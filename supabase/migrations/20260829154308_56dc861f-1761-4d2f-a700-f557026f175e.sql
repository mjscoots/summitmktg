CREATE OR REPLACE FUNCTION public.lead_norm_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(regexp_replace(lower(btrim(coalesce(_name, ''))), '\s+', ' ', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.lead_name_key(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH t AS (
    SELECT string_to_array(public.lead_norm_name(_name), ' ') AS parts
  )
  SELECT CASE
    WHEN parts IS NULL OR array_length(parts, 1) IS NULL THEN NULL
    WHEN array_length(parts, 1) = 1 THEN parts[1]
    ELSE parts[1] || ' ' || parts[array_length(parts, 1)]
  END
  FROM t;
$$;

REVOKE ALL ON FUNCTION public.lead_norm_name(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lead_name_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_norm_name(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lead_name_key(text) TO authenticated, service_role;