/**
 * PerformanceIQ — Player Messages v2
 * PHASE 3: Functional thread view using state.messages[].
 */
import { buildSidebar }                              from '../../components/nav.js';
import { getCurrentRole, getCurrentUser }            from '../../core/auth.js';
import { getMessages, addMessage, markThreadRead }   from '../../state/state.js';
import { navigate }                                  from '../../router.js';

export function renderParentMessages() {
  const role    = getCurrentRole() || 'parent';
  const threads = getMessages();
  const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0);
  const activeId = window.location.hash.replace('#','') || threads[0]?.id || '';
  const active   = threads.find(t => t.id === activeId) || threads[0] || null;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/messages')}
  <main class="page-main" style="padding:0">
    <div style="display:grid;grid-template-columns:300px 1fr;height:calc(100vh - 64px);overflow:hidden">

      <div style="border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:16px 16px 12px;border-bottom:1px solid var(--border)">
          <div style="font-weight:700;font-size:15px;color:var(--text-primary)">
            Messages ${totalUnread > 0 ? `<span style="background:var(--piq-green);color:#0d1b3e;border-radius:10px;font-size:10px;font-weight:700;padding:1px 7px;margin-left:6px">${totalUnread}</span>` : ''}
          </div>
        </div>
        <div style="overflow-y:auto;flex:1">
          ${threads.map(t => `
          <div class="msg-thread" data-thread="${t.id}"
            style="display:flex;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border);cursor:pointer;
                   background:${active?.id===t.id?'var(--surface-2)':t.unread?'var(--surface-2)':'transparent'}">
            <div style="width:38px;height:38px;border-radius:50%;background:var(--piq-green);
                        display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${t.icon||'💬'}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-weight:${t.unread?700:600};font-size:13px;color:var(--text-primary)">${t.subject}</span>
                <span style="font-size:10.5px;color:var(--text-muted)">${_ago(t.messages.at(-1)?.ts)}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${t.messages.at(-1)?.body || ''}
              </div>
            </div>
            ${t.unread ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--piq-green);flex-shrink:0;margin-top:5px"></div>` : ''}
          </div>`).join('')}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;overflow:hidden">
        ${active ? `
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
          <span style="font-size:22px">${active.icon||'💬'}</span>
          <div style="font-weight:700;font-size:15px;color:var(--text-primary)">${active.subject}</div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px" id="msg-scroll">
          ${active.messages.map(m => `
          <div style="display:flex;flex-direction:column;align-items:${m.from==='You'?'flex-end':'flex-start'}">
            <div style="max-width:72%;padding:10px 14px;border-radius:${m.from==='You'?'14px 14px 4px 14px':'14px 14px 14px 4px'};
                        background:${m.from==='You'?'var(--piq-green)':'var(--surface-2)'};
                        color:${m.from==='You'?'#0d1b3e':'var(--text-primary)'};font-size:13.5px;line-height:1.5">
              ${m.body}
            </div>
            <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px;padding:0 4px">
              ${m.from} · ${_ago(m.ts)}
            </div>
          </div>`).join('')}
        </div>
        <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:10px">
          <input id="msg-input" type="text" placeholder="Type a message…"
            style="flex:1;padding:10px 14px;border-radius:22px;border:1px solid var(--border);
                   background:var(--surface-2);color:var(--text-primary);font-size:13.5px">
          <button class="btn-primary" id="msg-send" data-thread="${active.id}"
            style="padding:10px 20px;border-radius:22px;font-size:13px">Send</button>
        </div>` : `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">
          <div style="font-size:40px;margin-bottom:12px">💬</div>
          <div style="font-weight:600;font-size:15px;color:var(--text-primary)">Select a conversation</div>
        </div>`}
      </div>

    </div>
  </main>
</div>`;
}

function _ago(ts) {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60000) return 'now';
  if (d < 3600000) return Math.floor(d/60000) + 'm';
  if (d < 86400000) return Math.floor(d/3600000) + 'h';
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

document.addEventListener('piq:viewRendered', e => {
  const route = e.detail?.route || '';
  if (!route.endsWith('/messages')) return;

  document.querySelectorAll('.msg-thread').forEach(el => {
    el.addEventListener('click', () => {
      markThreadRead(el.dataset.thread);
      window.location.hash = el.dataset.thread;
      navigate(route);
    });
  });

  const scroll = document.getElementById('msg-scroll');
  if (scroll) scroll.scrollTop = scroll.scrollHeight;

  const input   = document.getElementById('msg-input');
  const sendBtn = document.getElementById('msg-send');

  function doSend() {
    const body = input?.value.trim();
    if (!body) return;
    addMessage(sendBtn.dataset.thread, 'You', body);
    input.value = '';
    navigate(route + '#' + sendBtn.dataset.thread);
  }

  sendBtn?.addEventListener('click', doSend);
  input?.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); doSend(); } });
});
