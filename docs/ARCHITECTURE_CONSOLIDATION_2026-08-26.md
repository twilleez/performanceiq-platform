# Architecture Consolidation QA — 2026-08-26

## Decision
PASS for architecture consolidation.

## Production source of truth
The repository-root static application is the single authoritative production frontend:

- `index.html`
- `styles.css`
- `css/`
- `js/`
- `assets/`
- `icons/`
- `manifest.json`
- `sw.js`

`frontend/` is now explicitly legacy/reference code. `backend/` is explicitly a non-production server prototype.

## Package cleanup
The root `package.json` no longer declares `frontend` and `backend` as npm workspaces. Root commands now represent the production application rather than building alternate architectures.

## Deployment isolation
`.github/workflows/deploy.yml` now:

1. checks out the repository;
2. runs `npm run test:smoke`;
3. stages only production web files into `.pages/`;
4. verifies that `frontend/`, `backend/`, and `database/` are absent from the artifact;
5. uploads `.pages/` to GitHub Pages.

The previous workflow uploaded the whole repository. That behavior has been removed.

## Service worker
The service worker was upgraded to `piq-v7` and now derives app-shell URLs from `self.registration.scope`. This prevents project-site hosting under `/performanceiq-platform/` from incorrectly precaching account-root paths such as `/index.html`.

## Automated verification
The static smoke suite now verifies:

- no root npm workspaces remain;
- Pages uses a dedicated staged artifact;
- legacy frontend/backend trees are excluded;
- smoke checks run before upload;
- the service worker uses registration scope;
- the rest of the production auth, role, accessibility, and browser-key checks still pass.

GitHub Actions smoke run `33002321312` completed successfully for the consolidated architecture. The Pages deployment run `33002321306` successfully completed smoke checks, production staging, staged-artifact verification, artifact upload, and GitHub Pages deployment.

## Remaining limitation
Legacy `frontend/` and `backend/` source is intentionally retained rather than deleted. It no longer creates production ambiguity because it is excluded from the package workspace, documented as non-production, and excluded from deployment.

Any future migration to React/Vite or a trusted backend requires a separately approved migration plan and PM acceptance.
