REVOKE ALL ON FUNCTION public.setting_text(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setting_text(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.lead_set_cycling(uuid, int, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lead_set_cycling(uuid, int, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.people_leads_designation_stamp() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.people_leads_designation_stamp() FROM anon;
REVOKE ALL ON FUNCTION public.people_leads_designation_stamp() FROM authenticated;

REVOKE ALL ON FUNCTION public.leads_list(text,text,text,text,text,uuid,text,boolean,boolean,numeric,numeric,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leads_list(text,text,text,text,text,uuid,text,boolean,boolean,numeric,numeric,integer,text) TO authenticated, service_role;