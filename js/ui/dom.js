export const dom = {};

export function cacheDOM() {
  // Topbar
  dom.btnTheme   = document.getElementById('btnTheme');
  dom.btnRefresh = document.getElementById('btnRefresh');
  dom.btnExport  = document.getElementById('btnExport');

  // Search
  dom.athleteSearch      = document.getElementById('athleteSearch');
  dom.athleteFilterInput = document.getElementById('athleteFilterInput');

  // Dashboard
  dom.dashSub     = document.getElementById('dashSub');
  dom.statAvg     = document.getElementById('statAvg');
  dom.statAvgSub  = document.getElementById('statAvgSub');
  dom.statReady   = document.getElementById('statReady');
  dom.statReadySub= document.getElementById('statReadySub');
  dom.statMonitor = document.getElementById('statMonitor');
  dom.statMonitorSub = document.getElementById('statMonitorSub');
  dom.statRisk    = document.getElementById('statRisk');
  dom.sparkAvg    = document.getElementById('sparkAvg');
  dom.heatmapBody = document.getElementById('heatmapBody');
  dom.loadBarList = document.getElementById('loadBarList');
  dom.alertsList  = document.getElementById('alertsList');
  dom.rosterMini  = document.getElementById('rosterMini');
  dom.activityFeed= document.getElementById('activityFeed');
  dom.eventList   = document.getElementById('eventList');
  dom.riskBadge   = document.getElementById('riskBadge');

  dom.pillOnlineText = document.getElementById('pillOnlineText');
  dom.pillSeason     = document.getElementById('pillSeason');
  dom.pillGame       = document.getElementById('pillGame');
  dom.pillGameText   = document.getElementById('pillGameText');

  dom.chipOnlineText = document.getElementById('chipOnlineText');
  dom.chipFlags      = document.getElementById('chipFlags');
  dom.chipFlagsText  = document.getElementById('chipFlagsText');
  dom.chipGame       = document.getElementById('chipGame');
  dom.chipGameText2  = document.getElementById('chipGameText2');

  dom.insightText = document.getElementById('insightText');

  // Athletes view
  dom.athleteCountSub = document.getElementById('athleteCountSub');
  dom.athleteCardGrid = document.getElementById('athleteCardGrid');
  dom.athleteDetail   = document.getElementById('athleteDetail');
  dom.backToList      = document.getElementById('backToList');

  dom.detailHero      = document.getElementById('detailHero');
  dom.detailRingFill  = document.getElementById('detailRingFill');
  dom.detailRingNum   = document.getElementById('detailRingNum');
  dom.detailRingDelta = document.getElementById('detailRingDelta');
  dom.detailTier      = document.getElementById('detailTier');
  dom.detailScoreNote = document.getElementById('detailScoreNote');
  dom.detailPillars   = document.getElementById('detailPillars');
  dom.detailWellness  = document.getElementById('detailWellness');
  dom.detailLoad      = document.getElementById('detailLoad');
  dom.detailInsight   = document.getElementById('detailInsight');
  dom.detailWorkout   = document.getElementById('detailWorkout');
  dom.detailPRs       = document.getElementById('detailPRs');

  // Train
  dom.btnGenerate       = document.getElementById('btnGenerate');
  dom.btnGenerateInline = document.getElementById('btnGenerateInline');
  dom.btnPushToday      = document.getElementById('btnPushToday');
  dom.buildSport        = document.getElementById('buildSport');
  dom.buildType         = document.getElementById('buildType');
  dom.buildDuration     = document.getElementById('buildDuration');
  dom.buildIntensity    = document.getElementById('buildIntensity');
  dom.generatedSessionWrap = document.getElementById('generatedSessionWrap');
  dom.sessionLibrary    = document.getElementById('sessionLibrary');

  // Analytics
  dom.analyticsSub      = document.getElementById('analyticsSub');
  dom.analyticsStatGrid = document.getElementById('analyticsStatGrid');
  dom.loadChart         = document.getElementById('loadChart');
  dom.scoreDistChart    = document.getElementById('scoreDistChart');
  dom.scoreRanges       = document.getElementById('scoreRanges');
  dom.analyticsBody     = document.getElementById('analyticsBody');
  dom.btnExportAnalytics= document.getElementById('btnExportAnalytics');

  // Schedule
  dom.fullEventList     = document.getElementById('fullEventList');

  // Settings
  dom.settingTeamName = document.getElementById('settingTeamName');
  dom.settingSeason   = document.getElementById('settingSeason');
  dom.settingSport    = document.getElementById('settingSport');
  dom.settingTheme    = document.getElementById('settingTheme');
  dom.btnSaveSettings = document.getElementById('btnSaveSettings');

  dom.btnExportData   = document.getElementById('btnExportData');
  dom.btnImportData   = document.getElementById('btnImportData');
  dom.btnResetData    = document.getElementById('btnResetData');
  dom.importFileInput = document.getElementById('importFileInput');

  // Misc
  dom.userName = document.getElementById('userName');
  dom.userRole = document.getElementById('userRole');

  dom.loadingScreen   = document.getElementById('loadingScreen');
  dom.onboardingModal = document.getElementById('onboardingModal');
  dom.toastContainer  = document.getElementById('toastContainer');
    }
