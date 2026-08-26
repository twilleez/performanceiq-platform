# Backend Prototype

This directory is not part of the current production GitHub Pages runtime.

PerformanceIQ currently uses the root browser application with Supabase authentication, database access, and RLS. Keep this backend code only for future trusted-server features such as privileged integrations, scheduled jobs, or server-generated reports that cannot safely run in the browser.

Do not place server secrets in the root application. A future backend activation requires its own deployment, security review, environment configuration, tests, and Program Manager sign-off.
