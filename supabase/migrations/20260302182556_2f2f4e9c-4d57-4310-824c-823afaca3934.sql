ALTER TABLE public.scheduling_requests 
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_request_id uuid REFERENCES public.scheduling_requests(id) ON DELETE SET NULL;