 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { usePillarCheck } from '@/hooks/usePillarCheck';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Plus, Video, FileText, Link2, FileCode, Pencil, Trash2, ExternalLink, Loader2 } from 'lucide-react';
 import { toast } from 'sonner';
 import { cn } from '@/lib/utils';
 import { sanitizeUrl } from '@/lib/sanitizeUrl';

 interface Resource {
   id: string;
   resource_name: string;
   resource_type: string;
   resource_url: string;
   description: string | null;
   added_by: string | null;
   created_at: string;
 }
 
 interface TeamResourcesProps {
   teamId: string;
   teamSlug: string;
 }
 
 const RESOURCE_TYPES = [
   { value: 'video', label: 'Video', icon: Video },
   { value: 'document', label: 'Document', icon: FileText },
   { value: 'link', label: 'Link', icon: Link2 },
   { value: 'script', label: 'Script', icon: FileCode },
 ];
 
 export function TeamResources({ teamId, teamSlug }: TeamResourcesProps) {
   const { user, role } = useAuth();
   const { isPillar } = usePillarCheck();
   const [resources, setResources] = useState<Resource[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [modalOpen, setModalOpen] = useState(false);
   const [editingResource, setEditingResource] = useState<Resource | null>(null);
   const [isSaving, setIsSaving] = useState(false);
 
   // Form state
   const [name, setName] = useState('');
   const [type, setType] = useState('link');
   const [url, setUrl] = useState('');
   const [description, setDescription] = useState('');
 
   const isAdmin = role === 'admin';
   const canEdit = isPillar || isAdmin;
 
   useEffect(() => {
     fetchResources();
   }, [teamId]);
 
   const fetchResources = async () => {
     setIsLoading(true);
     const { data, error } = await supabase
       .from('team_resources')
       .select('*')
       .eq('team_id', teamId)
       .order('created_at', { ascending: false });
 
     if (!error && data) {
       setResources(data);
     }
     setIsLoading(false);
   };
 
   const resetForm = () => {
     setName('');
     setType('link');
     setUrl('');
     setDescription('');
     setEditingResource(null);
   };
 
   const openAddModal = () => {
     resetForm();
     setModalOpen(true);
   };
 
   const openEditModal = (resource: Resource) => {
     setEditingResource(resource);
     setName(resource.resource_name);
     setType(resource.resource_type);
     setUrl(resource.resource_url);
     setDescription(resource.description || '');
     setModalOpen(true);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!name.trim() || !url.trim()) {
       toast.error('Name and URL are required');
       return;
     }
 
     setIsSaving(true);
 
     try {
       if (editingResource) {
         const { error } = await supabase
           .from('team_resources')
           .update({
             resource_name: name.trim(),
             resource_type: type,
             resource_url: url.trim(),
             description: description.trim() || null,
             updated_at: new Date().toISOString(),
           })
           .eq('id', editingResource.id);
 
         if (error) throw error;
         toast.success('Resource updated');
       } else {
         const { error } = await supabase
           .from('team_resources')
           .insert({
             team_id: teamId,
             resource_name: name.trim(),
             resource_type: type,
             resource_url: url.trim(),
             description: description.trim() || null,
             added_by: user?.id,
           });
 
         if (error) throw error;
         toast.success('Resource added');
       }
 
       setModalOpen(false);
       resetForm();
       fetchResources();
     } catch (error) {
       console.error('Error saving resource:', error);
       toast.error('Failed to save resource');
     } finally {
       setIsSaving(false);
     }
   };
 
   const handleDelete = async (resource: Resource) => {
     if (!confirm('Delete this resource?')) return;
 
     const { error } = await supabase
       .from('team_resources')
       .delete()
       .eq('id', resource.id);
 
     if (error) {
       toast.error('Failed to delete');
     } else {
       toast.success('Resource deleted');
       fetchResources();
     }
   };
 
   const getTypeIcon = (resourceType: string) => {
     const typeConfig = RESOURCE_TYPES.find(t => t.value === resourceType);
     const Icon = typeConfig?.icon || Link2;
     return <Icon className="w-4 h-4" />;
   };
 
   if (isLoading) {
     return (
       <div className="bg-card rounded-xl border border-border/50 p-6">
         <div className="flex items-center justify-center py-4">
           <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
         </div>
       </div>
     );
   }
 
   return (
     <div className="bg-card rounded-xl border border-border/50 p-4">
       <div className="flex items-center justify-between mb-4">
         <h3 className="text-sm font-medium text-muted-foreground">Team Resources</h3>
         {canEdit && (
           <Button size="sm" variant="ghost" onClick={openAddModal} className="h-7 gap-1.5 text-xs">
             <Plus className="w-3.5 h-3.5" />
             Add Resource
           </Button>
         )}
       </div>
 
       {resources.length === 0 ? (
         <p className="text-sm text-muted-foreground text-center py-4">
           No resources yet
         </p>
       ) : (
         <div className="space-y-2">
           {resources.map((resource) => (
             <div
               key={resource.id}
               className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
             >
               <div className="p-2 rounded-lg bg-primary/10 text-primary">
                 {getTypeIcon(resource.resource_type)}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-foreground truncate">
                   {resource.resource_name}
                 </p>
                 {resource.description && (
                   <p className="text-xs text-muted-foreground truncate">
                     {resource.description}
                   </p>
                 )}
               </div>
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <a
                   href={sanitizeUrl(resource.resource_url)}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                 >
                   <ExternalLink className="w-3.5 h-3.5" />
                 </a>
                 {canEdit && (
                   <>
                     <button
                       onClick={() => openEditModal(resource)}
                       className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                     >
                       <Pencil className="w-3.5 h-3.5" />
                     </button>
                     <button
                       onClick={() => handleDelete(resource)}
                       className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   </>
                 )}
               </div>
             </div>
           ))}
         </div>
       )}
 
       {/* Add/Edit Modal */}
       <Dialog open={modalOpen} onOpenChange={setModalOpen}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle>
               {editingResource ? 'Edit Resource' : 'Add Resource'}
             </DialogTitle>
           </DialogHeader>
 
           <form onSubmit={handleSubmit} className="space-y-4 pt-2">
             <div>
               <label className="block text-sm font-medium mb-1.5">Name *</label>
               <Input
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 placeholder="Resource name..."
                 required
               />
             </div>
 
             <div>
               <label className="block text-sm font-medium mb-1.5">Type</label>
               <div className="flex gap-2">
                 {RESOURCE_TYPES.map((t) => (
                   <button
                     key={t.value}
                     type="button"
                     onClick={() => setType(t.value)}
                     className={cn(
                       "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors",
                       type === t.value
                         ? "border-primary bg-primary/10 text-primary"
                         : "border-border text-muted-foreground hover:border-primary/50"
                     )}
                   >
                     <t.icon className="w-4 h-4" />
                     {t.label}
                   </button>
                 ))}
               </div>
             </div>
 
             <div>
               <label className="block text-sm font-medium mb-1.5">URL *</label>
               <Input
                 value={url}
                 onChange={(e) => setUrl(e.target.value)}
                 placeholder="https://..."
                 required
               />
             </div>
 
             <div>
               <label className="block text-sm font-medium mb-1.5">Description</label>
               <Textarea
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 placeholder="Optional description..."
                 className="min-h-[60px]"
               />
             </div>
 
             <div className="flex justify-end gap-2 pt-2">
               <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                 Cancel
               </Button>
               <Button type="submit" disabled={isSaving}>
                 {isSaving ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin mr-2" />
                     Saving...
                   </>
                 ) : (
                   editingResource ? 'Update' : 'Add'
                 )}
               </Button>
             </div>
           </form>
         </DialogContent>
       </Dialog>
     </div>
   );
 }