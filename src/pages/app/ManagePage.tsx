import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Swords, Calculator, FileText, Mic, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

const GRID_PATTERN =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]";

interface ManageCard {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  colorClass: string;
  hoverBorder: string;
  hoverShadow: string;
  tag?: string;
  managerOnly?: boolean;
}

const cards: ManageCard[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'View team metrics and performance statistics',
    icon: Swords,
    path: '/app/war-room',
    colorClass: 'text-orange-400 bg-orange-500/15 group-hover:bg-orange-500/25',
    hoverBorder: 'hover:border-orange-500/40',
    hoverShadow: 'hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.4)]',
    tag: 'MANAGE',
    managerOnly: true,
  },
  {
    id: 'calculators',
    label: 'Calculators',
    description: 'Revenue and earnings projection calculators',
    icon: Calculator,
    path: '/app/calculators',
    colorClass: 'text-teal-400 bg-teal-500/15 group-hover:bg-teal-500/25',
    hoverBorder: 'hover:border-teal-500/40',
    hoverShadow: 'hover:shadow-[0_0_30px_-10px_rgba(20,184,166,0.4)]',
  },
  {
    id: 'forms',
    label: 'Forms',
    description: 'Interview forms and weekly check-ins',
    icon: FileText,
    path: '/app/forms',
    colorClass: 'text-blue-400 bg-blue-500/15 group-hover:bg-blue-500/25',
    hoverBorder: 'hover:border-blue-500/40',
    hoverShadow: 'hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.4)]',
    tag: 'MANAGE',
    managerOnly: true,
  },
  {
    id: 'pitch-videos',
    label: 'Pitch Approvals & Rep Videos',
    description: 'Review pitch submissions and all rep video recordings',
    icon: Video,
    path: '/app/pitch-approvals',
    colorClass: 'text-purple-400 bg-purple-500/15 group-hover:bg-purple-500/25',
    hoverBorder: 'hover:border-purple-500/40',
    hoverShadow: 'hover:shadow-[0_0_30px_-10px_rgba(139,92,246,0.4)]',
    tag: 'MANAGE',
    managerOnly: true,
  },
];

export default function ManagePage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const availableCards = cards.filter(c => !c.managerOnly || isManager);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Hero Banner */}
        <div className="relative h-24 rounded-xl overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 via-teal-500/15 to-primary/20" />
          <div className={cn('absolute inset-0 opacity-50', GRID_PATTERN)} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight drop-shadow-sm">
              MANAGE
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Leadership tools and performance controls
            </p>
          </div>
        </div>

        {/* Feature Cards — 2x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {availableCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.path)}
                className={cn(
                  'group relative p-6 bg-card rounded-xl text-left overflow-hidden',
                  'border-2 border-border/50 cursor-pointer',
                  'transition-all duration-300 hover:scale-[1.02]',
                  card.hoverBorder,
                  card.hoverShadow
                )}
              >
                {/* Grid texture */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')]" />
                {/* Subtle color gradient */}
                <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-br from-current/[0.04] via-transparent to-current/[0.02]" />
                {card.tag && (
                  <div className="absolute top-3 right-3">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {card.tag}
                    </span>
                  </div>
                )}
                <div className={cn(
                  'p-3 rounded-xl w-fit mb-3 transition-colors relative',
                  card.colorClass
                )}>
                  <Icon className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-foreground transition-colors relative">
                  {card.label}
                </h2>
                <p className="text-sm text-muted-foreground relative">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
