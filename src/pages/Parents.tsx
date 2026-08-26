import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mountain } from 'lucide-react';
import { useRecruitingContent } from '@/hooks/usePublicRecruiting';
import { setPageMeta } from '@/lib/pageMeta';

interface Section {
  key: string;
  heading: string;
  fallback: string;
}

/** Honest factual defaults — the owner can replace any of these from the admin panel. */
export const PARENT_SECTIONS: Section[] = [
  {
    key: 'parents_what_it_is',
    heading: 'What the job actually is',
    fallback:
      'Summit trains and fields door-to-door sales reps. Reps work an assigned area and sell service agreements directly to residents. It is commission-based sales work, not an hourly job, and it runs roughly from May through August. Summit also runs a smaller fiber internet line in the winter and is starting a life insurance line.',

  },
  {
    key: 'parents_housing',
    heading: 'Housing and living arrangements',
    fallback:
      'Reps relocate to the summer sales market and live in shared housing arranged by the team, usually apartments with two to four reps per unit. Housing costs are disclosed before the season starts and are deducted from commissions rather than paid up front.',
  },
  {
    key: 'parents_safety',
    heading: 'Safety and supervision',
    fallback:
      'Reps work in daylight hours in assigned neighborhoods, are driven to and from their areas in team car groups, and check in with a manager every day. Every rep has a direct manager they meet with weekly, and there is always a manager reachable by phone while reps are in the field.',
  },
  {
    key: 'parents_pay',
    heading: 'How pay works',
    fallback:
      'Pay is commission on serviced accounts. A rep earns a percentage of the revenue their accounts generate once service is performed, and the percentage increases as total revenue increases. Because it is commission, earnings depend entirely on how much the rep sells and how many of those accounts stay serviced. There is no guaranteed income and no earnings promise.',
  },
  {
    key: 'parents_expectations',
    heading: 'What we expect from your student',
    fallback:
      'A full summer commitment, a consistent daily work schedule, attendance at weekly team meetings, and honesty with customers. Reps who follow the training and put in the hours generally finish the summer with real sales experience and savings.',
  },
  {
    key: 'parents_questions',
    heading: 'Questions',
    fallback:
      'If you would like to speak with a manager directly before your student commits, reach out through Instagram and we will set up a call with the person who would be managing them.',
  },
];

export default function Parents() {
  const navigate = useNavigate();
  const content = useRecruitingContent();

  useEffect(() => {
    setPageMeta({
      title: 'Information for Parents — Summit Marketing',
      description:
        'A plain explanation of the summer sales job, housing, safety and how pay works at Summit.',
      path: '/parents',
    });
  }, []);

  const copy = content?.parents || {};

  return (
    <div className="gold-world min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate('/recruiting')}
            className="flex items-center gap-2 text-foreground transition-colors hover:text-primary"
          >
            <Mountain className="h-5 w-5 text-primary" />
            <span className="text-lg font-black tracking-tight">Summit</span>
          </button>
        </div>
      </nav>

      <header className="border-b border-border py-14">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            For parents
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Information for parents
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {copy.parents_intro ||
              'This page explains what your student would be doing, where they would live, how they are supervised, and how they get paid. No pitch — just the facts, so you can ask better questions.'}
          </p>
        </div>
      </header>

      <main className="py-12">
        <div className="mx-auto max-w-3xl space-y-4 px-6">
          {PARENT_SECTIONS.map((s) => (
            <section key={s.key} className="rounded-xl border border-border bg-card/60 p-6">
              <h2 className="text-lg font-bold text-foreground">{s.heading}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {copy[s.key] || s.fallback}
              </p>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <span className="text-sm text-muted-foreground">Summit Trinity © 2026</span>
          <button
            onClick={() => navigate('/recruiting')}
            className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Back to summer jobs
          </button>
        </div>
      </footer>
    </div>
  );
}
