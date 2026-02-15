 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { Bell, Pin, Plus, Send, MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
 import { formatDistanceToNow } from 'date-fns';
 import { Button } from '@/components/ui/button';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Checkbox } from '@/components/ui/checkbox';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import { toast } from 'sonner';
 import { cn } from '@/lib/utils';
 
 interface Announcement {
   id: string;
   title: string;
   content: string;
   is_pinned: boolean;
   created_at: string;
   target_role: 'rookie' | 'manager' | 'admin' | null;
   author_id: string | null;
   team_ids: string[] | null;
   author_name?: string;
 }
 
 interface Team {
   id: string;
   name: string;
   slug: string;
 }
 
 interface CommunityFeedProps {
   canPost?: boolean;
   isAdmin?: boolean;
 }
 
export function CommunityFeed({ canPost = false, isAdmin = false }: CommunityFeedProps) {
  const { role, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [audienceType, setAudienceType] = useState<'everyone' | 'managers_only' | 'teams'>('everyone');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManager = role === 'manager' || role === 'admin';
 
   useEffect(() => {
     const fetchTeams = async () => {
       const { data } = await supabase
         .from('teams')
         .select('id, name, slug')
         .order('name');
       setTeams(data || []);
     };
     if (canPost) {
       fetchTeams();
     }
   }, [canPost]);
 
   const fetchAnnouncements = async () => {
     try {
       let query = supabase
         .from('announcements')
         .select('*')
         .order('is_pinned', { ascending: false })
         .order('created_at', { ascending: false })
         .limit(30);
 
       if (role === 'rookie') {
         query = query.or('target_role.is.null,target_role.eq.rookie');
       }
 
       const { data, error } = await query;
       if (error) {
         console.error('Error fetching announcements:', error);
         return;
       }
       
       // Fetch author names
       const authorIds = [...new Set((data || []).filter(a => a.author_id).map(a => a.author_id))];
       let authorMap: Record<string, string> = {};
       
       if (authorIds.length > 0) {
         const { data: profiles } = await supabase
           .from('profiles')
           .select('user_id, full_name')
           .in('user_id', authorIds);
         
         authorMap = (profiles || []).reduce((acc, p) => {
           acc[p.user_id] = p.full_name;
           return acc;
         }, {} as Record<string, string>);
       }
       
       const announcementsWithAuthors = (data || []).map(a => ({
         ...a,
         author_name: a.author_id ? authorMap[a.author_id] : undefined,
       }));
       
       setAnnouncements(announcementsWithAuthors);
     } catch (err) {
       console.error('Error:', err);
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => {
     fetchAnnouncements();
   }, [role]);
 
  const resetForm = () => {
    setNewTitle('');
    setNewContent('');
    setIsPinned(false);
    setSelectedTeamIds([]);
    setAudienceType('everyone');
    setIsCreateOpen(false);
    setEditingAnnouncement(null);
  };
 
   const handleSaveAnnouncement = async () => {
     if (!newTitle.trim() || !newContent.trim()) {
       toast.error('Please fill in all fields');
       return;
     }
    setIsSubmitting(true);
    try {
      // Determine target_role based on audience type
      let targetRole: 'manager' | null = null;
      let teamIds: string[] | null = null;

      if (audienceType === 'managers_only') {
        targetRole = 'manager';
      } else if (audienceType === 'teams' && selectedTeamIds.length > 0) {
        teamIds = selectedTeamIds;
      }

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: newTitle.trim(),
            content: newContent.trim(),
            is_pinned: isPinned,
            target_role: targetRole,
            team_ids: teamIds,
          })
          .eq('id', editingAnnouncement.id);
         
         if (error) {
           toast.error('Failed to update announcement');
           return;
         }
         toast.success('Updated!');
      } else {
        const { error } = await supabase.from('announcements').insert({
          title: newTitle.trim(),
          content: newContent.trim(),
          is_pinned: isPinned,
          author_id: user?.id,
          target_role: targetRole,
          team_ids: teamIds,
        });
         if (error) {
           toast.error('Failed to create announcement');
           return;
         }
         toast.success('Posted!');
       }
       resetForm();
       fetchAnnouncements();
     } catch (err) {
       toast.error('Something went wrong');
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const handleTogglePin = async (id: string, currentlyPinned: boolean) => {
     try {
       const { error } = await supabase
         .from('announcements')
         .update({ is_pinned: !currentlyPinned })
         .eq('id', id);
       if (error) {
         toast.error('Failed to update');
         return;
       }
       setAnnouncements(prev => 
         prev.map(a => a.id === id ? { ...a, is_pinned: !currentlyPinned } : a)
           .sort((a, b) => {
             if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
             return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
           })
       );
       toast.success(currentlyPinned ? 'Unpinned' : 'Pinned');
     } catch {
       toast.error('Something went wrong');
     }
   };
 
  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setNewTitle(announcement.title);
    setNewContent(announcement.content);
    setIsPinned(announcement.is_pinned);
    setSelectedTeamIds(announcement.team_ids || []);
    // Determine audience type from announcement
    if (announcement.target_role === 'manager') {
      setAudienceType('managers_only');
    } else if (announcement.team_ids && announcement.team_ids.length > 0) {
      setAudienceType('teams');
    } else {
      setAudienceType('everyone');
    }
    setIsCreateOpen(true);
  };
 
   const handleDelete = async (id: string) => {
     try {
       const { error } = await supabase
         .from('announcements')
         .delete()
         .eq('id', id);
       
       if (error) {
         toast.error('Failed to delete');
         return;
       }
       toast.success('Deleted');
       fetchAnnouncements();
     } catch {
       toast.error('Something went wrong');
     }
   };
 
   const pinnedAnnouncements = announcements.filter(a => a.is_pinned);
   const regularAnnouncements = announcements.filter(a => !a.is_pinned);
 
   if (isLoading) {
     return (
       <div className="bg-card rounded-lg border border-border/50 p-4 h-full">
         <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
       </div>
     );
   }
 
   return (
     <div className="bg-card rounded-lg border border-border/50 h-full flex flex-col">
       {/* Header */}
       <div className="p-3 border-b border-border/30 flex-shrink-0">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <MessageSquare className="w-4 h-4 text-primary" />
             <h2 className="font-semibold text-sm text-foreground">Community Announcements</h2>
           </div>
           {canPost && (
             <Dialog open={isCreateOpen} onOpenChange={(open) => {
               setIsCreateOpen(open);
               if (!open) resetForm();
             }}>
               <DialogTrigger asChild>
                 <Button size="sm" variant="ghost" className="h-7 px-2 text-primary hover:text-primary">
                   <Plus className="w-4 h-4" />
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                   <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Post Announcement'}</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-3 pt-3">
                   <Input
                     placeholder="Title..."
                     value={newTitle}
                     onChange={(e) => setNewTitle(e.target.value)}
                     className="bg-muted border-border text-sm"
                   />
                   <Textarea
                     placeholder="What's happening?"
                     value={newContent}
                     onChange={(e) => setNewContent(e.target.value)}
                     className="bg-muted border-border min-h-[100px] text-sm"
                   />
                   <div className="flex items-center gap-3">
                     <button
                       type="button"
                       onClick={() => setIsPinned(!isPinned)}
                       className={cn(
                         "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                         isPinned 
                           ? "border-primary bg-primary/10 text-primary"
                           : "border-border text-muted-foreground hover:text-foreground"
                       )}
                     >
                       <Pin className="w-3 h-3" />
                       Pin
                     </button>
                   </div>
                   {isManager && (
                     <div className="border-t border-border pt-3">
                       <label className="block text-xs font-medium mb-2 text-muted-foreground">Who should see this?</label>
                       <div className="flex gap-2 flex-wrap">
                         <button
                           type="button"
                           onClick={() => setAudienceType('everyone')}
                           className={cn(
                             "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                             audienceType === 'everyone'
                               ? "border-primary bg-primary/10 text-primary"
                               : "border-border text-muted-foreground hover:text-foreground"
                           )}
                         >
                           Everyone
                         </button>
                         <button
                           type="button"
                           onClick={() => setAudienceType('managers_only')}
                           className={cn(
                             "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                             audienceType === 'managers_only'
                               ? "border-primary bg-primary/10 text-primary"
                               : "border-border text-muted-foreground hover:text-foreground"
                           )}
                         >
                           Managers Only
                         </button>
                         {isAdmin && (
                           <button
                             type="button"
                             onClick={() => setAudienceType('teams')}
                             className={cn(
                               "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                               audienceType === 'teams'
                                 ? "border-primary bg-primary/10 text-primary"
                                 : "border-border text-muted-foreground hover:text-foreground"
                             )}
                           >
                             Select Teams
                           </button>
                         )}
                       </div>
                       <p className="text-[10px] text-muted-foreground mt-1.5">
                         {audienceType === 'everyone' && 'All managers and rookies will see this'}
                         {audienceType === 'managers_only' && 'Only managers will see this (no rookies)'}
                         {audienceType === 'teams' && 'Only selected team members will see this'}
                       </p>
                       {audienceType === 'teams' && isAdmin && (
                         <div className="mt-2 max-h-24 overflow-y-auto space-y-1 bg-muted/30 p-2 rounded-md">
                           {teams.map(team => (
                             <label key={team.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer text-xs">
                               <Checkbox
                                 checked={selectedTeamIds.includes(team.id)}
                                 onCheckedChange={(checked) => {
                                   if (checked) {
                                     setSelectedTeamIds([...selectedTeamIds, team.id]);
                                   } else {
                                     setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id));
                                   }
                                 }}
                                 className="w-3.5 h-3.5"
                               />
                               {team.name}
                             </label>
                           ))}
                         </div>
                       )}
                     </div>
                   )}
                   <div className="flex justify-end gap-2 pt-2">
                     <Button variant="ghost" size="sm" onClick={resetForm}>
                       Cancel
                     </Button>
                     <Button
                       size="sm"
                       onClick={handleSaveAnnouncement}
                       disabled={isSubmitting}
                       className="gap-1.5"
                     >
                       <Send className="w-3 h-3" />
                       {editingAnnouncement ? 'Update' : 'Post'}
                     </Button>
                   </div>
                 </div>
               </DialogContent>
             </Dialog>
           )}
         </div>
       </div>
 
       {/* Feed content */}
       <div className="p-3 space-y-2 flex-1 overflow-y-auto">
         {pinnedAnnouncements.map((a) => (
           <FeedCard 
             key={a.id} 
             announcement={a} 
             canManage={canPost} 
             onTogglePin={handleTogglePin}
             onEdit={handleEdit}
             onDelete={handleDelete}
           />
         ))}
 
         {regularAnnouncements.length === 0 && pinnedAnnouncements.length === 0 ? (
           <div className="text-center py-8">
             <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
             <p className="text-sm text-muted-foreground">No announcements yet</p>
           </div>
         ) : (
           regularAnnouncements.map((a) => (
             <FeedCard 
               key={a.id} 
               announcement={a} 
               canManage={canPost}
               onTogglePin={handleTogglePin}
               onEdit={handleEdit}
               onDelete={handleDelete}
             />
           ))
         )}
       </div>
     </div>
   );
 }
 
