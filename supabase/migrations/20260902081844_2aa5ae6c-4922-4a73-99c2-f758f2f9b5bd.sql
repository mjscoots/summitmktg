REVOKE SELECT ON public.verticals FROM anon;
GRANT SELECT (name, short_name, slug, status, theme) ON public.verticals TO anon;