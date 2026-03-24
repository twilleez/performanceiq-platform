# PIQ Recovery — Sprint-by-Sprint Delivery Plan

## Phase 0 — Stop Active Harm (Days 1–10)
**Target:** All data-destruction incidents → 0. Sync visible to users.

### Sprint 0 (Days 1–5)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| `SeedDemoGate.tsx` — triple confirm modal | FE | 4h | 0 accidental triggers in QA |
| Move Seed Demo to Settings → Data Management | FE | 2h | Not visible from header |
| `UndoToast.tsx` — 10s undo system | FE | 6h | Undo works for all destructive actions |
| `useSyncState.ts` — sync status hook | FE | 4h | Header shows ✓/⟳/✗ correctly |
| `AppShell.tsx` — sync indicator in header | FE | 2h | All 3 states visible |
| WCAG: fix all contrast failures ≥ 4.5:1 | FE | 3h | Passes axe-core audit |
| Active nav tab: add weight + underline state | FE | 2h | Tab clearly active, 0 confusion in usability test |

### Sprint 0 QA Gates
- [ ] 0 accidental Seed Demo triggers across 10 test sessions
- [ ] Undo toast appears for: delete log, delete workout, import overwrite, settings reset
- [ ] Sync indicator transitions: saved → syncing → saved within 2s on standard connection
- [ ] All text contrast ratios ≥ 4.5:1 (verified with Colour Contrast Analyser)
- [ ] Active tab distinguishable at arm's length on 6" mobile screen

---

## Phase 1 — Usability & First Value (Days 11–42)

### Sprint 1 (Days 11–21)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| `OnboardingFlow.tsx` — 5 steps | FE + PD | 16h | Role selection → sport → profile → goal → PIQ reveal |
| Role default tab routing | FE | 3h | Coach lands on team view, athlete on dashboard |
| `navigation.ts` — 4-tab config | FE | 2h | 4 primary tabs with contextual sub-nav |
| Nav collapse: migrate all routes to 4-tab | FE | 8h | All pages accessible, 0 broken routes |
| `OnboardingFlow` DB: `piq_onboarding` table | BE | 2h | Progress persists across sessions |

### Sprint 2 (Days 22–32)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| Tooltip registry: annotate all nav tabs | FE + CN | 8h | Every tab has tooltip content |
| Tooltip registry: all dashboard modules | FE + CN | 8h | Every KPI card, chart, module has tooltip |
| Periodization tooltips (highest priority) | CN | 4h | Plain-language explanation for every term |
| `QuickEntryFAB.tsx` — 3-tap log | FE | 10h | Athlete logs in < 90s from any screen |
| FAB position-aware (above bottom nav) | FE | 2h | Never overlaps content |
| Coach dashboard: team roster default | FE | 4h | Coach sees roster on dashboard landing |

### Sprint 1+2 QA Gates
- [ ] Onboarding completion rate > 70% in usability test (5 participants per role)
- [ ] Nav wrong-section visits < 1 per session in usability test
- [ ] FAB: workout log in < 90 seconds for first-time user
- [ ] Tooltip: 'Periodization' tooltip achieves > 70% unassisted comprehension

---

## Phase 2 — Visual & Accessibility (Days 43–70)

### Sprint 3 (Days 43–56)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| `theme.ts` — color token system | DE | 4h | All components use CSS variables |
| Sport theme selector (6 themes) | FE | 8h | Theme applies to nav, cards, buttons, charts |
| Theme surfaced in onboarding step 1 | FE | 2h | 80%+ adoption in onboarding session |
| Dark/light mode toggle | FE | 6h | Persistent preference, no flash on reload |
| `global.css` — dark mode CSS vars | FE | 4h | All components themed correctly |

### Sprint 4 (Days 57–70)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| Typography: DM Sans 16px base system | FE | 4h | Body text ≥ 16px everywhere |
| Tabular numerals in all stat columns | FE | 3h | 0 decimal misalignment in analytics |
| Barlow Condensed display hierarchy | FE | 3h | 5-level type scale applied site-wide |
| KPI card hierarchy: primary dominant | FE + DE | 6h | Coaches find top KPI in < 5s |
| WCAG AA full audit + colorblind charts | FE | 8h | axe-core: 0 failures; colorblind palette active |

### Sprint 3+4 QA Gates
- [ ] WCAG AA: 0 failures in automated audit (axe-core)
- [ ] Sport theme: applies consistently across all 20+ components
- [ ] Dark mode: no white flash on page load, all text contrast ≥ 4.5:1
- [ ] Stat columns: 0 misalignment errors in QA data-entry test

