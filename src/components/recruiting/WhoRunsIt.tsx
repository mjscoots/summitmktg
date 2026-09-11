import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CALENDLY = 'https://calendly.com/mathewjoyce';

interface PublicManager {
  first_name: string | null;
  office_name: string | null;
  manager_intro: string | null;
  pillar_token: string | null;
}

/**
 * Who runs it. The photo and the booking link are owner set values read through
 * the allowlisted get_public_setting, so an empty photo renders nothing at all
 * and never a placeholder. The manager row comes from get_public_managers, a
 * read only function that exposes four columns for managers who are taking new
 * reps; when it returns no rows the row does not render.
 */
export function WhoRunsIt() {
  const [photo, setPhoto] = useState('');
  const [calendly, setCalendly] = useState(DEFAULT_CALENDLY);
  const [managers, setManagers] = useState<PublicManager[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [photoRes, calendlyRes, managerRes] = await Promise.all([
        supabase.rpc('get_public_setting', { _key: 'owner_photo' }),
        supabase.rpc('get_public_setting', { _key: 'owner_calendly' }),
        supabase.rpc('get_public_managers'),
      ]);
      if (!active) return;
      if (typeof photoRes.data === 'string') setPhoto(photoRes.data);
      if (typeof calendlyRes.data === 'string' && calendlyRes.data.trim()) setCalendly(calendlyRes.data.trim());
      setManagers(Array.isArray(managerRes.data) ? (managerRes.data as PublicManager[]) : []);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="who" className="public-section public-reveal px-5 py-16 text-center sm:px-6 md:py-24" data-reveal>
      <div className="mx-auto max-w-4xl">
        <h2 className="section-title text-foreground">Who runs it</h2>

        <div className="mt-10 grid items-center gap-8 md:grid-cols-2 md:text-left">
          {photo ? (
            <img
              src={photo}
              alt="Mathew Joyce"
              loading="lazy"
              className="mx-auto w-full max-w-sm rounded-xl object-cover"
            />
          ) : null}
          <div className={photo ? '' : 'md:col-span-2 md:text-center'}>
            <p className="text-lg text-foreground">Mathew Joyce. 21. Third year. Runs the region.</p>
            <a
              href={calendly}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gradient mt-6 inline-flex items-center justify-center px-6"
            >
              Book fifteen minutes with Matt
            </a>
          </div>
        </div>

        {managers.length > 0 && (
          <div className="mt-14">
            <p className="cover-label text-text-muted">Managers</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {managers.map((m, index) => (
                <article key={`${m.first_name}-${index}`} className="rounded-xl bg-card p-5 text-left">
                  <p className="text-base font-semibold text-foreground">{m.first_name}</p>
                  {m.office_name && <p className="mt-1 text-xs text-text-muted">{m.office_name}</p>}
                  {m.manager_intro && (
                    <p className="mt-3 line-clamp-2 text-sm text-text-secondary">{m.manager_intro}</p>
                  )}
                  {m.pillar_token && (
                    <Link
                      to={`/p/${m.pillar_token}`}
                      className="public-link mt-4 inline-flex min-h-11 items-center text-sm font-semibold"
                    >
                      Apply with {m.first_name}
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default WhoRunsIt;
