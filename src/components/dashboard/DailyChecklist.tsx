 import { useState, useEffect, useRef } from 'react';
 import { CheckSquare, Plus, Square, CheckCircle } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { useAuth } from '@/hooks/useAuth';
 
 interface ChecklistItem {
   id: string;
   text: string;
   completed: boolean;
   isRolledOver: boolean;
   createdAt: string;
 }
 
 const STORAGE_KEY = 'summit_daily_checklist';
 
 export function DailyChecklist() {
   const { user } = useAuth();
   const [items, setItems] = useState<ChecklistItem[]>([]);
   const [newItemText, setNewItemText] = useState('');
   const inputRef = useRef<HTMLInputElement>(null);
   const newItemInputRef = useRef<HTMLInputElement>(null);
 
   // Load items from localStorage on mount
   useEffect(() => {
     if (!user) return;
     
     const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
     if (stored) {
       try {
         const parsed = JSON.parse(stored);
         const today = new Date().toDateString();
         const storedDate = parsed.date;
         
         if (storedDate === today) {
           // Same day, load items as-is
           setItems(parsed.items || []);
         } else {
           // New day - roll over incomplete items
           const incompleteItems = (parsed.items || [])
             .filter((item: ChecklistItem) => !item.completed)
             .map((item: ChecklistItem) => ({
               ...item,
               isRolledOver: true,
             }));
           setItems(incompleteItems);
           // Save immediately with new date
           saveItems(incompleteItems);
         }
       } catch {
         setItems([]);
       }
     }
   }, [user]);
 
   const saveItems = (newItems: ChecklistItem[]) => {
     if (!user) return;
     localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify({
       date: new Date().toDateString(),
       items: newItems,
     }));
   };
 
   const addItem = (text: string) => {
     if (!text.trim()) return;
     
     const newItem: ChecklistItem = {
       id: crypto.randomUUID(),
       text: text.trim(),
       completed: false,
       isRolledOver: false,
       createdAt: new Date().toISOString(),
     };
     
     const newItems = [...items, newItem];
     setItems(newItems);
     saveItems(newItems);
     setNewItemText('');
   };
 
   const toggleItem = (id: string) => {
     const newItems = items.map(item => 
       item.id === id ? { ...item, completed: !item.completed, isRolledOver: false } : item
     );
     // Sort: incomplete rolled-over first, then incomplete, then completed
     newItems.sort((a, b) => {
       if (a.completed !== b.completed) return a.completed ? 1 : -1;
       if (a.isRolledOver !== b.isRolledOver) return a.isRolledOver ? -1 : 1;
       return 0;
     });
     setItems(newItems);
     saveItems(newItems);
   };
 
   const updateItemText = (id: string, text: string) => {
     const newItems = items.map(item => 
       item.id === id ? { ...item, text } : item
     );
     setItems(newItems);
     saveItems(newItems);
   };
 
   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id?: string) => {
     if (e.key === 'Enter') {
       e.preventDefault();
       if (id) {
         // Editing existing item - create new item below
         addItem('');
         setTimeout(() => newItemInputRef.current?.focus(), 0);
       } else {
         // New item input
         addItem(newItemText);
       }
     }
   };
 
   const removeItem = (id: string) => {
     const newItems = items.filter(item => item.id !== id);
     setItems(newItems);
     saveItems(newItems);
   };
 
  // Filter out completed items (they disappear when checked)
  // Sort remaining: rolled-over incomplete first, then others
  const sortedItems = [...items]
    .filter(item => !item.completed)
    .sort((a, b) => {
      if (a.isRolledOver !== b.isRolledOver) return a.isRolledOver ? -1 : 1;
      return 0;
    });
 
   const completedCount = items.filter(i => i.completed).length;
   const totalCount = items.length;
 
   return (
     <div className="bg-card rounded-lg border border-border/50 relative overflow-hidden">
       {/* Blue accent line on left */}
       <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/40" />
       
       <div className="p-4 border-b border-border/30 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <CheckSquare className="w-4 h-4 text-primary" />
           <div>
             <h2 className="font-semibold text-sm text-foreground">Today's Priorities</h2>
             <p className="text-[10px] text-muted-foreground">to-do list</p>
           </div>
          </div>
         {totalCount > 0 && (
           <span className="text-[10px] text-muted-foreground/70">
             {completedCount} / {totalCount} completed
           </span>
         )}
       </div>
       
       <div className="p-4 space-y-2">
         {sortedItems.map((item) => (
           <div 
             key={item.id}
             className={cn(
               "flex items-start gap-2.5 p-2.5 rounded-md transition-all group",
               item.isRolledOver && !item.completed && "bg-primary/8 border-l-2 border-l-primary border border-primary/20",
               item.completed && "opacity-40"
             )}
           >
             <button
               onClick={() => toggleItem(item.id)}
               className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110"
             >
               {item.completed ? (
                 <CheckCircle className="w-4 h-4 text-success" />
               ) : (
                 <Square className="w-4 h-4 text-muted-foreground/60 hover:text-primary transition-colors" />
               )}
             </button>
             <input
               type="text"
               value={item.text}
               onChange={(e) => updateItemText(item.id, e.target.value)}
               onKeyDown={(e) => handleKeyDown(e, item.id)}
               onBlur={() => {
                 if (!item.text.trim()) removeItem(item.id);
               }}
               placeholder="Task..."
               className={cn(
                 "flex-1 bg-transparent text-sm border-none outline-none placeholder:text-muted-foreground/50",
                 item.completed && "line-through text-muted-foreground/60",
                 item.isRolledOver && !item.completed && "text-primary font-medium"
               )}
             />
             {item.isRolledOver && !item.completed && (
               <span className="text-[9px] text-primary/80 font-medium px-1.5 py-0.5 rounded bg-primary/10">
                 ROLLOVER
               </span>
             )}
           </div>
         ))}
         
         {/* Add new item */}
         <div className="flex items-center gap-2.5 p-2.5 rounded-md hover:bg-muted/30 transition-colors border border-dashed border-border/30">
           <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
           <input
             ref={newItemInputRef}
             type="text"
             value={newItemText}
             onChange={(e) => setNewItemText(e.target.value)}
             onKeyDown={(e) => handleKeyDown(e)}
             placeholder="Add a task..."
             className="flex-1 bg-transparent text-sm border-none outline-none placeholder:text-muted-foreground/40"
           />
         </div>
       </div>
     </div>
   );
 }