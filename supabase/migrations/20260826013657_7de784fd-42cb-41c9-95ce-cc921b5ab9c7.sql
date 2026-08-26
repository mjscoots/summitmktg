ALTER FUNCTION public.resolve_sheet_manager(text, text) SET search_path = public;

-- new/updated functions: signed-in only
REVOKE EXECUTE ON FUNCTION public.user_tier(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_tier(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_can_recruit(uuid, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.leads_list(text,text,text,text,text,uuid,text,boolean,boolean,numeric,numeric,integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_detail(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_claim(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_free(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_designate(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_set_stage(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_log(uuid, text, text, text, timestamptz) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_add_tag(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_set_notes(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lead_private_note_add(uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.leads_callbacks_due() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_off_season_report() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.leads_import_preview(jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.leads_import_commit(jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_lead_on_access_loss() FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.lead_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_free(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_designate(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_set_stage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_log(uuid, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_add_tag(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_set_notes(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_private_note_add(uuid, text, text) TO authenticated;

-- staging table stays read-only, staff only
GRANT SELECT ON public.lead_sheet_import TO authenticated;
GRANT ALL ON public.lead_sheet_import TO service_role;
ALTER TABLE public.lead_sheet_import ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read sheet import" ON public.lead_sheet_import;
CREATE POLICY "Staff read sheet import" ON public.lead_sheet_import FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));