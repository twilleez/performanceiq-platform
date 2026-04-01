/**
 * messaging.js — Shared messaging component for all roles
 *
 * FIXES APPLIED:
 * [P0-2] Thread state now deep-cloned before mutation
 * [P1-2] No duplicate event listeners across navigations
 * [P1-6] Messages stored per-role: messages_coach, messages_player, messages_parent
 * [P2-3] Send button disabled during send to prevent double-fire
 */
import { getMessages, setMessages } from '../state/state.js';
import { getCurrentUser }           from '../core/auth.js';
import { showToast }                from '../core/notifications.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function ts() { return Date.now(); }

function fmtTime(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 60_000)     return 'Just now';
  if (diff < 3600_000)   return Math.floor(diff / 60_000) + 'm ago';
  if (diff < 86_400_000) return Math.floor(diff / 3600_000) + 'h ago';
  return new Date(ms).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function _roleColor(role = '') {
  const map = { Coach:'#39e66b', Player:'#3b82f6', Athlete:'#3b82f6', Parent:'#f59e0b', Admin:'#a78bfa', Group:'#22c9c9' };
  return map[role] || '#6b7280';
}

export function buildMessagingView({ role, threads: seedThreads, title = 'Messages', subtitle = 'Team communication' }) {
  const me = getCurrentUser();
  const meName = me?.name || 'You';

  // [P1-6] Role-scoped storage
  let storedMsgs = getMessages(role);

  if (!storedMsgs.length && seedThreads?.length) {
    storedMsgs = seedThreads.map((t, i) => ({
      id: `thread-${role}-${i}`,
      contact: t.name,
      contactRole: t.role || '',
      initials: (t.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color: t.color || _roleColor(t.role),
      unread: t.unread ?? false,
      lastTs: ts() - (i * 3600_000),
      messages: [{ from: t.name, text: t.preview, ts: ts() - (i * 3600_000), mine: false }],
    }));
    setMessages(role, storedMsgs);
  }

  const threadListHTML = storedMsgs.length
    ? storedMsgs.map(_threadRow).join('')
    : `<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">No conversations yet.</div>`;

  return `
<div class="msg-layout" id="msg-root" data-role="${esc(role)}">
  <div class="msg-sidebar">
    <div class="msg-sidebar-head">
      <span style="font-weight:700;font-size:14px;color:var(--text-primary)">Conversations</span>
      <button class="btn-primary" style="font-size:11.5px;padding:6px 12px" id="msg-new-btn">+ New</button>
    </div>
    <div id="msg-threads">${threadListHTML}</div>
  </div>
  <div class="msg-pane" id="msg-pane">
    ${storedMsgs[0] ? _conversationPane(storedMsgs[0], meName) : _emptyPane()}
  </div>
</div>

<style>
.msg-layout{display:grid;grid-template-columns:300px 1fr;height:calc(100vh - 160px);min-height:480px;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface-1)}
.msg-sidebar{border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.msg-sidebar-head{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
#msg-threads{overflow-y:auto;flex:1}
.msg-thread-row{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
.msg-thread-row:hover,.msg-thread-row.active{background:var(--surface-2)}
.msg-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.msg-thread-info{flex:1;min-width:0}
.msg-thread-name{font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.msg-thread-preview{font-size:11.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.msg-unread-dot{width:8px;height:8px;border-radius:50%;background:var(--piq-green);flex-shrink:0}
.msg-pane{display:flex;flex-direction:column;overflow:hidden}
.msg-pane-head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-shrink:0}
.msg-bubble-wrap{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.msg-bubble{max-width:68%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;word-break:break-word}
.msg-bubble.mine{background:var(--piq-green);color:#0d1b3e;align-self:flex-end;border-bottom-right-radius:4px}
.msg-bubble.theirs{background:var(--surface-2);color:var(--text-primary);align-self:flex-start;border-bottom-left-radius:4px}
.msg-bubble-meta{font-size:10.5px;margin-top:3px;opacity:.6}
.msg-compose{padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;flex-shrink:0}
.msg-compose textarea{flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:13px;color:var(--text-primary);resize:none;outline:none;font-family:inherit;line-height:1.4}
.msg-compose textarea:focus{border-color:var(--piq-green)}
.msg-empty{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-muted);font-size:13px}
@media(max-width:700px){.msg-layout{grid-template-columns:1fr}.msg-sidebar{display:none}}
</style>`;
}

function _threadRow(t) {
  const preview = t.messages?.at(-1)?.text || '';
  return `
<div class="msg-thread-row" data-tid="${esc(t.id)}" id="trow-${esc(t.id)}">
  <div class="msg-avatar" style="background:${t.color}22;color:${t.color}">${esc(t.initials)}</div>
  <div class="msg-thread-info">
    <div class="msg-thread-name">${esc(t.contact)}</div>
    <div class="msg-thread-preview">${esc(preview.slice(0, 55))}</div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
    <span style="font-size:10.5px;color:var(--text-muted)">${fmtTime(t.lastTs)}</span>
    ${t.unread ? `<div class="msg-unread-dot"></div>` : ''}
  </div>
</div>`;
}

function _conversationPane(t, meName) {
  const bubblesHTML = (t.messages || []).map(m => `
  <div>
    <div class="msg-bubble ${m.mine ? 'mine' : 'theirs'}">${esc(m.text)}</div>
    <div class="msg-bubble-meta" style="text-align:${m.mine ? 'right' : 'left'}">${m.mine ? esc(meName) : esc(t.contact)} · ${fmtTime(m.ts)}</div>
  </div>`).join('');

  return `
<div class="msg-pane-head">
  <div class="msg-avatar" style="background:${t.color}22;color:${t.color}">${esc(t.initials)}</div>
  <div>
    <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${esc(t.contact)}</div>
    <div style="font-size:11.5px;color:var(--text-muted)">${esc(t.contactRole)}</div>
  </div>
</div>
<div class="msg-bubble-wrap" id="msg-bubbles">${bubblesHTML}</div>
<div class="msg-compose">
  <textarea id="msg-input" rows="2" placeholder="Type a message…" maxlength="2000"></textarea>
  <button class="btn-primary" id="msg-send" style="padding:10px 16px;font-size:13px;align-self:flex-end">Send</button>
</div>`;
}

function _emptyPane() {
  return `<div class="msg-empty"><span style="font-size:32px">💬</span><span>Select a conversation</span></div>`;
}

export function wireMessaging(meName) {
  const root = document.getElementById('msg-root');
  if (!root) return;

  const role = root.dataset.role || 'player';

  // [P0-2] Deep-clone helper — prevents stale object references
  const deepClone = () => JSON.parse(JSON.stringify(getMessages(role)));

  function scrollBottom() {
    const b = document.getElementById('msg-bubbles');
    if (b) requestAnimationFrame(() => { b.scrollTop = b.scrollHeight; });
  }

  function loadThread(tid) {
    const threads = getMessages(role);
    const t = threads.find(x => x.id === tid);
    if (!t) return;

    // [P0-2] Clone before mutation
    const mutable = deepClone();
    const mt = mutable.find(x => x.id === tid);
    if (mt) mt.unread = false;
    setMessages(role, mutable);

    // Sidebar: remove unread dot, highlight active
    document.querySelector(`#trow-${CSS.escape(tid)} .msg-unread-dot`)?.remove();
    document.querySelectorAll('.msg-thread-row').forEach(r => r.classList.remove('active'));
    document.getElementById('trow-' + tid)?.classList.add('active');

    // Render conversation pane
    document.getElementById('msg-pane').innerHTML = _conversationPane(t, meName);
    scrollBottom();

    // Wire compose
    const btn   = document.getElementById('msg-send');
    const input = document.getElementById('msg-input');
    if (!btn || !input) return;

    const doSend = () => {
      const text = input.value.trim();
      if (!text || btn.disabled) return;

      // [P2-3] Disable during send
      btn.disabled = true;
      btn.textContent = '...';

      const threads = deepClone();
      const t2 = threads.find(x => x.id === tid);
      if (!t2) { btn.disabled = false; btn.textContent = 'Send'; return; }

      const msg = { from: meName, text, ts: ts(), mine: true };
      t2.messages.push(msg);
      t2.lastTs = msg.ts;
      setMessages(role, threads);

      // Update thread list preview
      const preview = document.querySelector(`#trow-${CSS.escape(tid)} .msg-thread-preview`);
      if (preview) preview.textContent = text.slice(0, 55);

      // Append bubble
      const bubbles = document.getElementById('msg-bubbles');
      if (bubbles) {
        const div = document.createElement('div');
        div.innerHTML = `
        <div class="msg-bubble mine">${esc(text)}</div>
        <div class="msg-bubble-meta" style="text-align:right">${esc(meName)} · Just now</div>`;
        bubbles.appendChild(div);
        scrollBottom();
      }

      input.value = '';
      btn.disabled = false;
      btn.textContent = 'Send';
    };

    btn.addEventListener('click', doSend);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
  }

  // Thread click delegation
  document.getElementById('msg-threads')?.addEventListener('click', e => {
    const row = e.target.closest('.msg-thread-row');
    if (row) loadThread(row.dataset.tid);
  });

  // New message
  document.getElementById('msg-new-btn')?.addEventListener('click', () => {
    showToast('New message — coming in next sprint');
  });

  // Auto-load first thread
  const first = getMessages(role)[0];
  if (first) loadThread(first.id);
}
