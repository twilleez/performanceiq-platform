# Automated Core-Journey QA — 2026-08-26

## Program Manager result: PASS

This phase added a real rendered-browser regression layer to the authoritative root PerformanceIQ application. The tests run against a production-equivalent static HTTP server and use the built-in demo-role pathway so browser QA does not create or mutate Supabase production data.

## Test architecture

- Runner: Playwright + Chromium.
- Desktop project: functional journeys and role-navigation contracts.
- Mobile Chromium project: phone-width signup visibility/contrast contract.
- CI workflow: `.github/workflows/browser-journeys.yml`.
- Test source: `tests/e2e/core-journeys.spec.js`.
- Root command: `npm run test:e2e`.
- Full local quality command: `npm test` runs static smoke first, then browser journeys.

## Journeys covered

1. Public signup renders readable and keyboard-accessible controls.
2. Demo signup enters onboarding without writing to Supabase.
3. Coach demo shell renders.
4. Player demo shell renders.
5. Parent demo shell renders.
6. Admin demo shell renders.
7. Solo demo shell renders.
8. Player Today → Readiness → Progress → Nutrition navigation renders without view-load errors.
9. Player navigation does not expose Coach-only Roster/Program controls.
10. Coach navigation exposes Coach workflow and not the Player Log nav.
11. Solo Today workout can be marked complete and Progress still renders.
12. Sign-out returns the user to the public surface.
13. Phone-width signup controls remain visibly rendered with non-hidden text/input styling.

## Defects found by the new browser gate

The first meaningful browser run did not receive a false green result. It surfaced real product defects:

- The final onboarding CSS override did not hide inactive `ob2-*` panels, causing multiple onboarding steps to appear simultaneously.
- Coach Home imported `getAssignedWorkouts` from state, but the shared state module did not export it.
- Player Today imported `completeAssignment`, but the shared state module did not export it.
- Solo Today imported `addCheckIn`, but the shared state module did not export it.
- Coach Home also depended on `getUnreadCount`, which was missing from the shared state contract.
- A malformed legacy root `tsconfig.json` actually contained React source and prevented Playwright discovery. The source was preserved as `legacy/InsightsView.tsx` and the malformed root config was removed.

## Fixes

- Restored the onboarding single-active-panel CSS contract.
- Upgraded production state to v8 and restored the authoritative shared APIs for assigned workouts, assignment completion, check-in history, and explicit unread counting.
- Added `assignedWorkouts` to default and migrated state safely from v7 storage.
- Kept readiness history compatible with selectors by recording check-ins as `type: 'checkin'` workout-log entries.
- Preserved legacy React source rather than deleting it during cleanup.
- Split desktop functional journeys from the mobile visual contract so mobile testing validates the actual mobile UI rather than assuming a permanently visible desktop sidebar.

## Final verification

Final browser workflow run: `33011932128`.

Result: **13 passed, 0 failed** in Chromium.

The same production state commit also passed:

- Production Smoke workflow run `33011932187`.
- GitHub Pages deployment run `33011932130`, including smoke checks, production artifact staging, staged-artifact verification, upload, and deployment.

## Scope and limitations

This browser suite validates rendered application behavior with demo identities. It does not replace live Supabase authorization testing for real Coach, Parent, and Admin accounts. Those live-role relationship tests remain a separate PM release gate.

The mobile project currently covers a representative Chromium-emulated phone viewport for the signup visibility defect. Broader physical-device/browser coverage can be added later, but this phase now provides repeatable rendered-browser regression protection in CI.
