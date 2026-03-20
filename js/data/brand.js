/**
 * PerformanceIQ — Brand System v2.0
 * Exports logo SVG strings and brand token helpers for use in views/components.
 *
 * Usage:
 *   import { LOGO_MARK_SVG, LOGO_FULL_SVG, PIQ_COLORS } from '../data/brand.js';
 */

/* ─── Logo Mark (nav, cards, 32×32 default) ─────────────────────────────── */
export const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" fill="none" aria-label="PerformanceIQ">
  <rect width="56" height="56" rx="14" fill="#0d1b3e"/>
  <circle cx="28" cy="28" r="18" stroke="rgba(57,230,107,0.15)" stroke-width="3" fill="none"/>
  <circle cx="28" cy="28" r="18"
    stroke="#39e66b" stroke-width="3.5" fill="none"
    stroke-dasharray="72 41" stroke-linecap="round"
    transform="rotate(-90 28 28)"/>
  <line x1="17" y1="28" x2="25" y2="28" stroke="#39e66b" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
  <line x1="19" y1="22.5" x2="25" y2="28" stroke="#39e66b" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
  <line x1="19" y1="33.5" x2="25" y2="28" stroke="#39e66b" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
  <circle cx="30" cy="28" r="2.8" fill="#39e66b"/>
</svg>`;

/* ─── Full Horizontal Logo (splash, marketing) ───────────────────────────── */
export const LOGO_FULL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 56" fill="none" aria-label="PerformanceIQ Platform">
  <rect width="56" height="56" rx="14" fill="#0d1b3e"/>
  <circle cx="28" cy="28" r="18" stroke="rgba(57,230,107,0.15)" stroke-width="3" fill="none"/>
  <circle cx="28" cy="28" r="18"
    stroke="#39e66b" stroke-width="3" fill="none"
    stroke-dasharray="70 43" stroke-linecap="round"
    transform="rotate(-90 28 28)"/>
  <line x1="18" y1="28" x2="25" y2="28" stroke="#39e66b" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
  <line x1="20" y1="23" x2="25" y2="28" stroke="#39e66b" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  <line x1="20" y1="33" x2="25" y2="28" stroke="#39e66b" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  <circle cx="30" cy="28" r="2.5" fill="#39e66b"/>
  <text x="68" y="22" font-family="Oswald, sans-serif" font-weight="700" font-size="20" letter-spacing="3" fill="white">PERFORMANCE</text>
  <text x="68" y="42" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="14" letter-spacing="8" fill="#39e66b">IQ PLATFORM</text>
</svg>`;

/* ─── Brand Color Tokens ─────────────────────────────────────────────────── */
export const PIQ_COLORS = {
  primary:       '#39e66b',
  primaryDark:   '#22c955',
  primaryGlow:   'rgba(57,230,107,0.18)',
  primarySubtle: 'rgba(57,230,107,0.08)',
  secondary:     '#2a9df4',
  accent:        '#ff6b35',
  navy:          '#0d1b3e',
  navyCard:      '#1a2a4a',
  navyLight:     '#1f3370',
  bg:            '#f4f6fb',
  text:          '#1e293b',
};

/* ─── Role Colors ────────────────────────────────────────────────────────── */
export const ROLE_COLORS = {
  coach:     PIQ_COLORS.primary,
  player:    PIQ_COLORS.secondary,
  athlete:   PIQ_COLORS.secondary,
  parent:    PIQ_COLORS.accent,
  solo:      PIQ_COLORS.primary,
  admin:     '#94a3b8',
};

/* ─── Role Emojis ────────────────────────────────────────────────────────── */
export const ROLE_ICONS = {
  coach:   '🎯',
  player:  '⚡',
  athlete: '⚡',
  parent:  '👥',
  solo:    '🏃',
  admin:   '🔧',
};

/* ─── PIQ Score Color by Tier ────────────────────────────────────────────── */
export function piqScoreColor(score) {
  if (score >= 85) return PIQ_COLORS.primary;     // Elite
  if (score >= 70) return PIQ_COLORS.secondary;   // Strong
  if (score >= 55) return '#f59e0b';              // Developing
  return PIQ_COLORS.accent;                        // Needs attention
}

export function piqScoreTier(score) {
  if (score >= 85) return 'ELITE';
  if (score >= 70) return 'STRONG';
  if (score >= 55) return 'DEVELOPING';
  return 'NEEDS WORK';
}

/* ─── Inline loader SVG (use in splash/boot before fonts load) ───────────── */
export const LOADER_SVG = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style="width:80px;height:80px">
  <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(57,230,107,0.12)" stroke-width="4"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#39e66b" stroke-width="4"
    stroke-dasharray="100 89" stroke-linecap="round"
    style="animation:piqSpin 1.2s linear infinite;transform-origin:40px 40px"
    transform="rotate(-90 40 40)"/>
</svg>
<style>@keyframes piqSpin{to{transform:rotate(360deg)}}</style>`;
