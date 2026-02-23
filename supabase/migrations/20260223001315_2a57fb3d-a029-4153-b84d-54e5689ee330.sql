
-- Add onboarding_status to profiles for tracking external platform status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'pending'
CHECK (onboarding_status IN ('pending', 'info_added', 'contract_signed', 'onboarded', 'summer_ready'));

-- Add index for manager queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON public.profiles(onboarding_status);
