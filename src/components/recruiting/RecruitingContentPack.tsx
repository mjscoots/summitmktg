import { useRecruitingContent, type RecruitingContent } from '@/hooks/usePublicRecruiting';

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video${u.pathname}`;
    return null;
  } catch {
    return null;
  }
}

function HeroVideo({ url }: { url: string }) {
  const embed = toEmbed(url);
  return (
    <section className="py-14">
      <div className="mx-auto max-w-3xl px-6">
        {embed ? (
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-border"
            style={{ aspectRatio: '16 / 9' }}
          >
            <iframe
              src={embed}
              title="Summit Marketing"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-border bg-card/60 px-5 py-4 text-center text-sm font-semibold text-primary transition-colors hover:border-primary/40"
          >
            Watch the video
          </a>
        )}
      </div>
    </section>
  );
}

function Timeline({ steps }: { steps: RecruitingContent['timeline'] }) {
  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-8 text-center text-2xl font-black uppercase tracking-wide text-foreground md:text-3xl">
          A day in the life
        </h2>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-4 rounded-xl border border-border bg-card/60 p-5">
              <div className="min-w-[64px] pt-0.5 text-[12px] font-bold uppercase tracking-wider text-primary">
                {s.time_label || `Step ${i + 1}`}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-foreground">{s.title}</p>
                {s.body && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Faq({ items }: { items: RecruitingContent['faq'] }) {
  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-8 text-center text-2xl font-black uppercase tracking-wide text-foreground md:text-3xl">
          Straight answers
        </h2>
        <div className="space-y-3">
          {items.map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-5">
              <p className="text-[15px] font-bold text-foreground">{f.question}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {f.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ items }: { items: RecruitingContent['testimonials'] }) {
  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-8 text-center text-2xl font-black uppercase tracking-wide text-foreground md:text-3xl">
          First-summer reps
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-5">
              {t.first_summer_figure && (
                <p className="text-xl font-black tabular-nums text-primary">{t.first_summer_figure}</p>
              )}
              {t.quote && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">“{t.quote}”</p>
              )}
              <p className="mt-3 text-[13px] font-bold text-foreground">{t.rep_name}</p>
              {t.school && <p className="text-[12px] text-muted-foreground">{t.school}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Admin-editable content blocks. Each one renders only when it has content. */
export function RecruitingContentPack() {
  const content = useRecruitingContent();
  if (!content) return null;

  const heroVideo = content.settings.recruiting_content_hero_video_url;

  return (
    <>
      {heroVideo && <HeroVideo url={heroVideo} />}
      {content.timeline.length > 0 && <Timeline steps={content.timeline} />}
      {content.faq.length > 0 && <Faq items={content.faq} />}
      {content.testimonials.length > 0 && <Testimonials items={content.testimonials} />}
    </>
  );
}
