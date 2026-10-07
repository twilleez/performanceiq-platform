/**
 * PerformanceIQ — Account linking v1
 * Lets an athlete share their data with a coach or a parent.
 */
import { supabase }                        from '../core/supabase.js';
import { getCurrentUser, getCurrentRole }  from '../core/auth.js';
import { isCloudAccount, pullAll }         from '../services/cloudSync.js';
import { isUuid }                          from '../services/cloudMap.js';

function esc(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const INPUT_STYLE = 'flex:1;min-width:0;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-primary);font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace';
const NOTE_STYLE  = 'font-size:12px;color:var(--text-muted);line-height:1.55';

function shareCodeHTML(kind) {
  const code  = getCurrentUser()?.id || '';
  const who   = kind === 'coach' ? 'athletes' : 'your athlete';
  const field = kind === 'coach' ? 'Coach code' : 'Parent code';
  return `
  <div class="panel" style="margin-bottom:16px" data-piq-link-ready="1">
    <div class="panel-title">${kind === 'coach' ? 'Invite athletes' : 'Link your athlete'}</div>
    <p style="${NOTE_STYLE};margin:8px 0 12px">
      Send this code to ${who}. They open <strong>Settings → Share my data</strong>, paste it into
      <strong>${field}</strong> and tap Connect. Their training and check-ins then appear here.
      Nothing is shared until the athlete does this, and they can stop sharing at any time.
    </p>
    <div style="display:flex;gap:8px;align-items:center">
      <input readonly value="${esc(code)}" aria-label="Your share code" style="${INPUT_STYLE}" data-piq-share-code />
      <button class="btn-draft" data-piq-copy-code style="padding:10px 14px;font-size:12.5px;white-space:nowrap">Copy code</button>
      <button class="btn-draft" data-piq-refresh style="padding:10px 14px;font-size:12.5px;white-space:nowrap">Refresh</button>
    </div>
    <div role="status" aria-live="polite" data-piq-link-status style="${NOTE_STYLE};margin-top:8px;min-height:18px"></div>
  </div>`;
}

function bindShareCode(panel) {
  const status = panel.querySelector('[data-piq-link-status]');
  panel.querySelector('[data-piq-copy-code]')?.addEventListener('click', async () => {
    const input = panel.querySelector('[data-piq-share-code]');
    try {
      await navigator.clipboard.writeText(input.value);
      status.textContent = 'Code copied.';
    } catch {
      input.select();
      status.textContent = 'Press Ctrl/Cmd + C to copy the selected code.';
    }
  });
  panel.querySelector('[data-piq-refresh]')?.addEventListener('click', async () => {
    status.textContent = 'Checking for linked athletes…';
    const changed = await pullAll({ force: true });
    if (!changed && status.isConnected) status.textContent = 'Up to date. No new links found.';
  });
}

const LINK_TABLES = {
  coach:  { table: 'coach_athlete_links',  column: 'coach_id',  label: 'Coach'  },
  parent: { table: 'parent_athlete_links', column: 'parent_id', label: 'Parent' },
};

async function loadLinks(athleteId) {
  const [coach, parent] = await Promise.all([
    supabase.from('coach_athlete_links').select('id,coach_id,is_active').eq('athlete_id', athleteId),
    supabase.from('parent_athlete_links').select('id,parent_id').eq('athlete_id', athleteId),
  ]);
  if (coach.error) throw coach.error;
  if (parent.error) throw parent.error;
  return [
    ...(coach.data || []).filter(l => l.is_active !== false).map(l => ({ kind: 'coach',  id: l.id, other: l.coach_id })),
    ...(parent.data || []).map(l => ({ kind: 'parent', id: l.id, other: l.parent_id })),
  ];
}

async function connect(kind, rawCode) {
  const me   = getCurrentUser()?.id;
  const code = String(rawCode || '').trim().toLowerCase();
  const cfg  = LINK_TABLES[kind];
  if (!me) return { ok: false, message: 'Please sign in again.' };
  if (!isUuid(code)) return { ok: false, message: 'That code is not complete. Paste the whole code you were sent.' };
  if (code === me)   return { ok: false, message: 'That is your own code. Paste the code your coach or parent sent you.' };

  const existing = await supabase.from(cfg.table).select('id').eq('athlete_id', me).eq(cfg.column, code).limit(1);
  if (existing.error) return { ok: false, message: existing.error.message };

  let res;
  if (existing.data?.length) {
    res = kind === 'coach'
      ? await supabase.from(cfg.table).update({ is_active: true }).eq('id', existing.data[0].id)
      : { error: null };
  } else {
    const row = { athlete_id: me, [cfg.column]: code };
    if (kind === 'coach') row.is_active = true;
    res = await supabase.from(cfg.table).insert(row);
  }
  if (res.error) {
    const message = res.error.code === '23503'
      ? 'No account matches that code. Check it with the person who sent it.'
      : `Could not connect: ${res.error.message}`;
    return { ok: false, message };
  }
  return { ok: true, message: `${cfg.label} connected. They can now see your training and check-ins.` };
}

async function disconnect(link) {
  const cfg = LINK_TABLES[link.kind];
  const res = link.kind === 'coach'
    ? await supabase.from(cfg.table).update({ is_active: false }).eq('id', link.id)
    : await supabase.from(cfg.table).delete().eq('id', link.id);
  return res.error ? { ok: false, message: res.error.message } : { ok: true };
}

function athletePanelHTML(role) {
  const row = (kind, label) => `
    <label style="display:block;font-size:12px;font-weight:600;color:var(--text-primary);margin:12px 0 6px" for="piq-link-${kind}">${label}</label>
    <div style="display:flex;gap:8px">
      <input id="piq-link-${kind}" autocomplete="off" spellcheck="false" placeholder="Paste the code you were sent" style="${INPUT_STYLE}" />
      <button class="btn-primary" data-piq-connect="${kind}" style="padding:10px 16px;font-size:12.5px;white-space:nowrap">Connect</button>
    </div>`;
  return `
  <div class="panel" id="piq-share-panel" style="margin-top:16px">
    <div class="panel-title">Share my data</div>
    <p style="${NOTE_STYLE};margin:8px 0 0">
      A connected coach or parent can see your logged sessions, readiness check-ins and scores.
      You choose who is connected and can remove them here at any time.
    </p>
    ${role === 'player' ? row('coach', 'Coach code') : ''}
    ${row('parent', 'Parent code')}
    <div role="status" aria-live="polite" id="piq-share-status" style="${NOTE_STYLE};margin-top:10px;min-height:18px"></div>
    <div id="piq-share-links" style="margin-top:8px"></div>
  </div>`;
}

async function renderLinks(panel) {
  const box = panel.querySelector('#piq-share-links');
  if (!box) return;
  let links;
  try {
    links = await loadLinks(getCurrentUser()?.id);
  } catch (err) {
    box.innerHTML = `<div style="${NOTE_STYLE}">Could not load your connections: ${esc(err?.message || 'unknown error')}</div>`;
    return;
  }
  if (!box.isConnected) return;
  if (!links.length) {
    box.innerHTML = `<div style="${NOTE_STYLE}">Not shared with anyone yet.</div>`;
    return;
  }
  box.innerHTML = links.map((l, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--border)">
      <div style="flex:1;font-size:13px;color:var(--text-primary)">
        ${LINK_TABLES[l.kind].label} connected
        <span style="font-size:11px;color:var(--text-muted);font-family:ui-monospace,Menlo,Consolas,monospace">· code ending ${esc(String(l.other).slice(-6))}</span>
      </div>
      <button class="btn-draft" data-piq-disconnect="${i}" style="padding:6px 12px;font-size:12px">Stop sharing</button>
    </div>`).join('');
  box.querySelectorAll('[data-piq-disconnect]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const status = panel.querySelector('#piq-share-status');
      const res = await disconnect(links[Number(btn.dataset.piqDisconnect)]);
      if (status) status.textContent = res.ok ? 'Sharing stopped.' : `Could not stop sharing: ${res.message}`;
      renderLinks(panel);
    });
  });
}

function mountAthletePanel(main, role) {
  if (main.querySelector('#piq-share-panel')) return;
  main.insertAdjacentHTML('beforeend', athletePanelHTML(role));
  const panel  = main.querySelector('#piq-share-panel');
  const status = panel.querySelector('#piq-share-status');

  panel.querySelectorAll('[data-piq-connect]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const kind  = btn.dataset.piqConnect;
      const input = panel.querySelector(`#piq-link-${kind}`);
      btn.disabled = true;
      status.textContent = 'Connecting…';
      let res;
      try { res = await connect(kind, input.value); }
      catch (err) { res = { ok: false, message: `Could not connect: ${err?.message || 'unknown error'}` }; }
      status.textContent = res.message;
      status.style.color = res.ok ? 'var(--piq-green)' : '#ef4444';
      if (res.ok) { input.value = ''; renderLinks(panel); }
      btn.disabled = false;
    });
  });
  renderLinks(panel);
}

function mount(route) {
  if (!isCloudAccount()) return;
  const role = getCurrentRole();

  document.querySelectorAll('[data-piq-link-panel]').forEach(slot => {
    if (slot.dataset.piqLinkMounted) return;
    const kind = slot.dataset.piqLinkPanel;
    if (kind !== role) return;
    slot.dataset.piqLinkMounted = '1';
    slot.innerHTML = shareCodeHTML(kind);
    bindShareCode(slot);
  });

  if ((route === 'player/settings' && role === 'player') || (route === 'solo/settings' && role === 'solo')) {
    const main = document.querySelector('#piq-main .page-main') || document.querySelector('.page-main');
    if (main) mountAthletePanel(main, role);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('piq:viewRendered', event => mount(event.detail?.route || ''));
}
