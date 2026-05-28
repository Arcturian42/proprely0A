-- rls_auto_enable is an event trigger function (fired on ddl_command_end).
-- It only needs to be invoked by PostgreSQL's trigger system (as postgres/superuser).
-- Explicit EXECUTE grants to anon and authenticated allow it to be reached via
-- /rest/v1/rpc/rls_auto_enable — a SECURITY DEFINER footgun with no legitimate use.
revoke execute on function public.rls_auto_enable() from anon, authenticated;