---

## Phase 3 — Retention Architecture (Days 43–84, parallel)

### Sprint 3B (Days 43–56, parallel with Phase 2)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| `notificationScheduler.ts` — streak reminders | BE | 8h | Sends at 3pm if user hasn't logged today |
| `notificationScheduler.ts` — weekly parent summary | BE | 6h | Sends Sunday 7pm with session count |
| Push subscription UI: opt-in flow | FE | 4h | Permission requested post-onboarding step 4 |
| Push subscription API: save to DB | BE | 3h | Stored in `piq_push_subscriptions` |
| Rate limiter: max 1/type/23h | BE | 2h | Verified via `piq_can_send_notification` RPC |

### Sprint 4B (Days 57–70, parallel with Phase 2)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| `RetentionEngine.tsx` — `StreakCard` | FE | 4h | Shows streak, week dots, at-risk warning |
| `RetentionEngine.tsx` — `MilestoneGrid` | FE | 6h | All 8 milestones with progress bars |
| Milestone detection job | BE | 4h | Fires within 60s of qualifying action |
| `ProgressTrend.tsx` — 30-day chart | FE | 4h | Visible on dashboard home card |
| DB: `piq_streaks`, `piq_milestones` tables | BE | 2h | Seeded for existing users |

### Sprint 5 (Days 71–84)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| Messaging: `piq_message_threads` + `piq_messages` | BE | 8h | Messages stored, RLS enforced |
| Messaging UI: thread list + message view | FE | 12h | Coach ↔ athlete real-time chat |
| Messaging: realtime subscription (Supabase) | FE + BE | 4h | New messages appear without refresh |
| PIQ Score reveal animation (onboarding step 4) | FE | 3h | 600ms reveal animation on first score |

### Phase 3 QA Gates
- [ ] Push notification open rate > 40% in pilot (10 users, 2-week test)
- [ ] Streak card: at-risk warning triggers correctly at 3pm with no log
- [ ] Milestone: first_log fires within 60s of first workout save
- [ ] Messages: real-time delivery < 500ms on standard connection
- [ ] 7-day return intent (survey): > 50% in next focus group round

---

## Phase 4 — Workflow Completion (Days 85–112)

### Sprint 6 (Days 85–98)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| `reportGenerator.ts` — PDF engine | BE | 12h | Generates branded PDF, all metrics included |
| Report share link API (signed URL) | BE | 4h | 7d/30d/90d/permanent options |
| Report UI: generate + share flow | FE | 8h | Coach generates in < 2 minutes |
| Report landing page (no-auth view) | FE | 4h | Parent views without login |

### Sprint 7 (Days 99–112)
| Task | Owner | Hours | Done-when |
|---|---|---|---|
| Nutrition: USDA API integration | BE | 6h | 800k+ foods searchable |
| Nutrition: barcode scan (camera API) | FE | 6h | Scan → found/not-found in < 2s |
| Nutrition: log flow with auto-macros | FE | 6h | Macros auto-calculated on food select |
| Periodization: visual timeline | FE | 8h | Season phases displayed graphically |
| Periodization: plain-language wizard | FE | 8h | Comprehension > 80% unassisted |
| Analytics: role-specific views | FE + BE | 10h | Coach, athlete, parent, AD views distinct |
| Analytics: AD export (PDF) | BE + FE | 6h | Board-ready PDF from analytics screen |

### Phase 4 QA Gates
- [ ] Coach report: generation to share in < 2 minutes
- [ ] Report link: accessible without PIQ login (no auth wall)
- [ ] Nutrition: barcode scan resolves in < 2 seconds
- [ ] Periodization comprehension: > 80% unassisted in moderated test
- [ ] Analytics export: renders correctly in Adobe, Chrome, Safari PDF

---

## Success Metrics (measured at R2 focus group)

| Metric | R1 Baseline | R2 Target |
|---|---|---|
| Overall Score | 47 | > 58 |
| Usability | 49 | > 62 |
| Ease of Use | 41 | > 55 |
| Color & Visual | 56 | > 62 |
| Typography | 58 | > 63 |
| Retention Score | 33 | > 48 |
| Avg Negative Sentiment | 44% | < 38% |
| 7-Day Return Intent | 31% | > 52% |
| Data-Loss Incidents | 3 | 0 |
| Behavioral Workarounds | 8 | < 4 |
