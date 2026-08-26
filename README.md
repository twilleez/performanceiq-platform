# PerformanceIQ

**Elite Training. Smart Results.**

PerformanceIQ is a multi-role athlete performance platform designed to turn wellness, training, and performance signals into clearer daily actions for athletes and coaches.

## Live application

Production: https://twilleez.github.io/performanceiq-platform/

## Product roles

- **Coach** — roster, programming, readiness, analytics, calendar, messaging and reporting.
- **Player/Athlete** — today's training, workout logging, readiness, progress, PIQ score and nutrition.
- **Parent** — linked-athlete progress, wellness, schedule and communication views.
- **Admin** — organization, teams, coaches, athletes, reporting, compliance and billing surfaces.
- **Solo athlete** — independent training, readiness, progress, goals, PIQ score and nutrition.

## Current architecture

The GitHub Pages production entry point is `index.html`, which loads `js/app.js` as an ES module. The root `js/` tree contains the current role router, views, state, services, authentication integration, and Supabase client. Styling is split across `styles.css` and modular files in `css/`.

The repository also contains `frontend/` and `backend/` trees. These should be treated as separate/experimental architecture until the consolidation work in the Program Manager backlog is completed; do not assume they are the GitHub Pages production entry point.

## Supabase

The browser client is initialized in `js/core/supabase.js`. Only browser-safe publishable/anon credentials may be present in frontend code. Never commit a service-role key or other secret credential.

Database SQL lives under `database/migrations/`. Schema and RLS changes must be tested against the connected Supabase project before production sign-off.

## Local development

Because the application uses ES modules, serve the repository through a local HTTP server instead of opening `index.html` directly from the filesystem.

Example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Demo accounts

The current demo pathway supports role-specific `@demo.com` users for product demonstrations without writing demo data to Supabase. Demo behavior must remain isolated from production user data.

## Product quality process

The release process is governed by:

- `docs/PROGRAM_MANAGER_PRODUCT_AUDIT.md`
- `docs/TEAM_BACKLOG.md`
- `docs/RELEASE_ACCEPTANCE_CHECKLIST.md`

The Program Manager is the release gate. Engineering, Design, and Marketing findings are not considered complete until implementation evidence exists, testing passes, and PM acceptance is recorded.

## Release priorities

Before calling the product production-ready for broad commercial use, resolve the P0/P1 items in the team backlog, especially:

1. frontend/database role contract alignment;
2. canonical profile schema alignment;
3. Supabase RLS and authorization hardening;
4. production auth/session convergence;
5. architecture consolidation and automated release testing;
6. mobile/accessibility/usability acceptance.

## Deployment

GitHub Pages deployment configuration is stored under `.github/workflows/`. A successful workflow run is necessary but not sufficient for release acceptance: the deployed production URL must also pass the PM smoke-test checklist.

## Security

PerformanceIQ handles athlete and wellness-related information. Apply least-privilege authorization, validate row-level security, avoid exposing secret keys, minimize sensitive data collection, and clearly communicate the limits of readiness/risk analytics. Production authorization must be enforced by Supabase/database policy, not only by hidden UI routes.
