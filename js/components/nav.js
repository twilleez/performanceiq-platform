/**
 * PerformanceIQ Nav Component
 * Role-aware sidebar builder used by all workspace views.
 */
import { getDashboardConfig } from '../state/selectors.js';
import { getCurrentRole }     from '../core/auth.js';

/**
 * Build a sidebar HTML string.
 * @param {string} role       - current user role
 * @param {string} activeRoute - current route string
 * @returns {string} HTML
 */
export function buildSidebar(role, activeRoute) {
  role = role || getCurrentRole() || 'solo';
  const config = getDashboardConfig();
  const items  = config.navItems;

  // Group items by section
  const main     = items.filter(it => !it.section || it.section === 'main');
  const secondary = items.filter(it => it.section === 'secondary');

  return `
<aside class="sidebar">
  <div class="sidebar-section">Navigation</div>
  ${main.map(it => sidebarLink(it, activeRoute)).join('')}
  ${secondary.length ? `
    <div class="sidebar-section">More</div>
    ${secondary.map(it => sidebarLink(it, activeRoute)).join('')}
  ` : ''}
</aside>`;
}

function sidebarLink(item, activeRoute) {
  const isActive = activeRoute === item.route
    || activeRoute?.startsWith(item.route.split('/')[0] + '/' + item.route.split('/')[1]);
  return `<a class="${isActive ? 'active' : ''}" data-route="${item.route}">
    <span class="si">${item.icon}</span> ${item.label}
  </a>`;
}

/**
 * Re-usable page wrapper with sidebar + content area.
 */
export function pageLayout(role, activeRoute, headerHtml, contentHtml) {
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, activeRoute)}
  <main class="page-main">
    <div class="page-header">${headerHtml}</div>
    ${contentHtml}
  </main>
</div>`;
}
