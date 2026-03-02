import { EVENTS } from '../data/demo.js';

export function renderSchedule(mountEl){
  if (!mountEl) return;
  mountEl.innerHTML = EVENTS.map(ev => `
    <div class="event-item">
      <div style="text-align:center;min-width:36px">
        <div class="event-days-num ${ev.days<=3?'soon':''}">${ev.days}</div>
        <div class="event-days-label">days</div>
      </div>
      <div><div class="event-name">${ev.name}</div><div class="event-detail">${ev.detail}</div></div>
      <div style="font-size:17px;margin-left:auto">${ev.icon}</div>
    </div>`).join('');
}
