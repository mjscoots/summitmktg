import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Link2, ArrowUpDown, Check, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableLinkCard } from '@/components/links/SortableLinkCard';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';

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

type PageTab = 'links' | 'phone-numbers';

export default function LinksPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'owner';

  const [links, setLinks] = useState<ManagedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLink, setEditingLink] = useState<ManagedLink | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>('links');

  // Form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [targetRole, setTargetRole] = useState<string>('all');
  const [icon, setIcon] = useState('link');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // Show all links — no role filter
  const filteredLinks = links;

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredLinks.findIndex(l => l.id === active.id);
    const newIndex = filteredLinks.findIndex(l => l.id === over.id);
    const reordered = arrayMove(filteredLinks, oldIndex, newIndex);

    const updatedLinks = links.map(l => {
      const newPos = reordered.findIndex(r => r.id === l.id);
      return newPos >= 0 ? { ...l, display_order: newPos } : l;
    });
    setLinks(updatedLinks.sort((a, b) => a.display_order - b.display_order));

    const updates = reordered.map((link, idx) =>
      supabase.from('managed_links').update({ display_order: idx }).eq('id', link.id)
    );
    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);
    if (hasError) {
      toast.error('Failed to save order');
      fetchLinks();
    }
  };

  const handleDoneReordering = () => {
    setIsReordering(false);
    toast.success('Link order saved');
  };

  const TABS: { id: PageTab; label: string; icon: typeof Link2 }[] = [
    { id: 'links', label: 'Links', icon: Link2 },
    { id: 'phone-numbers', label: 'Phone Numbers', icon: Phone },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Resources</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Links & phone numbers</p>
          </div>
          {isAdmin && activeTab === 'links' && (
            <div className="flex gap-2">
              {filteredLinks.length > 1 && (
                <Button
                  size="sm"
                  variant={isReordering ? 'default' : 'outline'}
                  className="gap-1.5 text-xs"
                  onClick={isReordering ? handleDoneReordering : () => setIsReordering(true)}
                >
                  {isReordering ? <Check className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
                  {isReordering ? 'Done' : 'Reorder'}
                </Button>
              )}
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
            </div>
          )}
        </div>

        {/* Tab toggle: Links / Phone Numbers */}
        <div className="p-1 bg-muted/50 rounded-xl mb-5 border border-border/30 w-fit">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsReordering(false); }}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-md border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", activeTab === tab.id && "text-primary")} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'links' && (
          <>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredLinks.map(l => l.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredLinks.map(link => (
                      <SortableLinkCard
                        key={link.id}
                        link={link}
                        isAdmin={isAdmin}
                        isReordering={isReordering}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}

        {activeTab === 'phone-numbers' && (
          <Card className="p-8 text-center">
            <Phone className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No phone numbers added yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Phone numbers will appear here once added</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
