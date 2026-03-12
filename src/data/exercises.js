export const EXERCISES = [
  // ─── BASKETBALL ───────────────────────────────────────────────────────────
  { id:"lat_bound",     title:"Lateral Bound",              sport:"basketball", pattern:"power",          equipment:"bodyweight", cue:"Stick the landing and own the hip." },
  { id:"skater_jump",   title:"Skater Jump",                sport:"basketball", pattern:"power",          equipment:"bodyweight", cue:"Push hard sideways and control the decel." },
  { id:"goblet_squat",  title:"Goblet Squat",               sport:"basketball", pattern:"strength_lower", equipment:"dumbbell",   cue:"Chest tall, full foot pressure." },
  { id:"rfess",         title:"Rear Foot Elevated Split Squat", sport:"basketball", pattern:"strength_lower", equipment:"dumbbell", cue:"Load the front leg and stay stacked." },
  { id:"sl_rdl",        title:"Single Leg RDL",             sport:"basketball", pattern:"hinge",          equipment:"dumbbell",   cue:"Long spine, square hips." },
  { id:"sprint10",      title:"10 Yard Sprint",             sport:"basketball", pattern:"speed",          equipment:"bodyweight", cue:"Violent first two steps." },
  { id:"dead_bug",      title:"Dead Bug",                   sport:"basketball", pattern:"core",           equipment:"bodyweight", cue:"Ribs down, breathe behind the shield." },
  { id:"side_plank",    title:"Side Plank Reach",           sport:"basketball", pattern:"core",           equipment:"bodyweight", cue:"Stay long through the side wall." },

  // ─── FOOTBALL ─────────────────────────────────────────────────────────────
  { id:"broad_jump",    title:"Broad Jump",                 sport:"football",   pattern:"power",          equipment:"bodyweight", cue:"Load fast, jump long, stick the landing." },
  { id:"med_slam",      title:"Med Ball Slam",              sport:"football",   pattern:"power",          equipment:"med_ball",   cue:"Full extension up, violent hips down." },
  { id:"trap_dl",       title:"Trap Bar Deadlift",          sport:"football",   pattern:"strength_lower", equipment:"barbell",    cue:"Push the floor away, keep the chest proud." },
  { id:"box_squat",     title:"Box Squat",                  sport:"football",   pattern:"strength_lower", equipment:"barbell",    cue:"Sit back to the box, explode off." },
  { id:"kb_swing",      title:"Kettlebell Swing",           sport:"football",   pattern:"hinge",          equipment:"kettlebell", cue:"Hinge — not squat. Snap the hips." },
  { id:"sled_push",     title:"Sled Push",                  sport:"football",   pattern:"speed",          equipment:"sled",       cue:"Low angle, short fast steps." },
  { id:"pallof_press",  title:"Pallof Press",               sport:"football",   pattern:"core",           equipment:"band",       cue:"Fight rotation. Own the midline." },
  { id:"ab_rollout",    title:"Ab Wheel Rollout",           sport:"football",   pattern:"core",           equipment:"bodyweight", cue:"Ribs to hips. Don't let the low back arch." },

  // ─── SOCCER ───────────────────────────────────────────────────────────────
  { id:"plyometric_hop",title:"Single Leg Hop Series",      sport:"soccer",     pattern:"power",          equipment:"bodyweight", cue:"Reactive ground contact — minimise contact time." },
  { id:"drop_jump",     title:"Drop Jump",                  sport:"soccer",     pattern:"power",          equipment:"bodyweight", cue:"Land soft, explode immediately." },
  { id:"bulgarian_ss",  title:"Bulgarian Split Squat",      sport:"soccer",     pattern:"strength_lower", equipment:"dumbbell",   cue:"Front knee tracks toe. Drive through heel." },
  { id:"nordic_curl",   title:"Nordic Curl",                sport:"soccer",     pattern:"hinge",          equipment:"bodyweight", cue:"Eccentric focus. Lower as slow as you can." },
  { id:"change_dir_drill", title:"5-10-5 Shuttle",         sport:"soccer",     pattern:"speed",          equipment:"bodyweight", cue:"Low hips at plant. Drive off the outside edge." },
  { id:"plank_shoulder_tap", title:"Plank Shoulder Tap",   sport:"soccer",     pattern:"core",           equipment:"bodyweight", cue:"Hips flat. Tap without rotating." },

  // ─── BASEBALL ─────────────────────────────────────────────────────────────
  { id:"rotary_med_throw", title:"Rotational Med Ball Throw", sport:"baseball", pattern:"power",         equipment:"med_ball",   cue:"Lead with the hip, not the shoulder." },
  { id:"broad_jump_bb",  title:"Broad Jump",                sport:"baseball",   pattern:"power",          equipment:"bodyweight", cue:"Max horizontal intent. Stick clean." },
  { id:"db_split_squat", title:"DB Split Squat",            sport:"baseball",   pattern:"strength_lower", equipment:"dumbbell",   cue:"Knee tracks toe, torso upright." },
  { id:"trap_rdl",       title:"Trap Bar RDL",              sport:"baseball",   pattern:"hinge",          equipment:"barbell",    cue:"Feel the hamstring length at the bottom." },
  { id:"sprint_bb",      title:"90 Ft Sprint",              sport:"baseball",   pattern:"speed",          equipment:"bodyweight", cue:"First step wins. Drive down and back." },
  { id:"med_chop",       title:"Med Ball Chop",             sport:"baseball",   pattern:"core",           equipment:"med_ball",   cue:"Diagonal pattern. Hips lead, arms follow." },

  // ─── VOLLEYBALL ───────────────────────────────────────────────────────────
  { id:"box_jump",       title:"Box Jump",                  sport:"volleyball", pattern:"power",          equipment:"bodyweight", cue:"Two-foot load, fast hips, tall landing." },
  { id:"depth_jump",     title:"Depth Jump",                sport:"volleyball", pattern:"power",          equipment:"bodyweight", cue:"Minimal ground contact. Jump high immediately." },
  { id:"back_squat",     title:"Back Squat",                sport:"volleyball", pattern:"strength_lower", equipment:"barbell",    cue:"Brace the trunk, control the descent." },
  { id:"shrug_carry",    title:"Farmer Carry",              sport:"volleyball", pattern:"hinge",          equipment:"dumbbell",   cue:"Tall posture, packed shoulders." },
  { id:"lateral_sprint", title:"Lateral Shuffle Sprint",    sport:"volleyball", pattern:"speed",          equipment:"bodyweight", cue:"Stay low, push off the outside foot." },
  { id:"hollow_hold",    title:"Hollow Body Hold",          sport:"volleyball", pattern:"core",           equipment:"bodyweight", cue:"Lower back pressed flat. Arms long." },

  // ─── TRACK ────────────────────────────────────────────────────────────────
  { id:"hang_power_clean", title:"Hang Power Clean",        sport:"track",      pattern:"power",          equipment:"barbell",    cue:"Triple extension — ankle, knee, hip. Catch high." },
  { id:"hurdle_hop",     title:"Hurdle Hop Series",         sport:"track",      pattern:"power",          equipment:"bodyweight", cue:"Stiff ankle. Quick off the ground." },
  { id:"front_squat",    title:"Front Squat",               sport:"track",      pattern:"strength_lower", equipment:"barbell",    cue:"Elbows up. Knees track over the 3rd toe." },
  { id:"romanian_dl",    title:"Romanian Deadlift",         sport:"track",      pattern:"hinge",          equipment:"barbell",    cue:"Bar drags the shins. Hamstrings load fully." },
  { id:"flying_sprint",  title:"Flying 20m Sprint",         sport:"track",      pattern:"speed",          equipment:"bodyweight", cue:"Full speed entry. Max velocity mechanics." },
  { id:"pallof_hold",    title:"Pallof Hold",               sport:"track",      pattern:"core",           equipment:"band",       cue:"Tall spine. Resist the pull for full time." },
];
