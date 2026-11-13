DROP POLICY IF EXISTS "pay_bands_read" ON public.public_pay_bands;
CREATE POLICY "pay_bands_read"
  ON public.public_pay_bands
  FOR SELECT
  TO authenticated
  USING (public.is_manager_tier(auth.uid()));

DROP POLICY IF EXISTS "pay_scales_read" ON public.public_pay_scales;
CREATE POLICY "pay_scales_read"
  ON public.public_pay_scales
  FOR SELECT
  TO authenticated
  USING (public.is_manager_tier(auth.uid()));