// ============================================================
// useDevice — Device detection, viewport tracking, responsive
// focus management, and scroll-to-focal-point behavior
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { BREAKPOINTS } from "../../assets/tokens/theme";

export type DeviceType = "mobile" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";

export interface DeviceInfo {
  // Core classification
  type: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;

  // Viewport
  width: number;
  height: number;
  orientation: Orientation;
  pixelRatio: number;
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };

  // Input
  hasHover: boolean;
  hasFinePointer: boolean;

  // Platform
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  isSafari: boolean;

  // Resolution helpers
  contentWidth: number;    // usable content width after safe areas
  navHeight: number;       // bottom nav height on mobile, top nav on desktop
  fabOffset: number;       // how far from bottom edge the FAB should sit
}

export interface FocalPointOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  highlightDuration?: number; // ms — how long to flash the focal element
  offset?: number;            // px above element
}

// ── INTERNAL ─────────────────────────────────────────────────
function getOrientation(w: number, h: number): Orientation {
  return w > h ? "landscape" : "portrait";
}

function classifyDevice(w: number): DeviceType {
  if (w < BREAKPOINTS.md) return "mobile";
  if (w < BREAKPOINTS.lg) return "tablet";
  return "desktop";
}

function detectIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function detectAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function detectPWA(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

function detectSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement);
  const parse = (v: string) => parseInt(v || "0", 10);
  return {
    top:    parse(style.getPropertyValue("--sat") || "0"),
    bottom: parse(style.getPropertyValue("--sab") || "0"),
    left:   parse(style.getPropertyValue("--sal") || "0"),
    right:  parse(style.getPropertyValue("--sar") || "0"),
  };
}

// Inject CSS env() variables for safe area insets
function injectSafeAreaVars() {
  if (document.getElementById("piq-safe-area-vars")) return;
  const style = document.createElement("style");
  style.id = "piq-safe-area-vars";
  style.textContent = `
    :root {
      --sat: env(safe-area-inset-top, 0px);
      --sab: env(safe-area-inset-bottom, 0px);
      --sal: env(safe-area-inset-left, 0px);
      --sar: env(safe-area-inset-right, 0px);
    }
  `;
  document.head.appendChild(style);
}

// ── MAIN HOOK ─────────────────────────────────────────────────
export function useDevice(): DeviceInfo {
  const buildInfo = useCallback((): DeviceInfo => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const type = classifyDevice(w);
    const isMobile = type === "mobile";
    const isTablet = type === "tablet";
    const isDesktop = type === "desktop";
    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const hasHover = window.matchMedia("(hover: hover)").matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const isIOS = detectIOS();
    const isAndroid = detectAndroid();
    const isPWA = detectPWA();
    const isSafari = detectSafari();
    const safeAreaInsets = getSafeAreaInsets();
    const navHeight = isMobile ? 56 + safeAreaInsets.bottom : 64;
    const fabOffset = isMobile ? navHeight + 16 + safeAreaInsets.bottom : 24;
    const contentWidth = w - safeAreaInsets.left - safeAreaInsets.right;

    return {
      type, isMobile, isTablet, isDesktop, isTouch,
      width: w, height: h,
      orientation: getOrientation(w, h),
      pixelRatio: window.devicePixelRatio || 1,
      safeAreaInsets, hasHover, hasFinePointer,
      isIOS, isAndroid, isPWA, isSafari,
      contentWidth, navHeight, fabOffset,
    };
  }, []);

  const [info, setInfo] = useState<DeviceInfo>(() => {
    if (typeof window === "undefined") {
      // SSR fallback
      return {
        type: "desktop", isMobile: false, isTablet: false, isDesktop: true,
        isTouch: false, width: 1280, height: 800, orientation: "landscape",
        pixelRatio: 1, safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
        hasHover: true, hasFinePointer: true, isIOS: false, isAndroid: false,
        isPWA: false, isSafari: false, contentWidth: 1280, navHeight: 64, fabOffset: 24,
      };
    }
    injectSafeAreaVars();
    return buildInfo();
  });

  useEffect(() => {
    injectSafeAreaVars();
    const update = () => setInfo(buildInfo());

    // Visual Viewport API for mobile keyboard-aware sizing
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", update);
      window.visualViewport.addEventListener("scroll", update);
    } else {
      window.addEventListener("resize", update);
    }

    window.addEventListener("orientationchange", () => {
      // Brief delay for orientation change to complete
      setTimeout(update, 150);
    });

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", update);
        window.visualViewport.removeEventListener("scroll", update);
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, [buildInfo]);

  return info;
}

// ── FOCAL POINT HOOK ──────────────────────────────────────────
// scrolls the screen to the most important element on mount or route change
export function useFocalPoint() {
  const device = useDevice();
  const focalRef = useRef<HTMLElement | null>(null);

  const setFocal = useCallback((el: HTMLElement | null) => {
    focalRef.current = el;
  }, []);

  const jumpToFocal = useCallback((options: FocalPointOptions = {}) => {
    const el = focalRef.current;
    if (!el) return;

    const {
      behavior = "smooth",
      block = device.isMobile ? "start" : "center",
      highlightDuration = 600,
      offset = device.isMobile ? 16 : 0,
    } = options;

    // Calculate scroll target accounting for nav offset
    const rect = el.getBoundingClientRect();
    const scrollTop = window.scrollY + rect.top - device.navHeight - offset;

    window.scrollTo({ top: Math.max(0, scrollTop), behavior });

    // Brief visual focus pulse to orient the user
    if (highlightDuration > 0) {
      el.style.transition = `box-shadow ${ANIMATION_DURATION.fast}ms ease`;
      el.style.boxShadow = "0 0 0 3px rgba(26, 82, 118, 0.4)";
      setTimeout(() => {
        if (el) el.style.boxShadow = "";
      }, highlightDuration);
    }

    // Set focus for accessibility
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }, [device]);

  return { setFocal, jumpToFocal, device };
}

const ANIMATION_DURATION = { fast: "150" } as const;

// ── RESPONSIVE CSS HELPER ─────────────────────────────────────
// Returns inline style object tuned to current device
export function useResponsiveStyles() {
  const device = useDevice();

  return {
    // Container padding respects safe areas
    containerPadding: {
      paddingLeft: `max(${device.isMobile ? "16px" : "24px"}, env(safe-area-inset-left))`,
      paddingRight: `max(${device.isMobile ? "16px" : "24px"}, env(safe-area-inset-right))`,
      paddingBottom: device.isMobile
        ? `max(${device.navHeight + 16}px, env(safe-area-inset-bottom))`
        : "24px",
    },

    // Content below top nav
    pageTop: {
      paddingTop: `${device.navHeight}px`,
    },

    // Typography scales
    bodyText: {
      fontSize: device.isMobile ? "15px" : "16px",
      lineHeight: "1.65",
    },

    // Touch-optimized buttons
    touchButton: {
      minHeight: device.isTouch ? "44px" : "36px",
      minWidth: device.isTouch ? "44px" : "auto",
    },
  };
}

// ── VIEWPORT LOCK (prevents layout shift during keyboard open) ─
export function useViewportLock() {
  useEffect(() => {
    const setVhVar = () => {
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVhVar();
    window.visualViewport?.addEventListener("resize", setVhVar);
    window.addEventListener("resize", setVhVar);
    return () => {
      window.visualViewport?.removeEventListener("resize", setVhVar);
      window.removeEventListener("resize", setVhVar);
    };
  }, []);
}
