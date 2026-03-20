/** Boot loader helper. */
export const bootLoader = {
  hide() {
    const l=document.getElementById('piq-boot-loader');
    if(!l) return;
    document.body.classList.add('piq-loaded');
    l.addEventListener('transitionend',()=>l.remove(),{once:true});
    setTimeout(()=>l.remove(),600);
  },
  showError(msg='Something went wrong. Please refresh.') {
    const l=document.getElementById('piq-boot-loader');
    if(l) l.innerHTML=`<div style="text-align:center;color:#fff;padding:24px"><div style="font-size:32px">⚠️</div><p>${msg}</p><button onclick="location.reload()">Reload</button></div>`;
  }
};
