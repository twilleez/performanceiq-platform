// ============================================================
// AppStore — Global app state context
// User, onboarding, theme preferences
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { SPORT_THEMES } from "../../../assets/tokens/theme";
import type { SportThemeId } from "../../../assets/tokens/theme";
import type { UserRole } from "../config/navigation";

interface UserPreferences {
  theme: "light" | "dark" | "system";
  sportTheme: SportThemeId;
  fontSize: "default" | "large" | "larger";
  reduceMotion: boolean;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  email: string;
  preferences: UserPreferences;
}

interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  currentStep: number;
  role: UserRole | null;
  sportTheme: SportThemeId | null;
}

interface AppStoreValue {
  user: User | null;
  onboarding: OnboardingState | null;
  loading: boolean;
  setOnboardingComplete: (state: any) => void;
  applyTheme: (sportThemeId: SportThemeId | string) => void;
  refreshUser: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTheme = useCallback((sportThemeId: SportThemeId | string) => {
    const theme = SPORT_THEMES[sportThemeId as SportThemeId];
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty("--theme-primary",   theme.primary);
    root.style.setProperty("--theme-accent",    theme.accent);
    root.style.setProperty("--theme-secondary", theme.secondary);
  }, []);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setUser(null); setLoading(false); return; }

      const [profileRes, onboardingRes, prefsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", authUser.id).single(),
        supabase.from("piq_onboarding").select("*").eq("user_id", authUser.id).single(),
        supabase.from("piq_user_preferences").select("*").eq("user_id", authUser.id).single(),
      ]);

      const profile = profileRes.data;
      const prefs   = prefsRes.data;
      const ob      = onboardingRes.data;

      setUser({
        id: authUser.id,
        firstName: profile?.first_name ?? "",
        lastName:  profile?.last_name  ?? "",
        role:      (profile?.role ?? "athlete") as UserRole,
        email:     authUser.email ?? "",
        preferences: {
          theme:        prefs?.theme        ?? "light",
          sportTheme:   (prefs?.sport_theme ?? "track") as SportThemeId,
          fontSize:     prefs?.font_size    ?? "default",
          reduceMotion: prefs?.reduce_motion ?? false,
        },
      });

      if (prefs?.sport_theme) applyTheme(prefs.sport_theme);
      if (prefs?.theme === "dark") document.documentElement.setAttribute("data-theme", "dark");

      setOnboarding({
        completed:    ob?.completed    ?? false,
        skipped:      ob?.skipped      ?? false,
        currentStep:  ob?.current_step ?? 0,
        role:         (ob?.role ?? null) as UserRole | null,
        sportTheme:   (ob?.sport_theme ?? null) as SportThemeId | null,
      });

    } catch (err) {
      console.error("AppStore loadUser error:", err);
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => {
    loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadUser());
    return () => subscription.unsubscribe();
  }, [loadUser]);

  const setOnboardingComplete = useCallback(async (state: any) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    await supabase.from("piq_onboarding").upsert({
      user_id:      userId,
      completed:    true,
      role:         state.role,
      sport_theme:  state.sport,
      team_name:    state.teamName,
      athlete_name: state.athleteName,
      first_goal:   state.firstGoal,
      completed_at: new Date().toISOString(),
    });

    if (state.sport) {
      await supabase.from("piq_user_preferences").upsert({
        user_id: userId, sport_theme: state.sport,
      });
      applyTheme(state.sport);
    }

    setOnboarding(prev => prev ? { ...prev, completed: true, role: state.role } : null);
  }, [applyTheme]);

  return (
    <AppStoreContext.Provider value={{
      user, onboarding, loading,
      setOnboardingComplete, applyTheme,
      refreshUser: loadUser,
    }}>
      {children}
    </AppStoreContext.Provider>
  );
};
