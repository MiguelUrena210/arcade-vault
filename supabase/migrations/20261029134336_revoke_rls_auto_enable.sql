-- SPEC 15: rls_auto_enable() es SECURITY DEFINER y Postgres concede EXECUTE a
-- PUBLIC por defecto, por lo que anon/authenticated podían invocarla vía
-- /rest/v1/rpc/. Se revoca el EXECUTE; como event trigger sigue funcionando
-- (se ejecuta como su owner), solo deja de ser invocable por RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
