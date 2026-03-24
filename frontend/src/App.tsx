================================================================
FILE: frontend/src/App.tsx
================================================================

// ============================================================
// App.tsx — Main entry point
// Wires all phases: device detection, onboarding, shell, FAB,
// tooltips, undo, retention, routing
// ============================================================

import React, { useEffect, useState, Suspense } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { QuickEntryFAB } from "./components/ui/QuickEntryFAB";
import { UndoProvider } from "./components/ui/UndoToast";
import { TooltipProvider, HelpSidebar } from "./components/ui/TooltipSystem";
import { RetentionStyles } from "./components/retention/RetentionEngine";
import { useDevice, useViewportLock } from "./hooks/useDevice";
import { useAppStore } from "./context/AppStore";
import { analytics } from "./lib/analytics";
import { NAV_TABS, ROLE_DEFAULT_TAB } from "./config/navigation";
import type { NavTab } from "./config/navigation";
import "../../frontend/src/styles/global.css";

// Lazy-load heavy views
const DashboardView        = React.lazy(() => import("./views/DashboardView"));
const TrainingView         = React.lazy(() => import("./views/TrainingView"));
const BodyView             = React.lazy(() => import("./views/BodyView"));
const InsightsView         = React.lazy(() => import("./views/InsightsView"));

export default function App() {
  useViewportLock();
  const device = useDevice();
  const { user, onboarding, setOnboardingComplete, applyTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>(
    user?.role ? ROLE_DEFAULT_TAB[user.role] : "dashboard"
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    !onboarding?.completed && !onboarding?.skipped
  );

  // Apply sport theme CSS variables on load
  useEffect(() => {
    if (user?.preferences?.sportTheme) {
      applyTheme(user.preferences.sportTheme);
    }
  }, [user?.preferences?.sportTheme]);

  // Analytics session start
  useEffect(() => {
    analytics.sessionStart = true;
    analytics.trackSessionStart();
    if (user) {
      analytics.identify(user.id, {
        role: user.role,
        sport_theme: user.preferences?.sportTheme,
        device_type: device.type,
        is_pwa: device.isPWA,
      });
    }
  }, []);

  // ⌘K to open help sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setHelpOpen(v => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleTabChange = (tab: NavTab) => setActiveTab(tab.id);

  const handleOnboardingComplete = (state: any) => {
    setOnboardingComplete(state);
    applyTheme(state.sport ?? "track");
    setShowOnboarding(false);
    analytics.trackFirstValue("first_log");
    // Jump to role's default tab
    if (state.role) setActiveTab(ROLE_DEFAULT_TAB[state.role]);
  };

  return (
    <UndoProvider>
      <TooltipProvider userId={user?.id}>
        <RetentionStyles />

        {/* Skip to main content link (accessibility) */}
        <a
          href="#main-content"
          style={{
            position: "absolute", top: -100, left: 8, zIndex: 9999,
            background: "var(--theme-primary)", color: "#fff",
            padding: "8px 16px", borderRadius: 4, fontSize: 14,
            textDecoration: "none", transition: "top 150ms",
          }}
          onFocus={e => (e.target.style.top = "8px")}
          onBlur={e => (e.target.style.top = "-100px")}
        >
          Skip to main content
        </a>

        {/* Onboarding overlay */}
        {showOnboarding && (
          <OnboardingFlow
            onComplete={handleOnboardingComplete}
            onSkip={() => setShowOnboarding(false)}
          />
        )}

        {/* Help sidebar */}
        <HelpSidebar isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

        {/* Main shell — device-aware nav */}
        <AppShell activeTab={activeTab} onTabChange={handleTabChange}>
          <Suspense fallback={<PageLoader />}>
            {activeTab === "dashboard" && <DashboardView />}
            {activeTab === "training" && <TrainingView />}
            {activeTab === "body" && <BodyView />}
            {activeTab === "insights" && <InsightsView />}
          </Suspense>
        </AppShell>

        {/* Quick-entry FAB — athletes and solo_athletes only */}
        {(user?.role === "athlete" || user?.role === "solo_athlete") && !showOnboarding && (
          <QuickEntryFAB />
        )}
      </TooltipProvider>
    </UndoProvider>
  );
}

const PageLoader = () => (
  <div style={{
    height: "50dvh", display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text-muted)", fontSize: 13,
  }}>
    Loading...
  </div>
);

