/**
 * PerformanceIQ Nav Component — role-aware sidebar builder.
 */
import { getDashboardConfig } from '../state/selectors.js';
import { getCurrentRole }     from '../core/auth.js';

export function buildSidebar(role, activeRoute) {
  role = role || getCurrentRole() || 'solo';
  const config = getDashboardConfig();
  const items  = config.navItems;
  const main      = items.filter(it => !it.section || it.section === 'main');
  const secondary = items.filter(it => it.section === 'secondary');
  return `
<aside class="sidebar">
  <div class="sidebar-section">Navigation</div>
  ${main.map(it => _link(it, activeRoute)).join('')}
  ${secondary.length ? `<div class="sidebar-section">More</div>${secondary.map(it => _link(it, activeRoute)).join('')}` : ''}
</aside>`;
}

function _link(item, activeRoute) {
  const active = activeRoute === item.route || activeRoute?.startsWith(item.route.split('/')[0] + '/' + item.route.split('/')[1]);
  return `<a class="${active ? 'active' : ''}" data-route="${item.route}">
    <span class="si">${item.icon}</span> ${item.label}
  </a>`;
}

export function pageLayout(role, activeRoute, headerHtml, contentHtml) {
  return `<div class="view-with-sidebar">${buildSidebar(role, activeRoute)}<main class="page-main"><div class="page-header">${headerHtml}</div>${contentHtml}</main></div>`;
}
