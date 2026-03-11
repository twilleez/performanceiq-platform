import { dashboardView } from "./views/dashboard.js";
import { teamView } from "./views/team.js";
import { workoutsView } from "./views/workouts.js";
import { builderView } from "./views/builder.js";
import { athleteMobileView } from "./views/athleteMobile.js";
import { periodizationView } from "./views/periodization.js";
import { recruitingView } from "./views/recruiting.js";
import { setupView } from "./views/setup.js";
import { swapModalView } from "./views/swapModal.js";
import { buildRecruitingProfile, getSwapOptions } from "./features/performanceEngine.js";

export function renderCurrentView(state){
  let main = "";
  switch(state.ui.view){
    case "team": main = teamView(state); break;
    case "workouts": main = workoutsView(state); break;
    case "builder": main = builderView(state); break;
    case "athlete": main = athleteMobileView(state); break;
    case "periodization": main = periodizationView(); break;
    case "recruiting": {
      const a = state.roster.find(x => x.id === state.ui.activeAthleteId) || state.roster[0];
      main = recruitingView(buildRecruitingProfile(a));
      break;
    }
    case "setup": main = setupView(state); break;
    default: main = dashboardView(state);
  }
  if (state.ui.swapTarget) main += swapModalView(getSwapOptions(state.ui.swapTarget.exerciseId));
  return main;
}
