import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { setPageMeta } from '@/lib/pageMeta';
import { captureSourceFromUrl, ORGANIC, type SourceAttribution } from '@/lib/source';

const GOLD = '#D4AF37';

const INTEREST_OPTIONS = [
  'The money',
  'The lifestyle',
  'Escaping my current job',
  'Just curious',
];

const leadSchema = z.object({
  first_name: z.string().trim().min(1, { message: 'Enter your first name' }).max(80),
  phone: z
    .string()
    .trim()
    .min(7, { message: 'Enter a valid phone number' })
    .max(30, { message: 'Phone number is too long' }),
  city: z.string().trim().min(1, { message: 'Enter your city' }).max(80),
  interest_reason: z.string().trim().min(1, { message: 'Pick one' }).max(60),
});

export default function TicketPage() {
  const [params] = useSearchParams();
  const refCode = (params.get('ref') || '').trim().slice(0, 40) || 'direct';
  const industry = (params.get('industry') || '').trim().slice(0, 40) || null;

  const [form, setForm] = useState({ first_name: '', phone: '', city: '', interest_reason: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [calendly, setCalendly] = useState('');
  const [claimed, setClaimed] = useState<number | null>(null);
  const [seriesTotal, setSeriesTotal] = useState(100);
  const [source, setSource] = useState<SourceAttribution>(ORGANIC);


  const numericTicket = /^[0-9]{1,3}$/.test(refCode) && Number(refCode) >= 1 && Number(refCode) <= 100
    ? refCode.padStart(3, '0')
    : null;

  useEffect(() => {
    setPageMeta({
      title: 'Golden Ticket — Summit Marketing',
      description: 'You were handed a Summit Marketing ticket. Leave your details and a manager will reach out.',
      path: '/ticket',
    });
    (async () => {
      const { data } = await (supabase as any).rpc('get_ticket_config');
      if (data?.calendly_url) setCalendly(data.calendly_url as string);
      const { data: series } = await (supabase as any).rpc('get_ticket_series_status');
      if (series) {
        setClaimed(Number(series.claimed) || 0);
        setSeriesTotal(Number(series.series_total) || 100);
      }
      setSource(await captureSourceFromUrl());
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Check your details');
      return;
    }
    setSaving(true);
    const { error: insertError } = await (supabase as any).from('recruiting_leads').insert({
      ...parsed.data,
      ref_code: refCode,
      vertical: industry,
      status: 'New',
      source_type: source.source_type,
      source_code: source.source_code,
      referrer_user_id: source.referrer_user_id,
      partner_id: source.partner_id,
    });
    setSaving(false);
    if (insertError) {
      setError('That ticket did not save. Check your details and submit again.');
      return;
    }
    setDone(true);
  };

  const field =
    'w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#D4AF37]/60';

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center px-5 py-10" style={{ background: '#050505' }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[45vh]"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.16), transparent 70%)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Ticket mark */}
        <div className="flex justify-center mb-8">
          <div
            className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: GOLD, border: `1px solid ${GOLD}44`, background: 'rgba(212,175,55,0.06)' }}
          >
            {numericTicket ? `Ticket Nº ${numericTicket}` : 'Golden Ticket'}
          </div>
        </div>

        {!done ? (
          <>
            <h1
              className="text-center text-[34px] leading-[1.05] font-black tracking-tight mb-4"
              style={{ color: '#F5F5F5' }}
            >
              You’ve been{' '}
              <span
                style={{
                  background: `linear-gradient(180deg, #F5E6A8, ${GOLD})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                scouted.
              </span>
            </h1>
            <p className="text-center text-[14px] leading-relaxed text-white/55 mb-3">
              You’re holding one of {seriesTotal}. Leave your details and a manager will call you.
            </p>
            {numericTicket && claimed !== null && claimed > 0 && (
              <p className="text-center text-[12px] font-semibold uppercase tracking-[0.18em] mb-8" style={{ color: GOLD }}>
                {claimed} of {seriesTotal} claimed
              </p>
            )}
            {!(numericTicket && claimed !== null && claimed > 0) && <div className="mb-5" />}

            <form onSubmit={submit} className="space-y-3">
              <input
                className={field}
                placeholder="First name"
                autoComplete="given-name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
              <input
                className={field}
                placeholder="Phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                className={field}
                placeholder="City"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <select
                className={field + ' appearance-none'}
                value={form.interest_reason}
                onChange={(e) => setForm({ ...form, interest_reason: e.target.value })}
                style={{ color: form.interest_reason ? '#fff' : 'rgba(255,255,255,0.3)' }}
              >
                <option value="" style={{ color: '#000' }}>
                  What’s got you curious?
                </option>
                {INTEREST_OPTIONS.map((o) => (
                  <option key={o} value={o} style={{ color: '#000' }}>
                    {o}
                  </option>
                ))}
              </select>

              {error && <p className="text-[13px] text-red-400 px-1">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl py-4 text-[15px] font-bold tracking-tight text-black transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: `linear-gradient(180deg, #F0DC8C, ${GOLD})`,
                  boxShadow: '0 10px 30px -10px rgba(212,175,55,0.6)',
                }}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Claiming…
                  </span>
                ) : (
                  'Claim My Spot'
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center animate-fade-in">
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'rgba(212,175,55,0.12)', border: `1px solid ${GOLD}55` }}
            >
              <Check className="w-7 h-7" style={{ color: GOLD }} />
            </div>
            <h1 className="text-[30px] font-black tracking-tight mb-3" style={{ color: '#F5F5F5' }}>
              You’re in.
            </h1>
            <p className="text-[14px] text-white/55 mb-9">Expect a call within 24 hours.</p>

            {calendly && (
              <a
                href={calendly}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-colors"
                style={{ color: GOLD, border: `1px solid ${GOLD}55`, background: 'rgba(212,175,55,0.05)' }}
              >
                Skip the line — book your call now
                <ArrowRight className="w-4 h-4" />
              </a>
            )}

            <a
              href="/recruiting"
              className="mt-5 inline-block text-[13px] font-medium text-white/45 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/70"
            >
              See who we are
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
