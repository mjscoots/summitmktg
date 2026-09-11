ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interested_in text[],
  ADD COLUMN IF NOT EXISTS sales_style text,
  ADD COLUMN IF NOT EXISTS earnings_goal text;