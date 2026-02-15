import { useAuth } from '@/hooks/useAuth';
import { Crown } from 'lucide-react';

export function AdminBadge() {
  const { role } = useAuth();
  
  if (role !== 'admin') return null;
  
  return (
    <div className="fixed top-[3.25rem] right-14 z-50 bg-primary/15 border border-primary/30 text-primary px-2 py-0.5 rounded-md flex items-center gap-1">
      <Crown className="w-2.5 h-2.5" />
      <span className="text-[11px] font-semibold uppercase tracking-wider">Admin</span>
    </div>
  );
}
