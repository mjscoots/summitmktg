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

interface Lookup {
  valid: boolean;
  pillar_name?: string;
  vertical?: string;
}

const VERTICAL_LABELS: Record<string, string> = {
  Pest: 'Pest control',
  Fiber: 'Fiber internet',
  Life: 'Life insurance',
};

/** The permanent pillar recruit link. It names the pillar and the industry, then makes the account. */
const PillarJoinPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [accountExists, setAccountExists] = useState(false);
  const [codeStep, setCodeStep] = useState(false);
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
      const { data } = await (supabase as any).rpc('pillar_link_lookup', { p_token: token });
      setLookup((data as Lookup | null) || { valid: false });
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
    const { data, error: fnError } = await supabase.functions.invoke('pillar-join', {
      body: {
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
      } else if (result.status === 'invalid') {
        setLookup({ valid: false });
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
    return shell(<p className="text-center text-sm text-muted-foreground">Loading this link</p>);
  }

  if (!lookup?.valid) {
    return shell(
      <div className="public-surface p-6">
        <p className="text-foreground">This link is not valid.</p>
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

  const industry = lookup.vertical ? VERTICAL_LABELS[lookup.vertical] || lookup.vertical : null;

  return shell(
    <form onSubmit={submit} className="public-surface p-6">
      <h1 className="text-xl font-extrabold text-foreground">Join {lookup.pillar_name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {industry ? `${industry} at Summit` : 'Summit'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Make your account here. Your pillar leader accepts you in from their side.
      </p>

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

export default PillarJoinPage;
