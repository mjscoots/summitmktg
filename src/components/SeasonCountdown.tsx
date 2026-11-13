import { useEffect, useState } from "react";

// May 1, 2027 00:00 America/Phoenix (fixed UTC-7). Hardcoded as a UTC instant:
// no timezone library, no DST math, no local-timezone Date string.
const SEASON_START_UTC = Date.parse("2027-05-01T07:00:00.000Z");

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

type Remaining = {
  live: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function readRemaining(): Remaining {
  const diff = SEASON_START_UTC - Date.now();

  if (diff <= 0) {
    return { live: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    live: false,
    days: Math.floor(diff / DAY),
    hours: Math.floor(diff / HOUR) % 24,
    minutes: Math.floor(diff / MINUTE) % 60,
    seconds: Math.floor(diff / SECOND) % 60,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

const SeasonCountdown = () => {
  const [remaining, setRemaining] = useState<Remaining>(readRemaining);

  useEffect(() => {
    const tick = window.setInterval(() => setRemaining(readRemaining()), SECOND);
    return () => window.clearInterval(tick);
  }, []);

  return (
    <section className="py-16 px-6 bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-wide mb-8">
          Days until start of season, May 1
        </h2>

        {remaining.live ? (
          <p className="text-xl md:text-2xl font-black text-primary">Season is live</p>
        ) : (
          <div className="card-elevated p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2">
              <span className="stat-num tabular-nums text-6xl md:text-7xl font-black leading-none text-primary">
                {remaining.days}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground pb-1">
                days
              </span>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3">
              {[
                { label: "hours", value: pad(remaining.hours) },
                { label: "minutes", value: pad(remaining.minutes) },
                { label: "seconds", value: pad(remaining.seconds) },
              ].map((cell) => (
                <div key={cell.label} className="min-w-16">
                  <div className="stat-num tabular-nums text-2xl md:text-3xl font-black text-foreground leading-none">
                    {cell.value}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {cell.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-muted-foreground">Season starts May 1, 2027.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default SeasonCountdown;
