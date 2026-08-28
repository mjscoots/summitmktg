import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Camera, User, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Wordmark } from '@/components/brand/Wordmark';
import { cn } from '@/lib/utils';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const SOURCES = [
  'A rep reached out',
  'A friend or family member',
  'Social media',
  'Campus or job fair',
  'Someone knocked my door',
  'Other',
];

type StepKey =
  | 'photo'
  | 'name'
  | 'phone'
  | 'hometown'
  | 'work'
  | 'shirt'
  | 'emergency'
  | 'source'
  | 'referrals';

interface Referral {
  name: string;
  phone: string;
  note: string;
}

/**
 * Day one, one question per screen. Every answer writes straight to the
 * profile as it is given, so a rep who stops halfway keeps what they typed.
 */
export function GuidedSetup({
  initial,
  onDone,
  onSkipAll,
}: {
  initial: Record<string, any>;
  onDone: () => void;
  onSkipAll: () => void;
}) {
  const { user, refreshProfile } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatar_url || null);
  const [firstName, setFirstName] = useState(String(initial.full_name || '').split(' ')[0] || '');
  const [lastName, setLastName] = useState(
    String(initial.full_name || '').split(' ').slice(1).join(' ')
  );
  const [nickname, setNickname] = useState(initial.nickname || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const [hometown, setHometown] = useState(initial.hometown || '');
  const [work, setWork] = useState(initial.organization || '');
  const [shirt, setShirt] = useState(initial.shirt_size || '');
  const [ecName, setEcName] = useState(initial.emergency_contact_name || '');
  const [ecPhone, setEcPhone] = useState(initial.emergency_contact_phone || '');
  const [source, setSource] = useState(initial.referred_by || '');
  const [referrals, setReferrals] = useState<Referral[]>([
    { name: '', phone: '', note: '' },
    { name: '', phone: '', note: '' },
    { name: '', phone: '', note: '' },
  ]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [index, setIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps: StepKey[] = useMemo(() => {
    const list: StepKey[] = [
      'photo',
      'name',
      'phone',
      'hometown',
      'work',
      'shirt',
      'emergency',
    ];
    if (!String(initial.referred_by || '').trim()) list.push('source');
    list.push('referrals');
    return list;
  }, [initial.referred_by]);

  const step = steps[index];
  const last = index === steps.length - 1;

  async function writeProfile(fields: Record<string, unknown>) {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ...fields, updated_at: new Date().toISOString() } as never)
      .eq('user_id', user.id);
    if (error) toast.error('That did not save');
  }

  async function markStep(key: string) {
    if (!user) return;
    await (supabase as any)
      .from('onboarding_marks')
      .upsert(
        { user_id: user.id, day: 0, item_key: `setup:${key}`, marked_by: user.id },
        { onConflict: 'user_id,day,item_key' }
      );
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Pick an image file');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
      await writeProfile({ avatar_url: publicUrl });
    } catch {
      toast.error('That photo did not upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function saveReferrals() {
    let added = 0;
    for (const r of referrals) {
      if (!r.name.trim() || r.phone.replace(/\D/g, '').length < 10) continue;
      const { data, error } = await (supabase as any).rpc('submit_referral', {
        _name: r.name.trim(),
        _phone: r.phone.trim(),
        _note: r.note.trim() || null,
      });
      if (error) {
        toast.error('That did not send');
        return;
      }
      const res = data as { ok: boolean; error?: string };
      if (res?.ok) added += 1;
      else if (res?.error) toast.error(res.error);
    }
    if (added > 0) toast.success(added === 1 ? 'One name sent' : `${added} names sent`);
  }

  async function finish() {
    if (!user) return;
    await writeProfile({ onboarding_status: 'profile_done' });
    await refreshProfile();
    onDone();
  }

  /** Saves the current screen, then moves on. */
  async function next(skip = false) {
    setSaving(true);
    try {
      if (!skip) {
        if (step === 'name') {
          const full = `${firstName.trim()} ${lastName.trim()}`.trim();
          if (!full) {
            toast.error('Add your name');
            return;
          }
          await writeProfile({ full_name: full, nickname: nickname.trim() || null });
        }
        if (step === 'phone' && phone.trim()) await writeProfile({ phone: phone.trim() });
        if (step === 'hometown' && hometown.trim()) await writeProfile({ hometown: hometown.trim() });
        if (step === 'work' && work.trim()) await writeProfile({ organization: work.trim() });
        if (step === 'shirt' && shirt) await writeProfile({ shirt_size: shirt });
        if (step === 'emergency' && (ecName.trim() || ecPhone.trim())) {
          await writeProfile({
            emergency_contact_name: ecName.trim() || null,
            emergency_contact_phone: ecPhone.trim() || null,
          });
        }
        if (step === 'source' && source.trim()) await writeProfile({ referred_by: source.trim() });
        if (step === 'referrals') await saveReferrals();
      }
      await markStep(skip ? `${step}:skipped` : step);
      if (last) await finish();
      else setIndex((i) => i + 1);
    } finally {
      setSaving(false);
    }
  }

  const heads: Record<StepKey, { title: string; hint: string }> = {
    photo: { title: 'Add a photo', hint: 'Your team sees this on the board and in chat.' },
    name: { title: 'What is your name?', hint: 'A nickname is optional.' },
    phone: { title: 'Your phone number', hint: 'Your manager uses this to reach you.' },
    hometown: { title: 'Where are you from?', hint: 'Your hometown or the city you live in.' },
    work: { title: 'School or job', hint: 'Where you are studying or working right now.' },
    shirt: { title: 'Shirt size', hint: 'For your gear.' },
    emergency: { title: 'Emergency contact', hint: 'One name and one number, in case we need it.' },
    source: { title: 'How did you find us?', hint: 'Pick the closest one.' },
    referrals: { title: 'Who are your three?', hint: 'Three people you would want on your team.' },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark className="h-6 w-auto text-foreground" />
          <button
            onClick={onSkipAll}
            className="min-h-11 text-[13px] text-muted-foreground hover:text-foreground"
          >
            Finish later
          </button>
        </div>

        <div className="mb-5 flex items-center gap-1.5">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= index ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
            Step {index + 1} of {steps.length}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {heads[step].title}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{heads[step].hint}</p>

          <div className="mt-5 space-y-3">
            {step === 'photo' && (
              <div className="flex justify-center">
                <div className="relative">
                  {uploading ? (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Your profile photo"
                      className="h-24 w-24 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/40">
                      <User className="h-9 w-9 text-muted-foreground/50" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary">
                    <Camera className="h-4 w-4 text-primary-foreground" />
                    <span className="sr-only">Upload a photo</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={uploadPhoto}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            )}

            {step === 'name' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    className="h-11"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    aria-label="First name"
                  />
                  <Input
                    className="h-11"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    aria-label="Last name"
                  />
                </div>
                <Input
                  className="h-11"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Nickname (optional)"
                  aria-label="Nickname"
                />
              </>
            )}

            {step === 'phone' && (
              <Input
                className="h-11"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                aria-label="Phone number"
              />
            )}

            {step === 'hometown' && (
              <Input
                className="h-11"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                placeholder="City, state"
                aria-label="Hometown or city"
              />
            )}

            {step === 'work' && (
              <Input
                className="h-11"
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="School or employer"
                aria-label="School or job"
              />
            )}

            {step === 'shirt' && (
              <div className="flex flex-wrap gap-2">
                {SHIRT_SIZES.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={shirt === s ? 'default' : 'outline'}
                    className="min-h-11 min-w-[56px]"
                    onClick={() => setShirt(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}

            {step === 'emergency' && (
              <>
                <Input
                  className="h-11"
                  value={ecName}
                  onChange={(e) => setEcName(e.target.value)}
                  placeholder="Their name"
                  aria-label="Emergency contact name"
                />
                <Input
                  className="h-11"
                  type="tel"
                  value={ecPhone}
                  onChange={(e) => setEcPhone(e.target.value)}
                  placeholder="Their phone number"
                  aria-label="Emergency contact phone"
                />
              </>
            )}

            {step === 'source' && (
              <div className="space-y-2">
                {SOURCES.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={source === s ? 'default' : 'outline'}
                    className="min-h-11 w-full justify-start"
                    onClick={() => setSource(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}

            {step === 'referrals' && (
              <div className="space-y-4">
                {referrals.map((r, i) => (
                  <div key={i} className="space-y-2 rounded-[10px] border border-border p-3">
                    <p className="text-[12px] text-muted-foreground">Person {i + 1}</p>
                    <Input
                      className="h-11"
                      value={r.name}
                      onChange={(e) =>
                        setReferrals((list) =>
                          list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                        )
                      }
                      placeholder="Name"
                      aria-label={`Referral ${i + 1} name`}
                    />
                    <Input
                      className="h-11"
                      type="tel"
                      value={r.phone}
                      onChange={(e) =>
                        setReferrals((list) =>
                          list.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x))
                        )
                      }
                      placeholder="Phone number"
                      aria-label={`Referral ${i + 1} phone`}
                    />
                    <Textarea
                      value={r.note}
                      onChange={(e) =>
                        setReferrals((list) =>
                          list.map((x, j) => (j === i ? { ...x, note: e.target.value } : x))
                        )
                      }
                      rows={2}
                      placeholder="How you know them (optional)"
                      aria-label={`Referral ${i + 1} note`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            className="mt-6 min-h-12 w-full"
            disabled={saving || uploading}
            onClick={() => void next(false)}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : last ? 'Done' : 'Continue'}
          </Button>

          <div className="mt-3 flex items-center justify-between">
            <button
              className="inline-flex min-h-11 items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40"
              disabled={index === 0 || saving}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              className="min-h-11 text-[13px] text-muted-foreground hover:text-foreground"
              disabled={saving}
              onClick={() => void next(true)}
            >
              Skip this
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuidedSetup;
