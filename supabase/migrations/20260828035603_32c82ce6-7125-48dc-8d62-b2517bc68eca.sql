ALTER TABLE public.revenue_import_batches DROP CONSTRAINT revenue_import_batches_status_check;
ALTER TABLE public.revenue_import_batches ADD CONSTRAINT revenue_import_batches_status_check
  CHECK (status = ANY (ARRAY['review'::text, 'committed'::text, 'discarded'::text, 'reversed'::text]));