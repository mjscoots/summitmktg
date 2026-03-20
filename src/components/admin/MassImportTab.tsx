import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { matchNames } from '@/lib/externalRoster';
import { Upload, Loader2, CheckCircle, XCircle, UserPlus, Trash2, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MassImportTabProps {
  profiles: { user_id: string; full_name: string; email: string }[];
  managers: { user_id: string; full_name: string }[];
  teams: { id: string; name: string }[];
  onRefresh: () => void;
}

interface ParsedUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'rookie' | 'manager';
  direct_manager: string;
  team_name: string;
  onboarding_status: string;
  alreadyExists: boolean;
  matchedName?: string;
  duplicateWarning?: string; // Set when name matches multiple existing profiles (nickname collision)
}

/* ── Status normalization ── */
const STATUS_MAP: Record<string, string> = {
  'summer ready': 'summer_ready',
  'summerready': 'summer_ready',
  'summer_ready': 'summer_ready',
  'onboarded': 'onboarded',
  'contract signed': 'contract_signed',
  'contractsigned': 'contract_signed',
  'contract_signed': 'contract_signed',
  'info added': 'info_added',
  'infoadded': 'info_added',
  'info_added': 'info_added',
  'pending': 'pending',
};

function normalizeStatus(raw: string): string {
  const key = raw.toLowerCase().replace(/[_\-]/g, ' ').trim();
  return STATUS_MAP[key] || STATUS_MAP[key.replace(/\s+/g, '')] || 'pending';
}

/* ── Detect best delimiter for a block of text ── */
function detectDelimiter(lines: string[]): 'tab' | 'pipe' | 'comma' | 'none' {
  let tabCount = 0, pipeCount = 0, commaCount = 0;
  const sample = lines.slice(0, Math.min(5, lines.length));
  for (const line of sample) {
    if (line.includes('\t')) tabCount++;
    if (line.includes('|')) pipeCount++;
    if (line.includes(',')) commaCount++;
  }
  // Prefer tab (spreadsheet paste), then pipe, then comma
  if (tabCount >= sample.length * 0.5) return 'tab';
  if (pipeCount >= sample.length * 0.5) return 'pipe';
  if (commaCount >= sample.length * 0.5) return 'comma';
  return 'none';
}

/* ── Smart column detection ── */
function detectColumns(headerCells: string[]): { nameIdx: number; managerIdx: number; statusIdx: number; emailIdx: number; phoneIdx: number } {
  const result = { nameIdx: 0, managerIdx: -1, statusIdx: -1, emailIdx: -1, phoneIdx: -1 };
  
  for (let i = 0; i < headerCells.length; i++) {
    const h = headerCells[i].toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (h.includes('name') && !h.includes('manager') && !h.includes('team') && result.nameIdx === 0) result.nameIdx = i;
    else if (h.includes('manager') || h.includes('reports to') || h.includes('supervisor')) result.managerIdx = i;
    else if (h.includes('status') || h.includes('stage') || h.includes('onboarding')) result.statusIdx = i;
    else if (h.includes('email') || h.includes('e-mail')) result.emailIdx = i;
    else if (h.includes('phone') || h.includes('cell') || h.includes('mobile')) result.phoneIdx = i;
  }
  return result;
}

function isHeaderRow(cells: string[]): boolean {
  const headerWords = ['name', 'manager', 'email', 'phone', 'status', 'role', 'team', 'rep'];
  const matches = cells.filter(c => headerWords.some(w => c.toLowerCase().includes(w))).length;
  return matches >= 2;
}

