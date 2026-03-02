import { dom } from '../ui/dom.js';

export function toast(msg, ms = 2800) {
  const host = dom.toastContainer || (() => {
    const div = document.createElement('div');
    div.id = 'toastContainer';
    document.body.appendChild(div);
    return div;
  })();

  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  host.appendChild(t);

  setTimeout(() => {
    t.style.transition = 'opacity .25s,transform .25s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(6px)';
    setTimeout(() => t.remove(), 280);
  }, ms);
}
