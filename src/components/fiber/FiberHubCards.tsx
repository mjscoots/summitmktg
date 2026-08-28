import { useState } from 'react';
import { ArrowUpRight, Copy, Check, Phone, MessageSquare, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { FiberContact, FiberFaq } from '@/hooks/useFiberHub';

export const HUB_CARD = 'rounded-xl border border-border bg-card';

/** A mint eyebrow above every Fiber section, so the workspace reads as Fiber at a glance. */
export function FiberEyebrow({ children }: { children: string }) {
  return (
    <p
      className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
      style={{ color: 'hsl(var(--workspace-accent))' }}
    >
      {children}
    </p>
  );
}

const GAINZ_URL = 'https://gainzops.org';

/** The hero: the work runs on Gainz, one tap away. */
export function GainzHero() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border p-5"
      style={{
        borderColor: 'hsl(var(--workspace-accent) / 0.35)',
        background:
          'linear-gradient(180deg, hsl(var(--workspace-accent) / 0.10), hsl(var(--surface-elevated)))',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--workspace-accent) / 0.10) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--workspace-accent) / 0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative">
        <FiberEyebrow>Fiber</FiberEyebrow>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-foreground">
          Your work runs on Gainz
        </h1>
        <span className="hero-accent-rule mt-3" aria-hidden />

        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Blitz areas, orders and payroll live on Gainz. This app is training, your team, chat and help.
        </p>
        <a
          href={GAINZ_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          Open Gainz
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

/** Managers and admins only: the rep onboarding link. */
export function JoinGainzCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  if (!link) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy the link');
    }
  };

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Join Gainz', url: link });
        return;
      } catch {
        /* dismissed */
      }
    }
    void copy();
  };

  return (
    <div className={`${HUB_CARD} p-4`}>
      <FiberEyebrow>Join Gainz</FiberEyebrow>
      <p className="text-[15px] text-muted-foreground">Send this to a new fiber rep to get them onboarded</p>
      <p className="mt-3 break-all rounded-lg border border-border bg-secondary/60 p-3 text-[12px] text-foreground">
        {link}
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" className="min-h-11 flex-1" onClick={copy}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copy
        </Button>
        <Button variant="outline" className="min-h-11 flex-1" onClick={share}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  );
}

function dial(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

/** Who to contact: tap to call or text. */
export function ContactsCard({ contacts }: { contacts: FiberContact[] }) {
  if (!contacts.length) return null;
  return (
    <div className={`${HUB_CARD} p-4`}>
      <FiberEyebrow>Who to contact</FiberEyebrow>
      <ul className="divide-y divide-border">
        {contacts.map((c) => (
          <li key={c.name} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-foreground">{c.name}</p>
              <p className="text-[15px] text-muted-foreground">{c.role}</p>
              <p className="text-[15px] tabular-nums text-muted-foreground">{c.phone}</p>
            </div>
            <a
              href={`tel:${dial(c.phone)}`}
              aria-label={`Call ${c.name}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={`sms:${dial(c.phone)}`}
              aria-label={`Text ${c.name}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** How it works, folded into the questions card as three plain entries. */
const HOW_IT_WORKS: { id: string; question: string; answer: string }[] = [
  {
    id: 'how-screenshots',
    question: 'Do I need a screenshot of every sale?',
    answer: 'Yes. Screenshots reconcile against ISP reports so no commission gets lost.',
  },
  {
    id: 'how-pay',
    question: 'Who do I ask about pay?',
    answer: 'Kei. Pay runs through Gainz and Everee, not this app.',
  },
  {
    id: 'how-markets',
    question: 'How do I request a market?',
    answer: 'By text through your manager, not the portal.',
  },
];

/** The Gainz onboarding questions, expandable one at a time. */
export function FiberQuestions({ faq }: { faq: FiberFaq[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const items = [...HOW_IT_WORKS, ...faq];
  if (!items.length) return null;
  return (
    <div className={`${HUB_CARD} p-4`}>
      <FiberEyebrow>Questions</FiberEyebrow>
      <ul className="divide-y divide-border">
        {items.map((q) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => setOpen(open === q.id ? null : q.id)}
              aria-expanded={open === q.id}
              className="flex min-h-11 w-full items-center justify-between gap-3 py-2.5 text-left text-[15px] text-foreground"
            >
              <span>{q.question}</span>
            </button>
            {open === q.id && <p className="pb-3 text-[15px] text-muted-foreground">{q.answer}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
