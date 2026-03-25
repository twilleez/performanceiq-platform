// ============================================================
// PIQ DESIGN SYSTEM TOKENS v1.0
// Single source of truth for all visual design decisions
// ============================================================

export const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export const DEVICE = {
  mobileSmall: `(max-width: ${BREAKPOINTS.xs}px)`,
  mobile: `(max-width: ${BREAKPOINTS.sm}px)`,
  tablet: `(max-width: ${BREAKPOINTS.md}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
  touch: "(hover: none) and (pointer: coarse)",
  mouse: "(hover: hover) and (pointer: fine)",
} as const;

// ── BASE PALETTE ─────────────────────────────────────────────
export const COLORS = {
  navy: {
    900: "#0A1628",
    800: "#0F1F3D",
    700: "#162847",
    600: "#1C3258",
    500: "#1A5276",
    400: "#2980B9",
    300: "#5DADE2",
    200: "#AED6F1",
    100: "#D6EAF8",
  },
  green: {
    900: "#0B3D1E",
    800: "#145A32",
    700: "#1E8449",
    600: "#27AE60",
    500: "#2ECC71",
    400: "#52D98C",
    300: "#82E6AA",
    200: "#ABEBC6",
    100: "#D5F5E3",
  },
  red: {
    900: "#641E16",
    800: "#922B21",
    700: "#C0392B",
    600: "#E74C3C",
    500: "#F1948A",
    400: "#F5B7B1",
    300: "#FADBD8",
    200: "#FDEDEC",
    100: "#FEF9F9",
  },
  orange: {
    700: "#935116",
    600: "#D35400",
    500: "#E67E22",
    400: "#F0A500",
    300: "#FAD7A0",
    200: "#FDEBD0",
    100: "#FEF9EC",
  },
  purple: {
    800: "#4A235A",
    700: "#6C3483",
    600: "#8E44AD",
    500: "#9B59B6",
    300: "#D2B4DE",
    200: "#E8DAEF",
    100: "#F4ECF7",
  },
  neutral: {
    950: "#0A0A0F",
    900: "#111118",
    800: "#1C1C28",
    700: "#2E2E42",
    600: "#4A4A62",
    500: "#6B6B80",
    400: "#9494A8",
    300: "#BBBBC8",
    200: "#D8D8E2",
    150: "#E8E6E0",
    100: "#F0EDE8",
    50: "#F8F7F4",
    0: "#FFFFFF",
  },
  semantic: {
    success: "#27AE60",
    successBg: "#EAFAF1",
    successBorder: "#A9DFBF",
    warning: "#E67E22",
    warningBg: "#FEF9EC",
    warningBorder: "#FAD7A0",
    error: "#C0392B",
    errorBg: "#FDECEA",
    errorBorder: "#F5C6C2",
    info: "#1A5276",
    infoBg: "#EBF5FB",
    infoBorder: "#AED6F1",
  },
} as const;

// ── SPORT THEMES ─────────────────────────────────────────────
export const SPORT_THEMES = {
  football: {
    id: "football",
    label: "Football",
    primary: "#1A5276",
    accent: "#E67E22",
    secondary: "#27AE60",
    icon: "🏈",
  },
  basketball: {
    id: "basketball",
    label: "Basketball",
    primary: "#C0392B",
    accent: "#E67E22",
    secondary: "#1A5276",
    icon: "🏀",
  },
  swimming: {
    id: "swimming",
    label: "Swimming",
    primary: "#1A5276",
    accent: "#5DADE2",
    secondary: "#27AE60",
    icon: "🏊",
  },
  track: {
    id: "track",
    label: "Track & Field",
    primary: "#6C3483",
    accent: "#E67E22",
    secondary: "#27AE60",
    icon: "🏃",
  },
  soccer: {
    id: "soccer",
    label: "Soccer",
    primary: "#1E8449",
    accent: "#F0A500",
    secondary: "#1A5276",
    icon: "⚽",
  },
  baseball: {
    id: "baseball",
    label: "Baseball",
    primary: "#145A32",
    accent: "#C0392B",
    secondary: "#1A5276",
    icon: "⚾",
  },
} as const;

// ── TYPOGRAPHY ───────────────────────────────────────────────
export const TYPOGRAPHY = {
  fontFamily: {
    display: "'Barlow Condensed', sans-serif",
    body: "'DM Sans', sans-serif",
    mono: "'DM Mono', monospace",
  },
  fontSize: {
    // Mobile-first sizes
    xs: "clamp(10px, 2.5vw, 11px)",
    sm: "clamp(12px, 3vw, 13px)",
    base: "clamp(14px, 3.5vw, 16px)", // 16px minimum per accessibility requirement
    md: "clamp(15px, 4vw, 18px)",
    lg: "clamp(18px, 4.5vw, 22px)",
    xl: "clamp(22px, 5.5vw, 28px)",
    "2xl": "clamp(28px, 7vw, 36px)",
    "3xl": "clamp(36px, 9vw, 48px)",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.85,
  },
  // Tabular numerals for stat columns — WCAG requirement for data alignment
  tabularNumerals: {
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum" 1',
  },
} as const;

// ── SPACING ──────────────────────────────────────────────────
export const SPACING = {
  // Touch targets: minimum 44px per WCAG 2.5.5
  touchTarget: "44px",
  touchTargetMin: "44px",

  // Responsive spacing using clamp
  xs: "clamp(4px, 1vw, 6px)",
  sm: "clamp(8px, 2vw, 12px)",
  md: "clamp(12px, 3vw, 16px)",
  lg: "clamp(16px, 4vw, 24px)",
  xl: "clamp(24px, 6vw, 32px)",
  "2xl": "clamp(32px, 8vw, 48px)",
  "3xl": "clamp(48px, 12vw, 64px)",

  // Layout
  navHeight: {
    mobile: "56px",
    desktop: "64px",
  },
  fabSize: "56px",
  sidebarWidth: "240px",
  contentMaxWidth: "1240px",
} as const;

// ── SHADOWS ──────────────────────────────────────────────────
export const SHADOWS = {
  sm: "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)",
  md: "0 4px 12px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.07)",
  lg: "0 8px 24px rgba(0,0,0,.12), 0 4px 8px rgba(0,0,0,.08)",
  xl: "0 16px 48px rgba(0,0,0,.14), 0 8px 16px rgba(0,0,0,.10)",
  fab: "0 4px 16px rgba(0,0,0,.24), 0 2px 6px rgba(0,0,0,.16)",
  toast: "0 8px 32px rgba(0,0,0,.18), 0 4px 8px rgba(0,0,0,.12)",
} as const;

// ── ANIMATION ────────────────────────────────────────────────
export const ANIMATION = {
  duration: {
    instant: "80ms",
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
    page: "300ms",
  },
  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    enter: "cubic-bezier(0.0, 0.0, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0.0, 1, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

// ── WCAG CONTRAST REQUIREMENTS ───────────────────────────────
export const WCAG = {
  normalText: 4.5,    // AA requirement
  largeText: 3.0,     // AA requirement for 18px+ or 14px bold
  uiComponents: 3.0,  // AA requirement for UI components
  enhanced: 7.0,      // AAA requirement
} as const;

// ── Z-INDEX STACK ────────────────────────────────────────────
export const Z_INDEX = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
  fab: 150,
} as const;

export type SportThemeId = keyof typeof SPORT_THEMES;
export type ColorScale = keyof typeof COLORS;
