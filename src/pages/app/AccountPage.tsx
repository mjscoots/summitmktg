import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

/** Account: change the password, or delete the account where that is allowed. */
export default function AccountPage() {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const canSelfDelete = role === 'rookie' || role === 'manager';

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error('Failed to change password');
      console.error(err);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteMyAccount = async () => {
    if (!canSelfDelete) return;
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
    setIsDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('self-delete-account');
      if (error) throw error;
      await signOut();
      toast.success('Account deleted. You can sign up again anytime.');
      navigate('/login', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Could not delete account right now. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Account" context="Your password and account controls." />

        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Change password
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Current password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">New password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Confirm new password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              variant="outline"
              className="btn-secondary"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change password'
              )}
            </Button>
          </div>
        </div>

        {canSelfDelete && (
          <div className="rounded-xl border border-destructive/40 bg-card p-6">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <Trash2 className="h-4 w-4 text-destructive" />
              Delete account
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete your account and sign up fresh.
            </p>
            <Button onClick={handleDeleteMyAccount} disabled={isDeletingAccount} variant="destructive">
              {isDeletingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete my account'
              )}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
