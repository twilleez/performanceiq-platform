-- Cleanup paired with 012_temp_enable_pg_net_for_qa_user_creation.sql.
-- The QA Auth user is provisioned before this runs; networking is then removed.
drop extension if exists pg_net;
drop schema if exists net cascade;
