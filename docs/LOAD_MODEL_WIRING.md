# Unified training load model

PerformanceIQ now uses `js/services/loadModel.js` as the production source of truth for session load and ACWR in the root application.

## Method

- Session load: RPE (CR-10) × duration in minutes (AU).
- Daily load: sum of scored sessions on each local calendar day; rest days are zero-load days.
- Acute load: last 7 days.
- Chronic load: average weekly load across the last 28 days (28-day total ÷ 4).
- ACWR: acute ÷ chronic.
- A ratio is not shown until there are at least 28 days of history, at least 4 scored sessions in the latest 28 days, and no more than 25% of recent sessions are missing RPE/duration.
- Missing RPE/duration is never replaced with a made-up default.

## Product interpretation

The legacy zone keys remain for compatibility, but user-facing language is neutral:

- `danger`: load well above recent baseline — coach review recommended.
- `spike`: load above recent baseline — monitor.
- `sweet-spot`: load consistent with recent baseline.
- `undertraining`: load below recent baseline.
- `detraining`: load well below recent baseline.
- `no-data`: not enough data yet.

These bands are training-load review flags only. They are not diagnoses, injury probabilities, or automatic instructions to rest. ACWR is contested as an injury predictor, and much of the literature is based on adult elite athletes rather than youth populations.

## Production wiring

The model is consumed by:

- `js/state/selectors.js`
- `js/services/engines.js`
- `js/state/selectorsElite.js`
- player/solo progress and PIQ score views
- coach athlete-detail load display
- workout-engine load guidance

Regression coverage lives in `tests/loadModel.test.mjs` and is run by Production Smoke Checks.

## Remaining architecture limitation

Coach/parent role views still need athlete-specific production data plumbing where they currently depend on local signed-in-user state. The unified load model does not solve that data-ownership/backend migration by itself.
