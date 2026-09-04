import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRightLeft, Loader2 } from 'lucide-react';

interface MoveRepModalProps {
  open: boolean;
  onClose: () => void;
  repUserId: string;
  repName: string;
  currentManagerUserId: string;
  onMoved: () => void;
}

interface SubManager {
  user_id: string;
  full_name: string;
  depth: number;
}

export function MoveRepModal({ open, onClose, repUserId, repName, currentManagerUserId, onMoved }: MoveRepModalProps) {
  const [subManagers, setSubManagers] = useState<SubManager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const selectedManager = subManagers.find(m => m.user_id === selectedManagerId);

  useEffect(() => {
    if (!open) {
      setSelectedManagerId('');
      setStep('select');
      return;
    }
    fetchSubManagers();
  }, [open, currentManagerUserId]);

  const fetchSubManagers = async () => {
    setIsLoading(true);
    try {
      // Get full downline from edges
      const { data, error } = await supabase.rpc('get_downline_from_edges', {
        _manager_user_id: currentManagerUserId,
      });
      if (error) throw error;

      // Filter to only managers/admins (not the rep being moved)
      const managers = (data || [])
        .filter((d: any) =>
          d.user_id !== repUserId &&
          (d.role === 'manager' || d.role === 'admin' || d.role === 'owner')
        )
        .map((d: any) => ({
          user_id: d.user_id,
          full_name: d.full_name,
          depth: d.depth,
        }));

      // Also include the current user themselves as an option
      setSubManagers(managers);
    } catch (err) {
      console.error('Failed to fetch sub-managers:', err);
      toast.error('Failed to load managers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMove = async () => {
    if (!selectedManager) return;
    setIsMoving(true);
    try {
      // Every move goes through place_person so manager_id, direct_manager, the
      // team, the downline edges and placement_log all land together.
      const { data, error } = await supabase.rpc('place_person', {
        _user_id: repUserId,
        _manager_id: selectedManager.user_id,
      });
      if (error) throw error;
      const res = (data as { success?: boolean; error?: string } | null) || null;
      if (!res?.success) throw new Error(res?.error || 'Failed to move rep');

      toast.success(`Moved ${repName} to ${selectedManager.full_name}`);
      onMoved();
      onClose();
    } catch (err: any) {
      console.error('Move failed:', err);
      toast.error(err?.message || 'Failed to move rep');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            {step === 'select' ? `Move ${repName}` : 'Confirm Move'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === 'select'
              ? 'Select a manager from your downline to move this rep under.'
              : `Move ${repName} to ${selectedManager?.full_name}? They will be removed from their current manager's direct reports.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step === 'select' && (
          <div className="py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : subManagers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sub-managers found in your downline.
              </p>
            ) : (
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager..." />
                </SelectTrigger>
                <SelectContent>
                  {subManagers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      <span style={{ paddingLeft: `${Math.max(0, m.depth - 1) * 12}px` }}>
                        {m.full_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isMoving}>Cancel</AlertDialogCancel>
          {step === 'select' ? (
            <AlertDialogAction
              disabled={!selectedManagerId}
              onClick={(e) => {
                e.preventDefault();
                setStep('confirm');
              }}
            >
              Next
            </AlertDialogAction>
          ) : (
            <>
              <AlertDialogAction
                disabled={isMoving}
                onClick={(e) => {
                  e.preventDefault();
                  setStep('select');
                }}
                className="bg-muted text-foreground hover:bg-muted/80"
              >
                Back
              </AlertDialogAction>
              <AlertDialogAction
                disabled={isMoving}
                onClick={(e) => {
                  e.preventDefault();
                  handleMove();
                }}
              >
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Move
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
