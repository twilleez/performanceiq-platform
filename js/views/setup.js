export function setupView(state){
  return `<div class="card"><h2>Setup</h2><div class="list"><div class="item">Boot mode: ${state.bootMode}</div><div class="item">Navigation buttons are rendered in js/app.js inside shell()</div><div class="item">Button click handlers are in js/app.js inside bindGlobalUI()</div><div class="item">Sports exercise data: js/data/exerciseLibrary.js</div><div class="item">Swap logic: js/features/performanceEngine.js</div></div></div>`;
}
