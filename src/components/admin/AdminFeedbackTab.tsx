import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CheckCircle, Trash2, Eye } from 'lucide-react';

interface FeedbackRow {
  id: string;
  user_id: string;
  feedback_type: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function AdminFeedbackTab() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      let query = (supabase.from('app_feedback' as any) as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user names
      const ids: string[] = [];
      (data || []).forEach((f: any) => { if (!ids.includes(f.user_id)) ids.push(f.user_id); });
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', ids);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setFeedback((data || []).map((f: any) => ({
        ...f,
        user_name: profileMap.get(f.user_id)?.full_name || 'Unknown',
        user_email: profileMap.get(f.user_id)?.email || '',
      })));
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeedback(); }, [filter]);

  const markReviewed = async (id: string) => {
    await (supabase.from('app_feedback' as any) as any)
      .update({ status: 'reviewed', updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchFeedback();
  };

  const deleteFeedback = async (id: string) => {
    await (supabase.from('app_feedback' as any) as any).delete().eq('id', id);
    fetchFeedback();
  };

  const typeEmoji: Record<string, string> = {
    feedback: '💡',
    bug: '🐛',
    complaint: '⚠️',
  };

  const statusColor: Record<string, string> = {
    new: 'bg-primary/20 text-primary',
    reviewed: 'bg-muted text-muted-foreground',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {['all', 'new', 'reviewed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Eye className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map(f => (
            <div key={f.id} className="border border-border/50 rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{f.user_name}</span>
                    <span className="text-xs text-muted-foreground">{f.user_email}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {typeEmoji[f.feedback_type] || ''} {f.feedback_type}
                    </Badge>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[f.status] || ''}`}>
                      {f.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{f.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {format(new Date(f.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {f.status === 'new' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markReviewed(f.id)}>
                      <CheckCircle className="w-3 h-3" /> Reviewed
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive" onClick={() => deleteFeedback(f.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
