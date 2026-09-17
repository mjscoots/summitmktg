import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadSchedulingUrl } from '@/lib/scheduling';
import { useApplicationSource } from '@/components/apply/IndustryStep';

/**
 * Pass 188 - one step by step application flow shared by both routes.
 *
 * One question per step, one card, a progress bar and a back arrow. No pay
 * figures live anywhere on this screen.
 */

export const INTEREST_OPTIONS = ['Pest control', 'Fiber internet', 'Life insurance', 'Not sure yet'] as const;
export const EXPERIENCE_OPTIONS = ['Nothing yet', 'Some sales', 'Door to door', 'Another industry'] as const;
export const STYLE_OPTIONS = ['In person sales', 'Remote sales', 'Either'] as const;

const VERTICAL_BY_INTEREST: Record<string, string> = {
  'Pest control': 'Pest',
  'Fiber internet': 'Fiber',
  'Life insurance': 'Life',
};
const INTEREST_BY_VERTICAL: Record<string, string> = {
  pest: 'Pest control',
  fiber: 'Fiber internet',
  life: 'Life insurance',
};

type StepKind = 'multi' | 'single' | 'text' | 'contact';

interface Step {
  id: string;
  kind: StepKind;
  title: string;
  helper?: string;
  options?: readonly string[];
  placeholder?: string;
  skippable?: boolean;
}

const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Pass 223 - the key that ties every write in one visit to one row. It lives in
 * localStorage so a refresh, a back step or a dropped connection returns to the
 * same row instead of making a second person out of the same human.
 */
const KEY_STORAGE = 'trnty_apply_key';

