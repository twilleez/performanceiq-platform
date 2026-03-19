/**
 * logo.js — PerformanceIQ Phase 15C
 * Single source of truth for all branding.
 * SVG-based — zero file deps, always renders, scales perfectly.
 *
 * Usage:
 *   import { mark, lockup, inline } from '../components/logo.js';
 *   el.innerHTML = mark(48);          // square P icon, 48px
 *   el.innerHTML = lockup(64);        // icon + PERFORMANCEIQ, 64px tall
 *   el.innerHTML = inline(32);        // compact header version
 */

const MARK_SRC   = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIiBmaWxsPSJub25lIj4KICA8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgcng9IjI0IiBmaWxsPSIjRkY2QjM1Ii8+CiAgPHRleHQgeD0iNjAiIHk9Ijg2IiAKICAgICAgICBmb250LWZhbWlseT0iT3N3YWxkLCBJbXBhY3QsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI3MiIgZm9udC13ZWlnaHQ9IjcwMCIKICAgICAgICB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIKICAgICAgICBsZXR0ZXItc3BhY2luZz0iLTIiPlA8L3RleHQ+Cjwvc3ZnPg==";
const LOCKUP_SRC = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgODAiIGZpbGw9Im5vbmUiPgogIDwhLS0gSWNvbiBzcXVhcmUgLS0+CiAgPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iMTYiIGZpbGw9IiNGRjZCMzUiLz4KICA8dGV4dCB4PSI0MCIgeT0iNTgiCiAgICAgICAgZm9udC1mYW1pbHk9Ik9zd2FsZCwgSW1wYWN0LCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iNDgiIGZvbnQtd2VpZ2h0PSI3MDAiCiAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPlA8L3RleHQ+CiAgPCEtLSBXb3JkbWFyayAtLT4KICA8dGV4dCB4PSI5NiIgeT0iMzQiCiAgICAgICAgZm9udC1mYW1pbHk9Ik9zd2FsZCwgSW1wYWN0LCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iMjYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiNFOEU4RjAiCiAgICAgICAgbGV0dGVyLXNwYWNpbmc9IjIiPlBFUkZPUk1BTkNFPC90ZXh0PgogIDx0ZXh0IHg9Ijk2IiB5PSI2NCIKICAgICAgICBmb250LWZhbWlseT0iT3N3YWxkLCBJbXBhY3QsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSIyNiIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI0ZGNkIzNSIKICAgICAgICBsZXR0ZXItc3BhY2luZz0iNCI+SVE8L3RleHQ+Cjwvc3ZnPg==";

/** Square P icon only */
export function mark(size = 48) {
  return `<img src="${MARK_SRC}" width="${size}" height="${size}"
    alt="PerformanceIQ" class="piq-logo-mark"
    style="display:block;border-radius:${Math.round(size*0.2)}px;" />`;
}

/** Full stacked lockup: icon on top, PERFORMANCE / IQ below */
export function lockup(iconSize = 72) {
  const textSize   = Math.round(iconSize * 0.38);
  const subSize    = Math.round(iconSize * 0.38);
  return `
    <div class="piq-lockup piq-lockup--stacked" aria-label="PerformanceIQ">
      <img src="${MARK_SRC}" width="${iconSize}" height="${iconSize}"
           alt="" aria-hidden="true"
           style="display:block;border-radius:${Math.round(iconSize*0.2)}px;" />
      <div style="text-align:center;line-height:1;">
        <div style="font-family:var(--font-display);font-size:${textSize}px;
                    font-weight:700;color:var(--piq-text);letter-spacing:0.05em;">
          PERFORMANCE
        </div>
        <div style="font-family:var(--font-display);font-size:${subSize}px;
                    font-weight:700;color:var(--piq-coral);letter-spacing:0.14em;">
          IQ
        </div>
      </div>
    </div>`;
}

/** Compact inline version for nav bars and headers */
export function inline(iconSize = 32) {
  const fontSize = Math.round(iconSize * 0.45);
  return `
    <div class="piq-lockup piq-lockup--inline" aria-label="PerformanceIQ"
         style="display:flex;align-items:center;gap:${Math.round(iconSize*0.3)}px;">
      <img src="${MARK_SRC}" width="${iconSize}" height="${iconSize}"
           alt="" aria-hidden="true"
           style="display:block;border-radius:${Math.round(iconSize*0.2)}px;flex-shrink:0;" />
      <div style="line-height:1.1;">
        <span style="font-family:var(--font-display);font-size:${fontSize}px;
                     font-weight:700;color:var(--piq-text);letter-spacing:0.05em;">
          PERFORMANCE
        </span>
        <span style="font-family:var(--font-display);font-size:${fontSize}px;
                     font-weight:700;color:var(--piq-coral);letter-spacing:0.1em;
                     margin-left:4px;">
          IQ
        </span>
      </div>
    </div>`;
}
