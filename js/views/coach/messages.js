/**
 * PerformanceIQ — Coach Messages v2
 * ─────────────────────────────────────────────────────────────
 * PHASE 3: Functional thread view with real state-persisted send.
 * Threads read from and write to state.messages[].
 * Selecting a thread marks it read. Sending appends to the thread.
 */
import { buildSidebar }                              from '../../components/nav.js';
import { getCurrentUser }                            from '../../core/auth.js';
import { getMessages, addMessage, markThreadRead }   from '../../state/state.js';
import { navigate }                                  from '../../router.js';

export function renderCoachMessages() {
  const user    = getCurrentUser();
  const threads = getMessages();
  const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0);

  // Active thread: stored in URL hash or default to first
  const activeId = window.location.hash.replace('#','') || threads[0]?.id || '';
  const active   = threads.find(t => t.id === activeId) || threads[0] || null;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/messages')}
  <main class="page-main" style="padding:0">

    <div style="display:grid;grid-template-columns:300px 1fr;height:calc(100vh - 64px);overflow:hidden">

      <!-- ── Thread list ──────────────────────────────────── -->
      <div style="border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:16px 16px 12px;border-bottom:1px solid var(--border)">
          <div style="font-weight:700;font-size:15px;color:var(--text-primary)">
            Messages ${totalUnread > 0 ? `<span style="background:var(--piq-green);color:#0d1b3e;border-radius:10px;font-size:10px;font-weight:700;padding:1px 7px;margin-left:6px">${totalUnread}</span>` : ''}
          </div>
        </div>
        <div style="overflow-y:auto;flex:1">
          ${threads.map(t => `
          <div class="msg-thread ${active?.id === t.id ? 'active' : ''}" data-thread="${t.id}"
            style="display:flex;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border);
                   cursor:pointer;background:${active?.id===t.id?'var(--surface-2)':t.unread?'var(--surface-2)':'transparent'};
                   transition:background .15s">
            <div style="width:38px;height:38px;border-radius:50%;background:var(--piq-green);
                        display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;
                        opacity:${t.unread?1:0.7}">${t.icon || '💬'}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-weight:${t.unread?700:600};font-size:13px;color:var(--text-primary)">${t.subject}</span>
                <span style="font-size:10.5px;color:var(--text-muted);flex-shrink:0;margin-left:4px">
                  ${_timeAgo(t.messages.at(-1)?.ts)}
                </span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${t.messages.at(-1)?.body || ''}
              </div>
            </div>
            ${t.unread ? `<div style="width:18px;height:18px;border-radius:50%;background:var(--piq-green);
                                      color:#0d1b3e;font-size:10px;font-weight:700;
                                      display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            ${t.unread}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>

      <!-- ── Message pane ─────────────────────────────────── -->
      <div style="display:flex;flex-direction:column;overflow:hidden" id="msg-pane">
        ${active ? _threadPane(active) : `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    height:100%;color:var(--text-muted)">
          <div style="font-size:40px;margin-bottom:12px">💬</div>
          <div style="font-weight:600;font-size:15px;color:var(--text-primary)">Select a conversation</div>
        </div>`}
      </div>

    </div>
  </main>
</div>`;
}

function _threadPane(thread) {
  return `
  <div style="padding:14px 18px;border-bottom:1px solid var(--border);
              display:flex;align-items:center;gap:12px">
    <span style="font-size:22px">${thread.icon || '💬'}</span>
    <div style="font-weight:700;font-size:15px;color:var(--text-primary)">${thread.subject}</div>
  </div>
  <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px"
       id="msg-scroll">
    ${thread.messages.map(m => `
    <div style="display:flex;flex-direction:column;align-items:${m.from==='You'?'flex-end':'flex-start'}">
      <div style="max-width:72%;padding:10px 14px;border-radius:${m.from==='You'?'14px 14px 4px 14px':'14px 14px 14px 4px'};
                  background:${m.from==='You'?'var(--piq-green)':'var(--surface-2)'};
                  color:${m.from==='You'?'#0d1b3e':'var(--text-primary)'};font-size:13.5px;line-height:1.5">
        ${m.body}
      </div>
      <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px;padding:0 4px">
        ${m.from} · ${_timeAgo(m.ts)}
      </div>
    </div>`).join('')}
  </div>
  <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:10px">
    <input id="msg-input" type="text" placeholder="Type a message…"
      style="flex:1;padding:10px 14px;border-radius:22px;border:1px solid var(--border);
             background:var(--surface-2);color:var(--text-primary);font-size:13.5px">
    <button class="btn-primary" id="msg-send" data-thread="${thread.id}"
      style="padding:10px 20px;border-radius:22px;font-size:13px">Send</button>
  </div>`;
}

function _timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000)   return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000)return Math.floor(diff/3600000) + 'h ago';
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'coach/messages') return;

  // Thread selection
  document.querySelectorAll('.msg-thread').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.thread;
      markThreadRead(id);
      window.location.hash = id;
      navigate('coach/messages');
    });
  });

  // Auto-scroll to bottom
  const scroll = document.getElementById('msg-scroll');
  if (scroll) scroll.scrollTop = scroll.scrollHeight;

  // Pre-fill from 1-tap alert button in coach/home.js
  const draft     = sessionStorage.getItem('piq_compose_draft');
  const draftThread = sessionStorage.getItem('piq_compose_thread');
  if (draft) {
    const input = document.getElementById('msg-input');
    if (input) input.value = draft;
    sessionStorage.removeItem('piq_compose_draft');
    sessionStorage.removeItem('piq_compose_thread');
    // If the draft thread isn't active, navigate to it
    if (draftThread && !document.getElementById('msg-scroll')) {
      window.location.hash = draftThread;
    }
  }

  // Send message
  const input  = document.getElementById('msg-input');
  const sendBtn = document.getElementById('msg-send');

  function doSend() {
    const body = input?.value.trim();
    if (!body) return;
    const threadId = sendBtn?.dataset.thread;
    if (!threadId) return;
    addMessage(threadId, 'You', body);
    input.value = '';
    navigate('coach/messages#' + threadId);
  }

  sendBtn?.addEventListener('click', doSend);
  input?.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); doSend(); } });
});
