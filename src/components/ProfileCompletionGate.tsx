import { ReactNode, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, User, CheckCircle2, Phone, Globe, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIMEZONES, detectBrowserTimezone } from '@/lib/timezones';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfileCompletionGateProps {
  children: ReactNode;
}

/**
 * Forces users to complete their profile (photo, phone, timezone, name)
 * before accessing the app. Managers/admins are also required.
 */
export function ProfileCompletionGate({ children }: ProfileCompletionGateProps) {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<{
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    timezone: string | null;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState(detectBrowserTimezone());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    
    const checkProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url, timezone')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfileData(data as any);
        setFullName((data as any).full_name || '');
        setPhone((data as any).phone || '');
        setTimezone((data as any).timezone || detectBrowserTimezone());
        setAvatarUrl((data as any).avatar_url);

        // Check completeness
        const complete = !!(
          (data as any).full_name?.trim() &&
          (data as any).phone?.trim() &&
          (data as any).avatar_url &&
          (data as any).timezone
        );
        setIsComplete(complete);
      }
      setIsChecking(false);
    };

    checkProfile();
  }, [user, authLoading]);

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isComplete) {
    return <>{children}</>;
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success('Photo uploaded!');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!fullName.trim()) { toast.error('Please enter your name'); return; }
    if (!phone.trim()) { toast.error('Please enter your phone number'); return; }
    if (!avatarUrl) { toast.error('Please upload a profile photo'); return; }
    if (!timezone) { toast.error('Please select your timezone'); return; }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl,
          timezone,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      setIsComplete(true);
      toast.success('Profile complete! Welcome aboard.');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    { label: 'Profile Photo', done: !!avatarUrl },
    { label: 'Full Name', done: !!fullName.trim() },
    { label: 'Phone Number', done: !!phone.trim() },
    { label: 'Timezone', done: !!timezone },
  ];
  const completedCount = fields.filter(f => f.done).length;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Complete Your Profile
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Fill out these fields to get started
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {fields.map((f, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-all',
                  f.done ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
            <span className="text-xs font-semibold text-muted-foreground ml-1">{completedCount}/4</span>
          </div>

          {/* Avatar Upload */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {isUploading ? (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-3 border-primary/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/85 transition-colors shadow-lg">
                <Camera className="w-4 h-4 text-primary-foreground" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Timezone <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <Globe className="w-4 h-4 text-muted-foreground mr-2" />
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !fullName.trim() || !phone.trim() || !avatarUrl || !timezone}
            size="lg"
            className="w-full mt-6 font-bold h-12"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Continue to App
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
