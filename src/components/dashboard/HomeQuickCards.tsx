import { useNavigate } from 'react-router-dom';
import { DollarSign, CalendarClock } from 'lucide-react';

/**
 * My money and Schedule stay one tap from Home so a phone never needs the menu
 * to reach them.
 */
export function HomeQuickCards() {
  const navigate = useNavigate();

  const cards = [
    {
      key: 'money',
      label: 'My money',
      detail: 'Pay, ladder, production',
      icon: DollarSign,
      path: '/app/money',
    },
    {
      key: 'schedule',
      label: 'Schedule',
      detail: 'Events and calendar',
      icon: CalendarClock,
      path: '/app/events',
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5">
      {cards.map((c) => (
        <button
          key={c.key}
          onClick={() => navigate(c.path)}
          className="stat-card min-h-[72px] w-full text-left transition-transform duration-180 hover:-translate-y-0.5"
        >
          <div className="relative z-10 flex items-center gap-2">
            <c.icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-[13px] font-medium text-foreground">{c.label}</span>
          </div>
          <p className="relative z-10 mt-1 truncate text-[11px] text-muted-foreground">{c.detail}</p>
        </button>
      ))}
    </div>
  );
}
