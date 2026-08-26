do $$
declare
  hdrs text;
begin
  select substring(command from 'headers := ''(.*)''::jsonb')
  into hdrs
  from cron.job where jobname = 'build-rep-profile-nightly';

  if hdrs is null then
    raise exception 'could not read scheduled job headers';
  end if;

  perform cron.unschedule('manager-weekly-digest');
exception when others then
  null;
end $$;

do $$
declare
  hdrs text;
begin
  select substring(command from 'headers := ''(.*)''::jsonb')
  into hdrs
  from cron.job where jobname = 'build-rep-profile-nightly';

  perform cron.schedule(
    'manager-weekly-digest',
    '0 13 * * 1',
    format($cmd$
  select net.http_post(
    url := 'https://chzvugfyjxqlcfddxyoa.supabase.co/functions/v1/manager-weekly-digest',
    headers := '%s'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
$cmd$, hdrs)
  );
end $$;