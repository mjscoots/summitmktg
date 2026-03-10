import { ReactNode, useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, User, CheckCircle2, Phone, Globe, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIMEZONES } from '@/lib/timezones';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfileCompletionGateProps {
  children: ReactNode;
}

/**
 * Prompts users to complete their profile (photo, phone, timezone, name)
 * but allows skipping. Managers/admins can also skip.
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
  const [skipped, setSkipped] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    
    const checkProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url, timezone, nickname')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfileData(data as any);
        const nameParts = ((data as any).full_name || '').split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
        setNickname((data as any).nickname || '');
        setPhone((data as any).phone || '');
        setTimezone((data as any).timezone || '');
        
        setAvatarUrl((data as any).avatar_url);

        // Profile is "complete" only if avatar exists
        // Other fields (name, phone) still checked for the full gate
        const hasAvatar = !!(data as any).avatar_url;
        const complete = !!(
          (data as any).full_name?.trim() &&
          (data as any).phone?.trim() &&
          hasAvatar
        );
        setIsComplete(complete);
      }
      setIsChecking(false);
    };

    // Check if user already skipped this session
    const wasSkipped = sessionStorage.getItem(`profile_gate_skipped_${user.id}`);
    if (wasSkipped) {
      setSkipped(true);
    }

    checkProfile();
  }, [user, authLoading]);

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isComplete || skipped) {
    return <>{children}</>;
  }

  const handleSkip = () => {
    if (user) {
      sessionStorage.setItem(`profile_gate_skipped_${user.id}`, 'true');
    }
    setSkipped(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // No file size limit - images are processed before upload
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
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) { toast.error('Please enter your name'); return; }

    setIsSaving(true);
    try {
      const updateData: Record<string, string> = {
        full_name: fullName,
        updated_at: new Date().toISOString(),
      };
      if (nickname.trim()) updateData.nickname = nickname.trim();
      if (phone.trim()) updateData.phone = phone.trim();
      if (avatarUrl) updateData.avatar_url = avatarUrl;
      if (timezone) updateData.timezone = timezone;
      

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
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

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const fields = [
    { label: 'Profile Photo', done: !!avatarUrl },
    { label: 'Name', done: !!fullName },
    { label: 'Phone Number', done: !!phone.trim() },
    
  ];
  const completedCount = fields.filter(f => f.done).length;
  const totalFields = fields.length;

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
            <span className="text-xs font-semibold text-muted-foreground ml-1">{completedCount}/{totalFields}</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  First Name
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Last Name
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nickname <span className="text-muted-foreground font-normal">(shown on leaderboard)</span>
              </label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="What do you go by?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Phone Number
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


          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !fullName}
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

          {/* Skip */}
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
