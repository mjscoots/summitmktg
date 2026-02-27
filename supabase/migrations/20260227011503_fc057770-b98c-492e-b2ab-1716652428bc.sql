DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'daily-accountability-post'
       OR command ILIKE '%daily-accountability-post%';
  END IF;
END
$$;