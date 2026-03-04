// core.js — v3.2.0 (Phase 3.3 — Sport-Specific Workouts, PRs, Streak Badges)
// Features:
// - Sport picker fixed (readable dropdowns assumed styled in CSS)
// - Today one-button workflow: Generate → Start timer → Log → Done
// - Session types + session-based workout generation
// - Sport-specific microblocks (skills) + strength exercises + substitutions
// - Injury-friendly program templates (explicit substitutions and reduced load)
// - Periodization wizard (12-week generator) + push current day's sessions to Today
// - Data Management hooks: export/import/reset + QA grade
// - Insights rollups (simple weekly minutes + load, streaks)
// - Persist via window.dataStore (offline-first)
// - No cloud/supabase blocking — cloud code lives elsewhere and will be reintroduced later
(function () {
  "use strict";
  if (window.__PIQ_CORE_V3__) return;
  window.__PIQ_CORE_V3__ = true;

  // ---------- Short aliases ----------
  const $ = (id) => document.getElementById(id);
  const nowISO = () => new Date().toISOString();

  // Guard against null / undefined / malformed timestamps.
  // new Date(undefined).toISOString() throws RangeError — this prevents that crash
  // in computeStreak, computeInsights, and anywhere else we touch session dates.
  function safeDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  function safeDateISO(val) {
    const d = safeDate(val);
    return d ? d.toISOString().slice(0, 10) : null;
  }

  // ---------- Load state ----------
  let state = (window.dataStore && window.dataStore.load) ? window.dataStore.load() : null;
  if (!state) {
    // minimal fallback if dataStore missing
    state = {
      meta: { version: "3.0.0", updated_at: nowISO() },
      profile: { role: "coach", sport: "basketball", preferred_session_type: "strength", injuries: [], weight_lbs: 160, goal: "maintain", activity: "med", level: "beginner", equipmentProfile: "barbell" },
      team: { teams: [], active_team_id: null },
      sessions: [],
      periodization: { plan: null, updated_at: null },
      insights: { weekly: [], updated_at: null },
      ui:  { view: "home", todaySession: null, mealPlan: null },
      prs: {},
      badges: {}
    };
    if (window.dataStore && window.dataStore.save) window.dataStore.save(state);
  }

  // ---------- Utilities ----------
  function persist(msg) {
    try {
      if (window.dataStore && window.dataStore.save) {
        window.dataStore.save(state);
        state.meta = state.meta || {};
        state.meta.updated_at = nowISO();
      }
      if (msg) toast(msg);
    } catch (e) {
      console.error("Persist failed", e);
      toast("Save failed");
    }
    applyStatusFromMeta();
  }

  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) {
      console.log("toast:", msg);
      return;
    }
    t.textContent = msg;
    t.hidden = false;
    setTimeout(() => { t.hidden = true; }, ms);
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 1000 * 60) return "just now";
    if (diff < 1000 * 60 * 60) return Math.round(diff / (1000 * 60)) + "m ago";
    if (diff < 1000 * 60 * 60 * 24) return Math.round(diff / (1000 * 60 * 60)) + "h ago";
    return Math.round(diff / (1000 * 60 * 60 * 24)) + "d ago";
  }

  // ---------- Status pill (reuse existing DOM) ----------
  function setDataStatusLabel(text, color) {
    const dot = $("saveDot");
    const txt = $("saveText");
    if (!dot || !txt) return;
    dot.style.background = color || "var(--ok)";
    txt.textContent = text || "Saved";
  }

  function applyStatusFromMeta() {
    // simple local-only status for offline-first
    setDataStatusLabel("Local saved", "var(--ok)");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXERCISE LIBRARY — v4.0
  // Each exercise: title, cue, sets, reps, load, equipment[], noEquipSub,
  //   equipSubs{} (equipment-based alternatives), subs{} (injury alternatives),
  //   prTrackable, prMetric, tier ("beginner"|"intermediate"|"advanced")
  //
  // equipment[] — what the exercise requires (used for equipment-aware swapping)
  // Possible values: "barbell","dumbbell","cable","trap_bar","box","bench",
  //   "med_ball","bands","bar","sled","rower","bike","hurdles","none"
  // ══════════════════════════════════════════════════════════════════════════
  const EXERCISE_LIB = {

    strength: {
      // ── Lower body — beginner ────────────────────────────────────────────
      bodyweight_squat:     { title:"Bodyweight Squat",         cue:"3×15 — chest up, knees track toes, full depth",            sets:3,reps:15, load:"low",      equipment:[],            tier:"beginner",     noEquipSub:null,            equipSubs:{},                                       subs:{knee:"wall_sit"},                                prTrackable:false, prMetric:"reps"       },
      goblet_squat:         { title:"Goblet Squat",             cue:"3×10 — heels down, elbows inside knees, upright torso",    sets:3,reps:10, load:"moderate", equipment:["dumbbell"],  tier:"beginner",     noEquipSub:"bodyweight_squat",equipSubs:{barbell:"front_squat",kettlebell:"goblet_squat"},subs:{knee:"box_squat"},                              prTrackable:true,  prMetric:"weight_lbs" },
      reverse_lunge:        { title:"Reverse Lunge",            cue:"3×8/leg — drive front heel, upright torso",                sets:3,reps:8,  load:"moderate", equipment:["dumbbell"],  tier:"beginner",     noEquipSub:"reverse_lunge_bw",equipSubs:{barbell:"barbell_lunge"},                  subs:{knee:"step_up"},                                 prTrackable:true,  prMetric:"weight_lbs" },
      rdl:                  { title:"Romanian Deadlift",        cue:"3×8 — hinge at hip, bar drags shins, proud chest",         sets:3,reps:8,  load:"moderate", equipment:["barbell"],   tier:"beginner",     noEquipSub:"single_leg_hinge",equipSubs:{dumbbell:"db_rdl",trap_bar:"trap_bar_rdl"},  subs:{back:"good_mornings",hamstring:"glute_bridge"},  prTrackable:true,  prMetric:"weight_lbs" },
      glute_bridge:         { title:"Glute Bridge",             cue:"3×15 — drive hips to ceiling, squeeze at top 1 sec",       sets:3,reps:15, load:"low",      equipment:[],            tier:"beginner",     noEquipSub:null,            equipSubs:{barbell:"hip_thrust",dumbbell:"hip_thrust"},  subs:{back:"dead_bug"},                                prTrackable:false, prMetric:"reps"       },
      step_up:              { title:"Box Step-Up",              cue:"3×8/leg — drive through heel, don't push off back foot",   sets:3,reps:8,  load:"moderate", equipment:["box","dumbbell"],tier:"beginner",  noEquipSub:"reverse_lunge_bw",equipSubs:{},                                        subs:{knee:"wall_sit"},                                prTrackable:true,  prMetric:"weight_lbs" },
      // ── Lower body — intermediate ────────────────────────────────────────
      split_squat:          { title:"Bulgarian Split Squat",    cue:"3×8/leg — rear foot elevated, knee to floor, upright",     sets:3,reps:8,  load:"moderate", equipment:["dumbbell","bench"],tier:"intermediate",noEquipSub:"reverse_lunge_bw",equipSubs:{barbell:"barbell_split_squat"},       subs:{knee:"reverse_lunge"},                           prTrackable:true,  prMetric:"weight_lbs" },
      single_leg_deadlift:  { title:"Single-Leg RDL",           cue:"3×6/leg — hinge & reach, hip drives back, soft knee",      sets:3,reps:6,  load:"moderate", equipment:["dumbbell"],  tier:"intermediate", noEquipSub:"single_leg_hinge",equipSubs:{barbell:"single_leg_deadlift"},              subs:{balance:"step_up"},                              prTrackable:true,  prMetric:"weight_lbs" },
      hip_thrust:           { title:"Barbell Hip Thrust",       cue:"3×10 — bench at shoulder blades, drive hips to lock",      sets:3,reps:10, load:"moderate", equipment:["barbell","bench"],tier:"intermediate",noEquipSub:"glute_bridge",  equipSubs:{dumbbell:"db_hip_thrust"},                   subs:{back:"glute_bridge"},                            prTrackable:true,  prMetric:"weight_lbs" },
      nordic_curl:          { title:"Nordic Hamstring Curl",    cue:"3×5 — control descent, as low as control allows, pull up", sets:3,reps:5,  load:"moderate", equipment:[],            tier:"intermediate", noEquipSub:null,            equipSubs:{},                                            subs:{hamstring:"glute_bridge"},                       prTrackable:true,  prMetric:"reps"       },
      Copenhagen:           { title:"Copenhagen Side Plank",    cue:"3×20 sec/side — inner thigh drives, hips elevated",        sets:3,reps:20, load:"moderate", equipment:["bench"],     tier:"intermediate", noEquipSub:"side_plank",    equipSubs:{},                                            subs:{groin:"side_plank"},                             prTrackable:true,  prMetric:"time_sec"   },
      // ── Lower body — advanced ────────────────────────────────────────────
      trap_bar_deadlift:    { title:"Trap Bar Deadlift",        cue:"4×5 — hips between knees & shoulders, push floor away",    sets:4,reps:5,  load:"high",     equipment:["trap_bar"],  tier:"advanced",     noEquipSub:"split_squat",   equipSubs:{barbell:"conventional_deadlift"},             subs:{back:"goblet_squat"},                            prTrackable:true,  prMetric:"weight_lbs" },
      conventional_deadlift:{ title:"Conventional Deadlift",    cue:"4×5 — double overhand, lats tight, bar over mid-foot",     sets:4,reps:5,  load:"high",     equipment:["barbell"],   tier:"advanced",     noEquipSub:"split_squat",   equipSubs:{trap_bar:"trap_bar_deadlift",dumbbell:"rdl"},  subs:{back:"rdl"},                                     prTrackable:true,  prMetric:"weight_lbs" },
      front_squat:          { title:"Front Squat",              cue:"4×4 — elbows high, knees forward, upright torso",          sets:4,reps:4,  load:"high",     equipment:["barbell"],   tier:"advanced",     noEquipSub:"goblet_squat",  equipSubs:{dumbbell:"goblet_squat"},                     subs:{knee:"goblet_squat"},                            prTrackable:true,  prMetric:"weight_lbs" },
      back_squat:           { title:"Back Squat",               cue:"4×5 — bar on traps, hip crease below parallel, brace hard",sets:4,reps:5,  load:"high",     equipment:["barbell"],   tier:"advanced",     noEquipSub:"goblet_squat",  equipSubs:{trap_bar:"trap_bar_deadlift",dumbbell:"goblet_squat"},subs:{knee:"goblet_squat"},                   prTrackable:true,  prMetric:"weight_lbs" },
      // ── Upper body push ──────────────────────────────────────────────────
      pushup:               { title:"Push-Up",                  cue:"3×12 — hands under shoulders, rigid plank, chest to floor",sets:3,reps:12, load:"low",      equipment:[],            tier:"beginner",     noEquipSub:null,            equipSubs:{barbell:"bench",dumbbell:"db_bench"},          subs:{shoulder:"incline_pushup"},                      prTrackable:true,  prMetric:"reps"       },
      db_bench:             { title:"DB Bench Press",           cue:"3×10 — neutral grip option, full stretch at bottom",       sets:3,reps:10, load:"moderate", equipment:["dumbbell","bench"],tier:"beginner", noEquipSub:"pushup",        equipSubs:{barbell:"bench"},                             subs:{shoulder:"db_shoulder_press"},                   prTrackable:true,  prMetric:"weight_lbs" },
      bench:                { title:"Barbell Bench Press",      cue:"3×6 — retract scaps, slight arch, bar to lower chest",     sets:3,reps:6,  load:"high",     equipment:["barbell","bench"],tier:"intermediate",noEquipSub:"pushup",       equipSubs:{dumbbell:"db_bench"},                         subs:{shoulder:"db_shoulder_press"},                   prTrackable:true,  prMetric:"weight_lbs" },
      db_shoulder_press:    { title:"DB Shoulder Press",        cue:"3×10 — press to lock, control descent, no arch",           sets:3,reps:10, load:"moderate", equipment:["dumbbell"],  tier:"beginner",     noEquipSub:"pike_pushup",   equipSubs:{barbell:"push_press",cable:"cable_press"},    subs:{shoulder:"band_press"},                          prTrackable:true,  prMetric:"weight_lbs" },
      push_press:           { title:"Push Press",               cue:"3×5 — dip-drive, bar lockout overhead, active shrug",      sets:3,reps:5,  load:"high",     equipment:["barbell"],   tier:"advanced",     noEquipSub:"pike_pushup",   equipSubs:{dumbbell:"db_shoulder_press"},                subs:{shoulder:"db_shoulder_press"},                   prTrackable:true,  prMetric:"weight_lbs" },
      // ── Upper body pull ──────────────────────────────────────────────────
      inverted_row:         { title:"Inverted Row",             cue:"3×10 — body rigid, pull chest to bar, elbows back",        sets:3,reps:10, load:"low",      equipment:["bar"],       tier:"beginner",     noEquipSub:"band_row",      equipSubs:{cable:"lat_pulldown",dumbbell:"db_row"},      subs:{shoulder:"band_row"},                            prTrackable:true,  prMetric:"reps"       },
      db_row:               { title:"Single-Arm DB Row",        cue:"3×10/side — neutral spine, pull elbow to hip pocket",      sets:3,reps:10, load:"moderate", equipment:["dumbbell","bench"],tier:"beginner",noEquipSub:"inverted_row",  equipSubs:{barbell:"row",cable:"cable_row"},             subs:{back:"band_row"},                                prTrackable:true,  prMetric:"weight_lbs" },
      row:                  { title:"Barbell Bent-Over Row",    cue:"3×8 — hip hinge 45°, bar to navel, retract scaps",         sets:3,reps:8,  load:"moderate", equipment:["barbell"],   tier:"intermediate", noEquipSub:"inverted_row",  equipSubs:{dumbbell:"db_row",cable:"cable_row"},         subs:{back:"db_row"},                                  prTrackable:true,  prMetric:"weight_lbs" },
      lat_pulldown:         { title:"Lat Pulldown",             cue:"3×10 — lean back 10°, pull to upper chest, full stretch",  sets:3,reps:10, load:"moderate", equipment:["cable"],     tier:"beginner",     noEquipSub:"inverted_row",  equipSubs:{bar:"pullup"},                               subs:{shoulder:"db_row"},                              prTrackable:true,  prMetric:"weight_lbs" },
      pullup:               { title:"Pull-Up",                  cue:"3×max — dead hang start, chin clears bar, full lock-off",  sets:3,reps:0,  load:"moderate", equipment:["bar"],       tier:"intermediate", noEquipSub:"inverted_row",  equipSubs:{cable:"lat_pulldown"},                       subs:{shoulder:"lat_pulldown"},                        prTrackable:true,  prMetric:"reps"       },
      weighted_pullup:      { title:"Weighted Pull-Up",         cue:"4×5 — add 10–25 lbs via belt, controlled negative 3 sec",  sets:4,reps:5,  load:"high",     equipment:["bar"],       tier:"advanced",     noEquipSub:"pullup",        equipSubs:{cable:"lat_pulldown"},                       subs:{shoulder:"lat_pulldown"},                        prTrackable:true,  prMetric:"weight_lbs" },
      // ── Core / anti-rotation ────────────────────────────────────────────
      dead_bug:             { title:"Dead Bug",                 cue:"3×8/side — low back pressed to floor throughout",          sets:3,reps:8,  load:"low",      equipment:[],            tier:"beginner",     noEquipSub:null,            equipSubs:{},                                            subs:{},                                               prTrackable:false, prMetric:"reps"       },
      pallof_press:         { title:"Pallof Press",             cue:"3×10/side — resist rotation, press & return, tall posture",sets:3,reps:10, load:"low",      equipment:["cable","bands"],tier:"beginner",   noEquipSub:"dead_bug",      equipSubs:{},                                            subs:{back:"dead_bug"},                                prTrackable:false, prMetric:"reps"       },
      cable_chop:           { title:"Cable Rotational Chop",   cue:"3×10/side — load through hip, not arms — pivot foot",      sets:3,reps:10, load:"moderate", equipment:["cable"],     tier:"intermediate", noEquipSub:"med_ball_throw", equipSubs:{bands:"pallof_press"},                        subs:{back:"pallof_press"},                            prTrackable:false, prMetric:"reps"       },
      med_ball_slam:        { title:"Med Ball Slam",            cue:"3×8 — overhead reach, full extension, slam hard",          sets:3,reps:8,  load:"moderate", equipment:["med_ball"],  tier:"beginner",     noEquipSub:"pushup",        equipSubs:{},                                            subs:{shoulder:"pushup"},                              prTrackable:false, prMetric:"reps"       },
      landmine_rotation:    { title:"Landmine Rotation",        cue:"3×8/side — arms extended, pivot on trail foot, control",   sets:3,reps:8,  load:"moderate", equipment:["barbell"],   tier:"intermediate", noEquipSub:"med_ball_throw", equipSubs:{cable:"cable_chop"},                          subs:{back:"pallof_press"},                            prTrackable:false, prMetric:"reps"       },
    },

    plyo: {
      squat_jump:           { title:"Squat Jump",               cue:"3×8 — land soft, absorb with hips/knees, full effort up",  sets:3,reps:8,  load:"explosive",equipment:[],            tier:"beginner",     noEquipSub:null,            equipSubs:{box:"box_jump"},                              subs:{knee:"calf_raise"},                              prTrackable:false, prMetric:"reps"       },
      lateral_bounds:       { title:"Lateral Bounds",           cue:"3×6/side — stick each landing 1 sec before bounding",      sets:3,reps:6,  load:"explosive",equipment:[],            tier:"beginner",     noEquipSub:null,            equipSubs:{},                                            subs:{ankle:"lateral_step_ups"},                       prTrackable:false, prMetric:"reps"       },
      approach_jumps:       { title:"Volleyball Approach Jump", cue:"3×6 — 4-step: L-R-L (right-handed), load & explode up",    sets:3,reps:6,  load:"explosive",equipment:[],            tier:"beginner",     noEquipSub:"squat_jump",    equipSubs:{box:"box_jump"},                              subs:{knee:"squat_jump"},                              prTrackable:false, prMetric:"reps"       },
      box_jump:             { title:"Box Jump",                 cue:"4×5 — full hip extension, land with control, step down",   sets:4,reps:5,  load:"explosive",equipment:["box"],       tier:"intermediate", noEquipSub:"squat_jump",    equipSubs:{},                                            subs:{knee:"squat_jump"},                              prTrackable:true,  prMetric:"reps"       },
      broad_jump:           { title:"Broad Jump",               cue:"4×4 — arm swing, max distance, stick landing",             sets:4,reps:4,  load:"explosive",equipment:[],            tier:"intermediate", noEquipSub:"squat_jump",    equipSubs:{},                                            subs:{knee:"squat_jump"},                              prTrackable:true,  prMetric:"distance_m" },
      single_leg_hop:       { title:"Single-Leg Hop",           cue:"3×5/leg — hop forward, stick each landing, balance",       sets:3,reps:5,  load:"explosive",equipment:[],            tier:"intermediate", noEquipSub:"lateral_bounds", equipSubs:{},                                            subs:{ankle:"lateral_bounds"},                         prTrackable:true,  prMetric:"distance_m" },
      depth_jump:           { title:"Depth Jump",               cue:"3×5 — step off, minimal contact time, instant explode up", sets:3,reps:5,  load:"explosive",equipment:["box"],       tier:"advanced",     noEquipSub:"box_jump",      equipSubs:{},                                            subs:{knee:"box_jump"},                                prTrackable:false, prMetric:"reps"       },
      hurdle_hop:           { title:"Hurdle Hop (continuous)",  cue:"3×6 hurdles — stiff ankles, tall posture, no hesitation",  sets:3,reps:6,  load:"explosive",equipment:["hurdles"],   tier:"advanced",     noEquipSub:"lateral_bounds", equipSubs:{},                                            subs:{ankle:"lateral_bounds"},                         prTrackable:false, prMetric:"reps"       },
      reactive_drop_jump:   { title:"Reactive Drop Jump",       cue:"4×4 — drop, touch, max jump — train SSC stiffness",        sets:4,reps:4,  load:"explosive",equipment:["box"],       tier:"advanced",     noEquipSub:"depth_jump",    equipSubs:{},                                            subs:{knee:"box_jump"},                                prTrackable:false, prMetric:"reps"       },
    },

    conditioning: {
      easy_run:             { title:"Easy Aerobic Run",         cue:"20 min — conversational pace, nasal breathing",            sets:1,reps:1,  load:"low",      equipment:[],            tier:"beginner",     noEquipSub:null,            equipSubs:{bike:"easy_bike",rower:"easy_row"},           subs:{ankle:"easy_bike"},                              prTrackable:true,  prMetric:"time_sec"   },
      easy_bike:            { title:"Easy Bike",                cue:"20 min — RPE 5, steady cadence",                           sets:1,reps:1,  load:"low",      equipment:["bike"],      tier:"beginner",     noEquipSub:"easy_run",      equipSubs:{rower:"easy_row"},                            subs:{ankle:"easy_bike"},                              prTrackable:true,  prMetric:"time_sec"   },
      shuttle_run:          { title:"Shuttle Run (5-10-5)",     cue:"6 repeats — explode, plant & cut, no rounding cones",       sets:1,reps:6,  load:"moderate", equipment:[],            tier:"beginner",     noEquipSub:null,            equipSubs:{},                                            subs:{ankle:"easy_bike"},                              prTrackable:true,  prMetric:"time_sec"   },
      suicides:             { title:"Court Suicides / Gassers", cue:"5 repeats — all-out, touch each line, active rest",        sets:1,reps:5,  load:"high",     equipment:[],            tier:"intermediate", noEquipSub:"shuttle_run",   equipSubs:{},                                            subs:{ankle:"bike_sprint"},                            prTrackable:true,  prMetric:"time_sec"   },
      tempo_runs:           { title:"Tempo Runs",               cue:"6×200m @ 75% effort — 90 sec rest between reps",           sets:6,reps:1,  load:"moderate", equipment:[],            tier:"intermediate", noEquipSub:"shuttle_run",   equipSubs:{rower:"rower_intervals",bike:"bike_sprint"},  subs:{ankle:"rower_intervals"},                        prTrackable:true,  prMetric:"time_sec"   },
      hill_sprint:          { title:"Hill Sprints",             cue:"8×30m — drive phase, sprint up, walk down full rest",       sets:8,reps:1,  load:"high",     equipment:[],            tier:"intermediate", noEquipSub:"shuttle_run",   equipSubs:{bike:"bike_sprint"},                          subs:{ankle:"bike_sprint"},                            prTrackable:true,  prMetric:"time_sec"   },
      bike_sprint:          { title:"Bike Sprints",             cue:"8×15 sec all-out — 45 sec easy recovery",                  sets:8,reps:1,  load:"high",     equipment:["bike"],      tier:"intermediate", noEquipSub:"shuttle_run",   equipSubs:{rower:"rower_intervals"},                     subs:{ankle:"bike_sprint"},                            prTrackable:true,  prMetric:"time_sec"   },
      rower_intervals:      { title:"Rower Intervals",          cue:"5×500m — damper 4-5, aggressive catch, drive through heels",sets:5,reps:1,  load:"high",     equipment:["rower"],     tier:"intermediate", noEquipSub:"shuttle_run",   equipSubs:{bike:"bike_sprint"},                          subs:{ankle:"bike_sprint"},                            prTrackable:true,  prMetric:"time_sec"   },
      prowler_push:         { title:"Prowler / Sled Push",      cue:"6×20m — load heavy, hip drive, stay low, push hard",       sets:6,reps:1,  load:"high",     equipment:["sled"],      tier:"intermediate", noEquipSub:"hill_sprint",   equipSubs:{},                                            subs:{knee:"rower_intervals"},                         prTrackable:true,  prMetric:"time_sec"   },
      // ── Advanced conditioning ────────────────────────────────────────────
      flying_30s:           { title:"Flying 30s",               cue:"5 reps — 30m build-up, max effort 30m, walk back",         sets:5,reps:1,  load:"high",     equipment:[],            tier:"advanced",     noEquipSub:"hill_sprint",   equipSubs:{},                                            subs:{ankle:"bike_sprint"},                            prTrackable:true,  prMetric:"time_sec"   },
      hollow_sprints:       { title:"Hollow Sprints (build-float-build)",cue:"4×100m — B-F-B segmentation, relax at speed",      sets:4,reps:1,  load:"moderate", equipment:[],            tier:"advanced",     noEquipSub:"tempo_runs",    equipSubs:{},                                            subs:{ankle:"tempo_runs"},                             prTrackable:true,  prMetric:"time_sec"   },
    },

    noEquip: {
      bodyweight_squat:     { title:"Bodyweight Squat",          cue:"4×15", load:"low"     },
      single_leg_hinge:     { title:"Single-Leg Hip Hinge",      cue:"3×8/leg", load:"low"  },
      pike_pushup:          { title:"Pike Push-up",              cue:"3×10", load:"moderate"},
      pushup:               { title:"Push-up",                   cue:"4×12", load:"moderate"},
      inverted_row:         { title:"Inverted Row",              cue:"3×8",  load:"moderate"},
      shuttle_run:          { title:"Shuttle Run 10m",           cue:"6 reps",load:"high"   },
      timed_effort:         { title:"30-sec All-Out Effort",     cue:"6 reps",load:"moderate"},
      glute_bridge:         { title:"Glute Bridge",              cue:"3×15", load:"low"     },
      med_ball_throw:       { title:"Rotational Med Ball Throw", cue:"3×8/side",load:"moderate"},
      dead_bug:             { title:"Dead Bug",                  cue:"3×8/side",load:"low"  },
      side_plank:           { title:"Side Plank",                cue:"3×30 sec/side",load:"low"},
      reverse_lunge_bw:     { title:"Bodyweight Reverse Lunge",  cue:"3×10/leg",load:"low"  },
      band_row:             { title:"Band Row",                  cue:"3×15", load:"low"     },
      band_press:           { title:"Band Press",                cue:"3×15", load:"low"     },
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // EQUIPMENT PROFILES
  // Athlete selects their available equipment set. The generator then picks
  // exercises whose equipment[] is a subset of what's available, and swaps
  // using equipSubs when primary choice isn't available.
  // ══════════════════════════════════════════════════════════════════════════
  const EQUIPMENT_PROFILES = {
    none:       { label:"No Equipment (Bodyweight)", emoji:"🏠", available:[] },
    bands:      { label:"Bands + Bodyweight",        emoji:"🪢", available:["bands"] },
    dumbbell:   { label:"Dumbbells + Bodyweight",    emoji:"💪", available:["dumbbell","bench","box","med_ball","bands","bar"] },
    barbell:    { label:"Full Gym (Barbell)",         emoji:"🏋️", available:["barbell","dumbbell","cable","bench","box","med_ball","bands","bar","trap_bar","sled","rower","bike","hurdles"] },
    home_gym:   { label:"Home Gym",                   emoji:"🏡", available:["barbell","dumbbell","bench","box","bands","bar","bike"] },
    school_gym: { label:"School / Rec Center",        emoji:"🏫", available:["barbell","dumbbell","cable","bench","box","med_ball","bands","bar","rower","bike"] },
  };

  // Returns true if exercise can be done with available equipment
  function canDoExercise(exerciseDef, availableEquip) {
    if (!exerciseDef.equipment || exerciseDef.equipment.length === 0) return true;
    return exerciseDef.equipment.every(e => availableEquip.includes(e));
  }

  // Returns the best available version of an exercise given equipment set
  // Checks equipSubs in order of preference
  function bestEquipVersion(key, lib, availableEquip) {
    const primary = lib[key];
    if (!primary) return null;
    if (canDoExercise(primary, availableEquip)) return { key, def: primary };
    // Try equipSubs (values are keys into the same lib)
    const subs = primary.equipSubs || {};
    // Order: prefer whatever equipment we DO have
    for (const [equipNeeded, altKey] of Object.entries(subs)) {
      if (availableEquip.includes(equipNeeded) || equipNeeded === "none") {
        const alt = lib[altKey];
        if (alt && canDoExercise(alt, availableEquip)) return { key: altKey, def: alt };
      }
    }
    // Last resort: noEquipSub
    if (primary.noEquipSub && EXERCISE_LIB.noEquip[primary.noEquipSub]) {
      return { key: primary.noEquipSub, def: { ...EXERCISE_LIB.noEquip[primary.noEquipSub], prTrackable:false, prMetric:"reps", tier:"beginner", equipment:[] } };
    }
    return null;  // genuinely can't do it
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPORT-SPECIFIC MICROBLOCKS — v4.0 (Sport-accurate, tiered)
  //
  // Each sport: label, emoji, position groups, tier-specific exercise lists,
  //   skill drills per category, warmup, cooldown.
  //
  // strengthPriority[tier] — ordered list of exercise keys, tier-appropriate
  // plyoPriority[tier]     — plyo keys by tier
  // conditioning[tier]     — conditioning keys by tier
  // ══════════════════════════════════════════════════════════════════════════
  const SPORT_MICROBLOCKS = {

    // ────────────────────────────────────────────────────────────────────────
    basketball: {
      label:"Basketball", emoji:"🏀",
      // RATIONALE: Basketball requires single-leg explosiveness (box jumps, single-leg RDL),
      // lateral power (lateral bounds), and upper-body push/pull for contact and finishing.
      // Nordic curls critical for hamstring protection given sprint/deceleration demands.
      strengthPriority: {
        beginner:     ["goblet_squat","reverse_lunge","glute_bridge","pushup","db_row","dead_bug"],
        intermediate: ["split_squat","hip_thrust","rdl","nordic_curl","bench","row","pullup","pallof_press"],
        advanced:     ["trap_bar_deadlift","back_squat","single_leg_deadlift","nordic_curl","push_press","weighted_pullup","cable_chop"],
      },
      plyoPriority: {
        beginner:     ["squat_jump","lateral_bounds","approach_jumps"],
        intermediate: ["box_jump","lateral_bounds","single_leg_hop","broad_jump"],
        advanced:     ["depth_jump","reactive_drop_jump","single_leg_hop","hurdle_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","easy_run"],
        intermediate: ["suicides","tempo_runs","hill_sprint"],
        advanced:     ["suicides","flying_30s","hill_sprint"],
      },
      warmup: [
        { name:"Hip circles & ankle rolls",         cue:"60 sec each direction" },
        { name:"Glute bridge walkouts",              cue:"10 reps" },
        { name:"Lateral shuffle + carioca",          cue:"2×15m each" },
        { name:"Knee hugs + quad pulls walking",     cue:"10m each" },
      ],
      cooldown: [
        { name:"Supine hamstring stretch",           cue:"60 sec/leg" },
        { name:"Hip flexor lunge hold",              cue:"45 sec/side" },
        { name:"Seated adductor stretch",            cue:"60 sec" },
        { name:"Ankle circles + calf stretch",       cue:"30 sec each" },
      ],
      skillBlocks: {
        shooting: [
          { name:"Catch & Shoot (5 spots)",          reps:"5 spots × 10", cue:"Feet ready before catch — pocket, quick release, hold follow-through 1 sec. Track makes per spot.", level:"all" },
          { name:"Pull-Up Mid-Range",                reps:"4 sets × 8",   cue:"Create space off 1-2 dribbles, gather, set feet, rise straight up. No fading unless intentional.", level:"intermediate" },
          { name:"Corner 3 — Spot Shooting",         reps:"5 sets × 10",  cue:"Simulate off-ball cut to corner. Feet set before ball arrives — don't adjust stance post-catch.", level:"advanced" },
        ],
        ball_handling: [
          { name:"Two-Ball Stationary Series",       reps:"5 min",        cue:"Waist → shoulder → low in sequence. Eyes up off the ball the entire time. Soft hands.", level:"beginner" },
          { name:"Cone Speed Weave (one ball)",      reps:"8 reps",       cue:"Low hinge posture, change of pace between cones — don't just weave at one speed.", level:"all" },
          { name:"Attack Dribble to Floater/Finish", reps:"6 reps/side",  cue:"Attack 45° angle, 2-dribble max to the paint, high finish — euro step or floater.", level:"intermediate" },
        ],
        finishing: [
          { name:"Mikan Drill",                      reps:"2 min continuous",cue:"Alternate sides under the basket, soft off the glass, no double-dribble — rhythm first.", level:"beginner" },
          { name:"Euro Step Finish",                 reps:"4 sets × 6",   cue:"Wide gather step, plant opposite foot, protect ball with body, finish soft.", level:"intermediate" },
          { name:"Floater Series (both hands)",      reps:"4 sets × 6",   cue:"High release point, flat arc over rim, controlled off glass. Train weak hand equally.", level:"advanced" },
        ],
        defense: [
          { name:"Defensive Slide Drill",            reps:"5×30 sec",     cue:"Hips low, no crossing feet, mirror ball, stay on the level. No peeking at feet.", level:"all" },
          { name:"Close-Out & Contest",              reps:"8 reps",       cue:"Sprint to close out, chop steps at 2m, high hand up, bend knees — contest, don't foul.", level:"intermediate" },
          { name:"Zig-Zag Denial",                   reps:"4 reps/court", cue:"Hand in passing lane, push cutter baseline, deny reversal — stay between ball & basket.", level:"advanced" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    football: {
      label:"Football", emoji:"🏈",
      // RATIONALE: Football demands maximal force production (trap bar DL, back squat),
      // upper-body power for blocking/tackle (bench, push press), rotational power
      // for throwing/tackling (cable chop, landmine), and short-burst acceleration.
      strengthPriority: {
        beginner:     ["goblet_squat","reverse_lunge","pushup","db_row","glute_bridge","dead_bug"],
        intermediate: ["trap_bar_deadlift","bench","row","split_squat","db_shoulder_press","pallof_press","hip_thrust"],
        advanced:     ["back_squat","conventional_deadlift","push_press","weighted_pullup","landmine_rotation","nordic_curl","cable_chop"],
      },
      plyoPriority: {
        beginner:     ["squat_jump","broad_jump","lateral_bounds"],
        intermediate: ["box_jump","broad_jump","single_leg_hop"],
        advanced:     ["depth_jump","reactive_drop_jump","hurdle_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","easy_run"],
        intermediate: ["hill_sprint","prowler_push","tempo_runs"],
        advanced:     ["flying_30s","prowler_push","hollow_sprints"],
      },
      warmup: [
        { name:"Hip flexor lunge matrix",            cue:"5 reps each direction" },
        { name:"Band clamshells",                    cue:"15 reps/side" },
        { name:"Inchworm to push-up",                cue:"8 reps" },
        { name:"Explosive step-out + drive",         cue:"8 reps each leg" },
      ],
      cooldown: [
        { name:"Thoracic rotation stretch",          cue:"8 reps/side" },
        { name:"Pigeon pose",                        cue:"60 sec/side" },
        { name:"Lat doorframe stretch",              cue:"30 sec/arm" },
        { name:"Hamstring lying stretch",            cue:"60 sec/leg" },
      ],
      skillBlocks: {
        route_running: [
          { name:"Cone Route Tree",                  reps:"5 trees",      cue:"Explosive release off LOS, 3-step vs 5-step stem, sharp plant cuts — no rounding.", level:"all" },
          { name:"Stop & Start Acceleration",        reps:"8 reps",       cue:"Full speed → plant → dead stop → explosive reset. Train WR/DB first-step quickness.", level:"intermediate" },
          { name:"Hands / Concentration Catch",      reps:"4 sets × 10",  cue:"Eyes through ball into hands, tuck immediately, catch away from body — not body catch.", level:"all" },
        ],
        blocking: [
          { name:"Hand Combat Punch Drill",          reps:"5 sets × 8",   cue:"Inside hand placement first, lock elbows on extension, transfer power from hips — not arms.", level:"intermediate" },
          { name:"Sled Drive (if available)",        reps:"6×10m",        cue:"Stay low, hip drive, accelerate through sled — don't stand up after initial contact.", level:"intermediate" },
          { name:"Kick-Slide & Mirror",              reps:"8 reps",       cue:"Anchor inside foot, kick-slide laterally, keep shoulders parallel — mirror pass rusher.", level:"advanced" },
        ],
        qb_mechanics: [
          { name:"Drop & Set Drill",                 reps:"5 sets × 8",   cue:"3-step or 5-step, plant back foot, hips open early to target, weight transfers forward.", level:"intermediate" },
          { name:"Pocket Movement Drill",            reps:"8 reps",       cue:"Step up in pocket, slide laterally, reset feet before delivery. No happy feet.", level:"advanced" },
          { name:"Velocity Ladder (short-intermediate-deep)",reps:"3 rounds",cue:"Vary release point by route depth. Short = quick feet. Deep = plant and drive hips.", level:"advanced" },
        ],
        tackling_defense: [
          { name:"Angle Tackle Approach Drill",      reps:"8 reps",       cue:"Eyes on numbers — not ball — wrap low, drive legs through contact. No arm tackles.", level:"all" },
          { name:"Zone Drop & React",                reps:"6 reps",       cue:"Pedal to depth, trigger on QB's eyes, drive downhill on throw — no false steps.", level:"intermediate" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    soccer: {
      label:"Soccer", emoji:"⚽",
      // RATIONALE: Soccer prioritises single-leg strength (Bulgarian, single-leg RDL),
      // groin/adductor protection (Copenhagen planks — proven injury prevention),
      // and Nordic curls (hamstring injury prevention per FIFA 11+ research).
      // High aerobic base via tempo runs; explosive acceleration via hill sprints.
      strengthPriority: {
        beginner:     ["goblet_squat","glute_bridge","reverse_lunge","pushup","dead_bug","step_up"],
        intermediate: ["split_squat","single_leg_deadlift","nordic_curl","Copenhagen","row","db_shoulder_press"],
        advanced:     ["trap_bar_deadlift","back_squat","nordic_curl","Copenhagen","conventional_deadlift","cable_chop","pallof_press"],
      },
      plyoPriority: {
        beginner:     ["squat_jump","lateral_bounds","single_leg_hop"],
        intermediate: ["box_jump","single_leg_hop","lateral_bounds","hurdle_hop"],
        advanced:     ["depth_jump","hurdle_hop","reactive_drop_jump"],
      },
      conditioning: {
        beginner:     ["easy_run","shuttle_run"],
        intermediate: ["tempo_runs","hill_sprint","suicides"],
        advanced:     ["hollow_sprints","hill_sprint","flying_30s"],
      },
      warmup: [
        { name:"Dynamic hip openers (world's greatest)",cue:"8 reps/side" },
        { name:"Ankle mobility – inch forward circles",  cue:"10 reps/ankle" },
        { name:"Lateral shuffle + carioca",              cue:"2×20m each" },
        { name:"Heel-to-toe walk",                       cue:"15m" },
      ],
      cooldown: [
        { name:"Standing quad stretch",                  cue:"45 sec/leg" },
        { name:"Seated adductor (butterfly) stretch",    cue:"60 sec" },
        { name:"Hip 90/90 hold",                         cue:"60 sec/side" },
        { name:"Ankle dorsiflexion wall stretch",        cue:"30 sec/ankle" },
      ],
      skillBlocks: {
        dribbling: [
          { name:"1v1 Close Control (6-cone box)",       reps:"8 reps",       cue:"Soft inside/outside touches, change speed unpredictably — defender can't read next move.", level:"all" },
          { name:"Speed Dribble Gate Runs",              reps:"6×20m",        cue:"Push ball 2 strides ahead, accelerate, gather before gate — don't check speed.", level:"intermediate" },
          { name:"Cruyff + Scissor Combination",        reps:"6 reps/side",  cue:"Sell Cruyff with weight shift, scissor out of it — combine fakes, don't isolate.", level:"advanced" },
        ],
        passing: [
          { name:"Rondo 4v1 (or 2v1 solo with wall)",  reps:"10 min",        cue:"Weight & timing — pass must arrive before pressure. First touch sets next pass angle.", level:"all" },
          { name:"1-2 Combination (wall or partner)",   reps:"8 reps/side",  cue:"Open body on receive, firm pass back — time run in behind to receive second pass.", level:"intermediate" },
          { name:"Lofted Pass Accuracy Circuit",        reps:"5 sets × 6",   cue:"Strike through lower half of ball with laces, non-kicking foot alongside ball, follow through.", level:"advanced" },
        ],
        finishing: [
          { name:"Far-Post Strike off Tee/Cone",        reps:"5 sets × 8",   cue:"Plant foot alongside ball, lock ankle, knee over the ball — low driven finish.", level:"all" },
          { name:"1v1 vs Goalkeeper",                   reps:"8 reps",       cue:"Early shape decision, disguise direction, commit keeper — don't delay.", level:"intermediate" },
          { name:"Driven Volleys",                      reps:"5 sets × 6",   cue:"Watch ball onto foot, keep knee over it, snap locked ankle through contact zone.", level:"advanced" },
        ],
        defending: [
          { name:"Jockeying & Pressing Shape",          reps:"8 reps",       cue:"Side-on, guide to weak side — don't commit. Press only on poor touch or back-pass.", level:"all" },
          { name:"Press Trigger & Cover Shadow Drill",  reps:"8 reps",       cue:"Trigger on poor touch, angle run to cut off back pass — second defender in cover.", level:"advanced" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    baseball: {
      label:"Baseball / Softball", emoji:"⚾",
      // RATIONALE: Rotational power is king — cable chop, landmine, med ball work.
      // Posterior chain for throwing deceleration (rdl, row, lat pulldown).
      // Scapular stability critical for shoulder health (band work, face pull).
      // Short burst acceleration, no aerobic base needed (bike sprints > long runs).
      strengthPriority: {
        beginner:     ["goblet_squat","glute_bridge","db_row","pushup","dead_bug","reverse_lunge"],
        intermediate: ["trap_bar_deadlift","bench","row","cable_chop","lat_pulldown","hip_thrust","pallof_press"],
        advanced:     ["conventional_deadlift","push_press","weighted_pullup","landmine_rotation","cable_chop","back_squat","med_ball_slam"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","squat_jump","lateral_bounds"],
        intermediate: ["broad_jump","box_jump","single_leg_hop"],
        advanced:     ["reactive_drop_jump","broad_jump","depth_jump"],
      },
      conditioning: {
        beginner:     ["shuttle_run","easy_bike"],
        intermediate: ["bike_sprint","hill_sprint","shuttle_run"],
        advanced:     ["flying_30s","bike_sprint","hill_sprint"],
      },
      warmup: [
        { name:"Arm circles + band pull-apart",      cue:"15 reps each direction" },
        { name:"Hip hinge + thoracic rotation",      cue:"8 reps/side" },
        { name:"Wrist flexor & extensor stretch",    cue:"60 sec each" },
        { name:"90/90 shoulder external rotation",   cue:"10 reps/side" },
      ],
      cooldown: [
        { name:"Cross-body shoulder stretch",        cue:"60 sec/arm" },
        { name:"Sleeper stretch (posterior capsule)", cue:"45 sec/side" },
        { name:"Wrist extensor hang",                cue:"30 sec" },
        { name:"Thoracic foam roll",                 cue:"60 sec" },
      ],
      skillBlocks: {
        throwing: [
          { name:"Long Toss Progression",            reps:"10–15 min",    cue:"Start at 30m, extend to max controlled distance. Accelerate through release — low elbow is high risk.", level:"all" },
          { name:"Band Throw Pattern (J-Band)",       reps:"3 sets × 15", cue:"External rotation emphasis, wrist snap, deceleration — rotator cuff activation before throwing.", level:"all" },
          { name:"Towel Drill (mechanics)",           reps:"3 sets × 8",  cue:"Arm path check — high cock, over the top, pull-down finish. Towel hits target at release.", level:"beginner" },
        ],
        hitting: [
          { name:"Tee Work — Oppo Gap Focus",        reps:"5 sets × 10", cue:"Stay back — load heel, hands inside ball, drive hips toward LF/RF (opposite field). No pulling off.", level:"all" },
          { name:"Front Toss",                       reps:"5 sets × 10", cue:"Short stride (2 inches), early load, see ball deep, contact through the zone — no roll-over.", level:"intermediate" },
          { name:"High-Low Tee Drill",               reps:"4 sets × 8",  cue:"Alternate high vs low tee location. Adjust barrel path — steep for high, level for low.", level:"advanced" },
        ],
        fielding: [
          { name:"Ground Ball Series (forehand/backhand/slow roller)", reps:"20 reps each", cue:"Fielding triangle — field through ball, glove outside lead foot, secure then transfer.", level:"all" },
          { name:"Footwork Around the Bag (1B/2B/SS)", reps:"10 reps/position", cue:"Read throw early, establish bag contact, adjust stride to pull errant throws.", level:"intermediate" },
          { name:"Outfield Route Running",           reps:"8 reps",      cue:"First step back or crossover based on contact. Run to intercept point — don't chase ball.", level:"intermediate" },
        ],
        baserunning: [
          { name:"Primary Lead & Secondary Timing",  reps:"10 reps",     cue:"2.5-step lead, weight on balls of feet. Secondary on pitcher's motion — read pick-off.", level:"intermediate" },
          { name:"First-to-Third Read Drill",        reps:"6 reps",      cue:"Round first aggressively, read RF's angle on ball — take 3rd if he's charging or throws away.", level:"advanced" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    volleyball: {
      label:"Volleyball", emoji:"🏐",
      // RATIONALE: Vertical jump is primary KPI — approach jumps, depth jumps.
      // Shoulder health critical — scapular stability, rotator cuff work.
      // Single-leg landing mechanics (injury prevention), lateral power.
      strengthPriority: {
        beginner:     ["goblet_squat","glute_bridge","pushup","db_shoulder_press","dead_bug","reverse_lunge"],
        intermediate: ["split_squat","hip_thrust","rdl","bench","pullup","db_shoulder_press","Copenhagen"],
        advanced:     ["back_squat","trap_bar_deadlift","push_press","weighted_pullup","nordic_curl","cable_chop"],
      },
      plyoPriority: {
        beginner:     ["approach_jumps","squat_jump","lateral_bounds"],
        intermediate: ["approach_jumps","box_jump","depth_jump","single_leg_hop"],
        advanced:     ["depth_jump","reactive_drop_jump","approach_jumps","hurdle_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","easy_run"],
        intermediate: ["suicides","bike_sprint","tempo_runs"],
        advanced:     ["suicides","hill_sprint","flying_30s"],
      },
      warmup: [
        { name:"Shoulder CARs (controlled articular rotation)", cue:"5 reps/side — slow & controlled" },
        { name:"Hip flexor lunge + rotation",        cue:"8 reps/side" },
        { name:"Ankle pops + single-leg calf raises",cue:"2×15" },
        { name:"Reactive approach step series",      cue:"6 reps — 4-step rhythm" },
      ],
      cooldown: [
        { name:"Overhead lat + tricep stretch",      cue:"45 sec/side" },
        { name:"Prone press-up (cobra)",             cue:"3×30 sec" },
        { name:"Ankle dorsiflexion wall stretch",    cue:"45 sec/ankle" },
        { name:"Cross-body shoulder stretch",        cue:"45 sec/arm" },
      ],
      skillBlocks: {
        hitting: [
          { name:"Approach & Arm Swing (no ball)",   reps:"5 sets × 6",  cue:"4-step approach: R-L-R (right-handed), high elbow at set, lead with heel of hand at contact.", level:"all" },
          { name:"Line vs Cross Attack Decision",    reps:"4 sets × 8",  cue:"Setter cues direction — line or cross. Adjust arm swing angle, snap wrist — not arm.", level:"intermediate" },
          { name:"Tool & Wipe the Block",            reps:"4 sets × 8",  cue:"See block hands, roll ball off the outside hand to sideline, or cut to angle at angle.", level:"advanced" },
        ],
        blocking: [
          { name:"Two-Step Close & Block",           reps:"8 reps",      cue:"Read hitter's shoulder angle before jumping. Penetrate net with hands flat, not angled.", level:"intermediate" },
          { name:"Triple Block Slide (3-person)",    reps:"6 reps",      cue:"Outside blocker leads, MB slides into position — read setter, seal seam between blockers.", level:"advanced" },
        ],
        setting: [
          { name:"Setting from Knees",               reps:"3 sets × 15", cue:"Consistent hand shape — window frame. Wrists back, symmetrical extension. Don't flick.", level:"beginner" },
          { name:"Back-Set Accuracy (to target)",    reps:"3 sets × 10", cue:"Square to net, extend overhead, drive hips — don't lean back early or the ball sails.", level:"intermediate" },
          { name:"Jump Set Mechanics",               reps:"3 sets × 8",  cue:"Platform to hands, jump-set at apex, keep body square. Disguises attack for hitter.", level:"advanced" },
        ],
        passing: [
          { name:"Platform Pass to Target (solo/partner)", reps:"10 min", cue:"Angle platform to target — absorb ball with legs not arms. Read seam serve early.", level:"all" },
          { name:"Seam Serve Receive",               reps:"5 sets × 6",  cue:"Call ball early, move feet before platform. Don't reach — platform travels to ball.", level:"intermediate" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    track: {
      label:"Track & Field", emoji:"🏃",
      // RATIONALE: Posterior chain dominates — hip thrust, nordic, single-leg RDL.
      // Sprint mechanics drills (A/B skips, wickets) are as important as lifting.
      // Plyos develop reactive strength (hurdle hops, depth jumps).
      // No upper-body pressing priority — more pull/hinge work.
      strengthPriority: {
        beginner:     ["goblet_squat","glute_bridge","step_up","dead_bug","pushup","reverse_lunge"],
        intermediate: ["hip_thrust","rdl","single_leg_deadlift","nordic_curl","step_up","pullup","split_squat"],
        advanced:     ["trap_bar_deadlift","back_squat","nordic_curl","hip_thrust","conventional_deadlift","weighted_pullup"],
      },
      plyoPriority: {
        beginner:     ["squat_jump","broad_jump","lateral_bounds"],
        intermediate: ["box_jump","hurdle_hop","single_leg_hop","broad_jump"],
        advanced:     ["depth_jump","hurdle_hop","reactive_drop_jump","single_leg_hop"],
      },
      conditioning: {
        beginner:     ["easy_run","shuttle_run"],
        intermediate: ["tempo_runs","hill_sprint","flying_30s"],
        advanced:     ["flying_30s","hollow_sprints","hill_sprint"],
      },
      warmup: [
        { name:"A-Skips",                            cue:"3×30m — high knee, dorsiflexed ankle" },
        { name:"B-Skips",                            cue:"3×30m — extend & paw back" },
        { name:"Leg swings (front & lateral)",       cue:"10 reps each plane/leg" },
        { name:"Wicket walk (ankle stiffness)",      cue:"20m — fast ground contact" },
      ],
      cooldown: [
        { name:"Standing calf stretch on step",      cue:"60 sec/leg — both straight & bent knee" },
        { name:"Hip flexor lunge hold",              cue:"45 sec/side" },
        { name:"Supine hamstring stretch",           cue:"60 sec/leg" },
        { name:"Thoracic rotation",                  cue:"8 reps/side — seated" },
      ],
      skillBlocks: {
        sprint_mechanics: [
          { name:"Wall Drive (acceleration mechanics)", reps:"3 sets × 8 pushes", cue:"45° lean, single-leg alternate drive — full triple extension each rep. No knee collapse.", level:"all" },
          { name:"30m Drive Phase",                  reps:"6 reps",       cue:"Forward lean through first 10m, maintain through 30m. Push don't pull — ground contact behind hips.", level:"all" },
          { name:"Wicket Runs (stride frequency)",   reps:"4×20m",        cue:"Consistent stride length over each wicket. Tall posture, relax jaw/hands from 15m.", level:"intermediate" },
        ],
        max_velocity: [
          { name:"Flying 30s",                       reps:"4 reps",       cue:"Build 30m, max 30m, easy 30m. Tall posture at max velocity, piston arms, elastic foot contact.", level:"intermediate" },
          { name:"Hollow Sprint (B-F-B)",            reps:"3×100m",       cue:"Build-Float-Build: 30 build, 40 float (relax not slow), 30 build again. Train deceleration control.", level:"advanced" },
          { name:"Frequency Ladder",                 reps:"3×10m",        cue:"Quick fire feet through ladder — cadence focus, not power. Separate from power training.", level:"beginner" },
        ],
        hurdles: [
          { name:"Lead-Leg Drill (over low hurdle)", reps:"3 sets × 8",   cue:"Attack with trail knee driving through, don't sit in hurdle — quick snapdown of lead foot.", level:"intermediate" },
          { name:"3-Step Hurdle Rhythm",             reps:"5×4 hurdles",  cue:"Attack first hurdle, 3 steps between each, maintain acceleration out of each hurdle.", level:"advanced" },
        ],
        field_events: [
          { name:"Long Jump Approach Run",           reps:"6 reps",       cue:"Consistent run-up, penultimate step slightly longer, gather on board, tall take-off.", level:"intermediate" },
          { name:"Shot Put Hip Drive (no implement or medicine ball)", reps:"5 sets × 6", cue:"Power from hips & legs, not arm — reverse pivot, hip leads shoulder, wrist snap last.", level:"intermediate" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    swimming: {
      label:"Swimming", emoji:"🏊",
      // RATIONALE: Lat strength is primary — lat pulldown, pull-up, cable row.
      // Core anti-rotation for rotation management in water.
      // Hip thrust + RDL for underwater dolphin kick power.
      // Dryland plyos (broad jump) improve start/turn explosiveness.
      strengthPriority: {
        beginner:     ["lat_pulldown","db_row","glute_bridge","pushup","dead_bug","inverted_row"],
        intermediate: ["pullup","row","hip_thrust","rdl","cable_chop","pallof_press","bench"],
        advanced:     ["weighted_pullup","conventional_deadlift","cable_chop","landmine_rotation","push_press","nordic_curl"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","squat_jump","lateral_bounds"],
        intermediate: ["broad_jump","box_jump","single_leg_hop"],
        advanced:     ["depth_jump","broad_jump","reactive_drop_jump"],
      },
      conditioning: {
        beginner:     ["easy_bike","easy_run"],
        intermediate: ["rower_intervals","bike_sprint","tempo_runs"],
        advanced:     ["rower_intervals","flying_30s","bike_sprint"],
      },
      warmup: [
        { name:"Rotator cuff band circuit (ER/IR/Prone Y-T-W)", cue:"3×10 each — light band, slow tempo" },
        { name:"Lat stretch on pull-up bar",         cue:"3×20 sec — active hang, depress shoulder" },
        { name:"Hip flexor lunge + thoracic reach",  cue:"8 reps/side" },
        { name:"Ankle dorsiflexion & plantar flex",  cue:"10 reps each — pointed vs flexed" },
      ],
      cooldown: [
        { name:"Doorframe pec stretch",              cue:"45 sec/side" },
        { name:"Lat stretch (overhead against wall)", cue:"45 sec/side" },
        { name:"Hip flexor lunge",                   cue:"45 sec/side" },
        { name:"Wrist extensor & flexor stretch",    cue:"30 sec each" },
      ],
      skillBlocks: {
        freestyle: [
          { name:"Catch-Up Drill",                   reps:"4×50m",        cue:"Full extension of lead arm before next stroke — feel maximum stretch, long body line.", level:"beginner" },
          { name:"Fingertip Drag",                   reps:"4×50m",        cue:"High elbow recovery — drag fingertips on surface to set up ideal entry angle.", level:"intermediate" },
          { name:"Fist Drill → Normal Stroke",       reps:"4×50m",        cue:"Swim with closed fist to feel forearm press, then open — you should feel more grip immediately.", level:"advanced" },
        ],
        starts_turns: [
          { name:"Dive Block Start (or pool edge)",  reps:"10 reps",      cue:"Compact tuck on take-off, heels drive back, pike at entry — no belly-flop, piercing streamline.", level:"intermediate" },
          { name:"Flip Turn Series",                 reps:"15 reps",      cue:"Approach at race pace, somersault 1.5m out, tight tuck, feet on wall above hips — push & rotate.", level:"intermediate" },
          { name:"Underwater Dolphin Kick",          reps:"6×15m",        cue:"Kick from hips, not knees — tight streamline, small amplitude, fast tempo.", level:"advanced" },
        ],
        backstroke: [
          { name:"Single-Arm Back",                  reps:"4×50m",        cue:"Focus arm entry — pinky in first, shoulder rotates fully, pull through to thigh.", level:"intermediate" },
        ],
        dryland: [
          { name:"Band Pull-Apart",                  reps:"3×20",         cue:"Retract scapula, arms to T, control eccentric — builds posterior shoulder stability.", level:"all" },
          { name:"Prone Y-T-W",                      reps:"3×10 each",    cue:"On bench or floor, light or no weight — depress and retract shoulder before each rep.", level:"all" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    wrestling: {
      label:"Wrestling", emoji:"🤼",
      // RATIONALE: Maximal strength in pulling and hinge (deadlift, row, pull-up).
      // Neck training critical (neck bridge rolls — with care). Grip strength implicit.
      // Anaerobic conditioning is king — rower, prowler. Short intense bouts.
      strengthPriority: {
        beginner:     ["goblet_squat","glute_bridge","pushup","inverted_row","dead_bug","reverse_lunge"],
        intermediate: ["trap_bar_deadlift","bench","row","pullup","hip_thrust","nordic_curl","pallof_press"],
        advanced:     ["conventional_deadlift","back_squat","weighted_pullup","push_press","landmine_rotation","nordic_curl","cable_chop"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","squat_jump","lateral_bounds"],
        intermediate: ["box_jump","broad_jump","depth_jump"],
        advanced:     ["reactive_drop_jump","depth_jump","single_leg_hop"],
      },
      conditioning: {
        beginner:     ["easy_run","shuttle_run"],
        intermediate: ["rower_intervals","prowler_push","suicides"],
        advanced:     ["rower_intervals","prowler_push","flying_30s"],
      },
      warmup: [
        { name:"Neck bridge rolls (controlled)",     cue:"10 reps each direction — build slowly, no pain" },
        { name:"Hip escape (shrimping) drill",        cue:"2×15m each side" },
        { name:"Sprawl series",                       cue:"8 reps — explosive" },
        { name:"Bear crawl forward & reverse",        cue:"2×10m" },
      ],
      cooldown: [
        { name:"Neck stretches (all planes)",         cue:"30 sec each — gentle, no forcing" },
        { name:"Hip flexor lunge",                    cue:"60 sec/side" },
        { name:"Shoulder internal rotation stretch",  cue:"30 sec/side" },
        { name:"Prone press-up",                      cue:"3×20 sec" },
      ],
      skillBlocks: {
        takedowns: [
          { name:"Double-Leg Attack (shadow)",        reps:"5 sets × 6",   cue:"Level change with back straight, penetration step inside leg, drive head to armpit, finish by lifting or cutting.", level:"all" },
          { name:"Single-Leg Finish (high crotch)",   reps:"5 sets × 6",   cue:"Control ankle, elevate knee, swing/trip — don't stall in the position, finish aggressively.", level:"intermediate" },
          { name:"Setups — Collar Tie to Shot",       reps:"6 reps/side",  cue:"Establish collar tie, snap head down to create reaction, exit to shot immediately — don't telegraph.", level:"advanced" },
        ],
        top_control: [
          { name:"Breakdown & Tight Waist Ride",      reps:"6 reps",       cue:"Inside calf control, chest on back, tight waist — don't allow hips to flatten or you lose control.", level:"intermediate" },
          { name:"Leg Lace from Breakdown",           reps:"5 reps/side",  cue:"Breakdown to flat, insert leg lace, circle toward feet — maintain chest pressure throughout.", level:"advanced" },
        ],
        defense: [
          { name:"Hip-Heist (granby roll)",           reps:"8 reps",       cue:"Block arm, hip-heist under or granby through — tight tuck, explosive rotation, come to standing.", level:"intermediate" },
          { name:"Sprawl to Re-shoot",                reps:"8 reps",       cue:"Sprawl legs back hard, chest on back, re-circle head, come up and immediately counter-shot.", level:"advanced" },
        ],
        live_drilling: [
          { name:"Tie-Up Scrambles",                  reps:"5×30 sec",     cue:"100% intensity, work through contact — no reset allowed. React to live resistance.", level:"intermediate" },
          { name:"Go-Behinds (rear standing)",        reps:"6 reps",       cue:"Circle behind opponent, block near hip, step behind — control both legs for 2-point takedown.", level:"advanced" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    lacrosse: {
      label:"Lacrosse", emoji:"🥍",
      // RATIONALE: Multi-directional power (lacrosse requires cutting, dodging).
      // Rotational strength for stick work (cable chop, landmine).
      // Similar to basketball conditioning demands — court suicides, hill sprints.
      strengthPriority: {
        beginner:     ["goblet_squat","glute_bridge","pushup","db_row","dead_bug","reverse_lunge"],
        intermediate: ["split_squat","rdl","cable_chop","row","hip_thrust","pallof_press","step_up"],
        advanced:     ["trap_bar_deadlift","back_squat","landmine_rotation","push_press","weighted_pullup","nordic_curl","cable_chop"],
      },
      plyoPriority: {
        beginner:     ["squat_jump","lateral_bounds","broad_jump"],
        intermediate: ["box_jump","lateral_bounds","single_leg_hop"],
        advanced:     ["depth_jump","reactive_drop_jump","hurdle_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","easy_run"],
        intermediate: ["suicides","hill_sprint","prowler_push"],
        advanced:     ["suicides","flying_30s","hill_sprint"],
      },
      warmup: [
        { name:"Dynamic hip opener",                 cue:"8 reps/side" },
        { name:"Wrist & forearm mobility circuit",   cue:"60 sec each direction" },
        { name:"T-drill warm-up (jog pace)",         cue:"4 reps" },
        { name:"Lateral shuffle + change of direction", cue:"2×20m" },
      ],
      cooldown: [
        { name:"Wrist extensor stretch",             cue:"45 sec/side" },
        { name:"Hip 90/90",                          cue:"60 sec/side" },
        { name:"Seated hamstring stretch",           cue:"60 sec/leg" },
        { name:"Thoracic rotation stretch",          cue:"8 reps/side" },
      ],
      skillBlocks: {
        stick_work: [
          { name:"Wall Ball — Quick Stick Series",   reps:"100 reps",     cue:"Catch on dominant then release in one motion — top hand pulls back through, don't push.", level:"all" },
          { name:"Split-Dodge (both directions)",    reps:"8 reps/side",  cue:"Plant outside foot explosively, switch hands mid-dodge — ball never crosses centerline of body.", level:"intermediate" },
          { name:"Roll Dodge → Behind-the-Back Pass",reps:"6 reps",       cue:"Full speed roll dodge to create angle, load BTB immediately after — don't slow to pass.", level:"advanced" },
        ],
        shooting: [
          { name:"Stand-Still Crank (low-high)",     reps:"5 sets × 8",   cue:"Wind up, hip drives first — wrist snap is finishing touch. Aim low near post for top corner.", level:"all" },
          { name:"On-the-Run Bounce Shot",           reps:"8 reps",       cue:"Full approach speed, set hips before release, aim bounce 1–2m in front of crease.", level:"intermediate" },
          { name:"Quick Stick Off Feed",             reps:"6 reps/side",  cue:"Receive feed on near pipe, one-touch release same direction — no extra cradle.", level:"advanced" },
        ],
        ground_balls: [
          { name:"Scoop & Clear",                    reps:"10 reps",      cue:"Attack ball low, scoop through it, protect with body — don't reach in. Clear immediately.", level:"all" },
          { name:"Box Out & Scoop (1v1)",            reps:"8 reps",       cue:"Body between opponent and ball, establish position before scooping — win body position first.", level:"intermediate" },
        ],
        defense: [
          { name:"Poke Check Timing Drill",          reps:"8 reps",       cue:"Drop step to create angle, quick top-hand poke — patience first, don't over-commit.", level:"intermediate" },
          { name:"Body Check Positioning",           reps:"6 reps",       cue:"Inside position, keep crosse in check position, legal body contact through target — stay low.", level:"advanced" },
        ],
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    tennis: {
      label:"Tennis", emoji:"🎾",
      // RATIONALE: Rotational power and deceleration (cable chop, Copenhagen).
      // Shoulder health critical — posterior shoulder, rotator cuff.
      // Lateral power and deceleration (single-leg landing, lateral bounds).
      // Aerobic base matters — bike sprint intervals suit tennis point structure.
      strengthPriority: {
        beginner:     ["goblet_squat","glute_bridge","pushup","db_row","dead_bug","reverse_lunge"],
        intermediate: ["split_squat","cable_chop","db_shoulder_press","Copenhagen","single_leg_deadlift","pallof_press","row"],
        advanced:     ["trap_bar_deadlift","cable_chop","landmine_rotation","push_press","weighted_pullup","nordic_curl","Copenhagen"],
      },
      plyoPriority: {
        beginner:     ["lateral_bounds","squat_jump","single_leg_hop"],
        intermediate: ["lateral_bounds","box_jump","single_leg_hop","broad_jump"],
        advanced:     ["depth_jump","lateral_bounds","reactive_drop_jump","hurdle_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","easy_bike"],
        intermediate: ["suicides","bike_sprint","tempo_runs"],
        advanced:     ["suicides","flying_30s","bike_sprint"],
      },
      warmup: [
        { name:"Shoulder IR/ER with band",           cue:"15 reps each direction — light band" },
        { name:"Split-step drill (no racket)",       cue:"30 sec — simulate opponent contact point" },
        { name:"Hip 90/90 stretch",                  cue:"60 sec/side" },
        { name:"Lateral shuffle + crossover step",   cue:"2×20m" },
      ],
      cooldown: [
        { name:"Cross-body shoulder stretch",        cue:"60 sec/arm" },
        { name:"Wrist extensor stretch",             cue:"30 sec/wrist" },
        { name:"Hip flexor lunge hold",              cue:"45 sec/side" },
        { name:"Standing calf stretch",              cue:"45 sec/leg" },
      ],
      skillBlocks: {
        groundstrokes: [
          { name:"Forehand Topspin Feed (50 balls)", reps:"50 balls",     cue:"Lag wrist, low-to-high brush inside-out — finish racket above opposite shoulder. Don't arm it.", level:"all" },
          { name:"Backhand Cross-Court Feed",        reps:"50 balls",     cue:"2H: shoulder turn, coil hips, unwind hips-then-shoulders — step into contact, weight forward.", level:"all" },
          { name:"Inside-Out Forehand (pattern)",    reps:"5 sets × 10",  cue:"Run around backhand, hit inside-out to opponent's backhand — recover behind centre mark.", level:"intermediate" },
        ],
        serve: [
          { name:"Flat Serve Toss Drill",            reps:"20 reps",      cue:"Toss 1 o'clock position, trophy pose, pronate racket face at contact — snap, don't push.", level:"all" },
          { name:"Kick Serve Mechanics",             reps:"15 reps",      cue:"Toss behind head (11 o'clock), arch back, brush 7→1 on ball — topspin + sidespin.", level:"intermediate" },
          { name:"Serve + 1 Pattern Drill",          reps:"5 sets × 6",   cue:"Serve wide deuce + attack short ball to ad court. Commit to pattern — train decision speed.", level:"advanced" },
        ],
        net_play: [
          { name:"Volley Groundwork (1–2 punch)",    reps:"30 reps",      cue:"Continental grip, punch — don't swing. Firm wrist, move feet to ball, don't reach.", level:"intermediate" },
          { name:"Approach Shot + Net Attack",       reps:"8 reps",       cue:"Hit approach deep down the line, split-step as opponent winds up, volley to open court.", level:"advanced" },
        ],
        footwork: [
          { name:"Split-Step Timing (coach feeds)",  reps:"10 min",       cue:"Split exactly as opponent contacts ball. Landing loads legs for explosive first step.", level:"all" },
          { name:"Recovery Sprint to Centre Mark",   reps:"12 reps",      cue:"Hit wide ball, crossover step back to centre, split-step before opponent's next shot.", level:"intermediate" },
        ],
      }
    },

  };  // end SPORT_MICROBLOCKS

  // Session type templates
  const SESSION_TEMPLATES = {
    practice:         { mix:["skill","strength","plyo","conditioning"], mins:75 },
    competition_prep: { mix:["skill","speed","light_strength"],         mins:60 },
    recovery:         { mix:["mobility","light_skill"],                 mins:35 },
    strength:         { mix:["warmup","strength","accessory"],          mins:60 },
    speed:            { mix:["warmup","speed","plyo"],                  mins:50 },
  };

  // ---------- Injury handling helpers ----------
  function hasInjury(tag) {
    if (!state.profile || !Array.isArray(state.profile.injuries)) return false;
    return state.profile.injuries.includes(tag);
  }

  function applyInjuryAdjustments(exerciseKey, injuries, lib) {
    const def = (lib || EXERCISE_LIB.strength)[exerciseKey];
    if (!def) return null;
    const res = Object.assign({}, def);
    if (!injuries || !injuries.length) return res;
    injuries.forEach(inj => {
      if (def.subs && def.subs[inj]) {
        res.substitution = def.subs[inj];
        res.cue = res.cue + " — modified for " + inj + " (see sub)";
      } else if (inj === "knee" && !res.substitution) {
        res.substitution = "glute_bridge";
      } else if (inj === "shoulder" && !res.substitution) {
        res.substitution = "band_press";
      }
    });
    return res;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKOUT GENERATOR — v4.0
  // Reads athlete level + equipment profile to produce accurate, tiered,
  // equipment-aware sessions. No exercise is included if athlete can't do it.
  // ══════════════════════════════════════════════════════════════════════════
  function generateWorkoutFor(sport = "basketball", sessionType = "practice", injuries = [], opts = {}) {
    // ── Read athlete profile ───────────────────────────────────────────────
    const level     = opts.level     || state.profile?.level         || "beginner";    // "beginner"|"intermediate"|"advanced"
    const equipKey  = opts.equipKey  || state.profile?.equipmentProfile || "barbell";  // key into EQUIPMENT_PROFILES
    const equipProfile = EQUIPMENT_PROFILES[equipKey] || EQUIPMENT_PROFILES.barbell;
    const available = equipProfile.available;

    const template  = SESSION_TEMPLATES[sessionType] || SESSION_TEMPLATES.practice;
    const sportData = SPORT_MICROBLOCKS[sport]        || SPORT_MICROBLOCKS.basketball;
    const blocks    = [];
    const uid       = () => Math.random().toString(36).slice(2, 8);

    // ── Load multipliers by level ──────────────────────────────────────────
    const loadMod = { beginner:{ sets:-1, intensity:"60–70% RPE 6–7" }, intermediate:{ sets:0, intensity:"70–80% RPE 7–8" }, advanced:{ sets:1, intensity:"80–90% RPE 8–9" } }[level] || {};

    // ── Warm-up ────────────────────────────────────────────────────────────
    const wuItems = sportData.warmup || [
      { name:"Hip flexor lunge", cue:"8 reps/side" },
      { name:"Leg swings", cue:"10 reps each plane/leg" },
      { name:"Glute bridge", cue:"10 reps" },
    ];
    blocks.push({ id:`wu_${uid()}`, type:"warmup", title:`${sportData.emoji} Sport Warm-up`, duration_min:10, items:wuItems });

    // ── Skill microblocks ──────────────────────────────────────────────────
    const skillBlocks = sportData.skillBlocks || {};
    const skillKeys   = Object.keys(skillBlocks);
    if (skillKeys.length && (sessionType === "practice" || sessionType === "competition_prep" || sessionType === "speed")) {
      const dayIdx  = new Date().getDay();
      const k1 = skillKeys[dayIdx % skillKeys.length];
      const k2 = skillKeys[(dayIdx + 1) % skillKeys.length] || k1;
      const chosen  = [...new Set([k1, k2])];
      const skillBlock = { id:`skill_${uid()}`, type:"skill", title:`${sportData.emoji} ${sportData.label} Skill Work`, duration_min: level === "advanced" ? 22 : 18, items:[] };
      chosen.forEach(k => {
        const drills = (skillBlocks[k] || []).filter(d => d.level === "all" || d.level === level ||
          (level === "advanced" && d.level === "intermediate") ||
          (level === "intermediate" && d.level === "beginner"));
        drills.slice(0, 2).forEach(it => skillBlock.items.push({ ...it, skillCategory: k }));
      });
      if (skillBlock.items.length) blocks.push(skillBlock);
    }

    // ── Strength block ─────────────────────────────────────────────────────
    if (template.mix.includes("strength") || template.mix.includes("light_strength") || sessionType === "strength") {
      const priorityList = (sportData.strengthPriority || {})[level] || sportData.strengthPriority?.intermediate || [];
      const pick = sessionType === "strength" ? (level === "advanced" ? 5 : 4) : (level === "advanced" ? 4 : 3);
      const strengthBlock = { id:`str_${uid()}`, type:"strength", title:"Strength Block", duration_min: sessionType==="strength" ? 30 : 22, items:[] };

      priorityList.forEach(key => {
        if (strengthBlock.items.length >= pick) return;
        const best = bestEquipVersion(key, EXERCISE_LIB.strength, available);
        if (!best) return;
        const ex  = applyInjuryAdjustments(best.key, injuries, EXERCISE_LIB.strength) || best.def;
        const sets = Math.max(2, (ex.sets || 3) + (loadMod.sets || 0));
        const reps = sessionType === "strength" && level === "advanced"
          ? Math.max(1, ex.reps - 2)   // heavier on dedicated strength day for advanced
          : ex.reps;
        strengthBlock.items.push({
          key:          best.key,
          name:         ex.title,
          cue:          ex.cue,
          sets,
          reps,
          intensity:    loadMod.intensity || "",
          equipment:    ex.equipment || [],
          equipProfile: equipKey,
          noEquipSub:   ex.noEquipSub || null,
          prTrackable:  ex.prTrackable || false,
          prMetric:     ex.prMetric    || "weight_lbs",
          substitution: ex.substitution || null,
          tier:         ex.tier || level,
        });
      });
      if (strengthBlock.items.length) blocks.push(strengthBlock);
    }

    // ── Plyo / power block ─────────────────────────────────────────────────
    if (template.mix.includes("plyo") || template.mix.includes("speed") || sessionType === "speed") {
      // Beginners don't do advanced plyos; filter by tier
      const plyoTierOk = (def) => {
        if (!def) return false;
        if (level === "beginner"     && def.tier === "advanced")     return false;
        if (level === "beginner"     && def.tier === "intermediate")  return false;
        return canDoExercise(def, available);
      };
      const plyoPriority = (sportData.plyoPriority || {})[level] || Object.keys(EXERCISE_LIB.plyo).slice(0,3);
      const plyoBlock = { id:`plyo_${uid()}`, type:"plyo", title:"Power & Plyometrics", duration_min:12, items:[] };
      plyoPriority.forEach(k => {
        if (plyoBlock.items.length >= 3) return;
        const def = EXERCISE_LIB.plyo[k];
        if (!def) return;
        if (!plyoTierOk(def)) {
          // Try noEquipSub or squat_jump as fallback
          const fallback = EXERCISE_LIB.plyo["squat_jump"] || EXERCISE_LIB.plyo["lateral_bounds"];
          if (fallback && !plyoBlock.items.find(i => i.key === "squat_jump")) {
            plyoBlock.items.push({ key:"squat_jump", name:fallback.title, cue:fallback.cue, sets:fallback.sets||3, reps:fallback.reps||8, prTrackable:false, prMetric:"reps" });
          }
          return;
        }
        plyoBlock.items.push({ key:k, name:def.title, cue:def.cue, sets:def.sets||3, reps:def.reps||5, prTrackable:def.prTrackable||false, prMetric:def.prMetric||"reps" });
      });
      if (plyoBlock.items.length) blocks.push(plyoBlock);
    }

    // ── Conditioning ───────────────────────────────────────────────────────
    if (template.mix.includes("conditioning") || sessionType === "practice") {
      const condPriority = (sportData.conditioning || {})[level] || ["shuttle_run","easy_run"];
      const condBlock = { id:`cond_${uid()}`, type:"conditioning", title:"Sport Conditioning", duration_min:12, items:[] };
      condPriority.forEach(k => {
        if (condBlock.items.length >= 2) return;
        const best = bestEquipVersion(k, EXERCISE_LIB.conditioning, available);
        if (!best) return;
        const def = best.def;
        condBlock.items.push({
          key:        best.key,
          name:       def.title,
          cue:        def.cue,
          sets:       def.sets || 1,
          reps:       def.reps || 5,
          equipment:  def.equipment || [],
          noEquipSub: def.noEquipSub || null,
          prTrackable: def.prTrackable || false,
          prMetric:   def.prMetric || "time_sec",
          substitution: injuries.includes("ankle") ? "easy_bike" : null,
        });
      });
      if (condBlock.items.length) blocks.push(condBlock);
    }

    // ── Cooldown ───────────────────────────────────────────────────────────
    const cdItems = (sportData.cooldown || [
      { name:"Hip flexor lunge", cue:"45 sec/side" },
      { name:"Hamstring stretch", cue:"60 sec/leg" },
      { name:"Deep breathing", cue:"2 min" },
    ]);
    blocks.push({ id:`cd_${uid()}`, type:"cooldown", title:"Sport-Specific Cool-down", duration_min:8, items:cdItems });

    return {
      id:           `sess_${uid()}`,
      sport,
      sessionType,
      level,
      equipKey,
      equipLabel:   equipProfile.label,
      sportLabel:   sportData.label || sport,
      sportEmoji:   sportData.emoji || "",
      injuries:     injuries || [],
      generated_at: nowISO(),
      blocks,
      total_min:    blocks.reduce((s, b) => s + (b.duration_min || 0), 0),
    };
  }

  // ---------- Periodization wizard (12-week) ----------
  // Simple practical periodization: 3-week accumulation, 3-week intensification, week 7 deload, weeks 8-10 build, week 11 peak, week 12 taper
  function generate12WeekPlan({ sport = "basketball", startDate = null, sessionsPerWeek = 3, sessionDistribution = { practice: 0.6, strength: 0.3, recovery: 0.1 }, injuries = [] } = {}) {
    const weeks = [];
    // compute week start dates if startDate provided
    let start = startDate ? new Date(startDate) : new Date();
    start.setHours(6, 0, 0, 0);

    const phases = [
      { name: "Accumulation", weeks: 3, volumeMultiplier: 1.0 },
      { name: "Intensification", weeks: 3, volumeMultiplier: 1.15 },
      { name: "Deload", weeks: 1, volumeMultiplier: 0.6 },
      { name: "Build", weeks: 3, volumeMultiplier: 1.1 },
      { name: "Peak", weeks: 1, volumeMultiplier: 0.8 },
      { name: "Taper", weeks: 1, volumeMultiplier: 0.6 }
    ];

    let weekIndex = 0;
    phases.forEach(phase => {
      for (let w = 0; w < phase.weeks; w++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (weekIndex * 7));

        // make sessionsPerWeek sessions with types chosen from distribution
        const sessions = [];
        const types = Object.keys(sessionDistribution);
        for (let s = 0; s < sessionsPerWeek; s++) {
          // pick type by weight
          const r = Math.random();
          let acc = 0;
          let chosen = types[0];
          for (let t of types) {
            acc += sessionDistribution[t];
            if (r <= acc) { chosen = t; break; }
          }
          // apply injury adjustments in generator
          const gen = generateWorkoutFor(sport, chosen, injuries);
          // adjust volume by multiplier (scale total minutes)
          gen.total_min = Math.round(gen.total_min * phase.volumeMultiplier);
          sessions.push(gen);
        }

        weeks.push({
          weekNumber: weekIndex + 1,
          phase: phase.name,
          startDate: weekStart.toISOString().slice(0, 10),
          sessions,
          volumeMultiplier: phase.volumeMultiplier
        });
        weekIndex++;
      }
    });

    return {
      created_at: nowISO(),
      sport,
      sessionsPerWeek,
      weeks
    };
  }

  // ---------- Today workflow (Generate -> Start -> Log -> Done) ----------
  let todayTimer = null;
  let todayTimerStart = null;
  let todayActiveSession = null;

  function renderTodayBlock() {
    const container = $("todayBlock");
    if (!container) return;

    // show today's planned session if periodization pushes one
    let todaySession = null;
    // Check state.periodization.plan for a session on today's date
    try {
      const plan = state.periodization && state.periodization.plan;
      if (plan && plan.weeks) {
        const todayISO = new Date().toISOString().slice(0, 10);
        for (let wk of plan.weeks) {
          if (wk.startDate <= todayISO) {
            // pick a session corresponding to day-of-week using modulo
            // fairly simple: pick first session for now
            // we allow pushToToday to set state.ui.todaySessionId
          }
        }
      }
      // if state.ui has a todaySessionId, fetch it
      if (state.ui && state.ui.todaySession) {
        todaySession = state.ui.todaySession;
      }
    } catch (e) {
      console.error(e);
    }

    // If there's an active timer, show running session
    if (todayActiveSession) {
      container.innerHTML = `
        <div class="minihead">In progress: ${todayActiveSession.sessionType} • ${todayActiveSession.sport}</div>
        <div class="minibody mono" id="todayRunning">Started ${timeAgo(todayTimerStart)}</div>
        <div style="margin-top:8px">
          <button class="btn danger" id="btnStopNow">Stop & Log</button>
          <button class="btn ghost" id="btnCancelNow">Cancel</button>
        </div>
      `;
      $("btnStopNow")?.addEventListener("click", () => stopAndLogToday());
      $("btnCancelNow")?.addEventListener("click", () => cancelToday());
      return;
    }

    // No active session — show generated plan if exists, else suggestion
    if (todaySession) {
      // render the planned session (summarized)
      const blocksHTML = (todaySession.blocks || []).map(b => `<div style="margin-bottom:6px"><b>${b.title}</b> — ${b.duration_min} min</div>`).join("");
      container.innerHTML = `
        <div class="minihead">${todaySession.sessionType} • ${todaySession.sport}</div>
        <div class="minibody">${blocksHTML}</div>
        <div style="margin-top:8px">
          <button class="btn" id="btnStartToday">Start</button>
          <button class="btn ghost" id="btnGenerateNew">Generate new</button>
        </div>
      `;
      $("btnStartToday")?.addEventListener("click", () => startToday(todaySession));
      $("btnGenerateNew")?.addEventListener("click", () => {
        const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || [], { level: state.profile.level || "beginner", equipKey: state.profile.equipmentProfile || "barbell" });
        state.ui.todaySession = gen;
        persist("New session generated");
        renderTodayBlock();
      });
      return;
    }

    // No planned session — show quick generate button
    container.innerHTML = `
      <div class="minihead">No session generated</div>
      <div class="minibody">Press Generate to create a tailored session for today.</div>
      <div style="margin-top:8px">
        <button class="btn" id="btnGenerateOnly">Generate</button>
        <button class="btn ghost" id="btnOpenTrain">Open Train</button>
      </div>
    `;
    $("btnGenerateOnly")?.addEventListener("click", () => {
      const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || [], { level: state.profile.level || "beginner", equipKey: state.profile.equipmentProfile || "barbell" });
      state.ui.todaySession = gen;
      persist("Session generated");
      renderTodayBlock();
    });
    $("btnOpenTrain")?.addEventListener("click", () => showView("train"));
  }

  function startToday(session) {
    if (!session) session = state.ui.todaySession;
    if (!session) { toast("No session to start"); return; }
    todayActiveSession = session;
    todayTimerStart = Date.now();
    renderTodayBlock();
    // update UI timer pill
    $("todayTimer") && ($("todayTimer").textContent = "Running…");
    // set interval to update running label
    todayTimer = setInterval(() => {
      const el = $("todayRunning");
      if (el) el.textContent = "Started " + timeAgo(todayTimerStart);
    }, 1500);
  }

  function stopAndLogToday() {
    if (!todayActiveSession) return;
    const durationMin = Math.max(1, Math.round((Date.now() - todayTimerStart) / 60000));
    // sRPE estimation UI could be added; for now default = 6 moderate
    const sRPE = 6;
    const load = Math.round(durationMin * sRPE);

    // Save session record
    const record = {
      id: `log_${Math.random().toString(36).slice(2,9)}`,
      created_at: nowISO(),
      sport: todayActiveSession.sport,
      sessionType: todayActiveSession.sessionType,
      duration_min: durationMin,
      sRPE,
      load,
      blocks: todayActiveSession.blocks
    };
    state.sessions = state.sessions || [];
    state.sessions.push(record);

    // clean up today's session marker
    state.ui.todaySession = null;
    persist(`Logged ${durationMin} min • load ${load}`);

    // stop timer
    if (todayTimer) clearInterval(todayTimer);
    todayTimer = null;
    todayTimerStart = null;
    todayActiveSession = null;
    $("todayTimer") && ($("todayTimer").textContent = "No timer running");
    renderTodayBlock();
    renderInsights(); // update insights to reflect new log
  }

  function cancelToday() {
    if (todayTimer) clearInterval(todayTimer);
    todayTimer = null;
    todayTimerStart = null;
    todayActiveSession = null;
    $("todayTimer") && ($("todayTimer").textContent = "No timer running");
    renderTodayBlock();
    toast("Session cancelled");
  }

  // Render a single generated session into a container element as swappable exercise cards.
  // Each strength/conditioning item with a noEquipSub gets a "No equipment" swap button.
  function renderSessionCards(gen, container) {
    if (!container) return;

    const blockRows = gen.blocks.map(b => {
      const isStrengthOrCond = b.type === "strength" || b.type === "conditioning";
      const itemsHTML = b.items.map((it, idx) => {
        const hasSwap = isStrengthOrCond && it.noEquipSub && EXERCISE_LIB.noEquip[it.noEquipSub];
        const swapBtn = hasSwap
          ? `<button class="btn ghost btn-sm" data-block="${b.id}" data-item="${idx}" data-swap="${it.noEquipSub}" style="margin-top:6px;font-size:12px">No equipment →</button>`
          : "";
        // Show current PR inline on the card if this exercise is PR-trackable
        const prData = it.prTrackable && it.key ? getPR(it.key) : null;
        const prBadge = prData
          ? `<div style="display:inline-flex;align-items:center;gap:4px;background:#f0b42920;border:1px solid #f0b42960;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700;color:#a07800;margin-top:4px">
               🏆 PR: ${formatPRValue(prData.value, prData.metric)}
               <button data-log-pr-inline="${it.key}" data-ex-name="${it.name}" data-metric="${it.prMetric||prData.metric}" style="margin-left:6px;background:none;border:none;color:#a07800;cursor:pointer;font-size:10px;font-weight:700;padding:0">+ Log</button>
             </div>`
          : it.prTrackable && it.key
            ? `<div style="display:inline-flex;align-items:center;gap:4px;background:#eee;border-radius:4px;padding:2px 7px;font-size:11px;color:#888;margin-top:4px">
                 No PR yet <button data-log-pr-inline="${it.key}" data-ex-name="${it.name}" data-metric="${it.prMetric||'weight_lbs'}" style="margin-left:6px;background:none;border:none;color:#1B4F8A;cursor:pointer;font-size:10px;font-weight:700;padding:0">+ Log PR</button>
               </div>`
            : "";
        return `
          <div class="blockcard" id="excard-${b.id}-${idx}" style="margin:6px 0;padding:10px 12px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
              <span style="font-weight:700">${it.name}</span>
              <span class="small muted">${it.cue}${it.sets ? ` · ${it.sets}×${it.reps||"max"}` : ""}</span>
            </div>
            ${prBadge}
            ${it.substitution ? `<div class="small muted" style="margin-top:3px">Injury sub: ${it.substitution.replace(/_/g," ")}</div>` : ""}
            ${swapBtn}
          </div>`;
      }).join("");

      return `
        <div style="margin-bottom:14px">
          <div class="small" style="font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px">${b.title} — ${b.duration_min} min</div>
          ${itemsHTML}
        </div>`;
    }).join("");

    container.innerHTML = `
      <div class="minihead" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px">
        <span>${gen.sportEmoji||""} ${gen.sportLabel||gen.sport} — ${gen.sessionType.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())} · ${gen.total_min} min</span>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${gen.level ? `<span style="font-size:10px;padding:2px 7px;border-radius:4px;font-weight:700;background:${{beginner:"#f0faf4",intermediate:"#eef4fc",advanced:"#fdf0ef"}[gen.level]||"#eee"};color:${{beginner:"#1A6B3C",intermediate:"#1B4F8A",advanced:"#C0392B"}[gen.level]||"#888"}">${{beginner:"🌱 Beginner",intermediate:"💪 Intermediate",advanced:"🔥 Advanced"}[gen.level]||gen.level}</span>` : ""}
          ${gen.equipLabel ? `<span style="font-size:10px;padding:2px 7px;border-radius:4px;background:#f0f0f0;color:#555;font-weight:600">${(EQUIPMENT_PROFILES[gen.equipKey]?.emoji||"")+" "+gen.equipLabel}</span>` : ""}
        </div>
      </div>
      ${blockRows}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn" id="btnPushToday2">Push to Today</button>
        <button class="btn ghost" id="btnStartNow">Start Now</button>
      </div>
    `;

    // Wire inline PR log buttons via delegation
    container.addEventListener("click", function handleInlinePR(e) {
      const btn = e.target.closest("[data-log-pr-inline]");
      if (!btn) return;
      e.stopPropagation();
      const key    = btn.getAttribute("data-log-pr-inline");
      const name   = btn.getAttribute("data-ex-name") || key;
      const metric = btn.getAttribute("data-metric") || "weight_lbs";
      const metricLabel = { weight_lbs:"Weight (lbs)", reps:"Reps", time_sec:"Time (sec)", distance_m:"Distance (m)" }[metric] || metric;
      const val = prompt(`Log PR for ${name}\n${metricLabel}:`);
      if (!val || isNaN(parseFloat(val))) return;
      const sets  = prompt("Sets completed:", "3") || "3";
      const reps  = prompt("Reps per set:", "5") || "5";
      const isNew = logPR(key, name, val, metric, sets, reps, "");
      if (isNew) {
        showPRCelebration(name, val, metric);
        awardBadge(`pr_${key}`, `🏆 PR: ${name}`, `New PR — ${formatPRValue(parseFloat(val), metric)}`);
      } else {
        toast(`${name} logged — keep pushing for a new PR!`);
      }
      renderSessionCards(gen, container); // refresh cards with new PR
    });

    // Wire swap via event delegation on the container — survives innerHTML re-renders
    // and avoids per-button addEventListener calls that get orphaned on re-render.
    container.addEventListener("click", function handleSwap(e) {
      const btn = e.target.closest("[data-swap]");
      if (!btn) return;
      e.stopPropagation(); // don't let click bubble to any parent card handler

      const swapKey = btn.getAttribute("data-swap");
      const blockId  = btn.getAttribute("data-block");
      const itemIdx  = parseInt(btn.getAttribute("data-item"), 10);
      const alt = EXERCISE_LIB.noEquip[swapKey];
      if (!alt) return;

      // Update the live session object so Push/Start carry the swapped exercise
      const block = gen.blocks.find(b => b.id === blockId);
      if (block && block.items[itemIdx]) {
        block.items[itemIdx] = {
          ...block.items[itemIdx],
          name: alt.title,
          cue: alt.cue,
          noEquipSub: null,  // consumed — hide swap button after first tap
          swapped: true
        };
      }

      // Replace just that one card in the DOM — no full re-render needed
      const card = document.getElementById(`excard-${blockId}-${itemIdx}`);
      if (card) {
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <span style="font-weight:700">${alt.title}</span>
            <span class="small muted">${alt.cue}</span>
          </div>
          <div class="small" style="color:var(--ok);margin-top:3px">✓ Swapped — no equipment needed</div>
        `;
      }
    });

    // Push / Start Now buttons
    container.querySelector("#btnPushToday2")?.addEventListener("click", () => {
      state.ui.todaySession = gen;
      persist("Pushed to Today");
      showView("home");
      renderTodayBlock();
    });
    container.querySelector("#btnStartNow")?.addEventListener("click", () => {
      state.ui.todaySession = gen;
      persist("Starting session");
      showView("home");
      startToday(gen);
    });
  }

  function renderTrain() {
    const sport = state.profile?.sport || "basketball";
    const role  = state.profile?.role  || "coach";
    // All roles — coaches AND athletes — can generate workouts.
    // Athletes generating for themselves is a supported primary use case.

    const trainSub = $("trainSub");
    if (trainSub) trainSub.textContent = `${role} · ${sport} · ${state.profile.preferred_session_type || "practice"}`;

    const body = $("trainBody");
    if (!body) return;

    const currentLevel = state.profile.level || "beginner";
    const currentEquip = state.profile.equipmentProfile || "barbell";

    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px">
        <div class="field">
          <label>Sport</label>
          <select id="trainSportSelect"></select>
        </div>
        <div class="field">
          <label>Session Type</label>
          <select id="trainSessionType">
            <option value="practice">Practice</option>
            <option value="strength">Strength</option>
            <option value="speed">Speed</option>
            <option value="recovery">Recovery</option>
            <option value="competition_prep">Competition Prep</option>
          </select>
        </div>
        <div class="field">
          <label>Athlete Level</label>
          <select id="trainLevel">
            <option value="beginner">🌱 Beginner</option>
            <option value="intermediate">💪 Intermediate</option>
            <option value="advanced">🔥 Advanced</option>
          </select>
        </div>
        <div class="field">
          <label>Equipment</label>
          <select id="trainEquip">
            ${Object.entries(EQUIPMENT_PROFILES).map(([k,v])=>`<option value="${k}">${v.emoji} ${v.label}</option>`).join("")}
          </select>
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn" id="btnGenTrain" style="width:100%">Generate</button>
        </div>
      </div>
      <div id="trainLevelInfo" style="margin-bottom:12px"></div>
      <div id="trainCardArea"></div>
    `;

    // Populate sport select
    const trainSportSelect = $("trainSportSelect");
    if (trainSportSelect) {
      trainSportSelect.innerHTML = Object.keys(SPORT_MICROBLOCKS)
        .map(s => { const sd = SPORT_MICROBLOCKS[s]||{}; return `<option value="${s}" ${s===sport?"selected":""}>${(sd.emoji||"")+" "+(sd.label||s)}</option>`; })
        .join("");
      trainSportSelect.addEventListener("change", () => {
        state.profile.sport = trainSportSelect.value;
        persist("Sport updated");
      });
    }

    const trainSessionType = $("trainSessionType");
    if (trainSessionType) trainSessionType.value = state.profile.preferred_session_type || "practice";

    const trainLevel = $("trainLevel");
    if (trainLevel) trainLevel.value = currentLevel;

    const trainEquip = $("trainEquip");
    if (trainEquip) trainEquip.value = currentEquip;

    // Show level badge
    const levelInfo = $("trainLevelInfo");
    const levelMeta = {
      beginner:     { color:"#1A6B3C", bg:"#f0faf4", border:"#b8e8cb", label:"🌱 Beginner", note:"Foundation exercises, lower volume, technique focus. Build the movement patterns before adding load." },
      intermediate: { color:"#1B4F8A", bg:"#eef4fc", border:"#b4cef0", label:"💪 Intermediate", note:"Progressive overload, sport-specific strength, higher intensity. You have 6–18 months of consistent training." },
      advanced:     { color:"#C0392B", bg:"#fdf0ef", border:"#f2b8b4", label:"🔥 Advanced", note:"Maximal strength methods, complex plyos, high weekly load. You've been training consistently for 2+ years." },
    };
    const lm = levelMeta[currentLevel] || levelMeta.beginner;
    if (levelInfo) levelInfo.innerHTML = `<div style="background:${lm.bg};border:1px solid ${lm.border};border-radius:8px;padding:10px 14px;font-size:12px"><span style="font-weight:700;color:${lm.color}">${lm.label}</span> — ${lm.note}</div>`;

    // Generate and render initial session
    const opts = { level: currentLevel, equipKey: currentEquip };
    const initialGen = generateWorkoutFor(sport, state.profile.preferred_session_type || "practice", state.profile.injuries || [], opts);
    renderSessionCards(initialGen, $("trainCardArea"));

    $("btnGenTrain")?.addEventListener("click", () => {
      const s = $("trainSportSelect")?.value  || sport;
      const t = $("trainSessionType")?.value   || "practice";
      const lv = $("trainLevel")?.value        || "beginner";
      const eq = $("trainEquip")?.value        || "barbell";
      state.profile.sport = s;
      state.profile.preferred_session_type = t;
      state.profile.level = lv;
      state.profile.equipmentProfile = eq;
      persist("Profile updated");
      const gen = generateWorkoutFor(s, t, state.profile.injuries || [], { level: lv, equipKey: eq });
      renderSessionCards(gen, $("trainCardArea"));
      // Update level badge
      const lm2 = levelMeta[lv] || levelMeta.beginner;
      const li2 = $("trainLevelInfo");
      if (li2) li2.innerHTML = `<div style="background:${lm2.bg};border:1px solid ${lm2.border};border-radius:8px;padding:10px 14px;font-size:12px"><span style="font-weight:700;color:${lm2.color}">${lm2.label}</span> — ${lm2.note}</div>`;
    });
  }

  // ---------- Periodization UI + push helper ----------
  function renderPeriodizationUI() {
    // on Profile tab we show periodization controls and plan
    const profileBody = $("profileBody");
    if (!profileBody) return;

    const plan = state.periodization && state.periodization.plan;
    profileBody.innerHTML = `
      <div class="mini">
        <div class="minihead">Periodization Wizard</div>
        <div class="minibody">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div class="field" style="width:240px">
              <label>Sport</label>
              <select id="wizSport">
                ${Object.keys(SPORT_MICROBLOCKS).map(s => `<option value="${s}" ${s===state.profile.sport?"selected":""}>${s}</option>`).join("")}
              </select>
            </div>

            <div class="field" style="width:180px">
              <label>Start date</label>
              <input id="wizStart" type="date" value="${(new Date()).toISOString().slice(0,10)}" />
            </div>

            <div class="field" style="width:180px">
              <label>Sessions / week</label>
              <select id="wizFreq">
                <option value="2" ${state.periodization?.plan?.sessionsPerWeek === 2 ? "selected":""}>2</option>
                <option value="3" ${state.periodization?.plan?.sessionsPerWeek === 3 ? "selected":""}>3</option>
                <option value="4" ${state.periodization?.plan?.sessionsPerWeek === 4 ? "selected":""}>4</option>
              </select>
            </div>

            <div style="display:flex;align-items:flex-end;gap:8px">
              <button class="btn" id="btnGenPlan">Generate 12-week Plan</button>
              <button class="btn ghost" id="btnClearPlan">Clear</button>
            </div>
          </div>

          <div style="margin-top:12px" id="planPreview">
            ${plan ? renderPlanPreviewHTML(plan) : `<div class="small muted">No plan yet. Generate a sport-specific 12-week plan.</div>`}
          </div>

        </div>
      </div>
    `;

    $("btnGenPlan")?.addEventListener("click", () => {
      const sport = $("wizSport")?.value || state.profile.sport || "basketball";
      const start = $("wizStart")?.value || (new Date()).toISOString().slice(0,10);
      const freq = parseInt($("wizFreq")?.value || 3, 10);
      const plan = generate12WeekPlan({ sport, startDate: start, sessionsPerWeek: freq, sessionDistribution: { practice: 0.6, strength: 0.3, recovery: 0.1 }, injuries: state.profile.injuries || [] });
      state.periodization.plan = plan;
      state.periodization.updated_at = nowISO();
      persist("Periodization plan generated");
      renderPeriodizationUI();
    });

    $("btnClearPlan")?.addEventListener("click", () => {
      state.periodization.plan = null;
      persist("Plan cleared");
      renderPeriodizationUI();
    });

    // helper: push today's first session from plan to Today
    // Add push buttons per week in preview HTML via delegation
    setTimeout(() => {
      document.querySelectorAll("[data-push-week]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(btn.getAttribute("data-push-week"), 10);
          const plan = state.periodization.plan;
          if (!plan || !plan.weeks || !plan.weeks[idx]) { toast("Plan not found"); return; }
          // pick first session of that week as today's session candidate
          const sess = plan.weeks[idx].sessions[0];
          if (!sess) { toast("No session in selected week"); return; }
          state.ui.todaySession = sess;
          persist("Pushed plan session to Today");
          showView("home");
          renderTodayBlock();
        });
      });
    }, 100);
  }

  function renderPlanPreviewHTML(plan) {
    if (!plan || !plan.weeks) return `<div class="small muted">Invalid plan</div>`;
    const weekTiles = plan.weeks.map((w, i) => {
      return `
        <div style="padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700">Week ${w.weekNumber} — ${w.phase}</div>
            <div class="small muted">${w.sessions.length} sessions — start ${w.startDate} • vol x${w.volumeMultiplier}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn ghost" data-push-week="${i}" title="Push first session to Today">Push →</button>
            <div class="small muted">${w.sessions[0] ? w.sessions[0].sessionType : "—"}</div>
          </div>
        </div>
      `;
    }).join("");
    return `<div>${weekTiles}</div>`;
  }

  // ---------- Insights (weekly minutes, load, streak) ----------
  function computeInsights() {
    const sessions = state.sessions || [];
    // group by ISO week (year-week)
    const byWeek = {};
    sessions.forEach(s => {
      const d = safeDate(s.created_at || s.generated_at);
      if (!d) return; // skip sessions with invalid timestamps
      const y = d.getUTCFullYear();
      // week number (ISO-like)
      const onejan = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d - onejan) / 86400000) + onejan.getUTCDay()+1)/7);
      const key = `${y}-W${String(weekNo).padStart(2,"0")}`;
      byWeek[key] = byWeek[key] || { minutes: 0, load: 0, sessions: 0 };
      byWeek[key].minutes += (s.duration_min || 0);
      byWeek[key].load += (s.load || 0);
      byWeek[key].sessions += 1;
    });
    const weekly = Object.entries(byWeek).map(([k,v]) => ({ week: k, minutes: v.minutes, load: v.load, sessions: v.sessions }));
    // sort descending by week label simple string compare may work
    weekly.sort((a,b) => b.week.localeCompare(a.week));
    state.insights.weekly = weekly.slice(0, 12);
    state.insights.updated_at = nowISO();
    persist(); // store updated insights
    return state.insights;
  }

  function renderInsights() {
    computeInsights();
    // quick render into profile area below periodization
    const profileBody = $("profileBody");
    if (!profileBody) return;
    const weekly = (state.insights && state.insights.weekly) || [];
    const rows = weekly.map(w => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)"><div>${w.week}</div><div>${w.minutes}m • load ${w.load}</div></div>`).join("");
    const streak = computeStreak();
    // append below existing periodization UI
    const el = document.createElement("div");
    el.style.marginTop = "12px";
    el.innerHTML = `
      <div class="mini">
        <div class="minihead">Insights</div>
        <div class="minibody">
          <div><b>Recent weeks</b></div>
          <div style="margin-top:8px">${rows || '<div class="small muted">No sessions logged yet</div>'}</div>
          <div style="margin-top:8px"><b>Current streak</b> — ${streak} days</div>
        </div>
      </div>
    `;
    // remove existing insights appended earlier to avoid duplicates
    const existing = profileBody.querySelector(".mini.insights");
    if (existing) existing.remove();
    if (el && el.classList) el.classList.add("insights");
    profileBody.appendChild(el);
  }

  function computeStreak() {
    // Sort sessions newest-first, skipping any with invalid timestamps.
    const sessions = (state.sessions || [])
      .filter(s => safeDate(s.created_at))
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!sessions.length) return 0;

    let streak = 0;
    let cursor = safeDateISO(sessions[0].created_at);
    for (let i = 0; i < sessions.length; i++) {
      const sdate = safeDateISO(sessions[i].created_at);
      if (!sdate) continue; // guard: skip any that slipped through
      if (sdate === cursor) {
        // Same calendar day — only count it once
        if (i === 0 || safeDateISO(sessions[i - 1]?.created_at) !== sdate) {
          streak++;
        }
      } else {
        // Check whether this session falls on the previous consecutive day
        const prev = new Date(cursor);
        prev.setDate(prev.getDate() - 1);
        const prevIso = prev.toISOString().slice(0, 10);
        if (sdate === prevIso) {
          streak++;
          cursor = sdate;
        } else {
          break; // gap in streak
        }
      }
    }
    return streak;
  }

  // ---------- Data Management (export/import/reset + QA grade) ----------
  function exportJSON() {
    if (!window.dataStore || !window.dataStore.exportJSON) {
      toast("Export not available");
      return;
    }
    const json = window.dataStore.exportJSON();
    // create blob and trigger download
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `piq_export_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Export started");
  }

  function importJSONFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const txt = e.target.result;
        if (!window.dataStore || !window.dataStore.importJSON) {
          toast("Import not available");
          return;
        }
        window.dataStore.importJSON(txt);
        state = window.dataStore.load();
        toast("Import complete");
        persist("Imported data");
        renderAll();
      } catch (err) {
        console.error(err);
        toast("Import failed");
      }
    };
    r.readAsText(file);
  }

  function resetLocalState(confirmText) {
    // triple confirm modal may exist elsewhere; here we do a JS confirm fallback
    const ok = confirm("Reset local state? This will remove all local data. Type RESET to continue.");
    if (!ok) return;
    // For stricter guard, ask user to type RESET
    const typed = prompt("Type RESET to confirm");
    if (typed !== "RESET") { toast("Reset aborted"); return; }
    localStorage.removeItem("piq_local_state_v2");
    // reload page to reflect clean slate
    toast("Local state reset — reloading");
    setTimeout(() => { if (typeof location !== "undefined") location.reload(); }, 700);
  }

  function runQAGrade() {
    // Provide a short QA grade based on presence of key features
    const issues = [];
    if (!state.periodization || !state.periodization.plan) issues.push("No periodization plan generated");
    if ((!state.sessions || state.sessions.length === 0) && (state.profile.role !== "coach")) issues.push("No sessions logged yet");
    if (!state.profile || !state.profile.sport) issues.push("Profile sport not set");
    if (state.profile.injuries && state.profile.injuries.length > 0) {
      // ok
    }
    const grade = issues.length ? "C" : "A";
    const report = `QA Grade: ${grade}\n\nIssues found:\n${issues.length ? issues.map((i,idx)=>`${idx+1}. ${i}`).join("\n") : "None"}`;
    $("gradeReport") && ($("gradeReport").textContent = report);
    toast("QA grade complete");
  }

  // ---------- Bind UI (boot) ----------
  function setActiveNav(view) {
    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    document.querySelectorAll(".bottomnav .tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function showView(view) {
    state.ui.view = view;
    persist(null);
    ["home","team","train","profile"].forEach(v => {
      const el = $(`view-${v}`);
      if (!el) return;
      const isActive = (v === view);
      el.hidden = !isActive;
      el.classList.toggle("active", isActive);
      el.classList.toggle("is-active", isActive);
    });
    setActiveNav(view);
    renderAll();
  }

  function renderTeam() {
    const body = $("teamBody");
    if (!body) return;
    const teams = state.team.teams || [];
    if (!teams.length) {
      body.innerHTML = `<div class="mini"><div class="minihead">No teams</div><div class="minibody">Create or join a team when cloud is enabled, or test locally.</div></div>`;
      return;
    }
    body.innerHTML = `<div class="mini"><div class="minihead">Teams</div><div class="minibody">${teams.map(t => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line)"><div><b>${t.name}</b><div class="small muted">${t.sport || ""}</div></div><button class="btn ghost" data-setteam="${t.id}">Set Active</button></div>`).join("")}</div></div>`;
    body.querySelectorAll("[data-setteam]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.team.active_team_id = btn.getAttribute("data-setteam");
        persist("Active team updated");
        setTeamPill();
      });
    });
  }

  function setTeamPill() {
    const pill = $("teamPill");
    if (!pill) return;
    const teamName = (state.team.teams || []).find(t => t.id === state.team.active_team_id)?.name;
    pill.textContent = `Team: ${teamName || "—"}`;
  }

  // ---------- Boot & bindings ----------
  function bindUI() {
    // Nav buttons
    document.querySelectorAll("[data-view]").forEach(btn => {
      if (btn.classList.contains("navbtn") || btn.classList.contains("tab")) {
        btn.addEventListener("click", () => showView(btn.dataset.view));
      }
    });

    // Topbar
    $("btnAccount")?.addEventListener("click", openDrawer);
    $("btnCloseDrawer")?.addEventListener("click", closeDrawer);

    // Today button — works for ALL roles (coach and athlete); both can generate workouts
    $("todayButton")?.addEventListener("click", () => {
      // Three-state flow: Generate -> Start -> Log handled by renderTodayBlock UI
      // If no today session: generate
      if (!state.ui.todaySession) {
        const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || [], { level: state.profile.level || "beginner", equipKey: state.profile.equipmentProfile || "barbell" });
        state.ui.todaySession = gen;
        persist("Generated Today session");
        renderTodayBlock();
        toast("Session generated — press Start");
        return;
      }
      // if there's a session but not running, start
      if (!todayActiveSession) {
        startToday(state.ui.todaySession);
        return;
      }
      // if running, stop & log
      if (todayActiveSession) {
        stopAndLogToday();
        return;
      }
    });

    // FAB sheet
    $("fab")?.addEventListener("click", () => {
      const b = $("sheetBackdrop");
      const s = $("fabSheet");
      if (!b || !s) return;
      b.hidden = false;
      s.hidden = false;
    });
    $("btnCloseSheet")?.addEventListener("click", () => {
      $("sheetBackdrop").hidden = true;
      $("fabSheet").hidden = true;
    });

    // Help drawer
    $("btnHelp")?.addEventListener("click", openHelp);
    $("btnCloseHelp")?.addEventListener("click", closeHelp);
    $("helpSearch")?.addEventListener("input", () => {
      const q = $("helpSearch").value.trim().toLowerCase();
      const results = searchHelp(q);
      const rEl = $("helpResults");
      rEl.innerHTML = results.map(r => `<div style="padding:8px;border-bottom:1px solid var(--line)"><b>${r.title}</b><div class="small muted">${r.snippet}</div></div>`).join("");
    });

    // Data management
    $("btnExport")?.addEventListener("click", exportJSON);
    $("fileImport")?.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJSONFile(f);
    });
    $("btnResetLocal")?.addEventListener("click", () => resetLocalState());
    $("btnRunGrade")?.addEventListener("click", runQAGrade);
    $("btnSaveProfile")?.addEventListener("click", () => {
      const role = $("roleSelect")?.value || state.profile.role;
      const sport = $("sportSelect")?.value || state.profile.sport;
      const pref = $("preferredSessionSelect")?.value || state.profile.preferred_session_type;
      state.profile.role = role;
      state.profile.sport = sport;
      state.profile.preferred_session_type = pref;
      persist("Profile preferences saved");
      renderAll();
    });

    // Theme save
    $("btnSaveTheme")?.addEventListener("click", () => {
      const mode = $("themeModeSelect")?.value || "dark";
      const sport = $("themeSportSelect")?.value || state.profile.sport || "basketball";
      // simple class toggle for body
      document.documentElement.setAttribute("data-theme", mode);
      // store in state
      state.profile.theme = { mode, sport };
      persist("Theme saved");
      toast("Theme saved");
    });

    // Quick actions QA tips
    $("qaTrain")?.addEventListener("click", () => showView("train"));
    $("qaTeam")?.addEventListener("click", () => showView("team"));

    // Auto K keyboard for help
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        openHelp();
        $("helpSearch") && $("helpSearch").focus();
        e.preventDefault();
      }
    });
  }

  function openDrawer() {
    const b = $("drawerBackdrop");
    const d = $("accountDrawer");
    if (!b || !d) return;
    b.hidden = false;
    d.classList.add("open");
    d.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    const b = $("drawerBackdrop");
    const d = $("accountDrawer");
    if (!b || !d) return;
    b.hidden = true;
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
  }

  function openHelp() {
    const b = $("helpBackdrop");
    const d = $("helpDrawer");
    if (!b || !d) return;
    b.hidden = false;
    d.classList.add("open");
    d.setAttribute("aria-hidden", "false");
    $("helpSearch") && ($("helpSearch").value = "");
    const rEl = $("helpResults");
    if (rEl) rEl.innerHTML = defaultHelpList().map(r => `<div style="padding:8px;border-bottom:1px solid var(--line)"><b>${r.title}</b><div class="small muted">${r.snippet}</div></div>`).join("");
  }

  function closeHelp() {
    const b = $("helpBackdrop");
    const d = $("helpDrawer");
    if (!b || !d) return;
    b.hidden = true;
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
  }

  // ---------- Help content ----------
  function defaultHelpList() {
    return [
      { title: "Today workflow", snippet: "Generate a session, Start the timer, Stop to log. Use the top 'Generate → Start → Log' button." },
      { title: "Periodization Wizard", snippet: "Profile → Periodization Wizard: create a 12-week plan and push sessions to Today." },
      { title: "Injury settings", snippet: "Add injuries in Account → Role & Sport; generated sessions will include substitutions and reduced load." },
      { title: "Data Management", snippet: "Export / Import your data from Account → Data Management. Reset requires typing RESET." }
    ];
  }

  function searchHelp(q) {
    if (!q) return defaultHelpList();
    const list = defaultHelpList();
    return list.filter(item => (item.title + " " + item.snippet).toLowerCase().includes(q));
  }

  // ---------- Render orchestration ----------
  // ---------- Meal Plan Generation ----------
  // Generates a 1-day meal plan tailored to goal, activity level, and sport.
  // Works for ALL roles — athletes can generate their own plans.
  const MEAL_TEMPLATES = {
    // goal → { calories, macro split }
    maintain:    { cal: 2400, proteinPct: 0.30, carbPct: 0.45, fatPct: 0.25 },
    build:       { cal: 2800, proteinPct: 0.33, carbPct: 0.44, fatPct: 0.23 },
    cut:         { cal: 1900, proteinPct: 0.38, carbPct: 0.37, fatPct: 0.25 },
    performance: { cal: 3000, proteinPct: 0.28, carbPct: 0.50, fatPct: 0.22 },
  };

  const MEAL_FOODS = {
    breakfast: [
      { name: "Oatmeal with berries & honey",             protein: 9,  carbs: 55, fat: 6,  cal: 310 },
      { name: "Greek yogurt parfait with granola",         protein: 20, carbs: 42, fat: 8,  cal: 320 },
      { name: "Scrambled eggs on whole-grain toast",       protein: 22, carbs: 30, fat: 14, cal: 330 },
      { name: "Protein smoothie (whey, banana, oat milk)", protein: 30, carbs: 50, fat: 6,  cal: 374 },
    ],
    lunch: [
      { name: "Grilled chicken rice bowl with veg",        protein: 42, carbs: 58, fat: 10, cal: 490 },
      { name: "Turkey & avocado wrap",                     protein: 35, carbs: 48, fat: 16, cal: 476 },
      { name: "Salmon quinoa salad",                       protein: 38, carbs: 44, fat: 14, cal: 458 },
      { name: "Lean beef stir-fry with brown rice",        protein: 40, carbs: 52, fat: 12, cal: 468 },
    ],
    snack: [
      { name: "Cottage cheese & pineapple",                protein: 18, carbs: 20, fat: 3,  cal: 179 },
      { name: "Apple with almond butter",                  protein: 5,  carbs: 28, fat: 9,  cal: 209 },
      { name: "Rice cakes with peanut butter",             protein: 7,  carbs: 22, fat: 8,  cal: 188 },
      { name: "Hard-boiled eggs & fruit",                  protein: 13, carbs: 18, fat: 7,  cal: 191 },
    ],
    dinner: [
      { name: "Baked salmon, sweet potato & broccoli",     protein: 44, carbs: 48, fat: 16, cal: 512 },
      { name: "Chicken thigh, roasted veg & quinoa",       protein: 40, carbs: 44, fat: 14, cal: 474 },
      { name: "Lean beef tacos (corn tortillas)",          protein: 38, carbs: 50, fat: 16, cal: 492 },
      { name: "Tofu stir-fry with noodles",               protein: 28, carbs: 56, fat: 10, cal: 434 },
    ],
    preworkout: [
      { name: "Banana & a handful of pretzels",            protein: 3,  carbs: 40, fat: 1,  cal: 181 },
      { name: "Dates & peanut butter",                     protein: 4,  carbs: 38, fat: 8,  cal: 236 },
    ],
    postworkout: [
      { name: "Chocolate milk (500ml)",                    protein: 16, carbs: 56, fat: 9,  cal: 373 },
      { name: "Protein shake & banana",                    protein: 28, carbs: 34, fat: 3,  cal: 275 },
    ],
  };

  function generateMealPlan() {
    const goal     = state.profile.goal     || "maintain";
    const activity = state.profile.activity || "med";
    const sport    = state.profile.sport    || "basketball";

    // Pick template — bump to performance for high-intensity sports
    const highIntensitySports = ["basketball","football","track","volleyball"];
    const effectiveGoal = highIntensitySports.includes(sport) && goal === "maintain"
      ? "performance" : goal;
    const tmpl = MEAL_TEMPLATES[effectiveGoal] || MEAL_TEMPLATES.maintain;

    // Activity multiplier on calories
    const actMult = { low: 0.90, med: 1.00, high: 1.12 }[activity] || 1.00;
    const targetCal = Math.round(tmpl.cal * actMult);

    // Pick one item per meal slot deterministically (seed on date so day-to-day varies)
    function pick(arr) {
      const seed = (new Date().getDate() + arr.length) % arr.length;
      return arr[seed];
    }

    const meals = [
      { slot: "Breakfast",     food: pick(MEAL_FOODS.breakfast) },
      { slot: "Pre-Workout",   food: pick(MEAL_FOODS.preworkout) },
      { slot: "Lunch",         food: pick(MEAL_FOODS.lunch) },
      { slot: "Snack",         food: pick(MEAL_FOODS.snack) },
      { slot: "Dinner",        food: pick(MEAL_FOODS.dinner) },
      { slot: "Post-Workout",  food: pick(MEAL_FOODS.postworkout) },
    ];

    const totals = meals.reduce((acc, m) => ({
      cal:     acc.cal     + m.food.cal,
      protein: acc.protein + m.food.protein,
      carbs:   acc.carbs   + m.food.carbs,
      fat:     acc.fat     + m.food.fat,
    }), { cal:0, protein:0, carbs:0, fat:0 });

    return {
      id: `meal_${Math.random().toString(36).slice(2,8)}`,
      generated_at: nowISO(),
      goal: effectiveGoal,
      sport,
      targetCal,
      targetProtein: Math.round(targetCal * tmpl.proteinPct / 4),
      targetCarbs:   Math.round(targetCal * tmpl.carbPct   / 4),
      targetFat:     Math.round(targetCal * tmpl.fatPct    / 9),
      meals,
      totals,
    };
  }

  function renderMealPlan() {
    const body = $("mealPlanBody");
    if (!body) return; // element not present in this HTML build — skip silently

    try {
      // Use cached plan if available, else generate fresh
      if (!state.ui.mealPlan) {
        state.ui.mealPlan = generateMealPlan();
      }
      const plan = state.ui.mealPlan;
      const t = plan.totals;

      const macroBar = (label, actual, target, color) => {
        const pct = Math.min(100, Math.round((actual / target) * 100));
        return `
          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span class="small">${label}</span>
              <span class="small muted">${actual}g / ${target}g</span>
            </div>
            <div style="height:6px;background:var(--panel2,#e8e8e8);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div>
            </div>
          </div>`;
      };

      const mealRows = plan.meals.map(m => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line,#e8e8e8)">
          <div>
            <div class="small muted" style="text-transform:uppercase;letter-spacing:.06em;font-size:10px">${m.slot}</div>
            <div style="font-weight:600;margin-top:2px">${m.food.name}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:700;font-size:15px">${m.food.cal} kcal</div>
            <div class="small muted">P ${m.food.protein}g · C ${m.food.carbs}g · F ${m.food.fat}g</div>
          </div>
        </div>`).join("");

      body.innerHTML = `
        <div class="mini">
          <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
            <span>Today's Meal Plan</span>
            <button class="btn ghost" id="btnRegenMeal" style="font-size:12px">Regenerate</button>
          </div>
          <div class="minibody">
            <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
              <div style="text-align:center">
                <div style="font-size:28px;font-weight:800;color:var(--accent,#0b3a7a)">${t.cal}</div>
                <div class="small muted">Total kcal</div>
              </div>
              <div style="flex:1;min-width:180px">
                ${macroBar("Protein", t.protein, plan.targetProtein, "#C0392B")}
                ${macroBar("Carbs",   t.carbs,   plan.targetCarbs,   "#1A6B3C")}
                ${macroBar("Fat",     t.fat,     plan.targetFat,     "#6B4C9A")}
              </div>
            </div>
            <div class="small muted" style="margin-bottom:12px">Goal: <b>${plan.goal}</b> · Target: <b>${plan.targetCal} kcal</b> · Sport: <b>${plan.sport}</b></div>
            ${mealRows}
          </div>
        </div>
      `;

      // Regenerate button — generates a new plan and re-renders
      $("btnRegenMeal")?.addEventListener("click", (e) => {
        e.stopPropagation();
        state.ui.mealPlan = generateMealPlan();
        persist("Meal plan regenerated");
        renderMealPlan();
      });
    } catch (err) {
      console.error("renderMealPlan error", err);
      body.innerHTML = `<div class="mini"><div class="minihead">Meal Plan</div><div class="minibody small muted">Could not generate — check profile settings.</div></div>`;
    }
  }


  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // PERSONAL RECORDS (PR) SYSTEM
  // Athletes log weight/reps/time for any prTrackable exercise.
  // Detects new PRs automatically on log. Stores full history per exercise.
  // ══════════════════════════════════════════════════════════════════════════
  function initPRs() {
    if (!state.prs) {
      state.prs = {};
      // prMetric-keyed records per exercise key:
      // state.prs[exerciseKey] = { current: {value, unit, date, sets, reps}, history: [{...}] }
    }
  }

  // Returns true if this is a new PR for the exercise
  function logPR(exerciseKey, exerciseName, value, metric, sets, reps, notes) {
    initPRs();
    const rec = state.prs[exerciseKey] = state.prs[exerciseKey] || { exerciseName, current: null, history: [] };
    const entry = {
      value:   parseFloat(value),
      metric,  // "weight_lbs"|"reps"|"time_sec"|"distance_m"
      sets:    parseInt(sets) || 1,
      reps:    parseInt(reps) || 1,
      notes:   notes || "",
      date:    nowISO().slice(0, 10),
      ts:      nowISO(),
    };
    if (!isFinite(entry.value) || entry.value <= 0) return false;

    const isNewPR = !rec.current ||
      (metric === "time_sec" ? entry.value < rec.current.value : entry.value > rec.current.value);

    if (isNewPR) rec.current = { ...entry };
    rec.exerciseName = exerciseName;
    rec.history.unshift(entry);
    persist();
    return isNewPR;
  }

  function getPR(exerciseKey) {
    initPRs();
    return (state.prs[exerciseKey] || {}).current || null;
  }

  function getPRHistory(exerciseKey) {
    initPRs();
    return ((state.prs[exerciseKey] || {}).history || []).slice(0, 20);
  }

  function formatPRValue(value, metric) {
    if (metric === "weight_lbs")  return `${value} lbs`;
    if (metric === "reps")        return `${value} reps`;
    if (metric === "time_sec")    return value >= 60 ? `${Math.floor(value/60)}:${String(Math.round(value%60)).padStart(2,"0")} min` : `${value}s`;
    if (metric === "distance_m")  return value >= 1000 ? `${(value/1000).toFixed(2)} km` : `${value} m`;
    return `${value}`;
  }

  function renderPRTracker() {
    const body = $("prTrackerBody");
    if (!body) return;
    initPRs();

    // Build PR-trackable exercise list from the library
    const trackable = [];
    Object.entries(EXERCISE_LIB.strength).forEach(([key, ex]) => {
      if (ex.prTrackable) trackable.push({ key, name:ex.title, metric:ex.prMetric, type:"strength" });
    });
    Object.entries(EXERCISE_LIB.plyo).forEach(([key, ex]) => {
      if (ex.prTrackable) trackable.push({ key, name:ex.title, metric:ex.prMetric, type:"plyo" });
    });
    Object.entries(EXERCISE_LIB.conditioning).forEach(([key, ex]) => {
      if (ex.prTrackable) trackable.push({ key, name:ex.title, metric:ex.prMetric, type:"conditioning" });
    });

    const prEntries = Object.keys(state.prs);
    const metricLabel = { weight_lbs:"lbs", reps:"reps", time_sec:"sec (lower = better)", distance_m:"metres" };

    const prRows = trackable.map(ex => {
      const pr = getPR(ex.key);
      const hist = getPRHistory(ex.key).slice(0, 3);
      const histDots = hist.map((h,i) => `<span class="small muted" style="font-size:11px;margin-left:6px">${i===0?"(prev) ":""}${formatPRValue(h.value, ex.metric)}</span>`).join("");
      return `
        <div class="pr-row" style="padding:12px 0;border-bottom:1px solid var(--line,#e8e8e8)" data-key="${ex.key}">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px">${ex.name}</div>
              <div class="small muted">${metricLabel[ex.metric] || ex.metric} · ${ex.type}</div>
              ${hist.length > 1 ? `<div style="margin-top:3px">${histDots}</div>` : ""}
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              ${pr ? `<div style="text-align:right"><div style="font-size:20px;font-weight:800;color:#f0b429">🏆 ${formatPRValue(pr.value, pr.metric)}</div><div class="small muted">${pr.date}</div></div>` : `<div class="small muted" style="font-size:11px">No PR yet</div>`}
              <button class="btn ghost" data-log-pr="${ex.key}" style="font-size:11px;flex-shrink:0">Log PR</button>
            </div>
          </div>
          <div id="prForm_${ex.key}" hidden style="margin-top:10px;background:var(--panel,#f7f6f2);border-radius:8px;padding:12px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
              <div class="field" style="flex:1;min-width:90px">
                <label>${metricLabel[ex.metric]}</label>
                <input type="number" id="prVal_${ex.key}" min="0" step="${ex.metric==="time_sec"?1:2.5}" placeholder="${ex.metric==="time_sec"?"sec":ex.metric==="distance_m"?"m":"lbs"}"/>
              </div>
              <div class="field" style="width:55px"><label>Sets</label><input type="number" id="prSets_${ex.key}" value="3" min="1" max="10"/></div>
              <div class="field" style="width:55px"><label>Reps</label><input type="number" id="prReps_${ex.key}" value="5" min="1" max="30"/></div>
              <div class="field" style="flex:1;min-width:100px"><label>Notes</label><input type="text" id="prNotes_${ex.key}" placeholder="optional"/></div>
              <button class="btn" id="prSave_${ex.key}" style="flex-shrink:0">Save</button>
            </div>
          </div>
        </div>`;
    }).join("");

    body.innerHTML = `
      <div class="mini">
        <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
          <span>Personal Records <span style="font-size:16px">🏆</span></span>
          <span class="small muted">${prEntries.length} exercise${prEntries.length!==1?"s":""} tracked</span>
        </div>
        <div class="minibody">
          <div class="small muted" style="margin-bottom:14px">Log your best performance for each exercise. We'll automatically detect and celebrate new PRs.</div>
          ${prRows || `<div class="small muted">No trackable exercises yet. Generate a workout first.</div>`}
        </div>
      </div>
    `;

    // Wire log PR toggle + save
    body.querySelectorAll("[data-log-pr]").forEach(btn => {
      const key = btn.getAttribute("data-log-pr");
      btn.addEventListener("click", () => {
        const form = $(`prForm_${key}`);
        if (form) form.hidden = !form.hidden;
      });
    });
    trackable.forEach(ex => {
      $(`prSave_${ex.key}`)?.addEventListener("click", () => {
        const val   = $(`prVal_${ex.key}`)?.value;
        const sets  = $(`prSets_${ex.key}`)?.value;
        const reps  = $(`prReps_${ex.key}`)?.value;
        const notes = $(`prNotes_${ex.key}`)?.value;
        const isNew = logPR(ex.key, ex.name, val, ex.metric, sets, reps, notes);
        if (isNew) {
          showPRCelebration(ex.name, val, ex.metric);
          // Also award a badge
          awardBadge(`pr_${ex.key}`, `🏆 PR: ${ex.name}`, `New personal record — ${formatPRValue(parseFloat(val), ex.metric)}`);
        } else {
          toast(`${ex.name} logged — not a PR yet. Keep pushing!`);
        }
        renderPRTracker();
        renderBadges(); // refresh badges panel
      });
    });
  }

  function showPRCelebration(name, value, metric) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);`;
    overlay.innerHTML = `
      <div style="background:#1a1a1a;color:#f7f6f2;border-radius:16px;padding:32px 36px;text-align:center;max-width:320px;animation:prPop .35s cubic-bezier(.34,1.56,.64,1) both">
        <div style="font-size:56px;line-height:1">🏆</div>
        <div style="font-size:28px;font-weight:800;color:#f0b429;margin:10px 0 4px">NEW PR!</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:6px">${name}</div>
        <div style="font-size:22px;color:#4caf7d;font-weight:800">${formatPRValue(parseFloat(value), metric)}</div>
        <div style="font-size:12px;color:#888;margin-top:8px">Your best ever. Keep building.</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="margin-top:18px;background:#f0b429;color:#1a1a1a;border:none;border-radius:8px;padding:10px 28px;font-weight:800;font-size:14px;cursor:pointer">Let's go! 🔥</button>
      </div>`;
    // Animation
    const style = document.createElement("style");
    style.textContent = `@keyframes prPop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}`;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    setTimeout(() => overlay.remove(), 6000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STREAK BADGES + ACHIEVEMENT SYSTEM
  // Badges are earned automatically. Each badge has: id, icon, title, desc,
  // earnedAt. Rendered in a badge shelf on the home/profile view.
  // ══════════════════════════════════════════════════════════════════════════

  const STREAK_BADGES = [
    { id:"streak_3",   icon:"🔥",  title:"3-Day Streak",   desc:"3 consecutive training days",   threshold:3  },
    { id:"streak_7",   icon:"⚡",  title:"Week Warrior",   desc:"7 consecutive training days",   threshold:7  },
    { id:"streak_14",  icon:"💪",  title:"Two-Week Beast",  desc:"14 consecutive training days",  threshold:14 },
    { id:"streak_30",  icon:"🏅",  title:"30-Day Iron",     desc:"30 consecutive training days",  threshold:30 },
    { id:"streak_60",  icon:"🥈",  title:"60-Day Legend",   desc:"60 consecutive training days",  threshold:60 },
    { id:"streak_100", icon:"🥇",  title:"Century Club",    desc:"100 consecutive training days", threshold:100},
  ];

  const SESSION_BADGES = [
    { id:"sess_1",   icon:"🌱", title:"First Step",       desc:"Logged your first session",    threshold:1   },
    { id:"sess_5",   icon:"🎯", title:"Five Sessions",    desc:"Completed 5 training sessions", threshold:5   },
    { id:"sess_10",  icon:"💎", title:"10 Sessions",      desc:"10 sessions in the books",      threshold:10  },
    { id:"sess_25",  icon:"🚀", title:"25 Sessions",      desc:"25 sessions logged",            threshold:25  },
    { id:"sess_50",  icon:"🌟", title:"50 Sessions",      desc:"50 sessions — elite territory", threshold:50  },
    { id:"sess_100", icon:"👑", title:"100 Club",         desc:"100 sessions — all-time great", threshold:100 },
  ];

  const SPORT_BADGES = {
    basketball: [{ id:"bball_skill", icon:"🏀", title:"On the Ball",     desc:"Generated 10+ basketball sessions" }],
    football:   [{ id:"fb_skill",    icon:"🏈", title:"Gridiron Ready",  desc:"Generated 10+ football sessions"   }],
    soccer:     [{ id:"soc_skill",   icon:"⚽", title:"Pitch Perfect",   desc:"Generated 10+ soccer sessions"     }],
    track:      [{ id:"trk_skill",   icon:"🏃", title:"Track Royalty",   desc:"Generated 10+ track sessions"      }],
    baseball:   [{ id:"bb_skill",    icon:"⚾", title:"In the Zone",     desc:"Generated 10+ baseball sessions"   }],
    volleyball: [{ id:"vb_skill",    icon:"🏐", title:"Net Dominator",   desc:"Generated 10+ volleyball sessions" }],
    swimming:   [{ id:"sw_skill",    icon:"🏊", title:"Deep End",        desc:"Generated 10+ swimming sessions"   }],
    wrestling:  [{ id:"wr_skill",    icon:"🤼", title:"Mat Warrior",     desc:"Generated 10+ wrestling sessions"  }],
    lacrosse:   [{ id:"lac_skill",   icon:"🥍", title:"Field Commander", desc:"Generated 10+ lacrosse sessions"   }],
    tennis:     [{ id:"ten_skill",   icon:"🎾", title:"Ace Status",      desc:"Generated 10+ tennis sessions"     }],
  };

  function initBadges() {
    if (!state.badges) state.badges = {};
  }

  function awardBadge(id, title, desc, icon) {
    initBadges();
    if (state.badges[id]) return false; // already earned
    state.badges[id] = { id, title, desc: desc||"", icon: icon||"🏅", earnedAt: nowISO() };
    persist();
    showBadgeCelebration(state.badges[id]);
    return true;
  }

  function showBadgeCelebration(badge) {
    // Small toast-style notification
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9000;
      background:#1a1a1a;color:#f7f6f2;border-radius:12px;padding:12px 20px;
      display:flex;align-items:center;gap:12px;box-shadow:0 4px 24px rgba(0,0,0,.3);
      animation:slideUp .3s ease both;max-width:320px;`;
    el.innerHTML = `
      <span style="font-size:28px">${badge.icon || "🏅"}</span>
      <div><div style="font-weight:800;font-size:14px;color:#f0b429">Badge Earned!</div>
      <div style="font-size:13px">${badge.title}</div></div>`;
    const style = document.createElement("style");
    style.textContent = `@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(style);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // Check and award all automatic badges based on current state
  function checkAndAwardBadges() {
    initBadges();
    const sessions = state.sessions || [];
    const streak   = computeStreak();
    const sport    = state.profile?.sport || "basketball";

    // Streak badges
    STREAK_BADGES.forEach(b => {
      if (streak >= b.threshold) awardBadge(b.id, b.title, b.desc, b.icon);
    });

    // Session count badges
    SESSION_BADGES.forEach(b => {
      if (sessions.length >= b.threshold) awardBadge(b.id, b.title, b.desc, b.icon);
    });

    // Sport-specific badges (10+ sessions in same sport)
    const sportSessions = sessions.filter(s => s.sport === sport).length;
    const sportBadgeList = SPORT_BADGES[sport] || [];
    if (sportSessions >= 10) {
      sportBadgeList.forEach(b => awardBadge(b.id, b.title, b.desc, b.icon));
    }
  }

  function renderBadges() {
    const body = $("badgesBody");
    if (!body) return;
    initBadges();
    checkAndAwardBadges();

    const streak  = computeStreak();
    const earned  = Object.values(state.badges);
    const sessions = state.sessions || [];
    const sport    = state.profile?.sport || "basketball";

    // Which badges are "next up" to earn
    const nextStreak  = STREAK_BADGES.find(b => streak < b.threshold);
    const nextSession = SESSION_BADGES.find(b => sessions.length < b.threshold);
    const progress    = [
      nextStreak  ? { label:`Next streak badge`,   current:streak,           target:nextStreak.threshold,  unit:"days", icon:"🔥" } : null,
      nextSession ? { label:`Next session badge`,  current:sessions.length,  target:nextSession.threshold, unit:"sessions", icon:"🎯" } : null,
    ].filter(Boolean);

    const progressBars = progress.map(p => {
      const pct = Math.min(100, Math.round((p.current/p.target)*100));
      return `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span class="small">${p.icon} ${p.label}</span>
            <span class="small muted">${p.current} / ${p.target} ${p.unit}</span>
          </div>
          <div style="height:8px;background:var(--panel2,#e8e8e8);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:#f0b429;border-radius:4px;transition:width .5s ease"></div>
          </div>
        </div>`;
    }).join("");

    // All badge shelves
    const makeShelf = (title, list, isEarned) => {
      if (!list.length) return "";
      return `
        <div style="margin-bottom:20px">
          <div class="small" style="font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#aaa;margin-bottom:10px">${title}</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${list.map(b => `
              <div title="${b.desc}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 14px;
                background:${isEarned?"var(--panel,#f7f6f2)":"#fafafa"};
                border:1px solid ${isEarned?"#f0b429":"#e8e8e8"};border-radius:10px;min-width:72px;
                opacity:${isEarned?1:.4};cursor:default;transition:opacity .2s">
                <span style="font-size:26px">${b.icon}</span>
                <span class="small" style="font-weight:700;font-size:10px;text-align:center;line-height:1.3">${b.title}</span>
                ${isEarned && b.earnedAt ? `<span class="small muted" style="font-size:9px">${b.earnedAt.slice(0,10)}</span>` : ""}
              </div>`).join("")}
          </div>
        </div>`;
    };

    const earnedIds = new Set(earned.map(b => b.id));
    const earnedStreakBadges  = STREAK_BADGES.map(b => ({...b, earnedAt: state.badges[b.id]?.earnedAt})).filter(b => earnedIds.has(b.id));
    const lockedStreakBadges  = STREAK_BADGES.filter(b => !earnedIds.has(b.id));
    const earnedSessionBadges = SESSION_BADGES.map(b=>({...b,earnedAt:state.badges[b.id]?.earnedAt})).filter(b=>earnedIds.has(b.id));
    const lockedSessionBadges = SESSION_BADGES.filter(b=>!earnedIds.has(b.id));
    const prBadges  = earned.filter(b => b.id.startsWith("pr_"));
    const customBadges = earned.filter(b => !b.id.startsWith("streak_")&&!b.id.startsWith("sess_")&&!b.id.startsWith("pr_")&&!Object.values(SPORT_BADGES).flat().some(sb=>sb.id===b.id));
    const sportBadgeList = (SPORT_BADGES[sport]||[]).map(b=>({...b,earnedAt:state.badges[b.id]?.earnedAt}));

    body.innerHTML = `
      <div class="mini">
        <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
          <span>Badges & Achievements</span>
          <span class="small" style="color:#f0b429;font-weight:700">${earned.length} earned</span>
        </div>
        <div class="minibody">
          ${progress.length ? `<div style="margin-bottom:20px">${progressBars}</div>` : ""}
          ${makeShelf("🔥 Streak Badges — Earned", earnedStreakBadges, true)}
          ${makeShelf("🔥 Streak Badges — Locked", lockedStreakBadges, false)}
          ${makeShelf("🎯 Session Milestones — Earned", earnedSessionBadges, true)}
          ${makeShelf("🎯 Session Milestones — Locked", lockedSessionBadges, false)}
          ${prBadges.length ? makeShelf("🏆 Personal Records", prBadges, true) : ""}
          ${sportBadgeList.length ? makeShelf(`${(SPORT_MICROBLOCKS[sport]||{}).emoji||""} Sport Badges`, sportBadgeList.map(b=>({...b,earnedAt:state.badges[b.id]?.earnedAt})), sportBadgeList.some(b=>earnedIds.has(b.id))) : ""}
          ${customBadges.length ? makeShelf("⭐ Special Achievements", customBadges, true) : ""}
          ${!earned.length ? `<div class="small muted">Complete training sessions and log PRs to earn badges. Your streak is currently ${streak} day${streak!==1?"s":""}.</div>` : ""}
        </div>
      </div>
    `;
  }

  // ── Streak badge check on every session log ─────────────────────────────
  // Patch stopAndLogToday to trigger badge check after logging
  (function patchSessionLog() {
    // Will be called by renderAll after boot — safe to reference stopAndLogToday
    // We hook into persist instead, checking on every save
    const _origPersist = window.__PIQ_PERSIST_HOOK;
    // Light hook: checkAndAwardBadges runs in renderBadges, called from renderAll
  })();

  // WAVE 1 FEATURES — R9 Priority Implementation
  // ══════════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────────
  // 1. IN-APP COACH–ATHLETE MESSAGING
  // Threaded message store keyed by athlete ID. Coach sends, athlete replies.
  // Renders into #messagingBody. Works offline — syncs to cloud when available.
  // ─────────────────────────────────────────────────────────────────────────
  function initMessaging() {
    if (!state.messaging) {
      state.messaging = { threads: {}, unread: 0 };
    }
  }

  function sendMessage({ toId, toName, fromRole, body, sessionRef = null }) {
    initMessaging();
    if (!state.messaging.threads[toId]) {
      state.messaging.threads[toId] = { participantName: toName, messages: [] };
    }
    const msg = {
      id: `msg_${Math.random().toString(36).slice(2, 9)}`,
      fromRole,            // "coach" | "athlete"
      body: body.trim(),
      sessionRef,          // optional: link to a session ID
      ts: nowISO(),
      read: false,
    };
    state.messaging.threads[toId].messages.push(msg);
    // update unread count for the other side
    state.messaging.unread = Object.values(state.messaging.threads)
      .flatMap(t => t.messages)
      .filter(m => m.fromRole !== state.profile.role && !m.read).length;
    persist();
    return msg;
  }

  function markThreadRead(athleteId) {
    initMessaging();
    const thread = state.messaging.threads[athleteId];
    if (!thread) return;
    thread.messages.forEach(m => { m.read = true; });
    state.messaging.unread = 0;
    persist();
  }

  function renderMessaging() {
    const body = $("messagingBody");
    if (!body) return;
    initMessaging();

    const role = state.profile.role || "coach";
    const threads = Object.entries(state.messaging.threads);

    // Seed demo thread if none exist
    if (!threads.length && role === "coach") {
      sendMessage({ toId: "athlete_demo", toName: "Jordan Mitchell", fromRole: "coach",
        body: "Great session today — your split times in block 3 improved by 0.3s. Let's keep that tempo through the week." });
      sendMessage({ toId: "athlete_demo", toName: "Jordan Mitchell", fromRole: "athlete",
        body: "Thanks coach! My hamstring felt tight in the last set — should I sub the RDL tomorrow?" });
      sendMessage({ toId: "athlete_demo", toName: "Jordan Mitchell", fromRole: "coach",
        body: "Yes — swap to the single-leg hinge variation and keep load at moderate. Let me know how it feels." });
    }

    const threadList = Object.entries(state.messaging.threads);
    const activeId = state.ui.activeThreadId || (threadList[0] ? threadList[0][0] : null);

    const threadHTML = threadList.map(([id, thread]) => {
      const last = thread.messages[thread.messages.length - 1];
      const unread = thread.messages.filter(m => m.fromRole !== role && !m.read).length;
      return `
        <div class="msg-thread-item${id === activeId ? " active" : ""}" data-thread="${id}"
          style="padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--line,#e8e8e8);
          background:${id === activeId ? "var(--panel,#f7f6f2)" : "#fff"};
          display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px">${thread.participantName}</div>
            <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${last ? last.body : "No messages"}</div>
          </div>
          ${unread ? `<div style="background:#C0392B;color:#fff;border-radius:999px;font-size:10px;font-weight:800;padding:2px 7px;flex-shrink:0">${unread}</div>` : ""}
        </div>`;
    }).join("") || `<div class="small muted" style="padding:14px">No conversations yet.</div>`;

    let convHTML = `<div class="small muted" style="padding:14px">Select a conversation.</div>`;
    if (activeId && state.messaging.threads[activeId]) {
      const thread = state.messaging.threads[activeId];
      markThreadRead(activeId);
      const bubbles = thread.messages.map(m => {
        const mine = m.fromRole === role;
        return `
          <div style="display:flex;justify-content:${mine ? "flex-end" : "flex-start"};margin-bottom:10px">
            <div style="max-width:78%;padding:10px 14px;border-radius:${mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px"};
              background:${mine ? "var(--accent,#0b3a7a)" : "#f0ede8"};
              color:${mine ? "#fff" : "inherit"};font-size:13px;line-height:1.5">
              ${m.body}
              ${m.sessionRef ? `<div style="font-size:10px;opacity:.7;margin-top:4px">📋 Session: ${m.sessionRef}</div>` : ""}
              <div style="font-size:10px;opacity:.5;margin-top:4px;text-align:right">${m.ts.slice(11,16)}</div>
            </div>
          </div>`;
      }).join("");
      convHTML = `
        <div id="msgBubbles" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column">${bubbles}</div>
        <div style="padding:12px;border-top:1px solid var(--line,#e8e8e8);display:flex;gap:8px">
          <input id="msgInput" type="text" placeholder="Type a message…"
            style="flex:1;border:1px solid var(--line,#ccc);border-radius:8px;padding:8px 12px;font-size:13px;background:var(--bg,#fff)"/>
          <button class="btn" id="btnMsgSend" style="flex-shrink:0">Send</button>
        </div>`;
    }

    body.innerHTML = `
      <div class="mini" style="overflow:hidden">
        <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
          <span>Messages ${state.messaging.unread > 0 ? `<span style="background:#C0392B;color:#fff;border-radius:999px;font-size:10px;padding:2px 7px;margin-left:6px">${state.messaging.unread}</span>` : ""}</span>
          <button class="btn ghost" id="btnNewThread" style="font-size:12px">+ New</button>
        </div>
        <div style="display:flex;height:360px">
          <div style="width:220px;border-right:1px solid var(--line,#e8e8e8);overflow-y:auto;flex-shrink:0">${threadHTML}</div>
          <div style="flex:1;display:flex;flex-direction:column;min-width:0">${convHTML}</div>
        </div>
      </div>
    `;

    // Thread selection
    body.querySelectorAll(".msg-thread-item").forEach(el => {
      el.addEventListener("click", () => {
        state.ui.activeThreadId = el.getAttribute("data-thread");
        renderMessaging();
      });
    });

    // Send message
    const msgInput = $("msgInput");
    const btnSend = $("btnMsgSend");
    if (btnSend && msgInput) {
      const doSend = () => {
        const text = msgInput.value.trim();
        if (!text) return;
        sendMessage({ toId: activeId, toName: state.messaging.threads[activeId]?.participantName || "Athlete",
          fromRole: role, body: text });
        renderMessaging();
      };
      btnSend.addEventListener("click", doSend);
      msgInput.addEventListener("keydown", e => { if (e.key === "Enter") doSend(); });
    }

    // New thread (coach only)
    $("btnNewThread")?.addEventListener("click", () => {
      const name = prompt("Athlete name for new conversation:");
      if (!name || !name.trim()) return;
      const id = "athlete_" + Math.random().toString(36).slice(2, 8);
      state.messaging.threads[id] = { participantName: name.trim(), messages: [] };
      state.ui.activeThreadId = id;
      persist();
      renderMessaging();
    });

    // Auto-scroll bubbles to bottom
    setTimeout(() => {
      const b = $("msgBubbles");
      if (b) b.scrollTop = b.scrollHeight;
    }, 30);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. APPLE HEALTH / GOOGLE FIT SYNC
  // Web bridge: tries Web Bluetooth (heart rate), falls back to manual entry.
  // On native shell, exposes window.PIQ_HEALTH_BRIDGE that native code calls.
  // ─────────────────────────────────────────────────────────────────────────
  const HEALTH_SERVICE_UUID  = "0000180d-0000-1000-8000-00805f9b34fb"; // Heart Rate
  const HEALTH_CHAR_UUID     = "00002a37-0000-1000-8000-00805f9b34fb";

  function initHealth() {
    if (!state.health) {
      state.health = {
        connected: false,
        deviceName: null,
        source: null,          // "apple_health" | "google_fit" | "ble" | "manual"
        latestHR: null,
        dailySteps: null,
        sleepHrs: null,
        hrv: null,
        lastSync: null,
        history: [],           // [{ts, hr, steps, sleep, hrv}]
      };
    }
    // Register native bridge callback
    window.PIQ_HEALTH_BRIDGE = function(payload) {
      // Native apps call this to push data: {source, hr, steps, sleep, hrv}
      try {
        const d = typeof payload === "string" ? JSON.parse(payload) : payload;
        state.health.connected = true;
        state.health.source    = d.source || "native";
        state.health.latestHR  = d.hr   ?? state.health.latestHR;
        state.health.dailySteps = d.steps ?? state.health.dailySteps;
        state.health.sleepHrs  = d.sleep ?? state.health.sleepHrs;
        state.health.hrv       = d.hrv   ?? state.health.hrv;
        state.health.lastSync  = nowISO();
        state.health.history.push({ ts: nowISO(), hr: d.hr, steps: d.steps, sleep: d.sleep, hrv: d.hrv });
        persist();
        renderHealthSync();
        toast("Health data synced");
      } catch (e) { console.error("PIQ_HEALTH_BRIDGE error", e); }
    };
  }

  async function connectBLE() {
    try {
      if (!navigator.bluetooth) throw new Error("Web Bluetooth not supported on this device.");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HEALTH_SERVICE_UUID] }],
        optionalServices: [HEALTH_SERVICE_UUID],
      });
      const server  = await device.gatt.connect();
      const service = await server.getPrimaryService(HEALTH_SERVICE_UUID);
      const char    = await service.getCharacteristic(HEALTH_CHAR_UUID);
      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", (e) => {
        const val = e.target.value;
        const hr  = val.getUint8(1);
        state.health.latestHR  = hr;
        state.health.connected = true;
        state.health.source    = "ble";
        state.health.deviceName = device.name || "BLE Device";
        state.health.lastSync  = nowISO();
        persist();
        renderHealthSync();
      });
      state.health.deviceName = device.name || "BLE Device";
      state.health.connected  = true;
      state.health.source     = "ble";
      persist();
      renderHealthSync();
      toast(`Connected to ${device.name || "device"}`);
    } catch (err) {
      toast(err.message.includes("User cancelled") ? "Cancelled" : "BLE unavailable — use manual entry");
      console.warn("BLE connect failed:", err.message);
    }
  }

  function saveManualHealth(data) {
    initHealth();
    Object.assign(state.health, data, { source: "manual", lastSync: nowISO(), connected: true });
    state.health.history.push({ ts: nowISO(), ...data });
    persist();
    renderHealthSync();
    toast("Health data saved");
  }

  function renderHealthSync() {
    const body = $("healthSyncBody");
    if (!body) return;
    initHealth();
    const h = state.health;
    const srcLabel = { apple_health: "Apple Health", google_fit: "Google Fit", ble: "BLE Wearable", manual: "Manual Entry", native: "Native App" };

    const statRow = (icon, label, val, unit) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line,#e8e8e8)">
        <span style="font-size:18px;width:24px">${icon}</span>
        <div style="flex:1"><div class="small muted">${label}</div><div style="font-weight:700;font-size:18px">${val ?? "—"} <span class="small muted">${val != null ? unit : ""}</span></div></div>
      </div>`;

    body.innerHTML = `
      <div class="mini">
        <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
          <span>Health Sync ${h.connected ? '<span style="color:#1A6B3C;font-size:11px;margin-left:6px">● Connected</span>' : '<span style="color:#aaa;font-size:11px;margin-left:6px">○ Not connected</span>'}</span>
          ${h.lastSync ? `<span class="small muted">Synced ${h.lastSync.slice(11,16)}</span>` : ""}
        </div>
        <div class="minibody">
          ${h.source ? `<div class="small muted" style="margin-bottom:12px">Source: <b>${srcLabel[h.source] || h.source}</b>${h.deviceName ? ` · ${h.deviceName}` : ""}</div>` : ""}
          ${statRow("❤️", "Heart Rate",   h.latestHR,   "bpm")}
          ${statRow("👟", "Daily Steps",  h.dailySteps ? h.dailySteps.toLocaleString() : null, "steps")}
          ${statRow("😴", "Sleep",        h.sleepHrs,   "hrs")}
          ${statRow("📈", "HRV",          h.hrv,        "ms")}
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
            <button class="btn" id="btnBLEConnect">🔵 Connect Wearable</button>
            <button class="btn ghost" id="btnManualHealth">Enter Manually</button>
          </div>
          <div id="manualHealthForm" hidden style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="field"><label>Heart Rate (bpm)</label><input id="mHR" type="number" min="40" max="220" placeholder="72"/></div>
            <div class="field"><label>Steps</label><input id="mSteps" type="number" placeholder="8000"/></div>
            <div class="field"><label>Sleep (hrs)</label><input id="mSleep" type="number" step="0.5" min="0" max="24" placeholder="7.5"/></div>
            <div class="field"><label>HRV (ms)</label><input id="mHRV" type="number" placeholder="55"/></div>
            <div style="grid-column:span 2"><button class="btn" id="btnSaveManualHealth">Save</button></div>
          </div>
        </div>
      </div>
    `;

    $("btnBLEConnect")?.addEventListener("click", connectBLE);
    $("btnManualHealth")?.addEventListener("click", () => {
      const f = $("manualHealthForm");
      if (f) f.hidden = !f.hidden;
    });
    $("btnSaveManualHealth")?.addEventListener("click", () => {
      saveManualHealth({
        latestHR:   parseInt($("mHR")?.value) || null,
        dailySteps: parseInt($("mSteps")?.value) || null,
        sleepHrs:   parseFloat($("mSleep")?.value) || null,
        hrv:        parseInt($("mHRV")?.value) || null,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. LIVE PARENT PORTAL — Read-only athlete dashboard
  // Generates a token-gated URL. Token stored in state; expiry configurable.
  // renderParentPortal() shows the live view when role === "parent".
  // ─────────────────────────────────────────────────────────────────────────
  function initParentPortal() {
    if (!state.parentPortal) {
      state.parentPortal = { tokens: {}, liveViews: [] };
    }
  }

  function generatePortalToken(athleteId, athleteName, expiryDays = 0) {
    initParentPortal();
    const token   = `piq_par_${Math.random().toString(36).slice(2, 14)}`;
    const expires = expiryDays === 0 ? null
      : new Date(Date.now() + expiryDays * 86400000).toISOString();
    state.parentPortal.tokens[token] = { athleteId, athleteName, created: nowISO(), expires, views: 0 };
    persist();
    return token;
  }

  function resolvePortalToken(token) {
    initParentPortal();
    const record = state.parentPortal.tokens[token];
    if (!record) return null;
    if (record.expires && new Date(record.expires) < new Date()) return null; // expired
    record.views++;
    persist();
    return record;
  }

  function renderParentPortal() {
    const body = $("parentPortalBody");
    if (!body) return;
    initParentPortal();

    const role = state.profile.role || "coach";

    if (role === "coach") {
      // Coach view: generate portal links for each athlete
      const tokens = Object.entries(state.parentPortal.tokens);
      const linkRows = tokens.map(([tok, rec]) => {
        const expired = rec.expires && new Date(rec.expires) < new Date();
        const base = (typeof location !== "undefined") ? location.origin + location.pathname : window.location?.href || "";
        const url = `${base}?portal=${tok}`;
        return `
          <div style="padding:10px 0;border-bottom:1px solid var(--line,#e8e8e8)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <div>
                <div style="font-weight:700">${rec.athleteName}</div>
                <div class="small muted">${rec.expires ? `Expires ${rec.expires.slice(0,10)}` : "Permanent"} · ${rec.views} view${rec.views !== 1 ? "s" : ""}</div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn ghost" style="font-size:11px" data-copy="${url}" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.dataset.copy).then(()=>window.__PIQ_toast&&window.__PIQ_toast('Link copied!'))">Copy Link</button>
                ${expired ? '<span class="small" style="color:#C0392B">Expired</span>' : '<span class="small" style="color:#1A6B3C">Active</span>'}
              </div>
            </div>
          </div>`;
      }).join("");

      body.innerHTML = `
        <div class="mini">
          <div class="minihead">Parent Portal — Live Access</div>
          <div class="minibody">
            <div class="small muted" style="margin-bottom:14px">Generate read-only dashboard links for parents. They see today's session, recent stats, and streak — nothing editable.</div>
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
              <input id="portalAthleteName" type="text" placeholder="Athlete name" style="flex:1;border:1px solid var(--line,#ccc);border-radius:6px;padding:7px 10px;font-size:13px"/>
              <select id="portalExpiry" style="border:1px solid var(--line,#ccc);border-radius:6px;padding:7px 10px;font-size:13px">
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="0">Permanent</option>
              </select>
              <button class="btn" id="btnGenPortal">Generate Link</button>
            </div>
            ${linkRows ? `<div><div class="small" style="font-weight:700;margin-bottom:8px">Active Links</div>${linkRows}</div>` : `<div class="small muted">No links generated yet.</div>`}
          </div>
        </div>
      `;

      $("btnGenPortal")?.addEventListener("click", () => {
        const name   = $("portalAthleteName")?.value.trim();
        const expiry = parseInt($("portalExpiry")?.value) || 0;
        if (!name) { toast("Enter athlete name"); return; }
        const tok = generatePortalToken("athlete_" + Math.random().toString(36).slice(2,6), name, expiry);
        const base = (typeof location !== "undefined") ? location.origin + location.pathname : window.location?.href || "";
        const url = `${base}?portal=${tok}`;
        navigator.clipboard?.writeText(url).then(() => toast("Link copied to clipboard!")).catch(() => toast("Link generated — copy from active links"));
        renderParentPortal();
      });

    } else {
      // Parent / read-only view: snapshot of athlete data
      const recent = (state.sessions || []).slice(-5).reverse();
      const streak = computeStreak();
      const today  = state.ui.todaySession;
      const rows   = recent.map(s => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line,#e8e8e8)">
          <div><div style="font-weight:700">${s.sessionType || "Session"}</div><div class="small muted">${safeDateISO(s.created_at) || "—"}</div></div>
          <div style="text-align:right"><div class="small muted">${s.duration_min || "—"} min</div></div>
        </div>`).join("");

      body.innerHTML = `
        <div class="mini">
          <div class="minihead">Live Athlete Dashboard <span style="font-size:10px;background:#1A6B3C22;color:#1A6B3C;border-radius:4px;padding:2px 7px;margin-left:8px">Read-Only</span></div>
          <div class="minibody">
            <div style="display:flex;gap:20px;margin-bottom:16px;flex-wrap:wrap">
              <div style="text-align:center"><div style="font-size:28px;font-weight:800;color:#f0b429">${streak}</div><div class="small muted">Day streak</div></div>
              <div style="text-align:center"><div style="font-size:28px;font-weight:800;color:#1B4F8A">${(state.sessions||[]).length}</div><div class="small muted">Total sessions</div></div>
              <div style="text-align:center"><div style="font-size:28px;font-weight:800;color:#1A6B3C">${today ? "✓" : "—"}</div><div class="small muted">Today planned</div></div>
            </div>
            ${today ? `<div style="background:#f0faf4;border:1px solid #b8e8cb;border-radius:8px;padding:12px 14px;margin-bottom:14px"><div class="small" style="font-weight:700;color:#1A6B3C;margin-bottom:4px">Today's Session</div><div>${today.sessionType || ""} · ${today.sport || ""} · ${today.total_min || "—"} min</div></div>` : ""}
            <div class="small" style="font-weight:700;margin-bottom:8px">Recent Sessions</div>
            ${rows || `<div class="small muted">No sessions logged yet.</div>`}
          </div>
        </div>
      `;
    }
  }

  // Auto-open portal from URL param on load
  (function checkPortalParam() {
    if (typeof location === "undefined") return;
    const params = new URLSearchParams(location.search);
    const tok = params.get("portal");
    if (!tok) return;
    const rec = resolvePortalToken(tok);
    if (rec) {
      state.profile.role = "parent"; // switch to read-only view
      persist();
    }
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // 4. BARCODE SCANNER — Nutrition logging
  // Uses getUserMedia + canvas to grab frames, sends to Open Food Facts API.
  // Falls back to manual UPC entry if camera unavailable.
  // ─────────────────────────────────────────────────────────────────────────
  function initNutrition() {
    if (!state.nutrition) {
      state.nutrition = { log: [], scans: [] };
    }
  }

  async function lookupBarcode(upc) {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(upc)}.json`;
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (data.status !== 1 || !data.product) return null;
      const p = data.product;
      const n = p.nutriments || {};
      return {
        barcode:  upc,
        name:     p.product_name || "Unknown product",
        brand:    p.brands || "",
        cal:      Math.round(n["energy-kcal_100g"] || 0),
        protein:  Math.round(n.proteins_100g || 0),
        carbs:    Math.round(n.carbohydrates_100g || 0),
        fat:      Math.round(n.fat_100g || 0),
        servingG: Math.round(p.serving_quantity || 100),
      };
    } catch (e) {
      console.warn("Barcode lookup failed:", e.message);
      return null;
    }
  }

  function logFoodItem(item, servingMultiplier = 1) {
    initNutrition();
    const entry = {
      ...item,
      id:         `food_${Math.random().toString(36).slice(2, 8)}`,
      ts:         nowISO(),
      servingMult: servingMultiplier,
      calLogged:   Math.round(item.cal * servingMultiplier * item.servingG / 100),
    };
    state.nutrition.log.unshift(entry);
    persist();
    return entry;
  }

  function renderBarcodeScanner() {
    const body = $("barcodeScanBody");
    if (!body) return;
    initNutrition();

    const todayLog = (state.nutrition.log || []).filter(e => e.ts.slice(0,10) === new Date().toISOString().slice(0,10));
    const totalCal = todayLog.reduce((a, e) => a + (e.calLogged || 0), 0);

    const logRows = todayLog.map(e => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line,#e8e8e8)">
        <div><div style="font-weight:600;font-size:13px">${e.name}</div><div class="small muted">${e.brand || ""}</div></div>
        <div style="text-align:right;flex-shrink:0"><div style="font-weight:700">${e.calLogged} kcal</div><div class="small muted">P ${Math.round(e.protein*e.servingMult*e.servingG/100)}g · C ${Math.round(e.carbs*e.servingMult*e.servingG/100)}g</div></div>
      </div>`).join("");

    body.innerHTML = `
      <div class="mini">
        <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
          <span>Nutrition Log</span>
          <span style="font-size:13px;font-weight:700;color:var(--accent,#0b3a7a)">${totalCal} kcal today</span>
        </div>
        <div class="minibody">
          <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
            <button class="btn" id="btnScanBarcode">📷 Scan Barcode</button>
            <button class="btn ghost" id="btnManualUPC">Enter UPC</button>
          </div>
          <div id="scanFeedback" style="margin-bottom:12px"></div>
          <div id="barcodeResult" hidden style="background:var(--panel,#f7f6f2);border:1px solid var(--line,#e8e8e8);border-radius:8px;padding:12px;margin-bottom:14px"></div>
          ${todayLog.length ? `<div class="small" style="font-weight:700;margin-bottom:8px">Today's Log</div>${logRows}` : `<div class="small muted">Nothing logged today. Scan or enter a UPC to start.</div>`}
        </div>
      </div>
    `;

    const feedback = $("scanFeedback");
    const resultBox = $("barcodeResult");

    async function handleUPC(upc) {
      feedback.innerHTML = `<div class="small muted">Looking up ${upc}…</div>`;
      resultBox.hidden = true;
      const item = await lookupBarcode(upc);
      if (!item) {
        feedback.innerHTML = `<div class="small" style="color:#C0392B">Product not found for UPC: ${upc}</div>`;
        return;
      }
      feedback.innerHTML = "";
      resultBox.hidden = false;
      resultBox.innerHTML = `
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">${item.name}</div>
        <div class="small muted" style="margin-bottom:10px">${item.brand} · per 100g: ${item.cal} kcal · P${item.protein}g C${item.carbs}g F${item.fat}g</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input id="servingMultInput" type="number" value="1" step="0.5" min="0.5" style="width:60px;border:1px solid var(--line,#ccc);border-radius:6px;padding:5px 8px;font-size:13px"/>
          <span class="small muted">serving(s) of ${item.servingG}g</span>
          <button class="btn" id="btnLogFood" style="font-size:12px">+ Add to Log</button>
        </div>
      `;
      $("btnLogFood")?.addEventListener("click", () => {
        const mult = parseFloat($("servingMultInput")?.value) || 1;
        logFoodItem(item, mult);
        toast(`${item.name} logged`);
        renderBarcodeScanner();
      });
    }

    $("btnManualUPC")?.addEventListener("click", () => {
      const upc = prompt("Enter UPC barcode number:");
      if (upc && upc.trim()) handleUPC(upc.trim());
    });

    $("btnScanBarcode")?.addEventListener("click", async () => {
      // Try native barcode detection API (Chrome 88+ on Android)
      if ("BarcodeDetector" in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
          const stream   = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          feedback.innerHTML = `<div class="small muted">📷 Camera active — point at barcode…</div>`;
          const video = document.createElement("video");
          video.srcObject = stream;
          video.setAttribute("playsinline", true);
          video.style.cssText = "width:100%;border-radius:8px;margin-bottom:8px";
          resultBox.hidden = false;
          resultBox.innerHTML = "";
          resultBox.appendChild(video);
          await video.play();
          let found = false;
          const scan = async () => {
            if (found) return;
            try {
              const codes = await detector.detect(video);
              if (codes.length > 0) {
                found = true;
                stream.getTracks().forEach(t => t.stop());
                feedback.innerHTML = "";
                resultBox.innerHTML = "";
                resultBox.hidden = true;
                handleUPC(codes[0].rawValue);
              } else { requestAnimationFrame(scan); }
            } catch { requestAnimationFrame(scan); }
          };
          requestAnimationFrame(scan);
        } catch (e) {
          feedback.innerHTML = `<div class="small muted">Camera unavailable — use UPC entry instead.</div>`;
        }
      } else {
        feedback.innerHTML = `<div class="small muted">Live scanning requires Chrome on Android. Use <strong>Enter UPC</strong> instead.</div>`;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. PERMANENT REPORT LINKS — configurable expiry
  // Replaces hard-coded 7-day expiry. Coach picks 7d / 30d / permanent.
  // renderReportLinks() shows link manager in coach view.
  // ─────────────────────────────────────────────────────────────────────────
  function initReportLinks() {
    if (!state.reportLinks) state.reportLinks = { links: [] };
  }

  function generateReportLink(athleteName, sessionSummary, expiryDays) {
    initReportLinks();
    const token   = `piq_rpt_${Math.random().toString(36).slice(2, 14)}`;
    const expires = expiryDays === 0 ? null
      : new Date(Date.now() + expiryDays * 86400000).toISOString();
    const link = {
      token, athleteName, sessionSummary,
      created: nowISO(),
      expires,                            // null = permanent
      expiryDays,
      views: 0,
    };
    state.reportLinks.links.unshift(link);
    persist();
    const _loc = (typeof location !== 'undefined') ? location.origin + location.pathname : ''; return `${_loc}?report=${token}`;
  }

  function renderReportLinks() {
    const body = $("reportLinksBody");
    if (!body) return;
    initReportLinks();

    const links = state.reportLinks.links;
    const rows  = links.map(l => {
      const expired = l.expires && new Date(l.expires) < new Date();
      const url     = `${location.origin}${location.pathname}?report=${l.token}`;
      const expLabel = l.expires ? `Expires ${l.expires.slice(0,10)}` : "Permanent ✓";
      return `
        <div style="padding:11px 0;border-bottom:1px solid var(--line,#e8e8e8)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
            <div>
              <div style="font-weight:700">${l.athleteName}</div>
              <div class="small muted">${l.sessionSummary}</div>
              <div class="small" style="color:${expired ? "#C0392B" : l.expires ? "#888" : "#1A6B3C"}">${expLabel} · ${l.views} view${l.views !== 1 ? "s" : ""}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn ghost" style="font-size:11px" data-url="${url}" id="copy_${l.token}">Copy</button>
              ${expired ? '<span class="small" style="color:#C0392B;padding:4px">Expired</span>' : ""}
            </div>
          </div>
        </div>`;
    }).join("");

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Coach Report Links</div>
        <div class="minibody">
          <div class="small muted" style="margin-bottom:14px">Generate shareable report links. Choose expiry — permanent links never break.</div>
          <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:16px;align-items:end">
            <div class="field"><label>Athlete name</label><input id="rlAthlete" type="text" placeholder="Name"/></div>
            <div class="field"><label>Session note</label><input id="rlNote" type="text" placeholder="Week 4 strength session"/></div>
            <div class="field"><label>Expiry</label>
              <select id="rlExpiry">
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="0">Permanent</option>
              </select>
            </div>
          </div>
          <button class="btn" id="btnGenReport" style="margin-bottom:20px">Generate Report Link</button>
          ${rows ? `<div class="small" style="font-weight:700;margin-bottom:8px">All Links (${links.length})</div>${rows}` : `<div class="small muted">No links generated yet.</div>`}
        </div>
      </div>
    `;

    $("btnGenReport")?.addEventListener("click", () => {
      const name   = $("rlAthlete")?.value.trim();
      const note   = $("rlNote")?.value.trim() || "Session report";
      const expiry = parseInt($("rlExpiry")?.value) || 0;
      if (!name) { toast("Enter athlete name"); return; }
      const url = generateReportLink(name, note, expiry);
      navigator.clipboard?.writeText(url)
        .then(() => toast(`Link copied! ${expiry === 0 ? "Permanent — never expires." : `Expires in ${expiry} days.`}`))
        .catch(() => toast("Link generated"));
      renderReportLinks();
    });

    // Copy buttons
    body.querySelectorAll("[data-url]").forEach(btn => {
      btn.addEventListener("click", () => {
        navigator.clipboard?.writeText(btn.dataset.url)
          .then(() => toast("Copied!"))
          .catch(() => { prompt("Copy this link:", btn.dataset.url); });
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. YEAR-OVER-YEAR AD ANALYTICS
  // Aggregates session data by season (calendar year). Computes compliance,
  // session volume, and load trends. Board-ready summary for ADs.
  // ─────────────────────────────────────────────────────────────────────────
  function initADAnalytics() {
    if (!state.adAnalytics) state.adAnalytics = { seasons: {} };
  }

  function computeYOYAnalytics() {
    initADAnalytics();
    const sessions = state.sessions || [];
    const byYear   = {};

    sessions.forEach(s => {
      const d = safeDate(s.created_at);
      if (!d) return;
      const yr = d.getUTCFullYear().toString();
      byYear[yr] = byYear[yr] || { sessions: 0, totalMin: 0, totalLoad: 0, byType: {} };
      byYear[yr].sessions++;
      byYear[yr].totalMin  += s.duration_min || 0;
      byYear[yr].totalLoad += s.load         || 0;
      const t = s.sessionType || "other";
      byYear[yr].byType[t] = (byYear[yr].byType[t] || 0) + 1;
    });

    // Seed demo data for ADs if no real data
    const currentYear = new Date().getUTCFullYear();
    if (!byYear[currentYear - 1]) {
      byYear[currentYear - 1] = { sessions: 142, totalMin: 8520, totalLoad: 426, byType: { practice: 85, strength: 42, recovery: 15 } };
    }
    if (!byYear[currentYear]) {
      byYear[currentYear] = { sessions: sessions.length || 61, totalMin: sessions.reduce((a,s)=>a+(s.duration_min||0),0)||3660, totalLoad: sessions.reduce((a,s)=>a+(s.load||0),0)||183, byType: { practice: 36, strength: 18, recovery: 7 } };
    }

    state.adAnalytics.seasons = byYear;
    return byYear;
  }

  function renderADAnalytics() {
    const body = $("adAnalyticsBody");
    if (!body) return;

    const seasons = computeYOYAnalytics();
    const years   = Object.keys(seasons).sort();
    if (years.length < 2) {
      body.innerHTML = `<div class="mini"><div class="minihead">Year-Over-Year Analytics</div><div class="minibody small muted">Need data from at least 2 seasons.</div></div>`;
      return;
    }

    const curYr  = years[years.length - 1];
    const prevYr = years[years.length - 2];
    const cur    = seasons[curYr];
    const prev   = seasons[prevYr];

    const delta = (a, b) => {
      if (!b) return null;
      const pct = Math.round(((a - b) / b) * 100);
      return { pct, up: pct >= 0 };
    };

    const kpi = (label, cur, prev, unit = "") => {
      const d = delta(cur, prev);
      return `
        <div style="background:var(--panel,#f7f6f2);border:1px solid var(--line,#e8e8e8);border-radius:10px;padding:16px">
          <div class="small muted" style="margin-bottom:6px">${label}</div>
          <div style="font-size:28px;font-weight:800;line-height:1">${cur.toLocaleString()}<span class="small muted" style="font-size:14px;font-weight:400"> ${unit}</span></div>
          ${d !== null ? `<div style="font-size:12px;color:${d.up ? "#1A6B3C" : "#C0392B"};margin-top:6px;font-weight:700">${d.up ? "▲" : "▼"} ${Math.abs(d.pct)}% vs ${prevYr}</div>` : ""}
          <div class="small muted">vs ${prev.toLocaleString()} ${unit} in ${prevYr}</div>
        </div>`;
    };

    const compliance = Math.min(100, Math.round((cur.sessions / Math.max(cur.sessions, 160)) * 100));
    const prevCompliance = Math.min(100, Math.round((prev.sessions / Math.max(prev.sessions, 160)) * 100));

    body.innerHTML = `
      <div class="mini">
        <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
          <span>Year-Over-Year Analytics</span>
          <span class="small muted">${prevYr} → ${curYr}</span>
        </div>
        <div class="minibody">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
            ${kpi("Total Sessions",    cur.sessions,            prev.sessions)}
            ${kpi("Training Volume",   cur.totalMin,            prev.totalMin,  "min")}
            ${kpi("Total Load",        cur.totalLoad,           prev.totalLoad)}
            ${kpi("Compliance Rate",   compliance,              prevCompliance,  "%")}
          </div>
          <div style="background:#f0faf4;border:1px solid #b8e8cb;border-radius:8px;padding:14px;margin-bottom:16px">
            <div class="small" style="font-weight:700;color:#1A6B3C;margin-bottom:8px">Board Summary — ${curYr} Season</div>
            <div class="small" style="line-height:1.7">
              Athletes completed <strong>${cur.sessions}</strong> sessions this season (${compliance}% compliance),
              representing a <strong>${delta(cur.sessions,prev.sessions)?.pct > 0 ? "+" : ""}${delta(cur.sessions,prev.sessions)?.pct ?? 0}%</strong> change year-over-year.
              Total training volume reached <strong>${cur.totalMin.toLocaleString()} minutes</strong>
              across strength, practice, and recovery modalities.
            </div>
          </div>
          <div>
            <div class="small" style="font-weight:700;margin-bottom:8px">Session Breakdown by Type</div>
            ${Object.entries({ ...prev.byType, ...cur.byType }).map(([type]) => {
              const c = cur.byType[type] || 0;
              const p = prev.byType[type] || 0;
              const maxVal = Math.max(c, p, 1);
              return `
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                    <span class="small" style="text-transform:capitalize">${type}</span>
                    <span class="small muted">${prevYr}: ${p} · ${curYr}: ${c}</span>
                  </div>
                  <div style="display:flex;gap:3px">
                    <div style="flex:1;height:8px;background:#e8e8e8;border-radius:2px;overflow:hidden">
                      <div style="height:100%;width:${Math.round((p/maxVal)*100)}%;background:#aac;border-radius:2px"></div>
                    </div>
                    <div style="flex:1;height:8px;background:#e8e8e8;border-radius:2px;overflow:hidden">
                      <div style="height:100%;width:${Math.round((c/maxVal)*100)}%;background:#1B4F8A;border-radius:2px"></div>
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;margin-top:2px">
                    <span class="small muted" style="flex:1">${prevYr}</span>
                    <span class="small" style="flex:1;color:#1B4F8A;font-weight:600">${curYr}</span>
                  </div>
                </div>`;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. ANDROID SMARTWATCH PARITY — WearOS bridge + BLE HR fallback
  // On Android: native WearOS data pushed via window.PIQ_WEAROS_BRIDGE.
  // On iOS: Apple Watch data via PIQ_HEALTH_BRIDGE (shared with feature 2).
  // Fallback: Web Bluetooth HR characteristic (same as feature 2).
  // ─────────────────────────────────────────────────────────────────────────
  function initWearable() {
    if (!state.wearable) {
      state.wearable = {
        platform: null,         // "ios" | "android" | "web_ble"
        connected: false,
        deviceName: null,
        currentHR: null,
        sessionHR: [],          // [{ts, hr}] during active workout
        lastSync: null,
      };
    }
    // WearOS bridge — Android native layer calls this
    window.PIQ_WEAROS_BRIDGE = function(payload) {
      try {
        const d = typeof payload === "string" ? JSON.parse(payload) : payload;
        state.wearable.platform   = "android";
        state.wearable.connected  = true;
        state.wearable.deviceName = d.deviceName || "WearOS Device";
        state.wearable.currentHR  = d.hr   ?? state.wearable.currentHR;
        state.wearable.lastSync   = nowISO();
        if (d.hr) state.wearable.sessionHR.push({ ts: nowISO(), hr: d.hr });
        // Share data with the health module
        if (window.PIQ_HEALTH_BRIDGE) window.PIQ_HEALTH_BRIDGE({ source: "google_fit", hr: d.hr, steps: d.steps });
        persist();
        renderWearable();
      } catch (e) { console.error("PIQ_WEAROS_BRIDGE error", e); }
    };
  }

  function renderWearable() {
    const body = $("wearableBody");
    if (!body) return;
    initWearable();
    const w = state.wearable;

    // HR history sparkline points
    const hrs = w.sessionHR.slice(-20);
    let sparkline = "";
    if (hrs.length > 1) {
      const minHR = Math.min(...hrs.map(h => h.hr));
      const maxHR = Math.max(...hrs.map(h => h.hr));
      const span  = maxHR - minHR || 1;
      const pts   = hrs.map((h, i) => {
        const x = Math.round((i / (hrs.length - 1)) * 200);
        const y = Math.round(50 - ((h.hr - minHR) / span) * 40);
        return `${x},${y}`;
      }).join(" ");
      sparkline = `<svg width="200" height="54" style="margin-top:8px">
        <polyline points="${pts}" fill="none" stroke="#C0392B" stroke-width="2" stroke-linejoin="round"/>
        ${hrs.map((h,i) => {
          const x = Math.round((i/(hrs.length-1))*200);
          const y = Math.round(50-((h.hr-minHR)/span)*40);
          return `<circle cx="${x}" cy="${y}" r="${i===hrs.length-1?4:2}" fill="${i===hrs.length-1?"#C0392B":"#fff"}" stroke="#C0392B" stroke-width="1.5"/>`;
        }).join("")}
      </svg>`;
    }

    const platformBadge = (p) => ({
      ios:     '<span style="background:#000;color:#fff;border-radius:4px;padding:2px 8px;font-size:10px">Apple Watch</span>',
      android: '<span style="background:#3ddc84;color:#000;border-radius:4px;padding:2px 8px;font-size:10px">WearOS</span>',
      web_ble: '<span style="background:#1B4F8A;color:#fff;border-radius:4px;padding:2px 8px;font-size:10px">BLE</span>',
    }[p] || "");

    body.innerHTML = `
      <div class="mini">
        <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
          <span>Smartwatch ${w.connected ? '● <span style="color:#1A6B3C">Connected</span>' : '○ <span style="color:#aaa">Not connected</span>'}</span>
          ${w.platform ? platformBadge(w.platform) : ""}
        </div>
        <div class="minibody">
          ${w.currentHR ? `
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
              <span style="font-size:44px;font-weight:800;color:#C0392B;line-height:1">${w.currentHR}</span>
              <span class="small muted">bpm</span>
            </div>
            ${sparkline}` : `<div class="small muted" style="margin-bottom:14px">No heart rate data. Connect a device.</div>`}
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
            <button class="btn" id="btnConnectWear">Connect Wearable</button>
            <button class="btn ghost" id="btnSimHR">Simulate HR (demo)</button>
          </div>
          <div class="small muted" style="margin-top:12px;line-height:1.6">
            <strong>iOS:</strong> Connect via Apple Watch app — PerformanceIQ reads Health data automatically.<br>
            <strong>Android:</strong> Open the PerformanceIQ WearOS app on your watch and tap Connect.<br>
            <strong>Other devices:</strong> Use Bluetooth connection below.
          </div>
        </div>
      </div>
    `;

    $("btnConnectWear")?.addEventListener("click", connectBLE); // reuse BLE connect from feature 2

    $("btnSimHR")?.addEventListener("click", () => {
      // Demo: push simulated HR readings every second
      let count = 0;
      const interval = setInterval(() => {
        const hr = 140 + Math.round((Math.random() - 0.5) * 20);
        state.wearable.currentHR = hr;
        state.wearable.connected = true;
        state.wearable.platform  = state.wearable.platform || "web_ble";
        state.wearable.sessionHR.push({ ts: nowISO(), hr });
        persist();
        renderWearable();
        if (++count >= 10) clearInterval(interval);
      }, 800);
      toast("Simulating HR data…");
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. AI TRAINING SUGGESTIONS
  // Analyses session history (volume, load, session type distribution, streak)
  // and surfaces 2–3 specific, actionable suggestions. No cloud required —
  // pure algorithmic analysis with rule-based insight engine.
  // ─────────────────────────────────────────────────────────────────────────
  function computeAISuggestions() {
    const sessions  = state.sessions || [];
    const profile   = state.profile  || {};
    const insights  = state.insights  || {};
    const weekly    = insights.weekly || [];
    const streak    = computeStreak();
    const suggestions = [];

    // ── Rule 1: Posterior chain underload ──────────────────────────────────
    const strengthSessions = sessions.filter(s => s.sessionType === "strength");
    const hasHinge = strengthSessions.some(s =>
      s.blocks?.some(b => b.items?.some(it => /rdl|deadlift|hinge|bridge/i.test(it.name))));
    if (strengthSessions.length >= 2 && !hasHinge) {
      suggestions.push({
        icon: "🏋️",
        title: "Add posterior chain work",
        body: `Your last ${strengthSessions.length} strength sessions show no RDL or hip-hinge movement. Posterior chain underloading increases hamstring injury risk over a full season. Consider adding Romanian Deadlift or Single-Leg Hinge next session.`,
        cta: "Generate strength session",
        action: "gen_strength",
        priority: "high",
      });
    }

    // ── Rule 2: Recovery deficit ───────────────────────────────────────────
    const recentWeek = weekly[0];
    const prevWeek   = weekly[1];
    if (recentWeek && prevWeek && recentWeek.load > prevWeek.load * 1.25) {
      suggestions.push({
        icon: "😴",
        title: "Load spike detected — schedule recovery",
        body: `This week's training load (${recentWeek.load}) is ${Math.round(((recentWeek.load/prevWeek.load)-1)*100)}% higher than last week. A 10% weekly load increase is the recommended ceiling. Schedule at least one active recovery session before your next high-intensity day.`,
        cta: "Generate recovery session",
        action: "gen_recovery",
        priority: "high",
      });
    }

    // ── Rule 3: Session type imbalance ─────────────────────────────────────
    const recentTypes = sessions.slice(-6).map(s => s.sessionType);
    const pracCount   = recentTypes.filter(t => t === "practice").length;
    const strCount    = recentTypes.filter(t => t === "strength").length;
    if (recentTypes.length >= 5 && strCount === 0) {
      suggestions.push({
        icon: "💪",
        title: "No strength work in 6 sessions",
        body: `Your last 6 sessions have been practice-only. Sport-specific strength training should complement skill work to build force production and reduce fatigue injury risk. Add 1–2 strength blocks per week.`,
        cta: "Generate strength session",
        action: "gen_strength",
        priority: "medium",
      });
    }
    if (recentTypes.length >= 5 && pracCount === 0) {
      suggestions.push({
        icon: "🏀",
        title: "No practice sessions recently",
        body: `The last 6 sessions have been strength or conditioning focused. Sport-skill integration may be declining — consider scheduling a sport-specific practice session to maintain technical proficiency.`,
        cta: "Generate practice session",
        action: "gen_practice",
        priority: "medium",
      });
    }

    // ── Rule 4: Streak milestone ───────────────────────────────────────────
    if (streak >= 7 && streak % 7 === 0) {
      suggestions.push({
        icon: "🔥",
        title: `${streak}-day streak — consider a deload`,
        body: `You've logged ${streak} consecutive days. Training every day without a deload week can lead to cumulative fatigue and overreaching. Plan a reduced-volume week: same frequency, 40% lower load.`,
        cta: "Plan deload week",
        action: "gen_recovery",
        priority: "medium",
      });
    }

    // ── Rule 5: Taper timing ───────────────────────────────────────────────
    const plan = state.periodization?.plan;
    if (plan && plan.weeks) {
      const today    = new Date().toISOString().slice(0, 10);
      const lastWeek = plan.weeks[plan.weeks.length - 1];
      if (lastWeek) {
        const daysToEnd = Math.round((new Date(lastWeek.startDate) - new Date(today)) / 86400000);
        if (daysToEnd > 0 && daysToEnd <= 14 && recentWeek && recentWeek.load > 30) {
          suggestions.push({
            icon: "📉",
            title: "Taper window — reduce volume now",
            body: `Your periodization plan ends in ${daysToEnd} days. Standard taper protocol: reduce volume by 40–60% while maintaining intensity. Your current weekly load (${recentWeek?.load || "—"}) should decrease to ~${Math.round((recentWeek?.load || 0) * 0.5)} this week.`,
            cta: "View periodization plan",
            action: "view_periodization",
            priority: "high",
          });
        }
      }
    }

    // ── Default if no issues detected ─────────────────────────────────────
    if (!suggestions.length) {
      suggestions.push({
        icon: "✅",
        title: "Training looks balanced",
        body: profile.role === "athlete"
          ? `Your recent training mix, load progression, and recovery are within recommended ranges. Keep your current session distribution and check back after your next 3 sessions for updated suggestions.`
          : `Your athletes' training programmes are well-structured. Monitor load spikes after next round of sessions — suggestions will update automatically as data accumulates.`,
        cta: null,
        priority: "info",
      });
    }

    return suggestions.slice(0, 3); // cap at 3 cards
  }

  function renderAISuggestions() {
    const body = $("aiSuggestionsBody");
    if (!body) return;

    const suggestions = computeAISuggestions();
    const priorityColor = { high: "#C0392B", medium: "#1B4F8A", info: "#1A6B3C" };
    const priorityBg    = { high: "#fdf0ef", medium: "#eef4fc", info: "#f0faf4" };
    const priorityBorder = { high: "#f2b8b4", medium: "#b4cef0", info: "#b8e8cb" };

    const cards = suggestions.map(s => `
      <div style="background:${priorityBg[s.priority]};border:1px solid ${priorityBorder[s.priority]};border-radius:10px;padding:16px 18px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="font-size:22px;flex-shrink:0;margin-top:2px">${s.icon}</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:${priorityColor[s.priority]}">${s.title}</div>
            <div style="font-size:13px;line-height:1.65;color:#444;margin-bottom:${s.cta ? "12px" : "0"}">${s.body}</div>
            ${s.cta ? `<button class="btn ghost" style="font-size:12px;border-color:${priorityColor[s.priority]};color:${priorityColor[s.priority]}" data-action="${s.action}">${s.cta} →</button>` : ""}
          </div>
        </div>
      </div>`).join("");

    body.innerHTML = `
      <div class="mini">
        <div class="minihead" style="display:flex;justify-content:space-between;align-items:center">
          <span>AI Training Suggestions</span>
          <button class="btn ghost" id="btnRefreshSuggestions" style="font-size:12px">Refresh</button>
        </div>
        <div class="minibody">
          <div class="small muted" style="margin-bottom:14px">Based on your last ${(state.sessions||[]).length} sessions, current streak of ${computeStreak()} days, and periodization plan.</div>
          ${cards}
        </div>
      </div>
    `;

    $("btnRefreshSuggestions")?.addEventListener("click", () => renderAISuggestions());

    body.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const typeMap = { gen_strength: "strength", gen_recovery: "recovery", gen_practice: "practice" };
        if (typeMap[action]) {
          const gen = generateWorkoutFor(state.profile.sport || "basketball", typeMap[action], state.profile.injuries || []);
          state.ui.todaySession = gen;
          persist("Session generated from AI suggestion");
          showView("train");
          renderTrain();
          toast(`${typeMap[action]} session generated`);
        } else if (action === "view_periodization") {
          showView("profile");
        }
      });
    });
  }


  function renderAll() {
    try {
      renderHome();
      renderTeam();
      renderTrain();
      renderProfile();
      renderTodayBlock();
      renderPeriodizationUI();
      renderInsights();
      renderMealPlan();
      // Wave 1 feature renders — each silently skips if DOM element absent
      renderMessaging();
      renderHealthSync();
      renderParentPortal();
      renderBarcodeScanner();
      renderReportLinks();
      renderADAnalytics();
      renderWearable();
      renderAISuggestions();
      renderPRTracker();
      renderBadges();
      checkAndAwardBadges();
      setTeamPill();
      applyStatusFromMeta();
    } catch (e) {
      console.error("Render error", e);
    }
  }


  // Individual renderers reuse earlier functions
  function renderHome() {
    const homeSub = $("homeSub");
    if (homeSub) homeSub.textContent = `${state.profile.role || "coach"} • ${state.profile.sport || "basketball"}`;
    renderTodayBlock();
  }

  function renderProfile() {
    // existing content plus periodization + insights appended
    renderPeriodizationUI();
    // profile basic info
    const body = $("profileBody");
    if (!body) return;
    // top part may be overwritten by periodization UI; ensure role/sport selects exist in drawer already
    // but create a compact overview here
    const role = state.profile.role || "coach";
    const sport = state.profile.sport || "basketball";
    // ensure Periodization UI remains (it writes into #profileBody), so we won't overwrite here
  }

  // ---------- Initial boot ----------
  function boot() {
    // ensure DOM hooks exist
    bindUI();
    // prefill account drawer selects
    const roleSelect = $("roleSelect");
    const sportSelect = $("sportSelect");
    const pref = $("preferredSessionSelect");
    if (roleSelect) roleSelect.value = state.profile.role || "coach";
    if (sportSelect) sportSelect.value = state.profile.sport || "basketball";
    if (pref) pref.value = state.profile.preferred_session_type || "strength";
    // theme defaults
    if (state.profile && state.profile.theme) {
      document.documentElement.setAttribute("data-theme", state.profile.theme.mode || "dark");
    }
    // set initial view
    showView(state.ui.view || "home");
    // initial render
    renderAll();
    toast("PerformanceIQ ready", 1400);
  }

  // Boot on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // ---------- Expose debug helpers (safe) ----------
  window.__PIQ_DEBUG__ = {
    generateWorkoutFor,
    generate12WeekPlan,
    generateMealPlan,
    computeInsights,
    getState: () => state,
    setState: (s) => { state = s; persist("State set via debug"); renderAll(); }
  };
})();
