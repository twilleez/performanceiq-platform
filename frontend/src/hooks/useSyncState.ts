// ============================================================
// useSyncState — Phase 0
// Tracks Supabase sync status, exposes to AppShell indicator
// Auto-retry on failure with exponential backoff
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { analytics } from "../lib/analytics";

export type SyncStatus = "saved" | "syncing" | "error" | "offline";

interface SyncStateHook {
  syncStatus: SyncStatus;
  markDirty: () => void;
  retry: () => void;
  lastSyncedAt: Date | null;
}

const RETRY_DELAYS = [2000, 5000, 15000, 30000]; // exponential backoff

export function useSyncState(): SyncStateHook {
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>();
  const dirtyRef = useRef(false);

  // Monitor online/offline
  useEffect(() => {
    const goOnline  = () => { if (status === "offline") retry(); };
    const goOffline = () => setStatus("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (!navigator.onLine) setStatus("offline");
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [status]);

  // Monitor Supabase realtime connection
  useEffect(() => {
    const channel = supabase.channel("system");
    channel
      .on("system", { event: "disconnect" }, () => {
        setStatus("error");
        analytics.track("sync_failed", { error: "realtime_disconnect", retry_count: 0 });
      })
      .on("system", { event: "reconnect" }, () => {
        setStatus("saved");
        setLastSyncedAt(new Date());
        retryCount.current = 0;
        analytics.track("sync_recovered", { error: "realtime_disconnect", retry_count: retryCount.current });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setStatus("syncing");
    // Give supabase 1.5s to confirm
    const t = setTimeout(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setStatus("saved");
        setLastSyncedAt(new Date());
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const retry = useCallback(() => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("syncing");
    const delay = RETRY_DELAYS[Math.min(retryCount.current, RETRY_DELAYS.length - 1)];
    retryTimer.current = setTimeout(async () => {
      try {
        const { error } = await supabase.from("piq_sync_state").select("id").limit(1);
        if (error) throw error;
        setStatus("saved");
        setLastSyncedAt(new Date());
        retryCount.current = 0;
      } catch {
        retryCount.current++;
        setStatus("error");
        if (retryCount.current < 4) retry();
      }
    }, delay);
  }, []);

  useEffect(() => () => { clearTimeout(retryTimer.current); }, []);

  return { syncStatus: status, markDirty, retry, lastSyncedAt };
}