/* ── Main parse function ── */
function parseInput(
  text: string,
  existingProfiles: { full_name: string }[],
  managerList: { full_name: string }[]
): ParsedUser[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const parsed: ParsedUser[] = [];
  
  let colMap = { nameIdx: 0, managerIdx: -1, statusIdx: -1, emailIdx: -1, phoneIdx: -1 };
  let startLine = 0;

  // If structured delimiter, check for header row
  if (delimiter !== 'none') {
    const splitter = delimiter === 'tab' ? '\t' : delimiter === 'pipe' ? '|' : ',';
    const firstCells = lines[0].split(splitter).map(c => c.trim());
    if (isHeaderRow(firstCells)) {
      colMap = detectColumns(firstCells);
      startLine = 1;
    } else if (delimiter === 'pipe' || delimiter === 'comma') {
      // For pipe/comma without headers, assume: name, manager, status
      colMap = { nameIdx: 0, managerIdx: 1, statusIdx: 2, emailIdx: -1, phoneIdx: -1 };
    } else {
      // Tab without header: assume name, manager, status, email, phone
      colMap = { nameIdx: 0, managerIdx: 1, statusIdx: 2, emailIdx: 3, phoneIdx: 4 };
    }
  }

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    let full_name = '';
    let email = '';
    let phone = '';
    let direct_manager = '';
    let onboarding_status = 'pending';

    // Strip leading number: "1. " or "1) " or "1 "
    const cleanLine = line.replace(/^\d+[\.\)\-]\s*/, '');

    if (delimiter === 'tab') {
      const cells = cleanLine.split('\t').map(c => c.trim());
      full_name = cells[colMap.nameIdx] || '';
      if (colMap.managerIdx >= 0 && cells[colMap.managerIdx]) {
        direct_manager = cells[colMap.managerIdx].replace(/^manager:\s*/i, '');
      }
      if (colMap.statusIdx >= 0 && cells[colMap.statusIdx]) {
        onboarding_status = normalizeStatus(cells[colMap.statusIdx].replace(/^status:\s*/i, ''));
      }
      if (colMap.emailIdx >= 0 && cells[colMap.emailIdx]) email = cells[colMap.emailIdx];
      if (colMap.phoneIdx >= 0 && cells[colMap.phoneIdx]) phone = cells[colMap.phoneIdx];
    } else if (delimiter === 'pipe') {
      const cells = cleanLine.split('|').map(c => c.trim());
      full_name = cells[colMap.nameIdx] || '';
      if (colMap.managerIdx >= 0 && cells[colMap.managerIdx]) {
        direct_manager = cells[colMap.managerIdx].replace(/^manager:\s*/i, '');
      }
      if (colMap.statusIdx >= 0 && cells[colMap.statusIdx]) {
        onboarding_status = normalizeStatus(cells[colMap.statusIdx].replace(/^status:\s*/i, ''));
      }
      if (colMap.emailIdx >= 0 && cells[colMap.emailIdx]) email = cells[colMap.emailIdx];
      if (colMap.phoneIdx >= 0 && cells[colMap.phoneIdx]) phone = cells[colMap.phoneIdx];
    } else if (delimiter === 'comma') {
      const cells = cleanLine.split(',').map(c => c.trim());
      full_name = cells[colMap.nameIdx] || '';
      if (colMap.managerIdx >= 0 && cells[colMap.managerIdx]) {
        direct_manager = cells[colMap.managerIdx].replace(/^manager:\s*/i, '');
      }
      if (colMap.statusIdx >= 0 && cells[colMap.statusIdx]) {
        onboarding_status = normalizeStatus(cells[colMap.statusIdx].replace(/^status:\s*/i, ''));
      }
      if (colMap.emailIdx >= 0 && cells[colMap.emailIdx]) email = cells[colMap.emailIdx];
      if (colMap.phoneIdx >= 0 && cells[colMap.phoneIdx]) phone = cells[colMap.phoneIdx];
    } else {
      // Plain names — one per line
      full_name = cleanLine;
    }

    if (!full_name) continue;

    // Auto-match manager name against known managers
    if (direct_manager) {
      const bestMatch = managerList.find(m => matchNames(m.full_name, direct_manager) > 0.7);
      if (bestMatch) direct_manager = bestMatch.full_name;
    }

    // Check if already exists + detect potential duplicates (nickname collisions)
    let alreadyExists = false;
    let matchedName: string | undefined;
    let duplicateWarning: string | undefined;
    const allMatches: string[] = [];
    for (const p of existingProfiles) {
      const score = matchNames(p.full_name, full_name);
      if (score > 0.7) {
        allMatches.push(p.full_name);
        if (!alreadyExists) {
          alreadyExists = true;
          matchedName = p.full_name;
        }
      }
    }
    if (allMatches.length > 1) {
      duplicateWarning = `Matches ${allMatches.length} profiles: ${allMatches.join(', ')}`;
    }

    // Generate email if not provided
    if (!email) {
      const nameParts = full_name.toLowerCase().split(/\s+/);
      if (nameParts.length >= 2) {
        email = `${nameParts[0]}.${nameParts[nameParts.length - 1]}@summitmktg.com`;
      } else {
        email = `${nameParts[0]}@summitmktg.com`;
      }
    }

    parsed.push({
      id: crypto.randomUUID(),
      full_name,
      email,
      phone,
      role: 'rookie',
      direct_manager,
      team_name: '',
      onboarding_status,
      alreadyExists,
      matchedName,
      duplicateWarning,
    });
  }

  return parsed;
}

