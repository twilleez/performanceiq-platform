-- Temporary release-certification migration.
-- Enables pg_net only long enough to invoke a one-time QA Auth provisioning Edge Function.
create extension if not exists pg_net;
