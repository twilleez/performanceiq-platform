/**
 * Solo Subscription View — plan management for solo athletes
 */
import { buildSidebar }  from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { showToast }     from '../../core/notifications.js';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function renderSoloSubscription() {
  const user = getCurrentUser();

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'forever',
      color: '#6b7280',
      current: true,
      features: [
        { text:'Basic workout logging',          included:true },
        { text:'PIQ Score tracking',             included:true },
        { text:'Readiness check-in',             included:true },
        { text:'Exercise library access',        included:true },
        { text:'AI training recommendations',    included:false },
        { text:'Advanced analytics',             included:false },
        { text:'Goal tracking',                  included:false },
        { text:'Recruiting profile',             included:false },
      ],
    },
    {
      id: 'pro',
      name: 'Solo Pro',
      price: 9.99,
      period: '/month',
      color: '#22c955',
      popular: true,
      features: [
        { text:'Everything in Free',             included:true },
        { text:'AI training recommendations',    included:true },
        { text:'Advanced analytics & trends',    included:true },
        { text:'Goal tracking & milestones',     included:true },
        { text:'Nutrition engine',               included:true },
        { text:'Priority support',               included:true },
        { text:'Recruiting profile',             included:false },
        { text:'Coach connection',               included:false },
      ],
    },
    {
      id: 'elite',
      name: 'Elite',
      price: 19.99,
      period: '/month',
      color: '#3b82f6',
      features: [
        { text:'Everything in Solo Pro',         included:true },
        { text:'Recruiting profile & tools',     included:true },
        { text:'Coach connection (1 coach)',      included:true },
        { text:'Video analysis (5 uploads/mo)',  included:true },
        { text:'Custom training programs',       included:true },
        { text:'Export all data (CSV/PDF)',      included:true },
        { text:'Early access to new features',  included:true },
        { text:'Dedicated support line',         included:true },
      ],
    },
  ];

  const planCards = plans.map(p => `
  <div style="border:${p.current?'2px solid '+p.color:p.popular?'2px solid '+p.color+'88':'1px solid var(--border)'};border-radius:16px;padding:20px;position:relative;background:${p.current||p.popular?p.color+'0d':'var(--surface-1)'}">
    ${p.current ? `<div style="position:absolute;top:-1px;right:14px;background:${p.color};color:#0d1b3e;font-size:10px;font-weight:700;padding:3px 12px;border-radius:0 0 8px 8px">YOUR PLAN</div>` : ''}
    ${p.popular && !p.current ? `<div style="position:absolute;top:-1px;right:14px;background:${p.color};color:#0d1b3e;font-size:10px;font-weight:700;padding:3px 12px;border-radius:0 0 8px 8px">MOST POPULAR</div>` : ''}

    <div style="font-weight:700;font-size:16px;margin-bottom:4px;color:var(--text-primary)">${esc(p.name)}</div>
    <div style="margin-bottom:12px">
      ${p.price === 0
        ? `<span style="font-size:26px;font-weight:700;color:${p.color}">Free</span>`
        : `<span style="font-size:26px;font-weight:700;color:${p.color}">$${p.price}</span><span style="font-size:12px;color:var(--text-muted)">${p.period}</span>`}
    </div>

    <div style="margin-bottom:16px;min-height:200px">
      ${p.features.map(f=>`
      <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12.5px;color:${f.included?'var(--text-primary)':'var(--text-muted)'}">
        <span style="font-size:12px;color:${f.included?p.color:'var(--border)'};font-weight:700;flex-shrink:0">${f.included?'✓':'✕'}</span>
        ${esc(f.text)}
      </div>`).join('')}
    </div>

    <button class="${p.current?'btn-draft':'btn-primary'} sub-plan-btn" data-plan="${p.id}"
      style="width:100%;font-size:13px;padding:11px;background:${p.current?'':''};" ${p.current?'disabled':''}>
      ${p.current ? 'Current Plan' : 'Upgrade to ' + p.name}
    </button>
  </div>`).join('');

  const faqs = [
    ['Can I cancel anytime?', 'Yes. Cancel any time from this page or by contacting support. You keep access until the end of your billing period.'],
    ['What happens to my data if I downgrade?', 'All your logged data is preserved. You simply lose access to premium features — no data is deleted.'],
    ['Is there a student discount?', 'Yes — contact support with your student email for 20% off any paid plan.'],
    ['How do I connect with a coach?', 'The Elite plan includes one coach connection. Your coach will receive an invite link and can access your profile.'],
  ];

  const faqHTML = faqs.map(([q, a]) => `
  <div style="padding:14px 0;border-bottom:1px solid var(--border)">
    <div style="font-weight:600;font-size:13.5px;color:var(--text-primary);margin-bottom:6px">${esc(q)}</div>
    <div style="font-size:13px;color:var(--text-muted);line-height:1.6">${esc(a)}</div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/subscription')}
  <main class="page-main">
    <div class="page-header">
      <h1>Subscription</h1>
      <p>Manage your PerformanceIQ plan and billing</p>
    </div>

    <!-- Current plan banner -->
    <div style="background:var(--piq-green)11;border:1px solid var(--piq-green)33;border-radius:12px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:22px">✅</span>
        <div>
          <div style="font-weight:700;font-size:13.5px;color:var(--text-primary)">You're on the Free Plan</div>
          <div style="font-size:12px;color:var(--text-muted)">Upgrade anytime to unlock AI coaching, analytics, and more</div>
        </div>
      </div>
      <button class="btn-primary sub-plan-btn" data-plan="pro" style="font-size:13px;padding:9px 18px">Upgrade to Pro</button>
    </div>

    <!-- Plan comparison grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:28px">
      ${planCards}
    </div>

    <!-- FAQ -->
    <div class="panel">
      <div class="panel-title">Frequently Asked Questions</div>
      <div style="margin-top:8px">${faqHTML}</div>
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.querySelectorAll('.sub-plan-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      showToast(`Upgrade to ${plan} — payment coming soon`);
    });
  });
});
