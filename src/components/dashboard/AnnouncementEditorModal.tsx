import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'new_feature', label: 'New Feature' },
  { value: 'update', label: 'Update' },
  { value: 'training', label: 'Training' },
  { value: 'important', label: 'Important' },
  { value: 'admin_note', label: 'Admin Note' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: any | null;
  onSaved: () => void;
}

export function AnnouncementEditorModal({ open, onOpenChange, post, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('update');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaTarget, setCtaTarget] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [publishNow, setPublishNow] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setBody(post.body || '');
      setCategory(post.category || 'update');
      setCtaLabel(post.cta_label || '');
      setCtaTarget(post.cta_target || '');
      setIsPinned(post.is_pinned || false);
      setIsImportant(post.is_important || false);
      setPublishNow(post.status === 'published');
      setExpiresAt(post.expires_at ? post.expires_at.split('T')[0] : '');
    } else {
      setTitle('');
      setBody('');
      setCategory('update');
      setCtaLabel('');
      setCtaTarget('');
      setIsPinned(false);
      setIsImportant(false);
      setPublishNow(true);
      setExpiresAt('');
    }
  }, [post, open]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);

    const payload = {
      title: title.trim(),
      body: body.trim(),
      category,
      cta_label: ctaLabel.trim() || null,
      cta_target: ctaTarget.trim() || null,
      is_pinned: isPinned,
      is_important: isImportant,
      status: publishNow ? 'published' : 'draft',
      published_at: publishNow ? new Date().toISOString() : null,
      expires_at: expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : null,
      created_by: user?.id,
    };

    // If pinning, unpin others first
    if (isPinned) {
      await (supabase as any).from('announcement_posts').update({ is_pinned: false }).eq('is_pinned', true);
    }

    let error;
    if (post) {
      ({ error } = await (supabase as any).from('announcement_posts').update(payload).eq('id', post.id));
    } else {
      ({ error } = await (supabase as any).from('announcement_posts').insert(payload));
    }

    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success(post ? 'Announcement updated' : 'Announcement created');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-orange-500/20" style={{ background: 'hsl(220 20% 8%)' }}>
        <DialogHeader>
          <DialogTitle className="text-foreground">{post ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's new..." className="bg-background/50" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Body</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Details..." rows={3} className="bg-background/50 resize-none" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all ${category === c.value ? 'border-orange-500/40 text-orange-300' : 'border-border/30 text-muted-foreground hover:text-foreground'}`}
                  style={category === c.value ? { background: 'hsl(25 95% 53% / 0.12)' } : {}}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">CTA Button Label</Label>
              <Input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="e.g. Watch now" className="bg-background/50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">CTA Destination</Label>
              <Input value={ctaTarget} onChange={e => setCtaTarget(e.target.value)} placeholder="/app/videos" className="bg-background/50" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Expiration Date (optional)</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="bg-background/50 w-48" />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={publishNow} onCheckedChange={setPublishNow} />
              <Label className="text-xs">Publish immediately</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
              <Label className="text-xs">Pin to top</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isImportant} onCheckedChange={setIsImportant} />
              <Label className="text-xs">Important</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="text-xs font-bold" style={{ background: 'linear-gradient(135deg, hsl(25 95% 53%), hsl(30 90% 45%))' }}>
              {saving ? 'Saving...' : post ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
