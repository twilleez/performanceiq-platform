// ============================================================
// AppShell — Device-aware layout wrapper
// Mobile: bottom tab nav | Desktop: top nav + sidebar
// Includes: sync indicator, active nav state, safe areas
// ============================================================

import React, { useEffect, useRef } from "react";
import { useDevice, useFocalPoint, useViewportLock } from "../../hooks/useDevice";
import { useSyncState } from "../../hooks/useSyncState";
import { useAppStore } from "../../context/AppStore";
import { analytics } from "../../lib/analytics";
import { NAV_TABS } from "../../config/navigation";
import type { NavTab } from "../../config/navigation";

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: NavTab) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  useViewportLock();
  const device = useDevice();
  const { syncStatus } = useSyncState();
  const { user } = useAppStore();

  const handleTabChange = (tab: NavTab) => {
    analytics.track("nav_tab_changed", { from: activeTab, to: tab.id, device: device.type });
    onTabChange(tab);
  };

  return (
    <div
      data-device={device.type}
      data-theme={user?.preferences?.theme ?? "light"}
      style={{ minHeight: "var(--dvh, 100vh)" }}
    >
      {device.isDesktop
        ? <DesktopShell activeTab={activeTab} onTabChange={handleTabChange} syncStatus={syncStatus}>
            {children}
          </DesktopShell>
        : <MobileShell activeTab={activeTab} onTabChange={handleTabChange} syncStatus={syncStatus} device={device}>
            {children}
          </MobileShell>
      }
    </div>
  );
};

// ── SYNC STATE INDICATOR ─────────────────────────────────────
import type { SyncStatus } from "../../hooks/useSyncState";

const SyncIndicator: React.FC<{ status: SyncStatus; onRetry?: () => void }> = ({
  status, onRetry,
}) => {
  const config: Record<SyncStatus, { icon: string; label: string; color: string; bg: string }> = {
    saved:   { icon: "✓", label: "Saved",         color: "#27AE60", bg: "#eafaf1" },
    syncing: { icon: "⟳", label: "Syncing...",    color: "#E67E22", bg: "#fef9ec" },
    error:   { icon: "✗", label: "Sync failed",   color: "#C0392B", bg: "#fdecea" },
    offline: { icon: "◌", label: "Offline",       color: "#6b6b80", bg: "#f5f3ef" },
  };
  const c = config[status];

  return (
    <button
      onClick={status === "error" ? onRetry : undefined}
      aria-label={`Sync status: ${c.label}${status === "error" ? " — tap to retry" : ""}`}
      title={status === "error" ? "Tap to retry sync" : c.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 20,
        border: "none",
        background: c.bg,
        cursor: status === "error" ? "pointer" : "default",
        transition: "all 150ms ease",
        minHeight: "auto",
        minWidth: "auto",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: c.color,
          animation: status === "syncing" ? "spin 1s linear infinite" : "none",
        }}
        aria-hidden="true"
      >
        {c.icon}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: c.color, letterSpacing: ".04em", textTransform: "uppercase" }}>
        {c.label}
      </span>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
};

// ── DESKTOP SHELL ─────────────────────────────────────────────
const DesktopShell: React.FC<{
  activeTab: string;
  onTabChange: (tab: NavTab) => void;
  syncStatus: SyncStatus;
  children: React.ReactNode;
}> = ({ activeTab, onTabChange, syncStatus, children }) => {
  const { user } = useAppStore();

  return (
    <>
      {/* Top nav */}
      <header
        className="piq-nav-desktop"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 24,
        }}
      >
        {/* Logo */}
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 22,
          fontWeight: 900,
          color: "var(--theme-primary)",
          letterSpacing: "-.01em",
          flexShrink: 0,
        }}>
          PIQ
        </div>

        {/* Nav tabs */}
        <nav role="navigation" aria-label="Main navigation" style={{ display: "flex", gap: 4, flex: 1 }}>
          {NAV_TABS.map(tab => (
            <DesktopNavTab
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab)}
            />
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <SyncIndicator status={syncStatus} />
          <UserAvatar user={user} />
        </div>
      </header>

      {/* Content */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          paddingTop: "var(--nav-height-desktop)",
          minHeight: "var(--dvh, 100vh)",
        }}
      >
        {children}
      </main>
    </>
  );
};

