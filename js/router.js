import { athleteHomeView } from "./views/athleteHome.js";
import { sessionView } from "./views/session.js";
import { progressView } from "./views/progress.js";
import { profileView } from "./views/profile.js";
import { teamHomeView, teamScheduleView, rosterView, teamActivityView } from "./views/team.js";
export function renderScreen(state){ if (state.mode === "team"){ switch (state.ui.teamTab){ case "schedule": return teamScheduleView(state); case "roster": return rosterView(state); case "activity": return teamActivityView(state); default: return teamHomeView(state); } } switch (state.ui.tab){ case "session": return sessionView(state); case "progress": return progressView(state); case "profile": return profileView(state); default: return athleteHomeView(state); } }
