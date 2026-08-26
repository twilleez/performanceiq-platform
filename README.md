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

## Production architecture

There is one authoritative production frontend: the repository-root static application.

`index.html` loads `js/app.js` as an ES module. The root `js/` tree contains routing, role views, state, authentication, and the Supabase browser client. Styling is provided by `styles.css` and the modular `css/` tree. GitHub Pages deploys only this production surface plus required assets, icons, manifest, and service worker.

`frontend/` is retained as legacy/reference React/Vite code only. `backend/` is retained as a future trusted-server prototype. Neither is part of the GitHub Pages runtime or the root npm workspace. See `docs/ARCHITECTURE.md` for the production contract.

## Supabase

The browser client is initialized in `js/core/supabase.js`. Only browser-safe publishable credentials may be present in frontend code. Never commit a service-role key or another privileged secret to browser code.

Database SQL lives under `database/migrations/`. Schema and RLS changes must be tested against the connected Supabase project before production sign-off.

## Local development

Because the application uses ES modules, serve the repository through a local HTTP server instead of opening `index.html` directly from the filesystem.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Quality checks

Run the production smoke suite with:

```bash
npm test
```

The same checks run automatically in GitHub Actions and again inside the deployment workflow before the Pages artifact is uploaded.

## Demo accounts

The demo pathway supports role-specific `@demo.com` users for demonstrations without writing demo data to Supabase. Demo behavior must remain isolated from production user data.

## Product quality process

Release governance lives in:

- `docs/PROGRAM_MANAGER_PRODUCT_AUDIT.md`
- `docs/TEAM_BACKLOG.md`
- `docs/RELEASE_ACCEPTANCE_CHECKLIST.md`
- `docs/PM_STATUS.md`
- `docs/ARCHITECTURE.md`

The Program Manager is the release gate. Engineering, Design, and Marketing findings are not complete until implementation evidence exists, testing passes, and PM acceptance is recorded.

## Deployment

`.github/workflows/deploy.yml` stages a production-only `.pages/` artifact. Development source trees, database migrations, documentation, and legacy applications are not published as part of the website.

## Security

Production authorization is enforced by Supabase/database policy rather than hidden UI routes alone. Apply least privilege, validate RLS, never expose privileged keys, minimize sensitive data collection, and clearly communicate the limits of readiness/risk analytics.
