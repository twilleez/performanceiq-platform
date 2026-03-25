// ============================================================
// PushNotificationOptIn — Phase 3
// Permission request → VAPID subscribe → save to backend
// Shows after onboarding step 4 (PIQ reveal)
// Never asks twice if already granted or denied
// ============================================================

import React, { useState, useEffect } from "react";
import { useDevice } from "../../hooks/useDevice";
import { supabase } from "../../lib/supabase";
import { analytics } from "../../lib/analytics";

type PermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("VITE_VAPID_PUBLIC_KEY not set — push disabled");
    return null;
  }
  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch (err) {
    console.error("Push subscribe failed:", err);
    return null;
  }
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const json = sub.toJSON();
  await supabase.from("piq_push_subscriptions").upsert({
    user_id:    user.id,
    endpoint:   sub.endpoint,
    p256dh_key: json.keys?.p256dh ?? "",
    auth_key:   json.keys?.auth ?? "",
    device_type: /iphone|ipad|android/i.test(navigator.userAgent)
      ? /android/i.test(navigator.userAgent) ? "android" : "ios"
      : "web",
    is_active: true,
  }, { onConflict: "user_id,endpoint" });
}

// ── COMPONENT ─────────────────────────────────────────────────
interface PushOptInProps {
  onDismiss: () => void;
  context?: "post-onboarding" | "streak-at-risk" | "settings";
}

export const PushNotificationOptIn: React.FC<PushOptInProps> = ({
  onDismiss, context = "post-onboarding",
}) => {
  const { isMobile } = useDevice();
  const [permState, setPermState] = useState<PermissionState>("unknown");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermState("unsupported");
      return;
    }
    setPermState(Notification.permission as PermissionState);
    analytics.track("push_optin_shown", { context });
  }, []);

  // Already granted — register silently and dismiss
  useEffect(() => {
    if (permState === "granted") {
      registerServiceWorker().then(reg => {
        if (reg) subscribeToPush(reg).then(sub => { if (sub) saveSubscription(sub); });
      });
      onDismiss();
    }
  }, [permState]);

  if (permState === "unsupported" || permState === "granted" || permState === "denied") {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    analytics.track("push_optin_clicked", { context });

    const permission = await Notification.requestPermission();
    setPermState(permission as PermissionState);

    if (permission === "granted") {
      const reg = await registerServiceWorker();
      if (reg) {
        const sub = await subscribeToPush(reg);
        if (sub) {
          await saveSubscription(sub);
          analytics.track("push_subscribed", { context });
        }
      }
      setDone(true);
      setTimeout(onDismiss, 1800);
    } else {
      analytics.track("push_denied", { context });
      onDismiss();
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div style={{
        background: "#F0FDF4", border: "1px solid #BBF7D0",
        borderRadius: 12, padding: "16px 20px",
        display: "flex", gap: 12, alignItems: "center",
      }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#14532D" }}>Notifications enabled</div>
          <div style={{ fontSize: 12, color: "#166534" }}>We'll remind you to log and alert you when your streak is at risk.</div>
        </div>
      </div>
    );
  }

  const COPY = {
    "post-onboarding": {
      headline: "Never miss a day",
      body: "Get a daily log reminder and a heads-up when your streak is at risk. Takes 2 seconds to enable.",
      cta: "Enable reminders",
    },
    "streak-at-risk": {
      headline: "Your streak is at risk",
      body: "Turn on notifications so we can remind you before your streak resets at midnight.",
      cta: "Enable streak alerts",
    },
    "settings": {
      headline: "Training reminders",
      body: "Daily log reminders, streak alerts, and weekly summaries for parents.",
      cta: "Enable notifications",
    },
  };

  const copy = COPY[context];

  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--border-default)",
      borderRadius: 12,
      padding: isMobile ? "16px" : "18px 20px",
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
    }}>
      {/* Bell icon */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "var(--theme-primary)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        🔔
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          {copy.headline}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
          {copy.body}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleEnable}
            disabled={loading}
            style={{
              height: 36, padding: "0 18px", borderRadius: 8, border: "none",
              background: loading ? "var(--border-default)" : "var(--theme-primary)",
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", minHeight: 36, minWidth: "auto",
              transition: "background 150ms ease",
            }}
          >
            {loading ? "Enabling..." : copy.cta}
          </button>
          <button
            onClick={() => { analytics.track("push_optin_dismissed", { context }); onDismiss(); }}
            style={{
              height: 36, padding: "0 14px", borderRadius: 8,
              border: "1px solid var(--border-default)", background: "transparent",
              color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
              minHeight: 36, minWidth: "auto",
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

// ── SETTINGS TOGGLE (for settings screen) ─────────────────────
export const PushNotificationToggle: React.FC = () => {
  const [state, setState] = useState<PermissionState>("unknown");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) { setState("unsupported"); return; }
    setState(Notification.permission as PermissionState);

    // Check if actively subscribed
    navigator.serviceWorker?.getRegistration().then(reg => {
      reg?.pushManager.getSubscription().then(sub => setSubscribed(!!sub));
    });
  }, []);

  const handleToggle = async () => {
    if (subscribed) {
      // Unsubscribe
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("piq_push_subscriptions")
            .update({ is_active: false })
            .eq("user_id", user.id)
            .eq("endpoint", sub.endpoint);
        }
        setSubscribed(false);
        analytics.track("push_unsubscribed");
      }
    } else {
      const permission = await Notification.requestPermission();
      setState(permission as PermissionState);
      if (permission === "granted") {
        const reg = await registerServiceWorker();
        if (reg) {
          const sub = await subscribeToPush(reg);
          if (sub) {
            await saveSubscription(sub);
            setSubscribed(true);
            analytics.track("push_subscribed", { context: "settings" });
          }
        }
      }
    }
  };

  if (state === "unsupported") {
    return (
      <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "10px 0" }}>
        Push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
          Training reminders
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {state === "denied"
            ? "Blocked — enable in browser settings"
            : subscribed
            ? "Daily log reminders + streak alerts active"
            : "Get daily reminders and streak alerts"}
        </div>
      </div>
      <button
        onClick={state !== "denied" ? handleToggle : undefined}
        style={{
          width: 44, height: 24, borderRadius: 12,
          border: "none", cursor: state === "denied" ? "not-allowed" : "pointer",
          background: subscribed ? "var(--theme-primary)" : "var(--border-default)",
          position: "relative", transition: "background 200ms ease", flexShrink: 0,
        }}
        aria-label={subscribed ? "Disable notifications" : "Enable notifications"}
        aria-pressed={subscribed}
      >
        <span style={{
          position: "absolute", top: 2, left: subscribed ? 22 : 2,
          width: 20, height: 20, borderRadius: "50%", background: "#fff",
          transition: "left 200ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </button>
    </div>
  );
};
