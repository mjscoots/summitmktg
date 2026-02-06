import { useAuth } from '@/hooks/useAuth';
import { Crown } from 'lucide-react';

export function AdminBadge() {
  const { role } = useAuth();
  
  if (role !== 'admin') return null;
  
  return (
    <div className="fixed top-16 right-4 z-50 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1.5 rounded-full shadow-lg animate-pulse flex items-center gap-1.5">
      <Crown className="w-3.5 h-3.5" />
      <span className="text-xs font-bold uppercase tracking-wide">Admin Mode</span>
    </div>
  );
}
