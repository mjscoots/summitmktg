import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeUrl } from '@/lib/sanitizeUrl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface PersonalLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
}

export function PersonalLinksSection() {
  const { user, isViewingAs } = useAuth();
  const [links, setLinks] = useState<PersonalLink[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalLink | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('managed_links')
      .select('id, title, url, description')
      .eq('link_scope', 'personal')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setLinks((data as PersonalLink[]) ?? []);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setEditing(null);
    setTitle('');
    setUrl('');
    setDescription('');
  };

  const save = async () => {
    if (!user?.id || !title.trim() || !url.trim()) {
      toast.error('Title and URL are required');
      return;
    }
    if (isViewingAs) return;
    const values = { title: title.trim(), url: url.trim(), description: description.trim() || null };
    const result = editing
      ? await supabase.from('managed_links').update(values).eq('id', editing.id).eq('created_by', user.id).eq('link_scope', 'personal')
      : await supabase.from('managed_links').insert({
          ...values,
          created_by: user.id,
          link_scope: 'personal',
          target_role: 'all',
          icon: 'link',
          display_order: links.length,
        });
    if (result.error) {
      toast.error('Could not save link');
      return;
    }
    toast.success(editing ? 'Personal link updated' : 'Personal link added');
    setOpen(false);
    reset();
    void load();
  };

  const remove = async (id: string) => {
    if (!user?.id || isViewingAs) return;
    const { error } = await supabase
      .from('managed_links')
      .update({ is_active: false })
      .eq('id', id)
      .eq('created_by', user.id)
      .eq('link_scope', 'personal');
    if (error) toast.error('Could not remove link');
    else {
      toast.success('Personal link removed');
      void load();
    }
  };

  const edit = (link: PersonalLink) => {
    setEditing(link);
    setTitle(link.title);
    setUrl(link.url);
    setDescription(link.description ?? '');
    setOpen(true);
  };

  return (
    <section className="mb-8 space-y-3" aria-labelledby="personal-links-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="personal-links-heading" className="text-base font-semibold text-foreground">My links</h2>
          <p className="text-xs text-muted-foreground">Private shortcuts only you and owners can see.</p>
        </div>
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={isViewingAs}><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editing ? 'Edit personal link' : 'Add personal link'}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Link title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <Input placeholder="https://..." value={url} onChange={(event) => setUrl(event.target.value)} />
              <Textarea placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
              <Button className="w-full" onClick={save}>{editing ? 'Update link' : 'Add link'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {links.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">No personal links yet.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <div key={link.id} className="group relative rounded-md border border-border bg-card p-4">
              <a href={sanitizeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-start gap-3 pr-16">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold text-foreground">{link.title}<ExternalLink className="h-3 w-3" /></span>
                  {link.description && <span className="mt-1 block text-xs text-muted-foreground">{link.description}</span>}
                </span>
              </a>
              <div className="absolute right-2 top-2 flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(link)} aria-label={`Edit ${link.title}`}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(link.id)} aria-label={`Remove ${link.title}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}