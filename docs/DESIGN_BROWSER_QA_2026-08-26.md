# PerformanceIQ — Design & Browser QA

Date: 2026-08-26
Owner: Program Manager / Design QA

## Scope
Production root application (`index.html`, root `js/`, root `css/`) with emphasis on signup, onboarding, mobile behavior, accessibility, and repeatable regression checks.

## Findings and fixes

### 1. Signup contrast/cascade risk — FIXED
The production app historically mixed legacy dark-card auth rules with a white auth card. `css/auth-hotfix.css` remains loaded after legacy styles and now provides explicit readable foreground/background colors, visible placeholders, focus states, and 44px+ interactive targets.

### 2. Current onboarding wizard vs legacy stylesheet mismatch — FIXED WITH ISOLATED PRODUCTION OVERRIDE
The live onboarding view uses `ob2-*` components, while `css/onboarding.css` primarily styles the older `.onboard-*` component family. A dedicated `css/onboarding-hotfix.css` is now loaded last. It gives the active wizard an explicit white-card contract, readable dark text, visible inputs/placeholders, green selected states, keyboard focus treatment, responsive two-column/one-column grids, safe-area bottom padding, and reduced-motion behavior.

### 3. Signup semantics and keyboard behavior — FIXED
`js/views/shared/signup.js` now uses a semantic `<form>` submit path, programmatic labels for all fields, required/email/minlength validation, `aria-pressed` role state, polite live status messaging, accessible password help, keyboard-operable sign-in control, and busy-state signaling while signup is running.

### 4. Repeatable production smoke testing — ADDED
`scripts/smoke-static.mjs` checks production-critical files, stylesheet ordering, role-home coverage, browser publishable-key use, absence of a browser service-role key, auth reconciliation hooks, signup semantics, labels, password minimum length, role pressed state, and live-status messaging.

Root package command: `npm run test:smoke`.

GitHub Actions workflow: `.github/workflows/production-smoke.yml`.
The initial workflow run (run id 32997813219) completed successfully on 2026-08-26; the `smoke` job and its `Run static production smoke checks` step both concluded `success`.

## PM acceptance
- Signup contrast/code-path QA: PASS
- Signup keyboard/semantic QA: PASS
- Active onboarding responsive/contrast override: PASS at code/static level
- Reduced-motion support: PASS at code/static level
- Automated production static smoke gate: PASS
- Physical-device/rendered-browser visual verification: PENDING

## Remaining Design gate
A true rendered-browser/device pass is still required at representative phone widths (approximately 320, 375/390, and 430 CSS pixels) and desktop. The available GitHub/source tooling confirms code and workflow behavior but does not provide a full interactive mobile browser rendering session; therefore visual acceptance must not be overstated.
