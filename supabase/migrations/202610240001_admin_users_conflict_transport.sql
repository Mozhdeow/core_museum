-- Business conflicts must not use serialization_failure (40001): PostgREST 14
-- retries that SQLSTATE indefinitely. Preserve every authorization/locking/version
-- check and the existing 'conflict' contract; change only its transport SQLSTATE.
-- No account, journal row, policy, grant or security setting is modified.
do $migration$
declare
  definition text;
  previous text := 'raise exception ''conflict'' using errcode=''40001''';
  replacement text := 'raise sqlstate ''PT409'' using message = ''conflict''';
  occurrences integer;
begin
  definition := pg_get_functiondef('public.core_admin_users(uuid,text,uuid,jsonb)'::regprocedure);
  occurrences := (length(definition)-length(replace(definition,previous,'')))/length(previous);
  if occurrences <> 4
    or strpos(definition,'pg_advisory_xact_lock(74628031::bigint)') = 0
    or strpos(definition,'selfProtected') = 0
    or strpos(definition,'expectedUpdatedAt') = 0
    or strpos(definition,'''editor''') = 0 then
    raise exception 'Unexpected admin-users definition; inspect before applying conflict transport correction';
  end if;
  -- CREATE OR REPLACE retains the existing owner and function grants.
  execute replace(definition,previous,replacement);
end;
$migration$;
