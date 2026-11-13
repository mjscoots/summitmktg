import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { eventsFor, todayInTz } from '@/data/portal/calendar';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');

export default function PortalCalendar() {
  const today = todayInTz();
  const [ym, setYm] = useState({ y: today.y, m: today.m });
  const first = new Date(Date.UTC(ym.y, ym.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
  const shift = (d: number) => setYm(({ y, m }) => { const t = new Date(Date.UTC(y, m + d, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() }; });
  const label = new Date(Date.UTC(ym.y, ym.m, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Calendar</h1>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft className="w-5 h-5" /></Button>
        <p className="font-semibold">{label}</p>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => shift(1)}><ChevronRight className="w-5 h-5" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden text-xs">
        {DOW.map((d) => <div key={d} className="bg-card p-1 text-center font-semibold text-muted-foreground">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="bg-background min-h-20" />;
          const ev = eventsFor(`${ym.y}-${pad(ym.m + 1)}-${pad(d)}`, i % 7);
          const isToday = ym.y === today.y && ym.m === today.m && d === today.d;
          return (
            <div key={i} className="bg-card min-h-20 p-1 space-y-1">
              <p className={`text-right ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{d}</p>
              {ev.map((e) => <p key={e} className="rounded bg-primary/15 px-1 py-0.5 text-[10px] leading-tight text-foreground break-words">{e}</p>)}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Dates shown for America/Phoenix.</p>
    </div>
  );
}
