import { useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('feedback');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !message.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('app_feedback' as any).insert({
        user_id: user.id,
        feedback_type: type,
        message: message.trim(),
      } as any);
      if (error) throw error;
      toast({ title: 'Submitted', description: 'Thanks for your feedback!' });
      setMessage('');
      setType('feedback');
      setOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Could not submit. Try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/50 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/50 shadow-lg transition-all hover:-translate-y-0.5"
      >
        <MessageSquareWarning className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">💡 Feedback / Suggestion</SelectItem>
                <SelectItem value="bug">🐛 Bug Report</SelectItem>
                <SelectItem value="complaint">⚠️ Complaint</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !message.trim()}>
                {submitting ? 'Sending...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
