// ============================================================
// UndoToast — Phase 0 global undo system
// 10-second window, handles all destructive actions
// ============================================================

import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from "react";
import { useDevice } from "../../hooks/useDevice";
import { analytics } from "../../lib/analytics";

const UNDO_WINDOW_MS = 10_000;

export interface UndoAction {
  id: string;
  label: string;
  onUndo: () => void | Promise<void>;
  onCommit?: () => void | Promise<void>;
  severity?: "default" | "destructive";
}

interface UndoContextValue {
  pushUndo: (action: UndoAction) => void;
  clearUndo: (id: string) => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo must be used within UndoProvider");
  return ctx;
}

interface ActiveToast extends UndoAction {
  expiresAt: number;
  progress: number; // 0–100
}

export const UndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const { isMobile, navHeight } = useDevice();

  const clearUndo = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearInterval(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushUndo = useCallback((action: UndoAction) => {
    // Clear any existing toast with same id
    clearUndo(action.id);

    const expiresAt = Date.now() + UNDO_WINDOW_MS;
    const toast: ActiveToast = { ...action, expiresAt, progress: 100 };

    setToasts(prev => [toast, ...prev.slice(0, 2)]); // max 3 toasts

    analytics.track("undo_toast_shown", {
      action_id: action.id,
      label: action.label,
      severity: action.severity ?? "default",
    });

    // Progress countdown tick every 100ms
    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        clearUndo(action.id);
        action.onCommit?.();
        analytics.track("undo_toast_expired", { action_id: action.id });
      } else {
        setToasts(prev =>
          prev.map(t =>
            t.id === action.id
              ? { ...t, progress: (remaining / UNDO_WINDOW_MS) * 100 }
              : t
          )
        );
      }
    }, 100);

    timers.current.set(action.id, interval);
  }, [clearUndo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(t => clearInterval(t));
    };
  }, []);

  const handleUndo = async (toast: ActiveToast) => {
    clearUndo(toast.id);
    await toast.onUndo();
    analytics.track("undo_triggered", { action_id: toast.id });
  };

  // Position toast above bottom nav on mobile, below top nav on desktop
  const toastBottom = isMobile ? navHeight + 12 : "auto";
  const toastTop = isMobile ? "auto" : "calc(var(--nav-height) + 12px)";

  return (
    <UndoContext.Provider value={{ pushUndo, clearUndo }}>
      {children}

      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: "fixed",
          bottom: typeof toastBottom === "number" ? `${toastBottom}px` : toastBottom,
          top: toastTop,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 500,
          width: "calc(100% - 32px)",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map(toast => (
          <UndoToastItem
            key={toast.id}
            toast={toast}
            onUndo={() => handleUndo(toast)}
            onDismiss={() => {
              clearUndo(toast.id);
              toast.onCommit?.();
            }}
          />
        ))}
      </div>
    </UndoContext.Provider>
  );
};

const UndoToastItem: React.FC<{
  toast: ActiveToast;
  onUndo: () => void;
  onDismiss: () => void;
}> = ({ toast, onUndo, onDismiss }) => {
  const isDestructive = toast.severity === "destructive";

  return (
    <div
      role="alert"
      style={{
        background: "#1a1a2e",
        color: "#fff",
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,.18)",
        pointerEvents: "all",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: "toast-in 200ms ease forwards",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isDestructive && (
            <span style={{ fontSize: 16, flexShrink: 0 }}>🗑️</span>
          )}
          <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
            {toast.label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={onUndo}
            style={{
              height: 32,
              minHeight: 32,
              padding: "0 12px",
              borderRadius: 6,
              border: "1.5px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: "#fff",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Undo
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            style={{
              height: 32,
              minHeight: 32,
              width: 32,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,.5)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,.15)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${toast.progress}%`,
            background: isDestructive ? "#E74C3C" : "rgba(255,255,255,.6)",
            borderRadius: 2,
            transition: "width 100ms linear",
          }}
        />
      </div>
    </div>
  );
};
