import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';

/**
 * Pass 186 - the three questions.
 *
 * The same three questions run in two places: a sheet that rises once per visit
 * and a plain section in the page, so a visitor who closed the sheet still gets
 * asked. Nothing is written here. The answers ride to the application as query
 * params (sales, good, market) and pick the route; the industry question now
 * lives inside the application itself, so vertical is left empty.
 */
export const ASK_SEEN_KEY = 'trnty_ask_seen';

type Sold = 'yes' | 'no';
type Good = 'yes' | 'unsure' | 'find_out';

const SOLD: { value: Sold; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const GOOD: { value: Good; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'unsure', label: 'Not sure' },
  { value: 'find_out', label: 'I want to find out' },
];

export function useAskAnswers() {
  const [sold, setSold] = useState<Sold | null>(null);
  const [good, setGood] = useState<Good | null>(null);
  const [market, setMarket] = useState('');

  const step = sold === null ? 0 : good === null ? 1 : 2;
  const done = sold !== null && good !== null && market.trim().length > 0;

  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (sold) params.set('sales', sold);
    if (good) params.set('good', good);
    if (market.trim()) params.set('market', market.trim().slice(0, 80));
    params.set('vertical', '');
    const path = sold === 'yes' ? '/apply/veteran' : '/apply/rookie';
    return `${path}?${params.toString()}`;
  }, [sold, good, market]);

  const reset = useCallback(() => {
    setSold(null);
    setGood(null);
    setMarket('');
  }, []);

  return { sold, setSold, good, setGood, market, setMarket, step, done, href, reset };
}

interface QuestionsProps {
  ask: ReturnType<typeof useAskAnswers>;
  idPrefix: string;
}

/** The three questions, one at a time, plus the closing line. */
export function AskQuestions({ ask, idPrefix }: QuestionsProps) {
  const { sold, setSold, good, setGood, market, setMarket, step, done, href } = ask;
  const [completed, setCompleted] = useState(false);

  return (
    <div className="ask-body" data-step={step} data-complete={completed ? 'true' : 'false'}>
      {step === 0 && (
        <div className="ask-step" key="one">
          <h3 className="ask-question" id={`${idPrefix}-q1`}>Have you done sales before?</h3>
          <div className="mt-6 grid gap-3">
            {SOLD.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setSold(o.value)}
                className={`ask-choice ${sold === o.value ? 'ask-choice-on' : ''}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="ask-step" key="two">
          <h3 className="ask-question">Do you think you would be good at it?</h3>
          <div className="mt-6 grid gap-3">
            {GOOD.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setGood(o.value)}
                className={`ask-choice ${good === o.value ? 'ask-choice-on' : ''}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && !completed && (
        <div className="ask-step" key="three">
          <h3 className="ask-question">Where are you located?</h3>
          <input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="City, state"
            aria-label="Where are you located?"
            autoComplete="address-level2"
            className="ask-input mt-6"
          />
          <button
            type="button"
            className="ask-continue mt-3"
            disabled={!done}
            onClick={() => setCompleted(true)}
          >
            Continue
          </button>
        </div>
      )}
      {step === 2 && completed && (
        <div className="ask-step ask-final" key="done">
          <p className="ask-line">You are in the right place.</p>
          <Link to={href} className="btn-purple ask-get-in mt-5 inline-flex w-full items-center justify-center gap-2 px-8">
            Get in <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
      <div className="ask-dots" aria-label={`Question ${step + 1} of 3`}>
        {[0, 1, 2].map((index) => <span key={index} className={step === index ? 'ask-dot ask-dot-on' : 'ask-dot'} />)}
      </div>
    </div>
  );
}

/** The plain in page copy of the same three questions. */
export function AskSection() {
  const ask = useAskAnswers();
  return (
    <section id="ask" className="public-section px-5 py-16 text-center sm:px-6 md:py-24" data-reveal>
      <h2 className="section-title mx-auto max-w-4xl text-foreground">
        <span className="reveal-clip"><span>Three questions.</span></span>
      </h2>
      <div className="mx-auto mt-10 max-w-md text-left">
        <AskQuestions ask={ask} idPrefix="ask-section" />
      </div>
    </section>
  );
}

interface SheetProps {
  /** The element that has to be seen before the sheet rises. */
  watchId: string;
}

/** The sheet: rises once per visit, closes for good when dismissed. */
export function AskSheet({ watchId }: SheetProps) {
  const ask = useAskAnswers();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closedRef = useRef(false);
  const returnTo = useRef<HTMLElement | null>(null);
  const dragStart = useRef<number | null>(null);

  const seen = () => {
    try {
      return sessionStorage.getItem(ASK_SEEN_KEY) === '1';
    } catch {
      return false;
    }
  };

  const close = useCallback(() => {
    closedRef.current = true;
    try {
      sessionStorage.setItem(ASK_SEEN_KEY, '1');
    } catch {
      /* private mode */
    }
    setOpen(false);
    returnTo.current?.focus?.();
  }, []);

  // 1,500ms after the statement has been fully in view, or the moment the
  // visitor scrolls past it, whichever lands first.
  useEffect(() => {
    if (seen()) return;
    const node = document.getElementById(watchId);
    if (!node) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (closedRef.current) return;
          // Scrolled past: the statement has mostly left the top of the screen.
          const past = entry.boundingClientRect.bottom < window.innerHeight * 0.5;
          if (past) {
            window.clearTimeout(timer);
            setOpen(true);
            return;
          }
          // Fully in view means the whole element, or the whole viewport when
          // the element is taller than the screen.
          const need = Math.min(entry.boundingClientRect.height, window.innerHeight) - 2;
          if (entry.intersectionRect.height >= need) {
            if (!timer) timer = window.setTimeout(() => setOpen(true), 1500);
          } else {
            window.clearTimeout(timer);
            timer = 0;
          }
        });
      },
      { threshold: [0, 0.5, 0.95, 1] },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [watchId]);

  // Escape closes, Tab cycles inside the sheet.
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    sheet?.querySelector<HTMLElement>('button, a, input')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab' || !sheet) return;
      const nodes = Array.from(
        sheet.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])'),
      ).filter((n) => !n.hasAttribute('disabled'));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !sheet.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="ask-layer" role="presentation">
      <div className="ask-scrim" onClick={close} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="ask-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Three questions"
        onTouchStart={(e) => {
          dragStart.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          const start = dragStart.current;
          dragStart.current = null;
          const end = e.changedTouches[0]?.clientY;
          if (start != null && end != null && end - start > 80) close();
        }}
      >
        <button type="button" onClick={close} aria-label="Close" className="ask-close">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <AskQuestions ask={ask} idPrefix="ask-sheet" />
      </div>
    </div>
  );
}

export default AskSheet;