function applyKey(): string {
  try {
    const held = localStorage.getItem(KEY_STORAGE);
    if (held && held.length >= 8) return held;
    const made = `ak_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(KEY_STORAGE, made);
    return made;
  } catch {
    return `ak_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** The one line the person reads at the moment we start keeping their number. */
export const CONTACT_NOTE =
  'We save your name and number now, so someone from Trinity can call you even if you stop before the end.';

function buildSteps(kind: 'rookie' | 'vet'): Step[] {
  const head: Step[] = [
    { id: 'contact', kind: 'contact', title: 'How do we reach you?' },
    {
      id: 'interests',
      kind: 'multi',
      title: 'What are you most interested in?',
      helper: 'Choose one or more.',
      options: INTEREST_OPTIONS,
    },
    { id: 'experience', kind: 'single', title: 'What have you done before?', options: EXPERIENCE_OPTIONS },
    { id: 'style', kind: 'single', title: 'In person or remote?', options: STYLE_OPTIONS },
  ];

  const vetOnly: Step[] = [
    { id: 'revenue', kind: 'text', title: 'Last season revenue', placeholder: '' },
    {
      id: 'markets',
      kind: 'text',
      title: 'Markets you have worked',
      placeholder: 'List the markets you have worked before, city and state',
    },
  ];

  const tail: Step[] = [
    {
      id: 'goal',
      kind: 'text',
      title: 'What is your earnings goal for your first year?',
      placeholder: 'Your number',
    },
    { id: 'location', kind: 'text', title: 'Where are you located?', placeholder: 'City, State' },
    {
      id: 'referral',
      kind: 'text',
      title: 'Who told you about Trinity?',
      placeholder: 'The person who referred you, or the account you saw',
      skippable: true,
    },
  ];

  return kind === 'vet' ? [...head, ...vetOnly, ...tail] : [...head, ...tail];
}

const choiceBase =
  'flex min-h-[64px] w-full items-center justify-center rounded-xl border px-4 text-base font-semibold transition-colors sm:w-[420px]';
const primaryBase =
  'flex min-h-[64px] w-full items-center justify-center gap-2 rounded-xl bg-[#0A0A0F] px-4 text-[18px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-[420px]';
const inputBase =
  'min-h-[56px] w-full rounded-xl border border-[#E4E4EC] bg-white px-4 text-base text-[#0A0A0F] outline-none placeholder:text-[#8A8A99] focus:border-[#004EFD] sm:w-[420px]';

export default function ApplyFlow({ kind }: { kind: 'rookie' | 'vet' }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { source } = useApplicationSource();
  const steps = useMemo(() => buildSteps(kind), [kind]);
  const total = steps.length;

  const [index, setIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const advanceTimer = useRef<number | undefined>(undefined);

  const [interests, setInterests] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [style, setStyle] = useState('');
  const [revenue, setRevenue] = useState('');
  const [markets, setMarkets] = useState('');
  const [goal, setGoal] = useState('');
  const [location, setLocation] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [referral, setReferral] = useState('');

  // The pop up and the cover carry the market, the referral and the vertical.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const market = (params.get('market') || '').slice(0, 80);
    const ref = (params.get('referral') || '').slice(0, 80);
    const vertical = (params.get('vertical') || '').toLowerCase();
    if (market) setLocation(market);
    if (ref) setReferral(ref);
    const preset = INTEREST_BY_VERTICAL[vertical];
    if (preset) setInterests([preset]);
  }, []);

  useEffect(() => {
    loadSchedulingUrl().then(setSchedulingUrl);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index, atEnd]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const step = steps[index];

  const textValue = (id: string) =>
    id === 'revenue' ? revenue
      : id === 'markets' ? markets
      : id === 'goal' ? goal
      : id === 'location' ? location
      : referral;

  const setTextValue = (id: string, value: string) => {
    if (id === 'revenue') setRevenue(value);
    else if (id === 'markets') setMarkets(value);
    else if (id === 'goal') setGoal(value);
    else if (id === 'location') setLocation(value);
    else setReferral(value);
  };

  const valid = (() => {
    if (!step) return false;
    if (step.kind === 'multi') return interests.length > 0;
    if (step.kind === 'single') return step.id === 'experience' ? Boolean(experience) : Boolean(style);
    if (step.kind === 'contact')
      return fullName.trim() !== '' && phone.trim() !== '' && email.trim() !== '' && emailOk(email.trim());
    if (step.skippable) return true;
    return textValue(step.id).trim() !== '';
  })();

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= total) {
        setAtEnd(true);
        return i;
      }
      return i + 1;
    });
  }, [total]);

  const goBack = () => {
    if (atEnd) {
      setAtEnd(false);
      return;
    }
    if (index === 0) {
      navigate('/');
      return;
    }
    setIndex((i) => i - 1);
  };

  const pickSingle = (id: string, value: string) => {
    if (id === 'experience') setExperience(value);
    else setStyle(value);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(goNext, 280);
  };

  const derivedVertical = (() => {
    const picked = interests.filter((i) => VERTICAL_BY_INTEREST[i]);
    return picked.length === 1 ? VERTICAL_BY_INTEREST[picked[0]] : null;
  })();

  const submit = async (wantsCall: boolean) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-application', {
        body: {
          application_type: kind === 'vet' ? 'vet' : 'rookie',
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          city_state: location.trim(),
          referral_source: referral.trim(),
          interested_in: interests.length ? interests : null,
          sales_style: style || null,
          earnings_goal: goal.trim() || null,
          experience: experience || null,
          wants_call: wantsCall,
          vertical: derivedVertical,
          previous_company: kind === 'vet' ? markets.trim() : null,
          years_experience: kind === 'vet' ? revenue.replace(/[^0-9]/g, '') : null,
          source_type: source.source_type,
          source_code: source.source_code,
          referrer_user_id: source.referrer_user_id,
          partner_id: source.partner_id,
          website: honeypot,
        },
      });

      if (error || (data as { error?: string } | null)?.error) {
        throw new Error((data as { error?: string } | null)?.error || 'rejected');
      }

      supabase.functions
        .invoke('send-welcome-email', {
          body: {
            email: email.trim().toLowerCase(),
            firstName: fullName.trim().split(' ')[0],
            applicationType: kind === 'vet' ? 'vet' : 'rookie',
          },
        })
        .catch((emailError) => {
          console.error('Welcome email failed:', emailError);
        });

      if (wantsCall && schedulingUrl) {
        window.open(schedulingUrl, '_blank', 'noopener,noreferrer');
        navigate('/apply/success?call=1');
        return;
      }
      navigate('/apply/success');
    } catch (err) {
      console.error('Application submission error:', err);
      toast({
        title: 'Submission Failed',
        description: 'That did not go through. Check the phone and email and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' || atEnd) return;
    if (event.target instanceof HTMLButtonElement) return;
    if (!valid) return;
    event.preventDefault();
    goNext();
  };

  const progress = atEnd ? 1 : (index + 1) / total;

  return (
    <div className="apply-flow mx-auto w-full max-w-[560px] px-5 py-6 sm:py-10">
      <div className="rounded-2xl border border-[#E4E4EC] bg-white p-5 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-[#0A0A0F] transition-colors hover:bg-[#F3F3F7]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-[4px] flex-1 rounded-full bg-[#E4E4EC]">
            <div
              className="apply-progress h-[4px] rounded-full bg-[#004EFD]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        {atEnd ? (
          <div className="apply-step" onKeyDown={onKeyDown}>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-[24px] font-extrabold leading-tight text-[#0A0A0F] outline-none sm:text-[28px]"
            >
              We will have someone reach out and see if you are a good fit.
            </h2>
            <div className="mt-7 flex flex-col items-start gap-3">
              {schedulingUrl && (
                <button type="button" disabled={submitting} className={primaryBase} onClick={() => submit(true)}>
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Set up a call first
                </button>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={() => submit(false)}
                className={`${choiceBase} border-[#E4E4EC] bg-white text-[#0A0A0F] disabled:opacity-40`}
              >
                Just submit my application
              </button>
            </div>
          </div>
        ) : (
          <div className="apply-step" key={step.id} onKeyDown={onKeyDown}>
            <p className="mb-2 text-[13px] font-semibold text-[#8A8A99]">
              Step {index + 1} of {total}
            </p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-[24px] font-extrabold leading-tight text-[#0A0A0F] outline-none sm:text-[30px]"
            >
              {step.title}
            </h2>
            {step.helper && <p className="mt-2 text-[15px] text-[#5A5A6B]">{step.helper}</p>}

            <div className="mt-6 flex flex-col items-start gap-3">
              {step.kind === 'multi' &&
                step.options?.map((option) => {
                  const on = interests.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setInterests((prev) =>
                          prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option],
                        )
                      }
                      className={`${choiceBase} ${
                        on ? 'border-[#0A0A0F] bg-[#0A0A0F] text-white' : 'border-[#E4E4EC] bg-white text-[#0A0A0F]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}

              {step.kind === 'single' &&
                step.options?.map((option) => {
                  const on = (step.id === 'experience' ? experience : style) === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pickSingle(step.id, option)}
                      className={`${choiceBase} ${
                        on ? 'border-[#0A0A0F] bg-[#0A0A0F] text-white' : 'border-[#E4E4EC] bg-white text-[#0A0A0F]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}

              {step.kind === 'text' && (
                <input
                  type="text"
                  value={textValue(step.id)}
                  onChange={(e) => setTextValue(step.id, e.target.value)}
                  placeholder={step.placeholder}
                  aria-label={step.title}
                  className={inputBase}
                />
              )}

              {step.kind === 'contact' && (
                <>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                    aria-label="Full name"
                    className={inputBase}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    aria-label="Phone number"
                    className={inputBase}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    aria-label="Email address"
                    className={inputBase}
                  />
                </>
              )}

              {step.kind !== 'single' && (
                <button type="button" disabled={!valid} onClick={goNext} className={`mt-3 ${primaryBase}`}>
                  Continue
                </button>
              )}

              {step.skippable && (
                <button
                  type="button"
                  onClick={goNext}
                  className="min-h-11 text-[15px] font-semibold text-[#0A0A0F] underline underline-offset-4"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
