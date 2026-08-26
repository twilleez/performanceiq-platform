# PerformanceIQ Production Architecture

Updated: 2026-08-26

## Authoritative production application

The production application is the static root application served by GitHub Pages:

- `index.html`
- `styles.css`
- `css/`
- `js/`
- `assets/`
- `icons/`
- `manifest.json`
- `sw.js`

`index.html` loads `js/app.js`, which owns application bootstrap and route rendering. Authentication and data access use the Supabase browser client in `js/core/`.

## Deployment contract

`.github/workflows/deploy.yml` runs the root production smoke checks and stages only the production files into `.pages/`. GitHub Pages uploads that staging directory rather than the whole repository.

The following repository areas are intentionally excluded from the public Pages artifact:

- `frontend/`
- `backend/`
- `database/`
- `docs/`
- `scripts/`
- repository configuration and development files

This prevents alternate implementations, SQL, server prototypes, and internal documentation from being published as part of the web application.

## Legacy React/Vite frontend

`frontend/` is retained as reference/prototype code only. It is not the production UI, is not a root npm workspace, is not part of GitHub Pages deployment, and should not receive production feature work unless a separately approved migration project is opened.

Any useful feature that exists only in `frontend/` must be deliberately ported into the root production application and tested there before it is considered shipped.

## Backend prototype

`backend/` is not part of the current GitHub Pages runtime. The production browser app communicates directly with Supabase under RLS. Server-side code in `backend/` is retained only for future capabilities that genuinely require a trusted server environment.

Privileged credentials must never be moved into the root browser application.

## Database

`database/migrations/` is the repository record of Supabase database changes. Production database changes must be applied through controlled migrations and then represented in this directory.

## Quality gates

Before deployment, `npm run test:smoke` verifies the authoritative application contract, including key files, role routes, auth behavior markers, CSS ordering, safe browser-key usage, deployment isolation, and service-worker scope handling.

## Architecture rule

There is one production frontend: the root static application. Alternate implementations are prototypes until a Program Manager-approved migration replaces the production architecture end to end.