function FeedCard({ 
    announcement, 
    canManage,
    onTogglePin,
    onEdit,
    onDelete,
  }: { 
    announcement: Announcement; 
    canManage: boolean;
    onTogglePin: (id: string, pinned: boolean) => void;
    onEdit: (announcement: Announcement) => void;
    onDelete: (id: string) => void;
  }) {
    const [menuOpen, setMenuOpen] = useState(false);
   
   // Auto-bold first actionable sentence
   const formatContent = (content: string) => {
     const actionPhrases = ['Action Required:', 'Important:', 'Deadline:', 'Reminder:', 'Update:', 'Notice:'];
     for (const phrase of actionPhrases) {
       if (content.startsWith(phrase)) {
         const restOfContent = content.slice(phrase.length);
         const firstSentenceEnd = restOfContent.search(/[.!?]/);
         if (firstSentenceEnd > 0) {
           const boldPart = phrase + restOfContent.slice(0, firstSentenceEnd + 1);
           const rest = restOfContent.slice(firstSentenceEnd + 1);
           return { boldPart, rest };
         }
         return { boldPart: content, rest: '' };
       }
     }
     return { boldPart: '', rest: content };
   };
   
   const { boldPart, rest } = formatContent(announcement.content);
   
   return (
      <div
       className={cn(
         "p-3 rounded-md border transition-all relative overflow-hidden group",
         announcement.is_pinned 
           ? "border-primary/30 bg-slate-900/50" 
           : "border-border/30 bg-card hover:border-border/50"
       )}
     >
       {/* Blue indicator for pinned */}
       {announcement.is_pinned && (
         <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
       )}
       
       <div className="flex items-start justify-between gap-2">
         <div className="flex-1 min-w-0">
           <div className="flex items-center gap-1.5 mb-0.5">
             {announcement.is_pinned && (
               <Pin className="w-3 h-3 text-primary/70 flex-shrink-0" />
             )}
             <h4 className="font-medium text-sm text-foreground line-clamp-1">
               {announcement.title}
             </h4>
           </div>
           <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
             {boldPart && <span className="font-semibold text-foreground">{boldPart}</span>}
             {rest}
           </p>
           <div className="flex items-center gap-2 mt-1.5">
             <p className="text-[10px] text-muted-foreground/60">
               {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
             </p>
             {announcement.author_name && (
               <p className="text-[10px] text-muted-foreground/50">
                 • {announcement.author_name.split(' ')[0]}
               </p>
             )}
           </div>
         </div>
          {canManage && (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                  menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                 <MoreVertical className="w-4 h-4" />
               </button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-36">
               <DropdownMenuItem onClick={() => onTogglePin(announcement.id, announcement.is_pinned)}>
                 <Pin className="w-3.5 h-3.5 mr-2" />
                 {announcement.is_pinned ? 'Unpin' : 'Pin'}
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => onEdit(announcement)}>
                 <Pencil className="w-3.5 h-3.5 mr-2" />
                 Edit
               </DropdownMenuItem>
               <DropdownMenuItem 
                 onClick={() => onDelete(announcement.id)}
                 className="text-destructive focus:text-destructive"
               >
                 <Trash2 className="w-3.5 h-3.5 mr-2" />
                 Delete
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         )}
       </div>
     </div>
   );
 }