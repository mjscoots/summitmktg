REVOKE EXECUTE ON FUNCTION public.save_goal_interview(uuid, text, numeric, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_referral(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_goal_interview(uuid, text, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_referral(text, text, text) TO authenticated;