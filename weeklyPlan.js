import { navigate, ROLE_HOME } from '../../router.js';
import { setRole } from '../../core/auth.js';

export function renderPickRole() {
  const roles = [
    { id:'player', icon:'🏀', label:'Athlete',      desc:'Follow workouts and track your PIQ score' },
    { id:'coach',  icon:'🎽', label:'Coach',         desc:'Build programs, manage rosters, track readiness' },
    { id:'parent', icon:'👨‍👧', label:'Parent',        desc:'Monitor your athlete's progress' },
    { id:'solo',   icon:'🏃', label:'Solo Athlete',  desc:'Self-directed training with full builder' },
    { id:'admin',  icon:'🏫', label:'Admin',         desc:'Manage your organization and teams' },
  ];
  return `
<div class="auth-card" style="margin-top:0;max-width:560px;width:100%">
  <h2>Choose Your Role</h2>
  <p style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:20px;line-height:1.5">Your role shapes your dashboard and features.</p>
  <div class="pick-role-grid" id="role-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${roles.map(r => `
    <div class="pick-role-card" data-role="${r.id}"
      style="border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;background:rgba(255,255,255,.04)">
      <div style="font-size:22px;margin-bottom:6px">${r.icon}</div>
      <div style="font-weight:700;font-size:13.5px;color:#fff;margin-bottom:4px">${r.label}</div>
      <div style="font-size:11.5px;color:rgba(255,255,255,.45);line-height:1.4">${r.desc}</div>
    </div>`).join('')}
  </div>
</div>
<style>
.pick-role-card:hover{border-color:rgba(34,201,85,.4)!important;background:rgba(34,201,85,.06)!important}
</style>`;
}

document.addEventListener('piq:authRendered', () => {
  document.querySelectorAll('#role-grid .pick-role-card').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      setRole(role);
      navigate(ROLE_HOME[role]);
    });
  });
});
