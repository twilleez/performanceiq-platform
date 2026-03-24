// ============================================================
// Navigation config — Phase 1
// 4 primary tabs with contextual sub-nav per role
// ============================================================

export type UserRole = "coach" | "athlete" | "parent" | "solo_athlete" | "admin";

export interface NavTab {
  id: string;
  label: string;
  shortLabel?: string;
  icon: string;
  badge?: number;
  roles?: UserRole[];        // undefined = all roles
  subNav?: SubNavItem[];
}

export interface SubNavItem {
  id: string;
  label: string;
  path: string;
  roles?: UserRole[];
}

export const NAV_TABS: NavTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: "⚡",
    subNav: [
      { id: "overview",    label: "Overview",      path: "/dashboard" },
      { id: "piq-score",   label: "PIQ Score",     path: "/dashboard/piq-score" },
      { id: "alerts",      label: "Alerts",        path: "/dashboard/alerts" },
    ],
  },
  {
    id: "training",
    label: "Training",
    shortLabel: "Train",
    icon: "🏋️",
    subNav: [
      { id: "log",          label: "Log Workout",  path: "/training/log" },
      { id: "workouts",     label: "Workouts",     path: "/training/workouts" },
      { id: "periodization",label: "Season Plan",  path: "/training/periodization" },
      { id: "wellness",     label: "Wellness",     path: "/training/wellness" },
    ],
  },
  {
    id: "body",
    label: "Body",
    shortLabel: "Body",
    icon: "🥗",
    subNav: [
      { id: "nutrition",  label: "Nutrition",     path: "/body/nutrition" },
      { id: "recovery",   label: "Recovery",      path: "/body/recovery" },
      { id: "metrics",    label: "Body Metrics",  path: "/body/metrics" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    shortLabel: "Stats",
    icon: "📊",
    subNav: [
      { id: "analytics",   label: "Analytics",    path: "/insights/analytics" },
      { id: "reports",     label: "Reports",      path: "/insights/reports",  roles: ["coach", "admin"] },
      { id: "team",        label: "Team",         path: "/insights/team",     roles: ["coach", "admin"] },
    ],
  },
];

// Role-specific default landing tabs
export const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  coach:        "insights",   // coaches land on team overview
  athlete:      "dashboard",
  parent:       "insights",   // parents land on reports
  solo_athlete: "dashboard",
  admin:        "insights",
};

// Role-specific default sub-nav within each tab
export const ROLE_DEFAULT_SUBNAV: Partial<Record<UserRole, Record<string, string>>> = {
  coach: {
    dashboard: "overview",
    insights: "team",
  },
  parent: {
    insights: "reports",
  },
};
