import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { useAuth } from '@/hooks/useAuth';
import { useDownline } from '@/hooks/useDownline';
import { supabase } from '@/integrations/supabase/client';
import { isManagerOrAbove } from '@/lib/roles';
import { Truck, Car, Plane, CalendarDays, CheckCircle, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface LogisticsEntry {
  user_id: string;
  full_name: string;
  arrival_date: string | null;
  car_status: string;
  travel_status: string;
  notes: string;
}

const CAR_STATUSES = [
  { value: 'unknown', label: 'Unknown', icon: HelpCircle, color: 'text-muted-foreground' },
  { value: 'has_car', label: 'Has Car', icon: Car, color: 'text-primary' },
  { value: 'needs_car', label: 'Needs Car', icon: AlertCircle, color: 'text-primary' },
  { value: 'shared_ride', label: 'Shared Ride', icon: Truck, color: 'text-primary' },
];

const TRAVEL_STATUSES = [
  { value: 'unknown', label: 'Unknown', icon: HelpCircle, color: 'text-muted-foreground' },
  { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'text-primary' },
  { value: 'booked', label: 'Booked', icon: Plane, color: 'text-blue-400' },
  { value: 'pending', label: 'Pending', icon: AlertCircle, color: 'text-primary' },
  { value: 'not_needed', label: 'Local / N/A', icon: CheckCircle, color: 'text-muted-foreground' },
];

export default function RepLogisticsPage() {
  const { user, profile, role } = useAuth();
  const isManager = isManagerOrAbove(role);
  const { downline, isLoading: downlineLoading } = useDownline(user?.id || '', (profile as any)?.full_name || '');
  const [logistics, setLogistics] = useState<Map<string, LogisticsEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchLogistics = useCallback(async () => {
    if (!user) return;
    const userIds = downline.map((d: any) => d.user_id);
    if (userIds.length === 0) { setLoading(false); return; }

    const { data } = await (supabase as any)
      .from('rep_logistics')
      .select('*')
      .in('user_id', userIds);

    const map = new Map<string, LogisticsEntry>();
    // Initialize all downline with defaults
    downline.forEach((d: any) => {
      map.set(d.user_id, {
        user_id: d.user_id,
        full_name: d.full_name,
        arrival_date: null,
        car_status: 'unknown',
        travel_status: 'unknown',
        notes: '',
      });
    });
    // Override with DB data
    (data || []).forEach((row: any) => {
      const existing = map.get(row.user_id);
      if (existing) {
        map.set(row.user_id, { ...existing, ...row, full_name: existing.full_name });
      }
    });
    setLogistics(map);
    setLoading(false);
  }, [user, downline]);

  useEffect(() => {
    if (!downlineLoading && downline.length > 0) fetchLogistics();
    else if (!downlineLoading) setLoading(false);
  }, [downlineLoading, downline, fetchLogistics]);

  const updateField = async (userId: string, field: string, value: string) => {
    setSaving(userId);
    try {
      await (supabase as any).from('rep_logistics').upsert({
        user_id: userId,
        [field]: value,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      setLogistics(prev => {
        const next = new Map(prev);
        const entry = next.get(userId);
        if (entry) next.set(userId, { ...entry, [field]: value });
        return next;
      });
    } catch (e: any) {
      toast.error('Failed to update');
    } finally {
      setSaving(null);
    }
  };

  if (!isManager) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">
          Manager access required.
        </div>
      </AppLayout>
    );
  }

  const entries = Array.from(logistics.values());
  const readyCount = entries.filter(e => e.car_status !== 'unknown' && e.travel_status !== 'unknown' && e.arrival_date).length;
  const needsAttention = entries.filter(e => e.car_status === 'needs_car' || e.travel_status === 'pending').length;

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <PageBackButton to="/app/manage" label="Manage" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Rep Logistics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track arrival dates, car status, and travel for summer</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{entries.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Reps</p>
          </div>
          <div className="bg-card rounded-xl border border-green-500/20 p-4 text-center">
            <p className="text-2xl font-bold text-primary">{readyCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Ready</p>
          </div>
          <div className="bg-card rounded-xl border border-red-500/20 p-4 text-center">
            <p className="text-2xl font-bold text-primary">{needsAttention}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Needs Help</p>
          </div>
        </div>

        {loading || downlineLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No reps in your downline to track</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => {
              const carInfo = CAR_STATUSES.find(c => c.value === entry.car_status) || CAR_STATUSES[0];
              const travelInfo = TRAVEL_STATUSES.find(t => t.value === entry.travel_status) || TRAVEL_STATUSES[0];
              const isSaving = saving === entry.user_id;

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    "bg-card rounded-xl border border-border p-4 transition-all",
                    isSaving && "opacity-70"
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-foreground flex-1">{entry.full_name}</h3>
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Arrival Date */}
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> Arrival Date
                      </label>
                      <Input
                        type="date"
                        value={entry.arrival_date || ''}
                        onChange={e => updateField(entry.user_id, 'arrival_date', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Car Status */}
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1">
                        <Car className="w-3 h-3" /> Car Status
                      </label>
                      <Select value={entry.car_status} onValueChange={v => updateField(entry.user_id, 'car_status', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAR_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              <span className="flex items-center gap-1.5">
                                <s.icon className={cn("w-3 h-3", s.color)} />
                                {s.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Travel Status */}
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1">
                        <Plane className="w-3 h-3" /> Travel Status
                      </label>
                      <Select value={entry.travel_status} onValueChange={v => updateField(entry.user_id, 'travel_status', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAVEL_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              <span className="flex items-center gap-1.5">
                                <s.icon className={cn("w-3 h-3", s.color)} />
                                {s.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
