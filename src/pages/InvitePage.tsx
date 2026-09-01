import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type Preview =
  | { status: 'ok'; role: string; vertical: string | null; team_name: string | null; region: string | null; inviter: string | null }
  | { status: 'invalid' | 'used' | 'revoked' | 'expired' };

const VERTICAL_LABELS: Record<string, string> = {
  pest: 'Pest control',
  fiber: 'Fiber internet',
  life: 'Life insurance',
};

const ROLE_LABELS: Record<string, string> = {
  rep: 'Rep',
  manager: 'Manager',
  'vertical lead': 'Vertical lead',
};

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [accountExists, setAccountExists] = useState(false);
  const [codeStep, setCodeStep] = useState(false);
  const [greetName, setGreetName] = useState('');
  const [inviterFirst, setInviterFirst] = useState('');
  const [code, setCode] = useState('');



  useEffect(() => {
    if (isAuthenticated) {
      toast('You already have an account');
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const [lookup, previewResult] = await Promise.all([
        (supabase as any).rpc('invite_lookup', { p_token: token }),
        supabase.functions.invoke('redeem-invite', { body: { action: 'preview', token } }),
      ]);
      const found = (lookup?.data || null) as
        | { valid: boolean; first_name: string | null; inviter_first_name: string | null }
        | null;
      if (found?.valid) {
        setGreetName(found.first_name || '');
        setInviterFirst(found.inviter_first_name || '');
        if (found.first_name) setFirstName(found.first_name);
      }
      setPreview(previewResult.error ? { status: 'invalid' } : (previewResult.data as Preview));
      setLoading(false);
    })();
  }, [token]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name and email are required.');
      return;
    }
    setSubmitting(true);
    const { data, error: fnError } = await supabase.functions.invoke('redeem-invite', {
      body: {
        action: 'redeem',
        token,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      },
    });
    const result = (data || {}) as { status?: string; message?: string };
    if (fnError && !result.status) {
      setSubmitting(false);
      setError('Something went wrong. Try again in a moment.');
      return;
    }
    if (result.status === 'account_exists') {
      setSubmitting(false);
      setAccountExists(true);
      return;
    }
    if (result.status !== 'ok') {
      setSubmitting(false);
      if (result.status === 'rate_limited') {
        setError('Too many attempts. Try again later.');
      } else if (result.status === 'used' || result.status === 'revoked' || result.status === 'expired') {
        setPreview({ status: result.status });
      } else {
        setError(result.message || 'This link did not work.');
      }
      return;
    }

    await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    setSubmitting(false);
    setCodeStep(true);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setSubmitting(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    // Pass 119 — a brand new person lands in the day-one watch course first.
    navigate('/recruit-course', { replace: true });
  };

  const shell = (children: React.ReactNode) => (
    <div className="gold-world public-dots relative flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="relative z-10 mx-auto w-full max-w-md text-center">
        <Wordmark variant="hero" height={100} className="mx-auto !h-auto w-full max-w-[280px]" />
        <div className="mt-8 text-left">{children}</div>
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <p className="text-center text-sm text-muted-foreground">Loading your invite</p>,
    );
  }

  if (!preview || preview.status !== 'ok') {
    const line =
      preview?.status === 'used'
        ? 'This invite has already been used.'
        : preview?.status === 'revoked'
          ? 'This invite was cancelled.'
          : preview?.status === 'expired'
            ? 'This invite has expired.'
            : 'This invite link is not valid.';
    return shell(
      <div className="public-surface p-6">
        <p className="text-foreground">{line}</p>
        <Button className="mt-4 min-h-12 w-full" onClick={() => navigate('/recruiting#apply')}>
          Apply instead
        </Button>
      </div>,
    );
  }


  if (accountExists) {
    return shell(
      <div className="public-surface p-6">
        <p className="text-foreground">You already have an account. Sign in instead.</p>
        <Button className="mt-4 min-h-12 w-full" onClick={() => navigate('/login')}>
          Go to sign in
        </Button>
      </div>,
    );
  }

  if (codeStep) {
    return shell(
      <form onSubmit={verify} className="public-surface p-6">
        <h1 className="text-lg font-extrabold text-foreground">Check your email for your code</h1>
        <p className="mt-1 text-sm text-muted-foreground">We sent a sign-in code to {email}.</p>
        <div className="mt-4">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="min-h-12"
          />
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting} className="mt-4 min-h-12 w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>,
    );
  }

  const details = [
    preview.vertical ? VERTICAL_LABELS[preview.vertical] || preview.vertical : null,
    preview.team_name,
    preview.region,
    ROLE_LABELS[preview.role] || preview.role,
  ].filter(Boolean) as string[];

  return shell(
    <form onSubmit={submit} className="public-surface p-6">
      <h1 className="text-xl font-extrabold text-foreground">
        {greetName ? `${greetName}, you are invited to Summit` : 'You are invited to Summit'}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{details.join(' · ')}</p>
      {(inviterFirst || preview.inviter) && (
        <p className="mt-1 text-sm text-muted-foreground">Invited by {preview.inviter || inviterFirst}</p>
      )}


      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first">First name</Label>
            <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="min-h-12" />
          </div>
          <div>
            <Label htmlFor="last">Last name</Label>
            <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} className="min-h-12" />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-12" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-12" />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="mt-5 min-h-12 w-full">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create my account
      </Button>
    </form>,
  );
};

export default InvitePage;
