ALTER POLICY "Admins can read all leads" ON public.recruiting_leads USING (public.has_role(auth.uid(), 'owner'));
ALTER POLICY "Admins can update all leads" ON public.recruiting_leads USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
ALTER POLICY "Admins can delete leads" ON public.recruiting_leads USING (public.has_role(auth.uid(), 'owner'));
DO $privacy$
DECLARE r record; definition text; body text;
BEGIN
 FOR r IN SELECT p.oid,p.proname,l.lanname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname IN ('get_lead_board','get_my_leads','get_referral_leads','my_your_three','get_under_led','get_winback_feed','match_winback_gold','claim_lead','claim_winback','update_my_lead','admin_assign_lead','log_winback_contact','set_winback_priority','add_under_led_outreach','apply_winback_gold','add_manual_lead') LOOP
  definition := pg_get_functiondef(r.oid);
  IF r.lanname='plpgsql' THEN
   definition := regexp_replace(definition, E'\\mBEGIN\\M', E'BEGIN\n IF NOT public.has_role(auth.uid(), ''owner'') THEN RETURN ''{}''::jsonb; END IF;', 'i');
  ELSE
   body := split_part(split_part(definition,'AS $function$',2),'$function$',1);
   body := regexp_replace(btrim(body), ';[[:space:]]*$', '');
   definition := replace(definition,body,'SELECT * FROM (' || body || ') AS owner_rows WHERE public.has_role(auth.uid(), ''owner'')');
  END IF;
  EXECUTE definition;
 END LOOP;
 SELECT pg_get_functiondef('public.get_home_snapshot()'::regprocedure) INTO definition;
 definition := replace(definition,'WHERE l.claimed_by = uid','WHERE public.has_role(auth.uid(), ''owner'') AND l.claimed_by = uid');
 EXECUTE definition;
END $privacy$;
CREATE OR REPLACE FUNCTION public.notify_new_lead() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
BEGIN
 IF COALESCE(NEW.status,'New') <> 'New' THEN RETURN NEW; END IF;
 INSERT INTO public.user_notifications(user_id,title,message,link)
 SELECT DISTINCT ur.user_id,'New lead on the board',COALESCE(NEW.first_name,'A new lead') || COALESCE(' from ' || NEW.city,'') || ' is unclaimed.','/admin/content?tab=recruiting'
 FROM public.user_roles ur WHERE ur.role='owner';
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.owner_only_recruiting_alert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
BEGIN
 IF (NEW.link LIKE '/app/recruits%' OR NEW.link LIKE '/admin/content?tab=recruiting%') AND NOT public.has_role(NEW.user_id,'owner') THEN RETURN NULL; END IF;
 RETURN NEW;
END $function$;
CREATE TRIGGER owner_only_recruiting_alert BEFORE INSERT OR UPDATE ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.owner_only_recruiting_alert();
CREATE POLICY owner_only_recruiting_alert_read ON public.user_notifications AS RESTRICTIVE FOR SELECT TO authenticated USING ((COALESCE(link,'') NOT LIKE '/app/recruits%' AND COALESCE(link,'') NOT LIKE '/admin/content?tab=recruiting%') OR public.has_role(auth.uid(),'owner'));
DO $cron$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.sweep_speed_to_lead()'::regprocedure) INTO definition;
 definition := replace(definition,'ur.role IN (''manager'',''admin'',''owner'')','ur.role = ''owner''');
 definition := replace(definition,'WHERE p.user_id IS NOT NULL','WHERE public.has_role(p.user_id,''owner'') AND p.user_id IS NOT NULL');
 definition := replace(definition,'/app/recruits?lead=','/admin/content?tab=recruiting&lead=');
 EXECUTE definition;
 SELECT pg_get_functiondef('public.log_winback_contact(uuid,text,text)'::regprocedure) INTO definition;
 definition := replace(definition,'ur.role IN (''manager'',''admin'',''owner'')','ur.role = ''owner''');
 EXECUTE definition;
END $cron$;
CREATE OR REPLACE FUNCTION public.post_win_to_chat() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$ BEGIN RETURN NEW; END $function$;
REVOKE EXECUTE ON FUNCTION public.release_stale_leads(), public.notify_lead_expiry_warnings(), public.sweep_speed_to_lead() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_leads(), public.notify_lead_expiry_warnings(), public.sweep_speed_to_lead() TO service_role;