export default function MassImportTab({ profiles, managers, teams, onRefresh }: MassImportTabProps) {
  const [rawText, setRawText] = useState('');
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: string[]; failed: { email: string; error: string }[] } | null>(null);
  const [defaultManager, setDefaultManager] = useState('');
  const [defaultTeam, setDefaultTeam] = useState('');

  const handleParse = () => {
    const parsed = parseInput(rawText, profiles, managers);
    setParsedUsers(parsed);
    setResults(null);
    
    if (parsed.length === 0) {
      toast({ title: 'No names detected', description: 'Check your formatting and try again.', variant: 'destructive' });
    } else {
      const existing = parsed.filter(u => u.alreadyExists).length;
      const newCount = parsed.length - existing;
      toast({ title: `Parsed ${parsed.length} entries`, description: `${newCount} new, ${existing} already exist` });
    }
  };

  const handleRemove = (id: string) => {
    setParsedUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleUpdateUser = (id: string, field: keyof ParsedUser, value: string) => {
    setParsedUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const newUsers = parsedUsers.filter(u => !u.alreadyExists);
  const existingUsers = parsedUsers.filter(u => u.alreadyExists);

  const handleImport = async () => {
    if (newUsers.length === 0) {
      toast({ title: 'No new users to import', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      const usersToCreate = newUsers.map(u => ({
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        direct_manager: u.direct_manager || defaultManager,
        team_name: u.team_name || defaultTeam,
        onboarding_status: u.onboarding_status,
      }));

      const { data, error } = await supabase.functions.invoke('bulk-create-users', {
        body: { users: usersToCreate, is_import: true },
      });

      if (error) throw error;

      setResults(data);
      toast({
        title: 'Import Complete',
        description: `${data.success?.length || 0} created, ${data.failed?.length || 0} failed`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const detectedFormat = rawText.trim() ? (
    rawText.includes('\t') ? 'Tab-separated (spreadsheet)' :
    rawText.includes('|') ? 'Pipe-separated' :
    rawText.includes(',') ? 'Comma-separated' : 'Plain names'
  ) : null;

  return (
    <div className="space-y-6">
      {/* Input Area */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Paste Names</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Paste a list — one per line. Supports tab-separated (from spreadsheets), pipe-separated, comma-separated, or plain names.
            Manager names are auto-matched. Headers are auto-detected.
          </p>
        </div>
        <Textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`Paste names here...\n\nSupported formats:\n• Tab-separated from spreadsheet (Name ⇥ Manager ⇥ Status)\n• Name | Manager Name | Status\n• Name, email, phone, manager\n• Plain names (one per line)`}
          className="min-h-[160px] bg-muted/30 border-border/50 font-mono text-xs"
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleParse} disabled={!rawText.trim()} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Parse Names
          </Button>
          <span className="text-xs text-muted-foreground">
            {rawText.split('\n').filter(l => l.trim()).length} lines detected
            {detectedFormat && <span className="ml-1.5 text-primary/70">· {detectedFormat}</span>}
          </span>
        </div>
      </div>

      {/* Default Settings */}
      {parsedUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 p-3 bg-muted/20 border border-border/40 rounded-lg">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Default Manager</label>
            <Select value={defaultManager} onValueChange={setDefaultManager}>
              <SelectTrigger className="h-8 bg-background border-border/50 text-xs">
                <SelectValue placeholder="Select default..." />
              </SelectTrigger>
              <SelectContent>
                {managers.map(m => (
                  <SelectItem key={m.user_id} value={m.full_name} className="text-xs">{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Default Team</label>
            <Select value={defaultTeam} onValueChange={setDefaultTeam}>
              <SelectTrigger className="h-8 bg-background border-border/50 text-xs">
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.name} className="text-xs">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Already Exists Warning */}
      {existingUsers.length > 0 && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-xs font-semibold text-warning">{existingUsers.length} Already in App (will be skipped)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {existingUsers.map(u => (
              <span key={u.id} className={`text-[10px] px-2 py-0.5 rounded ${u.duplicateWarning ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                {u.full_name} → {u.matchedName}
                {u.duplicateWarning && <span className="ml-1 font-bold">⚠ DUPE</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Parsed Users Preview */}
      {newUsers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              <UserPlus className="w-4 h-4 inline mr-1.5 text-success" />
              {newUsers.length} New Users to Import
            </h3>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Import {newUsers.length} Users
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {newUsers.map(user => (
              <div key={user.id} className="p-3 rounded-xl border border-border/40 bg-muted/10 group relative">
                <button
                  onClick={() => handleRemove(user.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/30"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <UserAvatar fullName={user.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground">{user.role}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    user.onboarding_status === 'summer_ready' ? 'text-success border-success/30' :
                    user.onboarding_status === 'onboarded' ? 'text-primary border-primary/30' :
                    user.onboarding_status === 'contract_signed' ? 'text-warning border-warning/30' :
                    'text-muted-foreground border-border/40'
                  }`}>
                    {(user.onboarding_status || 'pending').replace(/_/g, ' ')}
                  </span>
                </div>
                {user.direct_manager && (
                  <p className="text-[10px] text-muted-foreground ml-10 truncate">
                    Manager: <span className="text-foreground/60">{user.direct_manager}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {results.success.length > 0 && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-xs font-semibold text-success">{results.success.length} Created Successfully</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {results.success.map((email, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-success/10 rounded text-success">{email}</span>
                ))}
              </div>
            </div>
          )}
          {results.failed.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs font-semibold text-destructive">{results.failed.length} Failed</span>
              </div>
              <div className="space-y-1">
                {results.failed.map((f, i) => (
                  <p key={i} className="text-[10px] text-destructive">{f.email}: {f.error}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
