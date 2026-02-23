import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, Plus, Trash2, Link2, BookOpen, Users, Globe, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface ManagedLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  target_role: string;
  display_order: number;
  is_active: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  link: Link2,
  book: BookOpen,
  users: Users,
  globe: Globe,
  external: ExternalLink,
};

export default function LinksPage() {
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';

  const [links, setLinks] = useState<ManagedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rookie' | 'manager'>(isManager ? 'manager' : 'rookie');
  const [showAdd, setShowAdd] = useState(false);
  const [editingLink, setEditingLink] = useState<ManagedLink | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [targetRole, setTargetRole] = useState<string>('all');
  const [icon, setIcon] = useState('link');

  const fetchLinks = async () => {
    const { data } = await supabase
      .from('managed_links')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setLinks((data as ManagedLink[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const filteredLinks = links.filter(l => {
    if (activeTab === 'rookie') return l.target_role === 'rookie' || l.target_role === 'all';
    if (activeTab === 'manager') return l.target_role === 'manager' || l.target_role === 'all';
    return true;
  });

  const resetForm = () => {
    setTitle(''); setUrl(''); setDescription(''); setTargetRole('all'); setIcon('link');
    setEditingLink(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) { toast.error('Title and URL are required'); return; }
    
    if (editingLink) {
      const { error } = await supabase
        .from('managed_links')
        .update({ title, url, description: description || null, target_role: targetRole, icon })
        .eq('id', editingLink.id);
      if (error) { toast.error('Failed to update link'); return; }
      toast.success('Link updated');
    } else {
      const { error } = await supabase
        .from('managed_links')
        .insert({ title, url, description: description || null, target_role: targetRole, icon, display_order: links.length });
      if (error) { toast.error('Failed to add link'); return; }
      toast.success('Link added');
    }
    
    resetForm();
    setShowAdd(false);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('managed_links').update({ is_active: false }).eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Link removed');
    fetchLinks();
  };

  const openEdit = (link: ManagedLink) => {
    setEditingLink(link);
    setTitle(link.title);
    setUrl(link.url);
    setDescription(link.description || '');
    setTargetRole(link.target_role);
    setIcon(link.icon || 'link');
    setShowAdd(true);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Links</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Quick access to important resources</p>
          </div>
          {isAdmin && (
            <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingLink ? 'Edit Link' : 'Add New Link'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input placeholder="Link title" value={title} onChange={e => setTitle(e.target.value)} />
                  <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
                  <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={targetRole} onValueChange={setTargetRole}>
                      <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="rookie">Rookies Only</SelectItem>
                        <SelectItem value="manager">Managers Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={icon} onValueChange={setIcon}>
                      <SelectTrigger><SelectValue placeholder="Icon" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="book">Book</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="globe">Globe</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} className="w-full">{editingLink ? 'Update' : 'Add Link'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Role toggle */}
        {isManager && (
          <div className="flex gap-1 mb-5 bg-muted/30 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('rookie')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'rookie'
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rookie Links
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'manager'
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Manager Links
            </button>
          </div>
        )}

        {/* Links grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <Card className="p-8 text-center">
            <Link2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No links added yet</p>
            {isAdmin && <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Link" to get started</p>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredLinks.map(link => {
              const IconComp = ICON_MAP[link.icon || 'link'] || Link2;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <Card className="p-4 h-full border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer relative overflow-hidden">
                    {/* Subtle gradient accent */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/60 to-primary/10 rounded-l-xl" />
                    
                    <div className="flex items-start gap-3 pl-2">
                      <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <IconComp className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {link.title}
                          </h3>
                          <ExternalLink className="w-3 h-3 text-muted-foreground/40 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {link.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{link.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[9px] text-muted-foreground/60">
                            {link.target_role === 'all' ? 'Everyone' : link.target_role === 'rookie' ? 'Rookie' : 'Manager'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Admin controls */}
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(link); }}
                          className="p-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(link.id); }}
                          className="p-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </Card>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