const DesktopNavTab: React.FC<{
  tab: NavTab;
  isActive: boolean;
  onClick: () => void;
}> = ({ tab, isActive, onClick }) => (
  <button
    role="tab"
    aria-selected={isActive}
    aria-current={isActive ? "page" : undefined}
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "0 14px",
      height: "var(--nav-height-desktop)",
      border: "none",
      borderBottom: `3px solid ${isActive ? "var(--theme-primary)" : "transparent"}`,
      background: "transparent",
      fontFamily: "'DM Sans',sans-serif",
      fontSize: 13,
      fontWeight: isActive ? 700 : 500,
      color: isActive ? "var(--theme-primary)" : "var(--text-muted)",
      cursor: "pointer",
      transition: "color 150ms ease, border-color 150ms ease",
      minHeight: 44,
      whiteSpace: "nowrap",
    }}
    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--text-secondary)"; }}
    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--text-muted)"; }}
  >
    <span aria-hidden="true" style={{ fontSize: 16 }}>{tab.icon}</span>
    <span>{tab.label}</span>
    {tab.badge ? (
      <span style={{
        background: "#C0392B",
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        borderRadius: 10,
        padding: "1px 5px",
        minWidth: 16,
        textAlign: "center",
      }}>
        {tab.badge}
      </span>
    ) : null}
  </button>
);

// ── MOBILE SHELL ─────────────────────────────────────────────
const MobileShell: React.FC<{
  activeTab: string;
  onTabChange: (tab: NavTab) => void;
  syncStatus: SyncStatus;
  device: ReturnType<typeof useDevice>;
  children: React.ReactNode;
}> = ({ activeTab, onTabChange, syncStatus, device, children }) => {
  const { user } = useAppStore();

  return (
    <>
      {/* Top mini-header: logo + sync + avatar */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 52,
          paddingTop: "env(safe-area-inset-top)",
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-default)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `env(safe-area-inset-top) 16px 0`,
        }}
      >
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 900,
          color: "var(--theme-primary)",
        }}>
          PIQ
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SyncIndicator status={syncStatus} />
          <UserAvatar user={user} size={32} />
        </div>
      </header>

      {/* Scrollable content area */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          paddingTop: "52px",
          paddingBottom: `calc(${device.navHeight}px + env(safe-area-inset-bottom) + 8px)`,
          minHeight: "var(--dvh, 100vh)",
          overscrollBehavior: "contain",
        }}
      >
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav
        className="piq-nav-mobile"
        role="navigation"
        aria-label="Main navigation"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${NAV_TABS.length}, 1fr)`,
        }}
      >
        {NAV_TABS.map(tab => (
          <MobileNavTab
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab)}
          />
        ))}
      </nav>
    </>
  );
};

const MobileNavTab: React.FC<{
  tab: NavTab;
  isActive: boolean;
  onClick: () => void;
}> = ({ tab, isActive, onClick }) => (
  <button
    role="tab"
    aria-selected={isActive}
    aria-current={isActive ? "page" : undefined}
    aria-label={tab.label}
    onClick={onClick}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      padding: "8px 4px",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      position: "relative",
      // WCAG 2.5.5: minimum 44x44 touch target
      minHeight: 44,
      minWidth: 44,
      "-webkit-tap-highlight-color": "transparent",
    } as React.CSSProperties}
  >
    {/* Active indicator dot above icon */}
    {isActive && (
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: "var(--theme-primary)",
        }}
      />
    )}

    {/* Icon */}
    <span
      aria-hidden="true"
      style={{
        fontSize: 20,
        lineHeight: 1,
        filter: isActive ? "none" : "grayscale(0.4) opacity(0.6)",
        transition: "filter 150ms ease",
      }}
    >
      {tab.icon}
    </span>

    {/* Label */}
    <span
      style={{
        fontSize: 10,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? "var(--theme-primary)" : "var(--text-muted)",
        transition: "color 150ms ease",
        letterSpacing: ".02em",
        lineHeight: 1,
      }}
    >
      {tab.shortLabel ?? tab.label}
    </span>

    {/* Badge */}
    {tab.badge ? (
      <span
        aria-label={`${tab.badge} notifications`}
        style={{
          position: "absolute",
          top: 4,
          right: "calc(50% - 14px)",
          background: "#C0392B",
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
          borderRadius: 10,
          padding: "1px 4px",
          minWidth: 14,
          textAlign: "center",
          lineHeight: "14px",
        }}
      >
        {tab.badge > 9 ? "9+" : tab.badge}
      </span>
    ) : null}
  </button>
);

// ── USER AVATAR ───────────────────────────────────────────────
const UserAvatar: React.FC<{ user: any; size?: number }> = ({ user, size = 36 }) => {
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <div
      aria-label={`Profile: ${user?.firstName ?? "User"}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--theme-primary)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: size * 0.4,
        fontWeight: 800,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
};
