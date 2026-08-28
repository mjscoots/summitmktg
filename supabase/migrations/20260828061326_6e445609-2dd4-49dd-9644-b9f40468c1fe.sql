REVOKE EXECUTE ON FUNCTION public.get_import_batches(_kind text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_money_sources() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ingest_fiber_week(batch jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ingest_pest_revenue(batch jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lead_system_for(_uid uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.leads_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_mastery_check(_module_id uuid, _user_id uuid, _source text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_appearance(_appearance text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.undo_import_batch(_batch_id uuid) FROM anon;