function addRipple(ev, target) {
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = target.getBoundingClientRect();
  r.style.left = (ev.clientX - rect.left) + 'px';
  r.style.top  = (ev.clientY - rect.top) + 'px';
  target.appendChild(r);
  setTimeout(() => r.remove(), 700);
}

function springPress(target) {
  try {
    target.animate(
      [{ transform:'scale(1)' }, { transform:'scale(.985)' }, { transform:'scale(1)' }],
      { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  } catch {}
}

export function installInteractions() {
  document.addEventListener('pointerdown', (e) => {
    const t = e.target && e.target.closest && e.target.closest('.btn,.iconbtn,.icon-btn,.navbtn,.nav-btn,.tab,.tab-btn,.fab');
    if (!t) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    springPress(t);
    addRipple(e, t);
  }, { passive:true });
}
