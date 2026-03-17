import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, ExternalLink, Table2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SpreadsheetEntry {
  id: string;
  title: string;
  embed_url: string;
  display_order: number;
  created_at: string;
}

function extractEmbedUrl(input: string): string {
  // Convert share/edit URLs to embed URLs
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    // Check if a gid param exists
    const gidMatch = input.match(/gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${match[1]}/pubhtml?gid=${gid}&single=true&widget=true&headers=false`;
  }
  // Already an embed or other URL
  return input;
}

export default function SpreadsheetsPage() {
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const canEdit = role === 'admin' || role === 'owner';

  const [sheets, setSheets] = useState<SpreadsheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSheets = async () => {
    const { data } = await (supabase as any)
      .from('manager_spreadsheets')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    const entries = (data as SpreadsheetEntry[]) || [];
    setSheets(entries);
    if (entries.length > 0 && !activeSheet) {
      setActiveSheet(entries[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSheets(); }, []);

  const addSheet = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    setSaving(true);
    const maxOrder = sheets.reduce((m, s) => Math.max(m, s.display_order), 0);
    const { error } = await (supabase as any).from('manager_spreadsheets').insert({
      title: newTitle.trim(),
      embed_url: extractEmbedUrl(newUrl.trim()),
      display_order: maxOrder + 1,
      is_active: true,
    });
    if (error) {
      toast.error('Failed to add spreadsheet');
    } else {
      toast.success('Spreadsheet added');
      setNewTitle('');
      setNewUrl('');
      setShowAdd(false);
      fetchSheets();
    }
    setSaving(false);
  };

  const deleteSheet = async (id: string) => {
    await (supabase as any).from('manager_spreadsheets').update({ is_active: false }).eq('id', id);
    toast.success('Spreadsheet removed');
    if (activeSheet === id) setActiveSheet(null);
    fetchSheets();
  };

  if (!isManager) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">This page is for managers only.</p>
        </div>
      </AppLayout>
    );
  }

  const current = sheets.find(s => s.id === activeSheet);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PageBackButton to="/app/manage" label="Manage" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Spreadsheets</h1>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Sheet
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sheets.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Table2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No spreadsheets added yet.</p>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="mt-3 gap-1.5">
                <Plus className="w-4 h-4" /> Add your first spreadsheet
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide border-b border-border/50 pb-2">
              {sheets.map(sheet => (
                <button
                  key={sheet.id}
                  onClick={() => setActiveSheet(sheet.id)}
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-all",
                    activeSheet === sheet.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  {sheet.title}
                  {canEdit && (
                    <span
                      onClick={(e) => { e.stopPropagation(); deleteSheet(sheet.id); }}
                      className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Embedded sheet */}
            {current && (
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/20">
                  <span className="text-sm font-medium text-foreground">{current.title}</span>
                  <a
                    href={current.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </a>
                </div>
                <iframe
                  src={current.embed_url}
                  className="w-full border-0"
                  style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
                  title={current.title}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            )}
          </>
        )}

        {/* Add Sheet Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Table2 className="w-4 h-4 text-primary" />
                Add Spreadsheet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Sales Tracker" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Google Sheets URL</label>
                <Input
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Paste any Google Sheets link — share, edit, or embed URL.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={addSheet} disabled={!newTitle.trim() || !newUrl.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
