import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, AlertTriangle, Users } from 'lucide-react';
 import { useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getDisplayName, hasDirectReports, getDirectReports, type TeamMember } from '@/lib/hierarchyUtils';
import { toast } from 'sonner';

interface MemberStatusToggleProps {
  member: TeamMember;
  roster: TeamMember[];
  canEdit: boolean;
  disabledReason?: string;
  onStatusChange?: () => void;
  size?: 'sm' | 'md';
}

type UserStatus = 'active' | 'contract_signed' | 'onboarded' | 'info_added' | 'nlc';

export function MemberStatusToggle({
  member,
  roster,
  canEdit,
  disabledReason,
  onStatusChange,
  size = 'sm',
}: MemberStatusToggleProps) {
   const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    targetStatus: UserStatus;
  }>({ open: false, targetStatus: 'active' });
  const [reassignDialog, setReassignDialog] = useState(false);

  const isNLC = member.status === 'nlc' || member.isNLC;
  const currentStatus: UserStatus = isNLC ? 'nlc' : 'active';
  const directReports = getDirectReports(roster, member.full_name).filter(r => r.status !== 'nlc');
  const hasReports = directReports.length > 0;

  const handleStatusSelect = (newStatus: UserStatus) => {
    if (newStatus === currentStatus) return;
    
    // If trying to mark as NLC and member has direct reports, show reassignment warning
    if (newStatus === 'nlc' && hasReports) {
      setReassignDialog(true);
      return;
    }
    
    setConfirmDialog({ open: true, targetStatus: newStatus });
  };

  const confirmStatusChange = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: confirmDialog.targetStatus,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', member.user_id);

      if (error) throw error;

       // Invalidate all team-related queries to force immediate refresh
       queryClient.invalidateQueries({ queryKey: ['team'] });
       queryClient.invalidateQueries({ queryKey: ['profiles'] });
       queryClient.invalidateQueries({ queryKey: ['teamMembers'] });

      toast.success(
        confirmDialog.targetStatus === 'nlc'
          ? `${getDisplayName(member.full_name)} marked as NLC`
          : `${getDisplayName(member.full_name)} marked as Active`
      );
      
       // Force page refresh to ensure all components update
       setTimeout(() => {
         window.location.reload();
       }, 500);

      onStatusChange?.();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
      setConfirmDialog({ open: false, targetStatus: 'active' });
    }
  };

  if (!canEdit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-not-allowed",
              isNLC
                ? "bg-destructive/15 text-destructive"
                : "bg-success/15 text-success"
            )}
          >
            {isNLC ? 'NLC' : 'Active'}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{disabledReason || 'You cannot edit this member\'s status'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isUpdating}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
            "hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/50",
            isNLC
              ? "bg-destructive/15 text-destructive"
              : "bg-success/15 text-success",
            isUpdating && "opacity-50 cursor-wait"
          )}
        >
          {isNLC ? 'NLC' : 'Active'}
          <ChevronDown className="w-3 h-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          <DropdownMenuItem
            onClick={() => handleStatusSelect('active')}
            className={cn(
              "flex items-center gap-2",
              currentStatus === 'active' && "bg-success/10"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-success" />
            Active
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusSelect('nlc')}
            className={cn(
              "flex items-center gap-2",
              currentStatus === 'nlc' && "bg-destructive/10"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-destructive" />
            NLC
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, targetStatus: 'active' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              {confirmDialog.targetStatus === 'nlc' 
                ? 'Mark as No Longer Coming?' 
                : 'Mark as Active?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.targetStatus === 'nlc' ? (
                <>
                  <strong>{getDisplayName(member.full_name)}</strong> will be excluded from all team stats and rankings.
                  They will appear at the bottom of member lists with NLC styling.
                </>
              ) : (
                <>
                  <strong>{getDisplayName(member.full_name)}</strong> will be included in all team stats and rankings.
                  They will appear in their normal position in member lists.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={isUpdating}
              className={cn(
                confirmDialog.targetStatus === 'nlc'
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-success hover:bg-success/90"
              )}
            >
              {isUpdating ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reassignment Required Dialog */}
      <AlertDialog open={reassignDialog} onOpenChange={setReassignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Reassignment Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong>{getDisplayName(member.full_name)}</strong> has {directReports.length} direct {directReports.length === 1 ? 'report' : 'reports'} that must be reassigned before marking as NLC:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {directReports.slice(0, 5).map(report => (
                  <li key={report.id}>{getDisplayName(report.full_name)}</li>
                ))}
                {directReports.length > 5 && (
                  <li>... and {directReports.length - 5} more</li>
                )}
              </ul>
              <p className="text-muted-foreground">
                Please reassign these members to another manager first.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Understood</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
