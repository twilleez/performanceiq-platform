// core.js — v4.0.0 (Phase 4 — Accurate Sport Workouts, Levels, Equipment Swap)
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
      profile: { role: "coach", sport: "basketball", preferred_session_type: "strength", injuries: [], weight_lbs: 160, goal: "maintain", activity: "med", level: "intermediate", equipment: ["dumbbell","barbell","bar","bench","box","cable","med_ball","sled","rower","bike","track","court","hill","hurdles","trap_bar"] },
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
  // EXERCISE LIBRARY  v4.0 — Full sport science accuracy
  //
  // Equipment tags used throughout:
  //   "none"      = bodyweight only
  //   "dumbbell"  = dumbbells
  //   "barbell"   = barbell + plates
  //   "trap_bar"  = hex/trap bar
  //   "cable"     = cable machine
  //   "med_ball"  = medicine ball
  //   "bar"       = pull-up / chin-up bar
  //   "bench"     = flat bench
  //   "box"       = plyo box
  //   "band"      = resistance band
  //   "sled"      = prowler/sled
  //   "rower"     = rowing machine
  //   "bike"      = stationary bike / assault bike
  //   "court"     = basketball / volleyball court
  //   "track"     = running track or marked turf
  //   "hill"      = outdoor hill / incline
  //   "hurdles"   = hurdle sticks
  //   "pool"      = swimming pool
  //
  // Each exercise has:
  //   beginner   — low-skill, lower-load prescription
  //   advanced   — higher-load, higher-skill prescription
  //   altEquip   — map of equipment → alternate exercise key when that
  //                equipment is NOT available
  //   subs       — injury-tag → alternate exercise key
  //   prTrackable / prMetric
  // ══════════════════════════════════════════════════════════════════════════

  // ── Equipment availability helpers ────────────────────────────────────────
  // state.profile.equipment = array of available equipment tags, e.g.
  //   ["dumbbell","bar","bench","band","box"]
  // If empty / absent  → bodyweight-only mode

  function hasEquip(tag) {
    const avail = state.profile?.equipment;
    if (!avail || !avail.length) return false;
    return avail.includes(tag);
  }

  function equip(primary, ...fallbacks) {
    // Return first equipment tag that the user has, or "none"
    if (hasEquip(primary)) return primary;
    for (const f of fallbacks) { if (hasEquip(f)) return f; }
    return "none";
  }

  // ── Athlete level helper ───────────────────────────────────────────────────
  // state.profile.level = "beginner" | "intermediate" | "advanced"
  function athleteLevel() {
    return state.profile?.level || "intermediate";
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXERCISE DEFINITIONS
  // beginner / advanced are { cue, sets, reps, load } overrides for that tier.
  // altEquip[missingEquipTag] = fallback exercise key to use instead.
  // ══════════════════════════════════════════════════════════════════════════
  const EXERCISE_LIB = {

    // ── LOWER BODY ──────────────────────────────────────────────────────────
    strength: {

      goblet_squat: {
        title:"Goblet Squat", equipment:"dumbbell",
        beginner:  { cue:"3 × 10 — heel elevation if needed, hip crease below knee",  sets:3, reps:10, load:"low"      },
        intermediate:{ cue:"3 × 10 — tempo 3-1-1, elbows track inside knees",          sets:3, reps:10, load:"moderate" },
        advanced:  { cue:"4 × 6 — pause at bottom 2 sec, heavy KB/DB",               sets:4, reps:6,  load:"high"     },
        altEquip:  { dumbbell:"bodyweight_squat_adv" },
        subs:      { knee:"step_up", back:"goblet_squat" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      split_squat: {
        title:"Bulgarian Split Squat", equipment:"dumbbell",
        beginner:  { cue:"3 × 8/leg — rear foot on low surface, bodyweight or light DB", sets:3, reps:8,  load:"low"      },
        intermediate:{ cue:"3 × 8/leg — rear foot elevated on bench, moderate DB",        sets:3, reps:8,  load:"moderate" },
        advanced:  { cue:"4 × 6/leg — barbell on back or heavy DBs, 3-sec eccentric",   sets:4, reps:6,  load:"high"     },
        altEquip:  { dumbbell:"reverse_lunge_bw", barbell:"split_squat" },
        subs:      { knee:"step_up", hip:"reverse_lunge_bw" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      rdl: {
        title:"Romanian Deadlift", equipment:"barbell",
        beginner:  { cue:"3 × 10 — light bar or DBs, hinge from hips, soft knee",       sets:3, reps:10, load:"low"      },
        intermediate:{ cue:"3 × 8 — barbell, push floor away, maintain lumbar curve",    sets:3, reps:8,  load:"moderate" },
        advanced:  { cue:"4 × 5 — heavy barbell, eccentric 3 sec, explosive up",        sets:4, reps:5,  load:"high"     },
        altEquip:  { barbell:"db_rdl" },
        subs:      { back:"hip_thrust", hamstring:"glute_bridge" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      db_rdl: {
        title:"DB Romanian Deadlift", equipment:"dumbbell",
        beginner:  { cue:"3 × 10 — light DBs, hinge until mild hamstring tension",      sets:3, reps:10, load:"low"      },
        intermediate:{ cue:"3 × 10 — heavy DBs, scapulae packed, lumbar neutral",       sets:3, reps:10, load:"moderate" },
        advanced:  { cue:"4 × 8 — tempo 3-0-1, single-leg variation option",            sets:4, reps:8,  load:"high"     },
        altEquip:  { dumbbell:"bodyweight_rdl" },
        subs:      { back:"glute_bridge", hamstring:"glute_bridge" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      trap_bar_deadlift: {
        title:"Trap Bar Deadlift", equipment:"trap_bar",
        beginner:  { cue:"4 × 5 — high handles, hips high, push floor away",            sets:4, reps:5,  load:"moderate" },
        intermediate:{ cue:"4 × 4 — low handles, hips athletic position, bar mid-foot", sets:4, reps:4,  load:"high"     },
        advanced:  { cue:"5 × 3 — max velocity intent, 85%+ 1RM, full reset each rep",  sets:5, reps:3,  load:"max"      },
        altEquip:  { trap_bar:"rdl", barbell:"rdl" },
        subs:      { back:"db_rdl", knee:"goblet_squat" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      barbell_back_squat: {
        title:"Back Squat", equipment:"barbell",
        beginner:  { cue:"3 × 8 — high bar, depth to parallel, knees track toes",       sets:3, reps:8,  load:"moderate" },
        intermediate:{ cue:"4 × 5 — hip crease below parallel, brace hard, stay tall",  sets:4, reps:5,  load:"high"     },
        advanced:  { cue:"5 × 3 — low bar, 80%+ 1RM, rebound out of hole",              sets:5, reps:3,  load:"max"      },
        altEquip:  { barbell:"goblet_squat" },
        subs:      { knee:"split_squat", back:"goblet_squat" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      power_clean: {
        title:"Power Clean", equipment:"barbell",
        beginner:  { cue:"4 × 4 — hang position, triple extension, rack at shoulder height", sets:4, reps:4, load:"moderate" },
        intermediate:{ cue:"4 × 3 — from floor, aggressive pull, fast elbows through",   sets:4, reps:3,  load:"high"     },
        advanced:  { cue:"5 × 2 — 80%+ 1RM, elbows lead, aggressive turnover",           sets:5, reps:2,  load:"max"      },
        altEquip:  { barbell:"db_power_clean" },
        subs:      { shoulder:"kb_swing", wrist:"kb_swing" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      db_power_clean: {
        title:"DB Hang Clean", equipment:"dumbbell",
        beginner:  { cue:"3 × 6 — hang position, triple extension, DBs to shoulders",   sets:3, reps:6,  load:"low"      },
        intermediate:{ cue:"4 × 5 — aggressive hip drive, fast elbow turnover",          sets:4, reps:5,  load:"moderate" },
        advanced:  { cue:"4 × 4 — heavy DBs, max acceleration intent",                  sets:4, reps:4,  load:"high"     },
        altEquip:  { dumbbell:"kb_swing" },
        subs:      { wrist:"kb_swing", shoulder:"box_jump" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      kb_swing: {
        title:"Kettlebell Swing", equipment:"dumbbell", // use DB as alt for KB
        beginner:  { cue:"3 × 12 — hip hinge pattern, KB between feet, powerful hip snap", sets:3, reps:12, load:"low"     },
        intermediate:{ cue:"4 × 12 — heavy KB, lat tension on backswing, eye level at top",sets:4, reps:12, load:"moderate"},
        advanced:  { cue:"5 × 10 — single-arm or double KB, ballistic hip extension",    sets:5, reps:10, load:"high"     },
        altEquip:  { dumbbell:"bodyweight_rdl" },
        subs:      { back:"glute_bridge", knee:"glute_bridge" },
        prTrackable:false, prMetric:"reps",
      },

      hip_thrust: {
        title:"Hip Thrust", equipment:"barbell",
        beginner:  { cue:"3 × 12 — bodyweight or DB, upper back on bench, full hip extension", sets:3, reps:12, load:"low" },
        intermediate:{ cue:"3 × 10 — barbell, toes forward, posterior pelvic tilt at top",    sets:3, reps:10, load:"moderate" },
        advanced:  { cue:"4 × 8 — heavy barbell, 1-sec pause at top, band around knees",     sets:4, reps:8,  load:"high"    },
        altEquip:  { barbell:"glute_bridge", bench:"glute_bridge" },
        subs:      { back:"glute_bridge", knee:"glute_bridge" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      nordic_curl: {
        title:"Nordic Hamstring Curl", equipment:"none",
        beginner:  { cue:"3 × 4 — partner holds ankles, use hands to control descent",  sets:3, reps:4,  load:"moderate" },
        intermediate:{ cue:"3 × 5 — controlled fall, pull back using hamstrings only",  sets:3, reps:5,  load:"high"     },
        advanced:  { cue:"4 × 6 — add weight vest or pause at bottom",                  sets:4, reps:6,  load:"max"      },
        altEquip:  {},
        subs:      { hamstring:"db_rdl", knee:"glute_bridge" },
        prTrackable:true, prMetric:"reps",
      },

      single_leg_deadlift: {
        title:"Single-Leg RDL", equipment:"dumbbell",
        beginner:  { cue:"3 × 8/leg — light DB or bodyweight, hand on wall for balance", sets:3, reps:8,  load:"low"      },
        intermediate:{ cue:"3 × 8/leg — contralateral DB, hips square, T-spine neutral", sets:3, reps:8,  load:"moderate" },
        advanced:  { cue:"4 × 6/leg — heavy DB, eyes down, controlled wobble is fine",   sets:4, reps:6,  load:"high"     },
        altEquip:  { dumbbell:"bodyweight_rdl" },
        subs:      { balance:"step_up", ankle:"rdl" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      step_up: {
        title:"Loaded Step-Up", equipment:"dumbbell",
        beginner:  { cue:"3 × 10/leg — low box, bodyweight, drive through heel",        sets:3, reps:10, load:"low"      },
        intermediate:{ cue:"3 × 8/leg — moderate box + DBs, no push-off from bottom",  sets:3, reps:8,  load:"moderate" },
        advanced:  { cue:"4 × 6/leg — high box + heavy DBs, full hip extension at top", sets:4, reps:6,  load:"high"     },
        altEquip:  { dumbbell:"step_up_bw", box:"reverse_lunge_bw" },
        subs:      { knee:"wall_sit", hip:"glute_bridge" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      copenhagen_plank: {
        title:"Copenhagen Side Plank", equipment:"bench",
        beginner:  { cue:"3 × 20 sec/side — bottom knee on floor, hip elevated",        sets:3, reps:20, load:"low"      },
        intermediate:{ cue:"3 × 30 sec/side — top ankle on bench, hips level",          sets:3, reps:30, load:"moderate" },
        advanced:  { cue:"4 × 45 sec/side — full Copenhagen, add hip adduction reps",   sets:4, reps:45, load:"high"     },
        altEquip:  { bench:"side_plank_adv" },
        subs:      { groin:"side_plank_adv" },
        prTrackable:true, prMetric:"time_sec",
      },

      // ── UPPER BODY ──────────────────────────────────────────────────────

      bench_press: {
        title:"Bench Press", equipment:"barbell",
        beginner:  { cue:"3 × 8 — grip just outside shoulder-width, touch chest, lock out", sets:3, reps:8, load:"moderate" },
        intermediate:{ cue:"4 × 6 — arch, leg drive, bar path slight curve to shoulder",   sets:4, reps:6, load:"high"     },
        advanced:  { cue:"5 × 3 — competition arch, 80%+ 1RM, pause option",               sets:5, reps:3, load:"max"      },
        altEquip:  { barbell:"db_bench" },
        subs:      { shoulder:"db_bench", wrist:"pushup_plus" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      db_bench: {
        title:"DB Bench Press", equipment:"dumbbell",
        beginner:  { cue:"3 × 12 — full stretch at bottom, neutral grip ok",            sets:3, reps:12, load:"low"      },
        intermediate:{ cue:"3 × 10 — pronated grip, full ROM, controlled eccentric",    sets:3, reps:10, load:"moderate" },
        advanced:  { cue:"4 × 8 — heavy DBs, 2-sec pause at chest",                    sets:4, reps:8,  load:"high"     },
        altEquip:  { dumbbell:"pushup_plus" },
        subs:      { shoulder:"pushup_plus" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      push_press: {
        title:"Push Press", equipment:"barbell",
        beginner:  { cue:"3 × 6 — bar in front rack, slight dip-drive, lock out overhead", sets:3, reps:6, load:"moderate" },
        intermediate:{ cue:"4 × 5 — aggressive leg drive, fast elbows from rack",          sets:4, reps:5, load:"high"     },
        advanced:  { cue:"5 × 3 — heavy loading, re-rack under control, wrists straight",  sets:5, reps:3, load:"max"      },
        altEquip:  { barbell:"db_push_press" },
        subs:      { shoulder:"db_shoulder_press", wrist:"pike_pushup" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      db_push_press: {
        title:"DB Push Press", equipment:"dumbbell",
        beginner:  { cue:"3 × 8 — DBs at shoulders, small dip, drive overhead",         sets:3, reps:8,  load:"low"      },
        intermediate:{ cue:"3 × 8 — aggressive leg drive, full lockout, lower controlled",sets:3, reps:8, load:"moderate" },
        advanced:  { cue:"4 × 6 — heavy DBs, single-arm alternating option",            sets:4, reps:6,  load:"high"     },
        altEquip:  { dumbbell:"pike_pushup" },
        subs:      { shoulder:"pike_pushup" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      db_shoulder_press: {
        title:"DB Shoulder Press", equipment:"dumbbell",
        beginner:  { cue:"3 × 12 — seated, 90° at bottom, elbows slightly forward",     sets:3, reps:12, load:"low"      },
        intermediate:{ cue:"3 × 10 — standing, slight core brace, full lockout",         sets:3, reps:10, load:"moderate" },
        advanced:  { cue:"4 × 8 — Arnold press or Z-press variation",                   sets:4, reps:8,  load:"high"     },
        altEquip:  { dumbbell:"pike_pushup" },
        subs:      { shoulder:"pike_pushup", neck:"lateral_raise" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      bent_over_row: {
        title:"Bent-Over Row", equipment:"barbell",
        beginner:  { cue:"3 × 10 — 45° torso, overhand, pull to lower chest",          sets:3, reps:10, load:"low"      },
        intermediate:{ cue:"3 × 8 — horizontal torso, elbows flare, retract scap",     sets:3, reps:8,  load:"moderate" },
        advanced:  { cue:"4 × 6 — pendlay row (dead stop) or heavy barbell row",       sets:4, reps:6,  load:"high"     },
        altEquip:  { barbell:"db_row" },
        subs:      { back:"db_row", shoulder:"band_row" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      db_row: {
        title:"Single-Arm DB Row", equipment:"dumbbell",
        beginner:  { cue:"3 × 12/side — bench-supported, full stretch at bottom",      sets:3, reps:12, load:"low"      },
        intermediate:{ cue:"3 × 10/side — chest-supported or bent-over, elbow to hip", sets:3, reps:10, load:"moderate" },
        advanced:  { cue:"4 × 8/side — heavy DB, kroc row style, controlled eccentric",sets:4, reps:8,  load:"high"     },
        altEquip:  { dumbbell:"inverted_row_bw" },
        subs:      { back:"band_row", shoulder:"band_row" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      pullup: {
        title:"Pull-Up", equipment:"bar",
        beginner:  { cue:"3 × 3-5 — band-assisted or jumping negatives, full hang",    sets:3, reps:4,  load:"moderate" },
        intermediate:{ cue:"3 × max — dead hang, chin above bar, elbows fully extend", sets:3, reps:8,  load:"high"     },
        advanced:  { cue:"4 × max — add weight belt, strict dead-hang, L-sit option",  sets:4, reps:10, load:"max"      },
        altEquip:  { bar:"inverted_row_bw" },
        subs:      { shoulder:"band_row", elbow:"inverted_row_bw" },
        prTrackable:true, prMetric:"reps",
      },

      lat_pulldown: {
        title:"Lat Pulldown", equipment:"cable",
        beginner:  { cue:"3 × 12 — wide grip, pull to upper chest, lean back slightly",sets:3, reps:12, load:"low"      },
        intermediate:{ cue:"3 × 10 — supinated grip, elbows drive down to hip",        sets:3, reps:10, load:"moderate" },
        advanced:  { cue:"4 × 8 — neutral grip, pause at bottom, 3-sec eccentric",     sets:4, reps:8,  load:"high"     },
        altEquip:  { cable:"band_row" },
        subs:      { shoulder:"band_row" },
        prTrackable:true, prMetric:"weight_lbs",
      },

      cable_chop: {
        title:"Cable Rotational Chop", equipment:"cable",
        beginner:  { cue:"3 × 10/side — half-kneeling, high to low, resist rotation",  sets:3, reps:10, load:"low"      },
        intermediate:{ cue:"3 × 10/side — standing, rotate through thoracic spine",    sets:3, reps:10, load:"moderate" },
        advanced:  { cue:"4 × 10/side — heavy cable, explosive concentric, slow ecc",  sets:4, reps:10, load:"high"     },
        altEquip:  { cable:"med_ball_rotational_throw", band:"band_chop" },
        subs:      { back:"pallof_press", shoulder:"dead_bug" },
        prTrackable:false, prMetric:"weight_lbs",
      },

      pallof_press: {
        title:"Pallof Press", equipment:"cable",
        beginner:  { cue:"3 × 10/side — half-kneeling, press and hold 2 sec",          sets:3, reps:10, load:"low"      },
        intermediate:{ cue:"3 × 12/side — standing, move away from anchor = harder",   sets:3, reps:12, load:"moderate" },
        advanced:  { cue:"4 × 12/side — overhead Pallof or tall-kneeling variation",   sets:4, reps:12, load:"high"     },
        altEquip:  { cable:"band_pallof", band:"band_pallof" },
        subs:      { back:"dead_bug", shoulder:"dead_bug" },
        prTrackable:false, prMetric:"reps",
      },

      dead_bug: {
        title:"Dead Bug", equipment:"none",
        beginner:  { cue:"3 × 6/side — lower back glued to floor, slow extension",     sets:3, reps:6,  load:"low"      },
        intermediate:{ cue:"3 × 8/side — opposite arm + leg, exhale fully, 3-sec hold",sets:3, reps:8,  load:"low"      },
        advanced:  { cue:"3 × 10/side — add light DB in hand or resistance band",      sets:3, reps:10, load:"moderate" },
        altEquip:  {},
        subs:      {},
        prTrackable:false, prMetric:"reps",
      },
    },

    // ── PLYOMETRICS ──────────────────────────────────────────────────────────
    plyo: {

      broad_jump: {
        title:"Broad Jump", equipment:"none",
        beginner:  { cue:"4 × 3 — stick landing 2 sec, soft knees, hips back",         sets:4, reps:3,  load:"explosive" },
        intermediate:{ cue:"4 × 4 — max horizontal distance, aggressive arm swing",    sets:4, reps:4,  load:"explosive" },
        advanced:  { cue:"5 × 4 — triple broad jump, continuous, stick final landing",  sets:5, reps:4,  load:"explosive" },
        altEquip:  {},
        subs:      { knee:"lateral_step_up", ankle:"lateral_step_up" },
        prTrackable:true, prMetric:"distance_m",
      },

      box_jump: {
        title:"Box Jump", equipment:"box",
        beginner:  { cue:"4 × 4 — step DOWN off box (don't jump down), land softly",   sets:4, reps:4,  load:"moderate"  },
        intermediate:{ cue:"4 × 5 — countermovement, full hip extension, stick top",   sets:4, reps:5,  load:"explosive" },
        advanced:  { cue:"4 × 5 — high box, rebound option — minimal ground contact",  sets:4, reps:5,  load:"explosive" },
        altEquip:  { box:"broad_jump" },
        subs:      { knee:"broad_jump", ankle:"step_up_bw" },
        prTrackable:true, prMetric:"reps",
      },

      approach_jumps: {
        title:"4-Step Approach Jump", equipment:"none",
        beginner:  { cue:"3 × 5 — 2-step approach, two-foot takeoff, land balanced",   sets:3, reps:5,  load:"moderate"  },
        intermediate:{ cue:"4 × 6 — full 4-step approach, swing arms, peak height",    sets:4, reps:6,  load:"explosive" },
        advanced:  { cue:"5 × 6 — attack step + jump-set timing, arm swing timing",    sets:5, reps:6,  load:"explosive" },
        altEquip:  {},
        subs:      { knee:"lateral_step_up", ankle:"lateral_step_up" },
        prTrackable:true, prMetric:"reps",
      },

      lateral_bounds: {
        title:"Lateral Bounds", equipment:"none",
        beginner:  { cue:"3 × 4/side — small bound, stick 2 sec, single-leg balance",  sets:3, reps:4,  load:"moderate"  },
        intermediate:{ cue:"4 × 6/side — max lateral distance, aggressive push-off",   sets:4, reps:6,  load:"explosive" },
        advanced:  { cue:"5 × 6/side — continuous zigzag, minimal ground time",         sets:5, reps:6,  load:"explosive" },
        altEquip:  {},
        subs:      { ankle:"lateral_step_up", knee:"step_up_bw" },
        prTrackable:false, prMetric:"reps",
      },

      depth_jump: {
        title:"Depth Jump", equipment:"box",
        beginner:  { cue:"— Not for beginners. Use box jump instead." ,                sets:0, reps:0,  load:"none" },
        intermediate:{ cue:"3 × 4 — low box (12\"), step off, immediate jump on contact",sets:3, reps:4, load:"explosive" },
        advanced:  { cue:"4 × 5 — 18-24\" box, amortize instantly, maximum height",    sets:4, reps:5,  load:"max"       },
        altEquip:  { box:"box_jump" },
        subs:      { knee:"box_jump", ankle:"box_jump" },
        prTrackable:false, prMetric:"reps",
      },

      single_leg_hop: {
        title:"Single-Leg Hop Series", equipment:"none",
        beginner:  { cue:"3 × 3/leg — short forward hops, stick each landing 2 sec",   sets:3, reps:3,  load:"moderate"  },
        intermediate:{ cue:"3 × 5/leg — triple-hop for distance, aggressive push-off", sets:3, reps:5,  load:"explosive" },
        advanced:  { cue:"4 × 5/leg — max distance, continuous reactive hops",          sets:4, reps:5,  load:"explosive" },
        altEquip:  {},
        subs:      { ankle:"step_up_bw", knee:"step_up_bw" },
        prTrackable:true, prMetric:"distance_m",
      },

      hurdle_hop: {
        title:"Hurdle Hop", equipment:"hurdles",
        beginner:  { cue:"3 × 4 — low hurdles (6\"), two-foot, stick after last",       sets:3, reps:4,  load:"moderate"  },
        intermediate:{ cue:"4 × 6 — rhythm hops, minimize ground contact time",         sets:4, reps:6,  load:"explosive" },
        advanced:  { cue:"4 × 8 — max height hurdles, single-leg option",               sets:4, reps:8,  load:"max"       },
        altEquip:  { hurdles:"lateral_bounds" },
        subs:      { ankle:"lateral_bounds", knee:"lateral_bounds" },
        prTrackable:false, prMetric:"reps",
      },
    },

    // ── CONDITIONING ────────────────────────────────────────────────────────
    conditioning: {

      suicides: {
        title:"Court Suicides", equipment:"court",
        beginner:  { cue:"4 repeats @ 70% — touch each line, walk back",               sets:1, reps:4,  load:"moderate" },
        intermediate:{ cue:"5 repeats — full court, touch & go, rest 90 sec between",  sets:1, reps:5,  load:"high"     },
        advanced:  { cue:"6 repeats — max effort, rest only 60 sec, track best split", sets:1, reps:6,  load:"max"      },
        altEquip:  { court:"shuttle_run" },
        subs:      { ankle:"bike_sprint", knee:"rower_intervals" },
        prTrackable:true, prMetric:"time_sec",
      },

      shuttle_run: {
        title:"10m Shuttle Run", equipment:"none",
        beginner:  { cue:"4 × 4 reps @ 70% — focus on deceleration & acceleration",    sets:4, reps:4,  load:"moderate" },
        intermediate:{ cue:"5 × 6 — max effort, plant foot, no sliding",               sets:5, reps:6,  load:"high"     },
        advanced:  { cue:"6 × 8 — timed, add 5-10-5 drill variation",                  sets:6, reps:8,  load:"max"      },
        altEquip:  {},
        subs:      { ankle:"bike_sprint", knee:"rower_intervals" },
        prTrackable:true, prMetric:"time_sec",
      },

      tempo_runs: {
        title:"Tempo Runs", equipment:"track",
        beginner:  { cue:"4 × 100m @ 65% — conversational effort, consistent pace",    sets:4, reps:1,  load:"low"      },
        intermediate:{ cue:"6 × 200m @ 75% — 90-sec rest, hold pace each rep",         sets:6, reps:1,  load:"moderate" },
        advanced:  { cue:"8 × 200m @ 80% — 60-sec rest, last 2 at race pace",          sets:8, reps:1,  load:"high"     },
        altEquip:  { track:"shuttle_run" },
        subs:      { ankle:"bike_sprint", knee:"rower_intervals" },
        prTrackable:true, prMetric:"time_sec",
      },

      hill_sprint: {
        title:"Hill Sprints", equipment:"hill",
        beginner:  { cue:"4 × 20m — moderate incline, drive knees, walk down fully",   sets:4, reps:1,  load:"moderate" },
        intermediate:{ cue:"6 × 30m — steep incline, pump arms, explosive each rep",   sets:6, reps:1,  load:"high"     },
        advanced:  { cue:"8 × 40m — max effort, weighted vest option, 2-min rest",     sets:8, reps:1,  load:"max"      },
        altEquip:  { hill:"treadmill_sprint", track:"shuttle_run" },
        subs:      { ankle:"bike_sprint", knee:"rower_intervals" },
        prTrackable:true, prMetric:"time_sec",
      },

      prowler_push: {
        title:"Prowler/Sled Push", equipment:"sled",
        beginner:  { cue:"4 × 20m — light load, upright torso, steady cadence",        sets:4, reps:1,  load:"moderate" },
        intermediate:{ cue:"6 × 20m — heavy load, drive from hips, minimal rest",      sets:6, reps:1,  load:"high"     },
        advanced:  { cue:"8 × 20m — very heavy, sprint pace, 90-sec rest",             sets:8, reps:1,  load:"max"      },
        altEquip:  { sled:"hill_sprint" },
        subs:      { knee:"bike_sprint", ankle:"bike_sprint" },
        prTrackable:true, prMetric:"time_sec",
      },

      rower_intervals: {
        title:"Rower Intervals", equipment:"rower",
        beginner:  { cue:"4 × 250m @ 70% — focus on leg drive → body swing → arms",    sets:4, reps:1,  load:"moderate" },
        intermediate:{ cue:"5 × 500m @ 80% — 2-min rest, rate 24-26 spm",             sets:5, reps:1,  load:"high"     },
        advanced:  { cue:"6 × 500m @ 90% — 90-sec rest, rate 28+ spm, track split",   sets:6, reps:1,  load:"max"      },
        altEquip:  { rower:"bike_sprint" },
        subs:      { back:"bike_sprint", shoulder:"bike_sprint" },
        prTrackable:true, prMetric:"time_sec",
      },

      bike_sprint: {
        title:"Assault Bike / Bike Sprints", equipment:"bike",
        beginner:  { cue:"6 × 10 sec all-out — full recovery between, arms + legs",    sets:6, reps:1,  load:"high"     },
        intermediate:{ cue:"8 × 15 sec all-out — 45 sec rest, track calories per set", sets:8, reps:1,  load:"max"      },
        advanced:  { cue:"10 × 15 sec all-out — 30 sec rest, Tabata-style option",     sets:10,reps:1,  load:"max"      },
        altEquip:  { bike:"shuttle_run" },
        subs:      { back:"shuttle_run", knee:"rower_intervals" },
        prTrackable:true, prMetric:"time_sec",
      },
    },

    // ── BODYWEIGHT FALLBACKS ─────────────────────────────────────────────────
    // Used when required equipment is unavailable — accessible by altEquip mapping
    noEquip: {
      bodyweight_squat:     { title:"Bodyweight Squat",          cue:"4 × 15 — hip depth, heels down, slow 3-sec descent",  load:"moderate" },
      bodyweight_rdl:       { title:"Bodyweight RDL",            cue:"3 × 12 — single or double, hinge pattern, flat back",  load:"moderate" },
      single_leg_hinge:     { title:"Single-Leg Hip Hinge",      cue:"3 × 8/leg — arms forward, spine neutral, balance",     load:"moderate" },
      pike_pushup:          { title:"Pike Push-Up",              cue:"3 × 10 — hips high, head through arms at bottom",      load:"moderate" },
      pushup_plus:          { title:"Push-Up",                   cue:"4 × max — full ROM, chest to floor, full lockout",      load:"moderate" },
      inverted_row_bw:      { title:"Inverted Row",              cue:"3 × max — table or bar low, body rigid, elbows back",   load:"moderate" },
      shuttle_run:          { title:"Shuttle Run 10m",           cue:"5 × 6 — plant, change direction, sprint each way",      load:"high"     },
      timed_effort:         { title:"30-sec Hard Sprint",        cue:"6 repeats — 100%, walk back, full recovery",            load:"high"     },
      glute_bridge:         { title:"Glute Bridge",              cue:"3 × 15 — pause 2 sec at top, posterior tilt",          load:"low"      },
      dead_bug_bw:          { title:"Dead Bug",                  cue:"3 × 8/side — lumbar flat to floor, breathe out",        load:"low"      },
      side_plank_adv:       { title:"Side Plank",                cue:"3 × 40 sec/side — hip stacked, no sag",                load:"moderate" },
      reverse_lunge_bw:     { title:"Reverse Lunge",             cue:"3 × 10/leg — tall posture, knee over ankle",            load:"moderate" },
      step_up_bw:           { title:"Step-Up (bodyweight)",      cue:"3 × 10/leg — drive through heel, no push-off",          load:"low"      },
      wall_sit:             { title:"Wall Sit",                  cue:"3 × 45 sec — 90° at knee, press back into wall",        load:"low"      },
      lateral_step_up:      { title:"Lateral Step-Up",           cue:"3 × 10/leg — lateral load, control descent",            load:"low"      },
      band_row:             { title:"Band Row",                  cue:"3 × 15 — anchor at chest height, elbows back",          load:"low"      },
      band_chop:            { title:"Band Rotational Chop",      cue:"3 × 12/side — anchor high, resist and control",         load:"low"      },
      band_pallof:          { title:"Band Pallof Press",         cue:"3 × 12/side — resist rotation, press & return",         load:"low"      },
      med_ball_rotational_throw: { title:"Med Ball Rotational Throw", cue:"3 × 8/side — wall throw, hip turn drives power",   load:"moderate" },
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SPORT-SPECIFIC MICROBLOCKS  v4.0
  // Science-accurate drill selection for each sport & level.
  //
  // strengthPriority[level] = ordered list of exercise keys for that tier.
  // plyoPriority[level], conditioning[level] likewise.
  // skillBlocks are position/skill-specific — same for all levels but
  // volume/intensity prescribed by the generator based on level.
  // ══════════════════════════════════════════════════════════════════════════
  const SPORT_MICROBLOCKS = {

    // ────────────────────────────────────────────────────────────────────────
    basketball: {
      label:"Basketball", emoji:"🏀",
      // Science rationale: NBA S&C data shows single-leg explosiveness,
      // triple extension (for jump shot + rim protection), reactive agility,
      // and lateral change of direction are the primary physical demands.
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","db_bench","pullup","dead_bug"],
        intermediate: ["split_squat","rdl","push_press","bent_over_row","copenhagen_plank"],
        advanced:     ["trap_bar_deadlift","barbell_back_squat","push_press","pullup","single_leg_deadlift"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","lateral_bounds","approach_jumps"],
        intermediate: ["box_jump","lateral_bounds","approach_jumps","single_leg_hop"],
        advanced:     ["depth_jump","box_jump","lateral_bounds","single_leg_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","tempo_runs"],
        intermediate: ["suicides","shuttle_run"],
        advanced:     ["suicides","bike_sprint"],
      },
      warmup: {
        items:[
          { name:"Ankle circles + hip 90/90 rotation",   cue:"60 sec/side" },
          { name:"Glute bridge walkout",                  cue:"10 reps" },
          { name:"A-skip + lateral shuffle combo",        cue:"2 × 20m each" },
          { name:"Band hip activation (clamshells)",      cue:"15 reps/side" },
        ]
      },
      cooldown: [
        { name:"Seated hamstring stretch",         cue:"60 sec each side" },
        { name:"Hip flexor lunge hold",            cue:"45 sec each side" },
        { name:"Thoracic rotation (thread-needle)",cue:"8 reps each side" },
      ],
      skillBlocks: {
        shooting: [
          { name:"Spot Shooting — Catch & Shoot",  reps:"5 spots × 10 shots",  cue:"Ball to pocket first, square shoulders before catch, hold follow-through 1 sec", load:"skill", level_note:"Beginner: 3 spots. Advanced: off movement, game-speed." },
          { name:"Pull-Up Mid-Range J",            reps:"4 sets × 8",          cue:"Dribble into space, gather on jump foot, get feet under body, flat arc",         load:"skill" },
          { name:"3-Point Spot Work",              reps:"5 spots × 8",         cue:"Wide base, hips into ground, quick release — triple threat before every shot",    load:"skill", advanced_only:false },
        ],
        ball_handling: [
          { name:"Two-Ball Stationary",            reps:"6 min total",          cue:"Waist → shoulder → low — soft hands, eyes up entire time, vary rhythm",         load:"skill" },
          { name:"Cone Speed Weave",               reps:"8 reps",              cue:"Stay low, lead with inside hand, change of direction at every cone",              load:"skill" },
          { name:"Behind-Back / Between-Legs Combo", reps:"4 min",             cue:"Game-speed moves, protect ball with body, stay in athletic stance",              load:"skill" },
        ],
        finishing: [
          { name:"Euro Step Finish",               reps:"4 sets × 6",          cue:"Wide gather off 2 feet, plant outside foot, opposite-hand finish",               load:"skill" },
          { name:"Floater (off 2 dribbles)",       reps:"4 sets × 6",          cue:"Push off inside foot, high release, flat arc — aim back of rim",                load:"skill" },
          { name:"Contact Finish (foam pad drill)",reps:"5 sets × 5",          cue:"Absorb contact, stay aggressive to the glass, don't fade",                      load:"skill" },
        ],
        defense: [
          { name:"Defensive Slides — full length", reps:"5 × 28m",             cue:"Hips low, never cross feet, lead with front foot, hands active",                load:"skill" },
          { name:"Close-out Drill (1-2 chops)",    reps:"8 reps",              cue:"Sprint, chop last 2m into low stance, hand up — no reach foul",                 load:"skill" },
          { name:"Deny Drill — 45° wing",          reps:"6 reps",              cue:"Denial stance: lead hand in passing lane, see ball and man",                    load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    football: {
      label:"Football", emoji:"🏈",
      // Science: NFL combine data — 40-yd dash, broad jump, and vertical
      // dominate physical performance. Heavy posterior chain loading,
      // max-strength base (for linemen), explosive upper body for skill positions.
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","db_bench","db_row","dead_bug"],
        intermediate: ["trap_bar_deadlift","bench_press","bent_over_row","push_press","hip_thrust"],
        advanced:     ["trap_bar_deadlift","barbell_back_squat","power_clean","bench_press","pullup"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","box_jump","lateral_bounds"],
        intermediate: ["broad_jump","depth_jump","box_jump","lateral_bounds"],
        advanced:     ["depth_jump","broad_jump","single_leg_hop","hurdle_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","tempo_runs"],
        intermediate: ["hill_sprint","prowler_push"],
        advanced:     ["prowler_push","hill_sprint","bike_sprint"],
      },
      warmup: {
        items:[
          { name:"Hip flexor lunge matrix (forward/lateral/rotational)", cue:"5 reps/direction" },
          { name:"Band clamshells + monster walk",                       cue:"15 reps/side" },
          { name:"Explosive start & drive (half-speed)",                 cue:"6 reps" },
          { name:"Arm circles + thoracic rotation",                      cue:"10 reps each" },
        ]
      },
      cooldown: [
        { name:"Pigeon pose hold",           cue:"60 sec each side" },
        { name:"Thoracic rotation stretch",  cue:"8 reps each side" },
        { name:"Lat & pec doorframe stretch",cue:"30 sec each side" },
      ],
      skillBlocks: {
        route_running: [
          { name:"Cone Route Tree (all 9 routes)",  reps:"5 full trees",     cue:"Explosive release off line, plant at cone, cut at 90°+ with no rounding", load:"skill" },
          { name:"Hands Drill — Focus Catches",     reps:"4 sets × 10",     cue:"Reach for ball away from body, eyes through ball, tuck immediately",      load:"skill" },
          { name:"Stem & Break Drill",              reps:"8 reps/route",    cue:"Sell the stem (3-4 steps), hard plant, lean into break, get in/out fast",  load:"skill" },
        ],
        blocking: [
          { name:"Sled Drive — hip explosion",      reps:"5 × 10m",         cue:"Low pad level, drive through — don't push, stay in contact zone",         load:"skill" },
          { name:"Kick-Slide Pass-Pro Drill",       reps:"8 reps",          cue:"Anchor inside foot, kick to set edge, mirror defender, keep inside hand", load:"skill" },
          { name:"Hand-Combat Punch Drill",         reps:"3 × 10 reps",     cue:"Inside hands, thumbs up, punch at breastplate — not head or outside",     load:"skill" },
        ],
        qb_mechanics: [
          { name:"Drop & Set Footwork",             reps:"5 sets × 10",     cue:"3/5/7-step drop, plant off back foot, hip rotation precedes arm action",  load:"skill" },
          { name:"Pocket Movement — Step Up/Slide", reps:"8 reps",          cue:"Mirror pass rush, step up in pocket, reset feet before throwing",         load:"skill" },
          { name:"Half-Speed Throw Mechanics",      reps:"50 throws",       cue:"Elbow up, wrist snap, stride toward target — drive hip, not just arm",    load:"skill" },
        ],
        tackling_pursuit: [
          { name:"Angle Tackle Drill",              reps:"10 reps",         cue:"Eyes on numbers/belt, buzz feet at contact, wrap low — no high targeting",load:"skill" },
          { name:"Pursuit Angle Drill",             reps:"8 reps",          cue:"Take proper angle — don't over-pursue, eyes on near hip of ball carrier", load:"skill" },
          { name:"Form Tackle in Bags",             reps:"10 reps",         cue:"Hit through, not at — drive legs on contact, generate power from ground", load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    soccer: {
      label:"Soccer", emoji:"⚽",
      // Science: Soccer demands repeated sprint capacity, aerobic base,
      // single-leg strength + stability (cutting), hamstring resilience
      // (hamstring strains #1 injury) → Nordic curl is essential.
      // Adductor work (Copenhagen) for groin injury prevention.
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","single_leg_deadlift","dead_bug","pullup"],
        intermediate: ["split_squat","rdl","single_leg_deadlift","nordic_curl","copenhagen_plank"],
        advanced:     ["barbell_back_squat","single_leg_deadlift","nordic_curl","copenhagen_plank","power_clean"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","lateral_bounds"],
        intermediate: ["lateral_bounds","single_leg_hop","hurdle_hop"],
        advanced:     ["single_leg_hop","hurdle_hop","lateral_bounds","depth_jump"],
      },
      conditioning: {
        beginner:     ["tempo_runs","shuttle_run"],
        intermediate: ["tempo_runs","hill_sprint"],
        advanced:     ["tempo_runs","hill_sprint","bike_sprint"],
      },
      warmup: {
        items:[
          { name:"Dynamic hip openers (world's greatest stretch)", cue:"8 reps/side" },
          { name:"Ankle mobility circles (both directions)",       cue:"30 sec/foot" },
          { name:"Lateral shuffle + carioca",                      cue:"2 × 20m each" },
          { name:"Leg swings (front/lateral)",                     cue:"12 reps each" },
        ]
      },
      cooldown: [
        { name:"Standing quad stretch",         cue:"45 sec each side" },
        { name:"Seated adductor stretch",       cue:"60 sec" },
        { name:"Hip 90/90 with rotation",       cue:"8 reps each side" },
      ],
      skillBlocks: {
        dribbling: [
          { name:"1v1 Close Control",            reps:"8 reps",           cue:"Soft first touch, body between ball and defender, change pace to beat",    load:"skill" },
          { name:"Speed Dribble Through Gates",  reps:"6 × 20m",          cue:"Push ball 2-3 steps ahead, sprint to it — don't babysit the ball",        load:"skill" },
          { name:"Cruyff / V-Turn Drill",        reps:"8 reps each",      cue:"Sell the direction, cut back sharply with inside of foot, explosive exit", load:"skill" },
        ],
        passing: [
          { name:"Rondo 4v1 (or 2-touch wall)",  reps:"10 min",           cue:"Weight and timing — early pass before pressure, open body to receive",    load:"skill" },
          { name:"1-2 Combination Play",         reps:"8 reps/side",      cue:"Firm return pass, time your run, make the movement before ball arrives",  load:"skill" },
          { name:"Switch-of-Play Long Pass",     reps:"20 reps",          cue:"Strike through centre of ball, non-kick foot beside ball, follow through", load:"skill" },
        ],
        finishing: [
          { name:"Far-Post Driven Strike",       reps:"5 × 8 balls",      cue:"Plant foot beside ball, locked ankle, strike laces, follow through low",  load:"skill" },
          { name:"1v1 vs Goalkeeper",            reps:"10 reps",          cue:"Shape early, pick your corner before shooting — disguise decision late",   load:"skill" },
          { name:"Volley / Half-Volley",         reps:"30 reps",          cue:"Get over ball at contact, knee above ball, sidefoot for placement",       load:"skill" },
        ],
        defending: [
          { name:"Defensive Jockey Drill",       reps:"6 reps",           cue:"Side-on stance, half-turn — delay, show outside, don't commit first",     load:"skill" },
          { name:"Press Trigger & Win Ball",     reps:"8 reps",           cue:"Trigger on poor touch or backwards pass — angle press, cut off back pass", load:"skill" },
          { name:"Block Tackle Technique",       reps:"10 reps",          cue:"Weight on front foot, lock ankle, commit and follow through on contact",   load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    baseball: {
      label:"Baseball / Softball", emoji:"⚾",
      // Science: Rotational power through hips (not arms) drives bat speed.
      // Posterior chain (RDL, rows) crucial for throwing velocity.
      // Shoulder health = internal/external rotation balance, scap stability.
      // Arm care before and after throwing is non-negotiable.
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","db_row","dead_bug","cable_chop"],
        intermediate: ["trap_bar_deadlift","db_bench","bent_over_row","cable_chop","hip_thrust"],
        advanced:     ["trap_bar_deadlift","db_bench","pullup","cable_chop","power_clean"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","box_jump"],
        intermediate: ["broad_jump","box_jump","single_leg_hop"],
        advanced:     ["broad_jump","depth_jump","single_leg_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","bike_sprint"],
        intermediate: ["hill_sprint","bike_sprint"],
        advanced:     ["hill_sprint","prowler_push","bike_sprint"],
      },
      warmup: {
        items:[
          { name:"Arm circles (small → large) + band pull-apart", cue:"15 reps each" },
          { name:"90/90 shoulder external rotation stretch",       cue:"30 sec each side" },
          { name:"Hip hinge + thoracic rotation",                  cue:"8 reps/side" },
          { name:"Wrist flexor/extensor stretch",                  cue:"60 sec total" },
        ]
      },
      cooldown: [
        { name:"Cross-body shoulder stretch",    cue:"60 sec each arm" },
        { name:"Wrist extensor hang",            cue:"30 sec each" },
        { name:"Doorframe pec stretch",          cue:"30 sec each side" },
      ],
      skillBlocks: {
        throwing_arm_care: [
          { name:"Long Toss Progression",        reps:"10–15 min build-up",  cue:"Start at 30ft, extend to max. Accelerate through release, low elbow = danger", load:"skill" },
          { name:"J-Band Arm Care Routine",      reps:"3 sets — 5 exercises", cue:"External/internal rotation, scarecrow, D2 pattern — feel shoulder, stop if pain", load:"skill" },
          { name:"Flat-Ground Throwing (command)",reps:"30 throws",           cue:"4-seam grip, 4/2-seam split, work corners — hit targets not just mechanics",  load:"skill" },
        ],
        hitting: [
          { name:"Tee Work — Opposite-Field Gap", reps:"5 sets × 10",        cue:"Stay back, hands inside ball, contact out front — drive to opposite field",   load:"skill" },
          { name:"Front Toss / Soft Toss",        reps:"5 sets × 10",        cue:"Short stride, early load, stay through contact zone — don't pull off",        load:"skill" },
          { name:"Rotational Med Ball Slam",      reps:"4 × 8/side",          cue:"Hip turn precedes hands — drive rotation from lead hip, hands follow",        load:"skill" },
        ],
        fielding: [
          { name:"Ground Ball Series (5-hole)",   reps:"25 reps",             cue:"Fielding triangle, glove outside front foot, charge routine GB aggressively",  load:"skill" },
          { name:"First-Step Reaction Drill",     reps:"15 reps",             cue:"Pitcher-focus stance, crossover step first — don't false step",               load:"skill" },
          { name:"Footwork Around the Bag",       reps:"10 reps each foot",   cue:"Early read of throw, soft feet on base, secure before transferring",          load:"skill" },
        ],
        baserunning: [
          { name:"Primary Lead + Read Pitcher",   reps:"10 reps",             cue:"2.5 shuffle steps, weight on balls of feet, time pickoff move",              load:"skill" },
          { name:"Rounding 1st — Secondary Lead", reps:"8 reps",              cue:"Banana route around first, read ball to outfield on contact, decisive",       load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    volleyball: {
      label:"Volleyball", emoji:"🏐",
      // Science: Vertical jump is primary performance indicator. Shoulder
      // stability and rotator cuff health essential for setters + hitters.
      // Repeated approach jumps demand quad/posterior chain balance.
      // Ankle stability (landing mechanics) = major injury prevention focus.
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","db_shoulder_press","dead_bug","pullup"],
        intermediate: ["split_squat","rdl","push_press","db_shoulder_press","pullup"],
        advanced:     ["barbell_back_squat","rdl","push_press","pullup","single_leg_deadlift"],
      },
      plyoPriority: {
        beginner:     ["approach_jumps","box_jump","broad_jump"],
        intermediate: ["approach_jumps","depth_jump","box_jump","lateral_bounds"],
        advanced:     ["depth_jump","approach_jumps","single_leg_hop","hurdle_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","bike_sprint"],
        intermediate: ["suicides","bike_sprint"],
        advanced:     ["suicides","bike_sprint","prowler_push"],
      },
      warmup: {
        items:[
          { name:"Shoulder CARs (Controlled Articular Rotations)", cue:"5 reps/side — very slow" },
          { name:"Hip flexor lunge + thoracic reach",               cue:"8 reps/side" },
          { name:"Ankle pops + calf raise complex",                 cue:"15 reps — build rhythm" },
          { name:"Band external rotation (arm care)",               cue:"15 reps/side" },
        ]
      },
      cooldown: [
        { name:"Overhead tricep + lat stretch",      cue:"45 sec each" },
        { name:"Cobra / prone press-up",             cue:"5 × 10-sec holds" },
        { name:"Ankle dorsiflexion calf stretch",    cue:"60 sec each side" },
      ],
      skillBlocks: {
        hitting: [
          { name:"4-Step Approach + Arm Swing",  reps:"5 sets × 6",   cue:"Left-right-left-jump (RH). High elbow at peak, heel of hand leads contact", load:"skill" },
          { name:"Tool & Wipe Off Block",        reps:"4 sets × 8",   cue:"See block hands, roll wrist over top OR wipe outside line — don't just spike", load:"skill" },
          { name:"Back-Row Attack Approach",     reps:"4 × 6",        cue:"Jump well behind 10-ft line, steep angle, land inside court",               load:"skill" },
        ],
        blocking: [
          { name:"Block Footwork — Slide/Cross", reps:"10 reps each", cue:"Read setter early, 2-step slide or cross-step, hands penetrate net",        load:"skill" },
          { name:"Triple Block Assignment",      reps:"8 sequences",  cue:"Outside blocker sets line, MB closes seam — no air between hands",          load:"skill" },
          { name:"Down-Ball / Tip Read",         reps:"10 reps",      cue:"Quick transition from block to dig: drop hands, turn hips, find ball",      load:"skill" },
        ],
        setting: [
          { name:"Setting from Knee (form drill)",reps:"60 reps",     cue:"Consistent hand shape (window), wrists back, symmetric push — NO thumbing",  load:"skill" },
          { name:"Back-Set Accuracy Drill",       reps:"30 reps",     cue:"Square target behind, extension overhead, hip drive — not a backward fall",  load:"skill" },
          { name:"Jump-Set Timing",               reps:"5 sets × 8",  cue:"Time jump to ball, contact at top of jump, quick hands",                    load:"skill" },
        ],
        passing: [
          { name:"Platform Pass to Target",       reps:"100 reps",    cue:"Angle platform toward target, absorb with legs — LEGS not arms move ball",   load:"skill" },
          { name:"Serve-Receive Lines",           reps:"5 serves/person", cue:"Read spin early, move feet first — catch ball with body then platform",  load:"skill" },
          { name:"Overhead Pass / Setting Form",  reps:"50 reps",     cue:"Same hand shape every time — snap through fingers, no push with palms",      load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    track: {
      label:"Track & Field", emoji:"🏃",
      // Science: Sprint mechanics — max velocity demands stiff ankle,
      // reactive strength index, hip flexor power. Acceleration = anterior
      // drive. Hamstring injuries peak at max velocity. Posterior chain
      // (RDL, hip thrust, Nordic) is primary injury prevention work.
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","single_leg_deadlift","dead_bug","hip_thrust"],
        intermediate: ["split_squat","rdl","single_leg_deadlift","nordic_curl","hip_thrust"],
        advanced:     ["barbell_back_squat","rdl","nordic_curl","hip_thrust","power_clean"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","hurdle_hop","lateral_bounds"],
        intermediate: ["broad_jump","hurdle_hop","single_leg_hop"],
        advanced:     ["single_leg_hop","hurdle_hop","depth_jump","broad_jump"],
      },
      conditioning: {
        beginner:     ["tempo_runs","shuttle_run"],
        intermediate: ["tempo_runs","hill_sprint"],
        advanced:     ["hill_sprint","tempo_runs","prowler_push"],
      },
      warmup: {
        items:[
          { name:"A-Skip + B-Skip (30m each)",                   cue:"2 × each — build rhythm" },
          { name:"Leg swings (frontal and sagittal)",            cue:"12 reps each direction" },
          { name:"Wicket walk (dorsiflexion + hip cycle)",       cue:"20m" },
          { name:"High-knee march → acceleration",              cue:"4 × 20m progressive" },
        ]
      },
      cooldown: [
        { name:"Calf stretch on step (gastro + soleus)", cue:"60 sec each" },
        { name:"Hip flexor lunge hold",                  cue:"45 sec each side" },
        { name:"Supine hamstring stretch",               cue:"60 sec each side" },
      ],
      skillBlocks: {
        sprint_mechanics: [
          { name:"A-Skips",               reps:"4 × 30m",        cue:"High knee, dorsiflexed foot (toe up), fast ground contact — think 'pawback'",  load:"skill" },
          { name:"B-Skips",               reps:"4 × 30m",        cue:"Extend leg fully then paw back aggressively — hip extension drives speed",     load:"skill" },
          { name:"Wall Drill (3-point)",   reps:"3 × 10/leg",    cue:"45° lean into wall, cycle legs at full speed — hips stay forward, toe up",     load:"skill" },
        ],
        acceleration: [
          { name:"30m Drive Phase",        reps:"6 reps",         cue:"Forward lean 45°, triple extension, push not pull — stay low through 30m",    load:"skill" },
          { name:"Wicket Runs",            reps:"5 × 20m",        cue:"Wickets set to 70% max stride — consistent cycle, don't reach or chop",       load:"skill" },
          { name:"3-Point Stance Start",   reps:"6 reps",         cue:"Dominant foot back, weight forward, fire arms first, stay low 10m",           load:"skill" },
        ],
        max_velocity: [
          { name:"Flying 30s",             reps:"5 reps",         cue:"30m build-up, then MAX effort 30m — tall posture, relax face/hands",          load:"skill" },
          { name:"Hollow Sprints",         reps:"4 × 100m",       cue:"Build (30m) → float (40m) → build (30m) — trains relaxation at speed",       load:"skill" },
          { name:"In-Out Drill (30-20-30)",reps:"4 reps",         cue:"All out for 30, float 20, all out again 30 — simulate race changes",          load:"skill" },
        ],
        hurdles: [
          { name:"Lead-Leg Drill over mini hurdles", reps:"4 × 4 hurdles", cue:"Attack with TRAIL knee up, lead foot strikes DOWN — don't sit in hurdle",load:"skill" },
          { name:"3-Stride Rhythm",                  reps:"6 × 4 hurdles", cue:"Step-hurdle-step-step-hurdle rhythm — attack first hurdle, maintain",     load:"skill" },
          { name:"Hurdle Side Drill",                reps:"3 × 10/side",   cue:"Lead-leg reach to outside, trail-leg clearance — hip flexibility focus",  load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    swimming: {
      label:"Swimming", emoji:"🏊",
      // Science: Dryland S&C for swimmers focuses on lat strength (pull),
      // core anti-rotation, hip flexor power, shoulder cuff stability.
      // Swimmers don't need heavy leg work — hip thrust + RDL for turn power.
      strengthPriority: {
        beginner:     ["lat_pulldown","db_row","dead_bug","hip_thrust","db_rdl"],
        intermediate: ["pullup","db_row","hip_thrust","pallof_press","rdl"],
        advanced:     ["pullup","bent_over_row","power_clean","hip_thrust","nordic_curl"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","box_jump"],
        intermediate: ["broad_jump","box_jump","single_leg_hop"],
        advanced:     ["depth_jump","broad_jump","single_leg_hop"],
      },
      conditioning: {
        beginner:     ["rower_intervals","bike_sprint"],
        intermediate: ["rower_intervals","bike_sprint"],
        advanced:     ["rower_intervals","bike_sprint","prowler_push"],
      },
      warmup: {
        items:[
          { name:"Rotator cuff band circuit (ER/IR/D2/scaption)", cue:"3 × 10 each — feel not fatigue" },
          { name:"Lat hang + active lat stretch",                  cue:"30 sec each side on bar" },
          { name:"Hip flexor lunge + spine rotation",              cue:"8 reps/side" },
          { name:"Ankle mobility + calf raise",                    cue:"15 reps — for turn push-off" },
        ]
      },
      cooldown: [
        { name:"Cross-body lat stretch",         cue:"45 sec each arm" },
        { name:"Doorframe pec stretch",          cue:"30 sec each side" },
        { name:"Supine hip flexor stretch",      cue:"60 sec each side" },
      ],
      skillBlocks: {
        freestyle: [
          { name:"Catch-Up Drill",               reps:"6 × 50m",     cue:"Full extension before next stroke — maintain long body line, don't windmill",load:"skill" },
          { name:"Fingertip Drag",               reps:"4 × 50m",     cue:"High elbow recovery — drag fingertips across water, sets up front-quadrant entry", load:"skill" },
          { name:"Fist Drill",                   reps:"4 × 50m",     cue:"Closed fist forces forearm to catch water — builds awareness of full surface area", load:"skill" },
        ],
        starts_turns: [
          { name:"Dive Block Start",             reps:"15 reps",     cue:"Compact arm swing, drive heels into block, narrow streamline — entry angle matters", load:"skill" },
          { name:"Flip Turn Mechanics",          reps:"20 reps",     cue:"Approach pace, dolphin kick into flip, tight tuck, push off wall + rotate", load:"skill" },
          { name:"Underwater Dolphin Kick",      reps:"6 × 15m underwater", cue:"Hips drive the kick — not feet. Remain streamlined, eyes down",       load:"skill" },
        ],
        backstroke_IM: [
          { name:"Single-Arm Backstroke",        reps:"4 × 50m",     cue:"High entry at 12 o'clock, rotate body to generate power, not just arm pull", load:"skill" },
          { name:"Breaststroke Timing",          reps:"4 × 50m",     cue:"Pull → breathe → kick → glide. Glide phase is where you go fast — don't rush", load:"skill" },
        ],
        dryland_activation: [
          { name:"Band Pull-Apart (3 variations)", reps:"3 × 15",    cue:"Straight across / low / high — retract scap fully, control eccentrically",  load:"skill" },
          { name:"Core Rotation Plank",            reps:"3 × 30 sec/side", cue:"Hold rotation under fatigue — resist collapse of hips",               load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    wrestling: {
      label:"Wrestling", emoji:"🤼",
      // Science: Wrestling demands grip strength, neck strength, explosive
      // hip extension, upper-back pulling (row / pull-up) for tie-ups,
      // and elite anaerobic capacity. Heavy compound movements + grappling-
      // specific conditioning (rower = perfect energy system match).
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","pullup","db_row","dead_bug"],
        intermediate: ["trap_bar_deadlift","bent_over_row","pullup","hip_thrust","dead_bug"],
        advanced:     ["trap_bar_deadlift","power_clean","pullup","bent_over_row","barbell_back_squat"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","box_jump"],
        intermediate: ["broad_jump","depth_jump","box_jump"],
        advanced:     ["depth_jump","broad_jump","single_leg_hop"],
      },
      conditioning: {
        beginner:     ["rower_intervals","shuttle_run"],
        intermediate: ["rower_intervals","prowler_push"],
        advanced:     ["rower_intervals","prowler_push","bike_sprint"],
      },
      warmup: {
        items:[
          { name:"Neck bridge rolls (supervised)",       cue:"10 reps each direction — build tolerance" },
          { name:"Hip escape drill (granby rolls)",      cue:"10 reps/side" },
          { name:"Sprawl series (half speed)",           cue:"8 reps — react to signal" },
          { name:"Grip circuit (wrist roller/dead hang)", cue:"3 × 30 sec" },
        ]
      },
      cooldown: [
        { name:"Neck stretches (4 directions)",   cue:"30 sec each hold" },
        { name:"Thoracic rotation stretch",       cue:"8 reps each side" },
        { name:"Hip flexor + lat combined stretch",cue:"45 sec each side" },
      ],
      skillBlocks: {
        takedowns: [
          { name:"Double-Leg Attack (level change)", reps:"5 × 6",     cue:"Penetration step, drive head to armpit, lock hands, drive through to finish",  load:"skill" },
          { name:"Single-Leg Finish (elevation)",    reps:"5 × 6",     cue:"Control ankle with both hands, elevate and swing or trip — don't stall",       load:"skill" },
          { name:"High-Crotch to Double",            reps:"4 × 6",     cue:"Attack high crotch, transition to inside position, drive to double finish",     load:"skill" },
        ],
        top_control: [
          { name:"Breakdown & Ride (inside-calf control)", reps:"6 min live", cue:"Inside calf, chest pressure, seal the hips — don't let them sit up",    load:"skill" },
          { name:"Cross-Face Cradle Entry",                reps:"8 reps",     cue:"Drive cross-face deep, scoop near leg, lock quickly — explosively",       load:"skill" },
        ],
        bottom_defense: [
          { name:"Hip-Heist (stand-up transition)", reps:"10 reps",    cue:"Post on far hand, hip-heist hard, tight waist — be explosive not gradual",     load:"skill" },
          { name:"Granby Roll Defense",             reps:"8 reps",     cue:"Shoulder roll, hip-heist through, face opponent — maintain scramble pressure",  load:"skill" },
          { name:"Sprawl Series (react to shot)",   reps:"10 reps",    cue:"Sprawl legs back, chest on opponent's back, re-circle head — no space given",   load:"skill" },
        ],
        live_drilling: [
          { name:"Tie-Up Scrambles (pummeling)",    reps:"5 × 30 sec", cue:"Constant motion, work inside position — head in, hips low, always moving",     load:"skill" },
          { name:"Penetration Step Reps",           reps:"3 × 20",     cue:"Lead step, level change simultaneously — practice the movement pattern",        load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    lacrosse: {
      label:"Lacrosse", emoji:"🥍",
      // Science: Lacrosse = rotational power (stick work), multi-directional
      // sprint speed, single-leg stability, and aggressive contact conditioning.
      // Copenhagen plank + adductor work for change-of-direction injury prevention.
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","db_push_press","db_row","dead_bug"],
        intermediate: ["split_squat","rdl","push_press","bent_over_row","cable_chop"],
        advanced:     ["barbell_back_squat","rdl","push_press","power_clean","cable_chop"],
      },
      plyoPriority: {
        beginner:     ["broad_jump","lateral_bounds","box_jump"],
        intermediate: ["lateral_bounds","box_jump","single_leg_hop"],
        advanced:     ["single_leg_hop","lateral_bounds","depth_jump"],
      },
      conditioning: {
        beginner:     ["shuttle_run","tempo_runs"],
        intermediate: ["suicides","hill_sprint"],
        advanced:     ["suicides","hill_sprint","bike_sprint"],
      },
      warmup: {
        items:[
          { name:"Dynamic hip opener (world's greatest stretch)", cue:"8 reps/side" },
          { name:"Wrist & forearm mobility circles",              cue:"60 sec total" },
          { name:"T-Drill (warmup speed)",                        cue:"4 reps — feel footwork" },
          { name:"Stick cradle + jog",                            cue:"3 min easy" },
        ]
      },
      cooldown: [
        { name:"Hip 90/90 with rotation",       cue:"8 reps each side" },
        { name:"Wrist flexor/extensor stretch", cue:"30 sec each direction" },
        { name:"Quad + hip flexor stretch",     cue:"45 sec each side" },
      ],
      skillBlocks: {
        stick_work: [
          { name:"Wall Ball — Quick Stick",      reps:"100 reps",       cue:"Catch and release in one motion — top hand leads, bottom wrist snaps",         load:"skill" },
          { name:"Split-Dodge Drill",            reps:"8 reps/side",    cue:"Plant outside foot hard, switch hands quickly, explode out of dodge",           load:"skill" },
          { name:"Roll Dodge + Shot",            reps:"8 reps/side",    cue:"Protect stick, tight roll, step into shot — generate power from hips",          load:"skill" },
        ],
        shooting: [
          { name:"Stand-Still Crank Shot",       reps:"5 × 10",         cue:"Wind up, hip rotation precedes hands, wrist snap at release — high or low corner", load:"skill" },
          { name:"On-the-Run Shot (both sides)", reps:"8 reps",         cue:"Full approach speed, plant, set hips to target — reach across body for far side",  load:"skill" },
          { name:"BTB / Sidearm Finish",         reps:"5 × 8",          cue:"Advanced: sell the look-off, BTB finish tight to goal — practice deception",      load:"skill" },
        ],
        ground_balls: [
          { name:"Scoop & Clear Drill",          reps:"12 reps",        cue:"Low to ball, scoop through (don't poke), protect with body after pickup",         load:"skill" },
          { name:"Contested Ground Ball",        reps:"8 reps",         cue:"Body-check legal position, scoop aggressively, accelerate away immediately",      load:"skill" },
        ],
        defense: [
          { name:"Poke-Check Technique",         reps:"10 reps",        cue:"Lead with top hand only, drop-step, quick jab — patience, don't over-commit",     load:"skill" },
          { name:"Angle Defense + Slide",        reps:"8 sequences",    cue:"Force to weak side, communicate slide assignment, crash on slide trigger",        load:"skill" },
        ],
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    tennis: {
      label:"Tennis", emoji:"🎾",
      // Science: Tennis demands rotational shoulder power, ankle stability
      // (split-step landing), repeated short-sprint lateral capacity,
      // and shoulder/elbow durability. Copenhagen plank + single-leg work
      // prevent ankle sprains. Cable chop builds rotational groundstroke power.
      strengthPriority: {
        beginner:     ["goblet_squat","db_rdl","db_shoulder_press","dead_bug","cable_chop"],
        intermediate: ["split_squat","single_leg_deadlift","db_shoulder_press","cable_chop","copenhagen_plank"],
        advanced:     ["barbell_back_squat","single_leg_deadlift","push_press","cable_chop","copenhagen_plank"],
      },
      plyoPriority: {
        beginner:     ["lateral_bounds","broad_jump"],
        intermediate: ["lateral_bounds","single_leg_hop","box_jump"],
        advanced:     ["lateral_bounds","single_leg_hop","hurdle_hop"],
      },
      conditioning: {
        beginner:     ["shuttle_run","bike_sprint"],
        intermediate: ["suicides","bike_sprint"],
        advanced:     ["suicides","bike_sprint","hill_sprint"],
      },
      warmup: {
        items:[
          { name:"Shoulder internal/external rotation (band)",  cue:"15 reps each direction" },
          { name:"Split-step drill (no racket)",                cue:"30 sec at game pace" },
          { name:"Hip 90/90 stretch + rotation",                cue:"60 sec/side" },
          { name:"Ankle lunge matrix (forward/lateral/cross)",  cue:"8 reps each" },
        ]
      },
      cooldown: [
        { name:"Shoulder sleeper stretch",       cue:"60 sec each side" },
        { name:"Wrist/forearm flexor stretch",   cue:"30 sec each direction" },
        { name:"Hip flexor lunge hold",          cue:"45 sec each side" },
      ],
      skillBlocks: {
        groundstrokes: [
          { name:"Forehand Topspin — Feed Drill", reps:"50 balls",       cue:"Lag wrist, low to high inside-out brush, finish high opposite shoulder",       load:"skill" },
          { name:"Backhand Cross-Court Feed",     reps:"50 balls",       cue:"2-hand: shoulder coil, unwind from hips, step into ball — not arms first",     load:"skill" },
          { name:"Baseline Rally (live or wall)", reps:"10 min",         cue:"Reset after every ball, consistent depth, vary spin — don't just bash",        load:"skill" },
        ],
        serve: [
          { name:"Flat Serve — Toss Drill Only",  reps:"20 reps",        cue:"Toss 1 o'clock, trophy position, let ball drop — perfect toss only, no hit",   load:"skill" },
          { name:"Flat Serve Full Swing",         reps:"20 serves",      cue:"Lead with trophy, pronate through contact, land inside baseline",               load:"skill" },
          { name:"Kick Serve Mechanics",          reps:"15 serves",      cue:"Toss slightly behind head, back arch, brush 7 → 1 on ball — heavy topspin",    load:"skill" },
        ],
        net_play: [
          { name:"Volley Fed Drill — compact punch", reps:"30 reps ea side",cue:"Continental grip — no backswing, punch with arm, firm wrist at contact",    load:"skill" },
          { name:"Approach + Close",                 reps:"15 sequences",  cue:"Short ball → approach down line → split-step → put away volley",             load:"skill" },
        ],
        footwork: [
          { name:"Split-Step Timing Drill",       reps:"10 min",         cue:"Split AS opponent strikes — not before/after. Land and immediately move",      load:"skill" },
          { name:"Recovery Sprint to Centre",     reps:"12 reps",        cue:"Hit → push off back foot → recover centre → split — footwork is shot 2",       load:"skill" },
          { name:"Lateral Shuffle + Crossover",   reps:"3 × 60 sec",     cue:"Shuffle for 3-4 steps, crossover to cover more court — stay athletic",         load:"skill" },
        ],
      },
    },
  };

  // Session type templates
  const SESSION_TEMPLATES = {
    practice:         { mix:["skill","strength","plyo","conditioning"], mins:75 },
    competition_prep: { mix:["skill","speed","light_strength"],         mins:60 },
    recovery:         { mix:["mobility","light_skill"],                 mins:35 },
    strength:         { mix:["warmup","strength","accessory"],          mins:60 },
    speed:            { mix:["warmup","speed","plyo"],                  mins:50 },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // EQUIPMENT SWAP ENGINE
  // resolveExercise(key, availableEquip, level) → actual exercise definition
  // to use, applying equipment substitution and level tier selection.
  // ══════════════════════════════════════════════════════════════════════════
  function resolveExercise(key, availableEquip, level) {
    const avail = availableEquip || (state.profile?.equipment) || [];
    const lvl   = level || athleteLevel();

    // Look up in all categories
    const lib = {
      ...EXERCISE_LIB.strength,
      ...EXERCISE_LIB.plyo,
      ...EXERCISE_LIB.conditioning,
    };

    let def = lib[key];
    if (!def) return null;

    // ── Equipment check ──────────────────────────────────────────────────
    const requiredEquip = def.equipment;
    const equipAvail = !requiredEquip || requiredEquip === "none" || avail.includes(requiredEquip);

    if (!equipAvail && def.altEquip) {
      // Find a substitute that uses available equipment
      const altKeys = Object.entries(def.altEquip); // [[missingEquip, altKey], ...]
      for (const [, altKey] of altKeys) {
        const altDef = lib[altKey] || EXERCISE_LIB.noEquip[altKey];
        if (!altDef) continue;
        const altEquip = altDef.equipment || "none";
        if (altEquip === "none" || avail.includes(altEquip)) {
          def = altDef;
          key = altKey;
          break;
        }
      }
      // If still no match, fall through to noEquip fallback
      if (!avail.includes(def.equipment || "none") && def.equipment !== "none") {
        // Try noEquip catalogue
        const noEqDef = EXERCISE_LIB.noEquip[Object.values(def.altEquip || {})[0]];
        if (noEqDef) { def = noEqDef; }
      }
    }

    // ── Level tier selection ─────────────────────────────────────────────
    const tier = def[lvl] || def.intermediate || def.beginner;
    if (!tier) return null; // depth_jump beginner guard

    return {
      key,
      title:       def.title,
      name:        def.title,
      cue:         tier.cue,
      sets:        tier.sets,
      reps:        tier.reps,
      load:        tier.load,
      equipment:   def.equipment || "none",
      noEquipSub:  def.altEquip ? Object.values(def.altEquip)[0] : null,
      prTrackable: def.prTrackable || false,
      prMetric:    def.prMetric   || "weight_lbs",
      subs:        def.subs       || {},
      equipSwapped: !equipAvail,   // flag to show "swapped for your equipment" in UI
    };
  }

  // ---------- Injury handling helpers ----------
  function hasInjury(tag) {
    if (!state.profile || !Array.isArray(state.profile.injuries)) return false;
    return state.profile.injuries.includes(tag);
  }

  function applyInjuryAdjustments(exObj, injuries) {
    if (!exObj || !injuries || !injuries.length) return exObj;
    const res = { ...exObj };
    injuries.forEach(tag => {
      if (res.subs && res.subs[tag]) {
        const subKey = res.subs[tag];
        const allLib = { ...EXERCISE_LIB.strength, ...EXERCISE_LIB.plyo, ...EXERCISE_LIB.conditioning, ...EXERCISE_LIB.noEquip };
        const subDef = allLib[subKey];
        if (subDef) {
          const lvl = athleteLevel();
          const tier = subDef[lvl] || subDef.intermediate || subDef.beginner || {};
          res.name  = subDef.title || res.name;
          res.cue   = (tier.cue || res.cue) + " (injury substitution)";
          res.sets  = tier.sets  || res.sets;
          res.reps  = tier.reps  || res.reps;
          res.substitution = subKey;
        }
      }
    });
    if (injuries.length) {
      // Moderate load for injured athletes
      if (res.load === "max" || res.load === "high") {
        res.cue = (res.cue || "") + " — moderate load given injury history";
        res.load = "moderate";
      }
    }
    return res;
  }

  // ---------- Workout generation ----------
  function generateWorkoutFor(sport, sessionType, injuries) {
    sport       = sport       || state.profile?.sport       || "basketball";
    sessionType = sessionType || state.profile?.preferred_session_type || "practice";
    injuries    = injuries    || state.profile?.injuries    || [];

    const level    = athleteLevel();
    const avail    = state.profile?.equipment || [];
    const template = SESSION_TEMPLATES[sessionType] || SESSION_TEMPLATES.practice;
    const sportData = SPORT_MICROBLOCKS[sport] || SPORT_MICROBLOCKS.basketball;
    const blocks   = [];
    const uid      = () => Math.random().toString(36).slice(2, 8);

    // ── Level-aware volume modifiers ────────────────────────────────────
    const volMod = { beginner:0.8, intermediate:1.0, advanced:1.2 }[level] || 1.0;
    const strengthCount = level === "advanced" ? 5 : level === "intermediate" ? 4 : 3;
    const plyoCount     = level === "advanced" ? 4 : 3;
    const skillCount    = level === "advanced" ? 3 : 2; // categories of skill drills

    // ── Sport-specific warm-up ──────────────────────────────────────────
    const wuDef = sportData.warmup || { items:[] };
    blocks.push({
      id:`warmup_${uid()}`, type:"warmup",
      title:`Sport Warm-Up — ${sportData.label}`,
      duration_min: level === "advanced" ? 12 : 10,
      items: wuDef.items,
    });

    // ── Skill microblocks ───────────────────────────────────────────────
    const skillBlocks = sportData.skillBlocks || {};
    const skillKeys   = Object.keys(skillBlocks);
    if (skillKeys.length && (template.mix.includes("skill") || template.mix.includes("light_skill"))) {
      const dayIdx = new Date().getDay();
      // Rotate skill categories by day so athletes hit different drills each session
      const chosen = [];
      for (let i = 0; i < Math.min(skillCount, skillKeys.length); i++) {
        chosen.push(skillKeys[(dayIdx + i) % skillKeys.length]);
      }
      const skillBlock = {
        id:`skill_${uid()}`, type:"skill",
        title:`${sportData.emoji} Skill Work · ${sportData.label} · ${level.charAt(0).toUpperCase()+level.slice(1)}`,
        duration_min: Math.round(18 * volMod),
        items:[],
      };
      chosen.forEach(k => {
        const drills = skillBlocks[k] || [];
        // Advanced: take all drills. Beginner: take first 1. Intermediate: first 2.
        const take = level === "advanced" ? drills.length : level === "intermediate" ? 2 : 1;
        drills.slice(0, take).forEach(it => {
          // Skip depth_jump for beginners
          if (it.advanced_only && level === "beginner") return;
          skillBlock.items.push({ ...it, skillCategory:k, levelNote: it.level_note || null });
        });
      });
      if (skillBlock.items.length) blocks.push(skillBlock);
    }

    // ── Strength block ──────────────────────────────────────────────────
    const needsStrength = template.mix.includes("strength") || template.mix.includes("light_strength") || sessionType === "strength";
    if (needsStrength) {
      const priorityList = sportData.strengthPriority?.[level] || sportData.strengthPriority?.intermediate || [];
      const pick = sessionType === "strength" ? strengthCount + 1 : strengthCount;
      const strengthBlock = {
        id:`strength_${uid()}`, type:"strength",
        title:`Strength · ${level.charAt(0).toUpperCase()+level.slice(1)}`,
        duration_min: sessionType === "strength" ? Math.round(30 * volMod) : Math.round(22 * volMod),
        items:[],
      };

      priorityList.slice(0, pick).forEach(key => {
        let ex = resolveExercise(key, avail, level);
        if (!ex) return;
        // depth_jump beginners skipped inside resolveExercise (sets:0 guard)
        if (ex.sets === 0) return;
        ex = applyInjuryAdjustments(ex, injuries);
        if (!ex) return;
        strengthBlock.items.push(ex);
      });
      if (strengthBlock.items.length) blocks.push(strengthBlock);
    }

    // ── Plyo / power ────────────────────────────────────────────────────
    const needsPlyo = template.mix.includes("plyo") || template.mix.includes("speed") || sessionType === "speed";
    if (needsPlyo) {
      const priorityList = sportData.plyoPriority?.[level] || sportData.plyoPriority?.intermediate || [];
      const plyoBlock = {
        id:`plyo_${uid()}`, type:"plyo",
        title:`Power & Plyometrics · ${level.charAt(0).toUpperCase()+level.slice(1)}`,
        duration_min: Math.round(12 * volMod),
        items:[],
      };
      priorityList.slice(0, plyoCount).forEach(key => {
        let ex = resolveExercise(key, avail, level);
        if (!ex || ex.sets === 0) return; // skip depth_jump for beginners
        plyoBlock.items.push(ex);
      });
      if (plyoBlock.items.length) blocks.push(plyoBlock);
    }

    // ── Conditioning ────────────────────────────────────────────────────
    const needsCond = template.mix.includes("conditioning") || sessionType === "practice";
    if (needsCond) {
      const condList = sportData.conditioning?.[level] || sportData.conditioning?.intermediate || [];
      const condBlock = {
        id:`cond_${uid()}`, type:"conditioning",
        title:`Sport Conditioning · ${level.charAt(0).toUpperCase()+level.slice(1)}`,
        duration_min: Math.round(12 * volMod),
        items:[],
      };
      condList.slice(0, 2).forEach(key => {
        let ex = resolveExercise(key, avail, level);
        if (!ex) return;
        ex = applyInjuryAdjustments(ex, injuries);
        condBlock.items.push(ex);
      });
      if (condBlock.items.length) blocks.push(condBlock);
    }

    // ── Sport-specific cool-down ────────────────────────────────────────
    const cdItems = (sportData.cooldown || [
      { name:"Hip flexor lunge hold", cue:"45 sec each side" },
      { name:"Hamstring stretch",     cue:"60 sec each side" },
      { name:"Deep breathing",        cue:"2 min" },
    ]);
    blocks.push({
      id:`cd_${uid()}`, type:"cooldown",
      title:"Sport Cool-Down",
      duration_min:7,
      items: cdItems,
    });

    return {
      id:           `sess_${uid()}`,
      sport,
      sessionType,
      level,
      sportLabel:   sportData.label  || sport,
      sportEmoji:   sportData.emoji  || "",
      injuries:     injuries,
      equipment:    avail,
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
        const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || []);
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
      const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || []);
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
            ${it.equipSwapped ? `<div style="display:inline-flex;align-items:center;gap:4px;background:#fff3cd;border:1px solid #f0d060;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600;color:#856404;margin-top:4px">🔄 Swapped for your equipment</div>` : ""}
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
      <div class="minihead" style="margin-bottom:10px">${(gen.sportEmoji||"")} ${gen.sportLabel||gen.sport} · ${gen.sessionType.replace(/_/g," ")} · ${(gen.level||"").toUpperCase()} · ${gen.total_min} min</div>
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

    body.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <div class="field" style="flex:1;min-width:120px">
          <label>Sport</label>
          <select id="trainSportSelect"></select>
        </div>
        <div class="field" style="width:160px">
          <label>Session type</label>
          <select id="trainSessionType">
            <option value="practice">Practice</option>
            <option value="strength">Strength</option>
            <option value="speed">Speed</option>
            <option value="recovery">Recovery</option>
            <option value="competition_prep">Competition Prep</option>
          </select>
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn" id="btnGenTrain">Generate</button>
        </div>
      </div>
      <div id="trainCardArea"></div>
    `;

    // Populate sport select
    const trainSportSelect = $("trainSportSelect");
    if (trainSportSelect) {
      trainSportSelect.innerHTML = Object.keys(SPORT_MICROBLOCKS)
        .map(s => { const sd = SPORT_MICROBLOCKS[s]; return `<option value="${s}" ${s===sport?"selected":""} >${sd?.emoji||""} ${sd?.label||s}</option>`; })
        .join("");
      trainSportSelect.addEventListener("change", () => {
        state.profile.sport = trainSportSelect.value;
        persist("Sport updated");
        renderTrain();
      });
    }

    const trainSessionType = $("trainSessionType");
    if (trainSessionType) trainSessionType.value = state.profile.preferred_session_type || "practice";

    // Generate and render initial session
    const initialGen = generateWorkoutFor(sport, state.profile.preferred_session_type || "practice", state.profile.injuries || []);
    renderSessionCards(initialGen, $("trainCardArea"));

    $("btnGenTrain")?.addEventListener("click", () => {
      const s = $("trainSportSelect")?.value || sport;
      const t = $("trainSessionType")?.value  || state.profile.preferred_session_type || "practice";
      state.profile.sport = s;
      state.profile.preferred_session_type = t;
      const gen = generateWorkoutFor(s, t, state.profile.injuries || []);
      renderSessionCards(gen, $("trainCardArea"));
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
    el.classList.add("insights");
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
    setTimeout(() => location.reload(), 700);
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
      if (el) el.hidden = (v !== view);
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
        const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || []);
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


  // ══════════════════════════════════════════════════════════════════════════
  // EQUIPMENT SETUP + ATHLETE LEVEL UI
  // Renders an interactive equipment checklist and level selector.
  // Mount with <div id="equipmentSetupBody"></div>
  // ══════════════════════════════════════════════════════════════════════════

  // All possible equipment tags with friendly names and icons
  const EQUIP_CATALOGUE = [
    { tag:"none",     label:"Bodyweight Only",   icon:"🤸", category:"always"    },
    { tag:"dumbbell", label:"Dumbbells",          icon:"🏋️", category:"free_weights" },
    { tag:"barbell",  label:"Barbell + Plates",   icon:"🏋️", category:"free_weights" },
    { tag:"trap_bar", label:"Trap / Hex Bar",     icon:"🔺", category:"free_weights" },
    { tag:"bar",      label:"Pull-Up / Chin Bar", icon:"🔧", category:"free_weights" },
    { tag:"bench",    label:"Flat Bench",         icon:"🪑", category:"free_weights" },
    { tag:"box",      label:"Plyo Box",           icon:"📦", category:"gym"       },
    { tag:"cable",    label:"Cable Machine",      icon:"🔌", category:"gym"       },
    { tag:"med_ball", label:"Medicine Ball",      icon:"⚽", category:"gym"       },
    { tag:"sled",     label:"Prowler / Sled",     icon:"🛷", category:"gym"       },
    { tag:"band",     label:"Resistance Bands",   icon:"🪢", category:"gym"       },
    { tag:"rower",    label:"Rowing Machine",     icon:"🚣", category:"cardio"    },
    { tag:"bike",     label:"Assault/Stat Bike",  icon:"🚴", category:"cardio"    },
    { tag:"court",    label:"Indoor Court",       icon:"🏟️", category:"facility"  },
    { tag:"track",    label:"Track / Turf",       icon:"🏃", category:"facility"  },
    { tag:"hill",     label:"Hill / Incline",     icon:"⛰️", category:"facility"  },
    { tag:"hurdles",  label:"Hurdles",            icon:"🏃", category:"facility"  },
    { tag:"pool",     label:"Swimming Pool",      icon:"🏊", category:"facility"  },
  ];

  const EQUIP_PRESETS = {
    full_gym:    { label:"Full Gym",         icon:"🏋️", tags:["dumbbell","barbell","trap_bar","bar","bench","box","cable","med_ball","sled","band","rower","bike","court","track"] },
    home:        { label:"Home / Garage",    icon:"🏠", tags:["dumbbell","bar","bench","box","band"] },
    bodyweight:  { label:"Bodyweight Only",  icon:"🤸", tags:[] },
    hotel:       { label:"Hotel / Minimal",  icon:"🏨", tags:["dumbbell","band"] },
    school_gym:  { label:"School / Team Gym",icon:"🏫", tags:["dumbbell","barbell","trap_bar","bar","bench","box","med_ball","rower","bike","court","track"] },
  };

  const LEVEL_DESCRIPTIONS = {
    beginner:     { label:"Beginner",     icon:"🌱", desc:"New to structured training or returning after a long break. Foundational movement patterns, lower loads, more coaching cues." },
    intermediate: { label:"Intermediate", icon:"💪", desc:"6–18 months consistent training. Comfortable with major lifts, building towards more complex movements and higher intensity." },
    advanced:     { label:"Advanced",     icon:"🔥", desc:"2+ years consistent structured training. Comfortable with Olympic lifts, high loads, reactive plyo, and higher training volume." },
  };

  function renderEquipmentSetup() {
    const body = $("equipmentSetupBody");
    if (!body) return;

    if (!state.profile.equipment) state.profile.equipment = [];
    if (!state.profile.level)     state.profile.level     = "intermediate";

    const avail = new Set(state.profile.equipment);
    const level = state.profile.level;

    // Preset buttons
    const presetBtns = Object.entries(EQUIP_PRESETS).map(([key, p]) =>
      `<button class="btn ghost" data-preset="${key}" style="font-size:12px">${p.icon} ${p.label}</button>`
    ).join("");

    // Equipment by category
    const cats = { free_weights:"Free Weights", gym:"Gym Equipment", cardio:"Cardio", facility:"Facility / Outdoor" };
    const equipSections = Object.entries(cats).map(([cat, catLabel]) => {
      const items = EQUIP_CATALOGUE.filter(e => e.category === cat);
      const checks = items.map(e =>
        `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;background:${avail.has(e.tag)?"var(--panel,#f0faf4)":"var(--surface,#fff)"};border:1px solid ${avail.has(e.tag)?"#b8e8cb":"var(--line,#e8e8e8)"};transition:all .15s;user-select:none">
           <input type="checkbox" data-equip="${e.tag}" ${avail.has(e.tag)?"checked":""} style="width:16px;height:16px;accent-color:#1A6B3C"/>
           <span style="font-size:15px">${e.icon}</span>
           <span style="font-size:13px;font-weight:${avail.has(e.tag)?700:400}">${e.label}</span>
         </label>`
      ).join("");
      return `<div style="margin-bottom:16px">
        <div class="small" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#aaa;margin-bottom:8px">${catLabel}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${checks}</div>
      </div>`;
    }).join("");

    // Level selector
    const levelCards = Object.entries(LEVEL_DESCRIPTIONS).map(([key, ld]) =>
      `<div data-level="${key}" style="flex:1;min-width:130px;padding:14px;border-radius:10px;cursor:pointer;
        background:${level===key?"#1B4F8A":"var(--panel,#f7f6f2)"};
        color:${level===key?"#fff":"inherit"};
        border:2px solid ${level===key?"#1B4F8A":"var(--line,#e8e8e8)"};
        transition:all .2s">
        <div style="font-size:22px;margin-bottom:6px">${ld.icon}</div>
        <div style="font-weight:800;font-size:14px;margin-bottom:4px">${ld.label}</div>
        <div style="font-size:11px;opacity:${level===key?".85":".65"};line-height:1.5">${ld.desc}</div>
      </div>`
    ).join("");

    // Swap preview — show what exercises would change
    const swapPreview = generateSwapPreview(Array.from(avail), level);

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Athlete Setup — Level & Equipment</div>
        <div class="minibody">

          <div style="margin-bottom:24px">
            <div style="font-weight:700;font-size:14px;margin-bottom:12px">Training Level</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">${levelCards}</div>
          </div>

          <div style="border-top:1px solid var(--line,#e8e8e8);padding-top:20px;margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div style="font-weight:700;font-size:14px">Available Equipment</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">${presetBtns}</div>
            </div>
            ${equipSections}
          </div>

          ${swapPreview ? `
          <div style="background:#fff8e8;border:1px solid #f0d060;border-radius:8px;padding:14px;margin-bottom:16px">
            <div class="small" style="font-weight:700;color:#a07800;margin-bottom:8px">🔄 Equipment Swaps — What Changes for You</div>
            ${swapPreview}
          </div>` : ""}

          <button class="btn" id="btnSaveSetup" style="width:100%">Save Setup & Regenerate Workout</button>
        </div>
      </div>
    `;

    // Level card click
    body.querySelectorAll("[data-level]").forEach(card => {
      card.addEventListener("click", () => {
        state.profile.level = card.getAttribute("data-level");
        persist();
        renderEquipmentSetup();
      });
    });

    // Equipment checkbox
    body.querySelectorAll("[data-equip]").forEach(cb => {
      cb.addEventListener("change", () => {
        const tag = cb.getAttribute("data-equip");
        const cur = new Set(state.profile.equipment || []);
        if (cb.checked) cur.add(tag);
        else cur.delete(tag);
        state.profile.equipment = Array.from(cur);
        persist();
        renderEquipmentSetup(); // re-render to update styling + preview
      });
    });

    // Preset buttons
    body.querySelectorAll("[data-preset]").forEach(btn => {
      btn.addEventListener("click", () => {
        const preset = EQUIP_PRESETS[btn.getAttribute("data-preset")];
        if (!preset) return;
        state.profile.equipment = [...preset.tags];
        persist();
        renderEquipmentSetup();
        toast(`Equipment set to: ${preset.label}`);
      });
    });

    // Save + regenerate
    $("btnSaveSetup")?.addEventListener("click", () => {
      persist("Setup saved");
      // Regenerate today's workout with new settings
      const sport = state.profile.sport || "basketball";
      const sType = state.profile.preferred_session_type || "practice";
      const gen   = generateWorkoutFor(sport, sType, state.profile.injuries || []);
      state.ui.todaySession = gen;
      persist();
      renderTodayBlock();
      renderTrain();
      toast(`Workout regenerated for ${LEVEL_DESCRIPTIONS[state.profile.level]?.label || state.profile.level} — ${Array.from(state.profile.equipment||[]).length} equipment items`);
    });
  }

  function generateSwapPreview(avail, level) {
    // Show 3–4 exercise examples where equipment swaps apply for this user
    const sport = state.profile?.sport || "basketball";
    const sportData = SPORT_MICROBLOCKS[sport] || {};
    const priorityList = sportData.strengthPriority?.[level] || sportData.strengthPriority?.intermediate || [];
    const examples = [];

    priorityList.slice(0, 6).forEach(key => {
      const def = EXERCISE_LIB.strength[key];
      if (!def) return;
      const reqEquip = def.equipment;
      if (!reqEquip || reqEquip === "none") return;
      const hasIt = avail.includes(reqEquip);
      if (!hasIt && def.altEquip) {
        const altKey = Object.values(def.altEquip)[0];
        const altDef = EXERCISE_LIB.strength[altKey] || EXERCISE_LIB.noEquip[altKey];
        if (altDef) {
          examples.push(`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px">
            <span style="color:#C0392B;font-weight:700">${def.title}</span>
            <span style="color:#aaa">→</span>
            <span style="color:#1A6B3C;font-weight:700">${altDef.title || altKey}</span>
            <span class="small muted">(no ${reqEquip.replace(/_/g," ")} available)</span>
          </div>`);
        }
      }
    });

    return examples.slice(0, 4).join("") || "";
  }


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
        const url = `${location.origin}${location.pathname}?portal=${tok}`;
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
        const url = `${location.origin}${location.pathname}?portal=${tok}`;
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
    return `${location.origin}${location.pathname}?report=${token}`;
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
      renderEquipmentSetup();
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
