-- Create rate_limits table for tracking API request attempts
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX idx_rate_limits_expires ON public.rate_limits(expires_at);

-- Enable RLS (only edge functions with service role can access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No user-facing policies - only service role can access this table
-- This prevents users from manipulating their own rate limit records

-- Create a function to check and increment rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Clean up expired entries first
  DELETE FROM public.rate_limits WHERE expires_at < now();
  
  -- Check current count for this key
  SELECT count, window_start INTO current_count, window_start_time
  FROM public.rate_limits
  WHERE key = p_key AND expires_at > now()
  LIMIT 1;
  
  IF current_count IS NULL THEN
    -- No existing record, create new one
    INSERT INTO public.rate_limits (key, count, window_start, expires_at)
    VALUES (p_key, 1, now(), now() + (p_window_seconds || ' seconds')::interval);
    RETURN true;
  ELSIF current_count < p_max_attempts THEN
    -- Increment counter
    UPDATE public.rate_limits
    SET count = count + 1
    WHERE key = p_key AND expires_at > now();
    RETURN true;
  ELSE
    -- Rate limit exceeded
    RETURN false;
  END IF;
END;
$$;