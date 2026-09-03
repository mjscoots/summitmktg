REVOKE ALL ON public.chat_prefs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_prefs TO authenticated;
GRANT ALL ON public.chat_prefs TO service_role;