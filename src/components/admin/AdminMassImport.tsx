import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { matchNames } from '@/lib/externalRoster';
import { Upload, Loader2, CheckCircle, XCircle, UserPlus, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface MassImportProps {
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
  organization: string;
  experience: string;
  onboarding_status: string;
  active: boolean;
  alreadyExists: boolean;
  matchedName?: string;
  updateFields?: string[];
}

/* ── Status normalization ── */
const STATUS_MAP: Record<string, string> = {
  'prospect added': 'pending',
  'prospectadded': 'pending',
  'prospect_added': 'pending',
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

/* ── Detect delimiter ── */
function detectDelimiter(lines: string[]): 'tab' | 'pipe' | 'comma' | 'none' {
  let tabCount = 0, pipeCount = 0, commaCount = 0;
  const sample = lines.slice(0, Math.min(10, lines.length));
  for (const line of sample) {
    if (line.includes('\t')) tabCount++;
    if (line.includes('|')) pipeCount++;
    if (line.includes(',') && !line.includes('@')) commaCount++;
  }
  if (tabCount >= sample.length * 0.4) return 'tab';
  if (pipeCount >= sample.length * 0.4) return 'pipe';
  if (commaCount >= sample.length * 0.4) return 'comma';
  return 'none';
}

/* ── Smart column detection ── */
function detectColumns(headerCells: string[]) {
  const result = { nameIdx: 0, managerIdx: -1, statusIdx: -1, emailIdx: -1, phoneIdx: -1 };
  for (let i = 0; i < headerCells.length; i++) {
    const h = headerCells[i].toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (h.includes('name') && !h.includes('manager') && !h.includes('team') && result.nameIdx === 0) result.nameIdx = i;
    else if (h.includes('manager') || h.includes('reports to')) result.managerIdx = i;
    else if (h.includes('status') || h.includes('stage') || h.includes('onboarding')) result.statusIdx = i;
    else if (h.includes('email') || h.includes('e-mail')) result.emailIdx = i;
    else if (h.includes('phone') || h.includes('cell') || h.includes('mobile')) result.phoneIdx = i;
  }
  return result;
}

function isHeaderRow(cells: string[]): boolean {
  const headerWords = ['name', 'manager', 'email', 'phone', 'status', 'role', 'team', 'rep'];
  return cells.filter(c => headerWords.some(w => c.toLowerCase().includes(w))).length >= 2;
}

/* ── GetHawx multi-line block parser ── */
function parseGetHawxBlocks(
  text: string,
  existingProfiles: { full_name: string; email: string }[],
  managerList: { full_name: string }[]
): ParsedUser[] {
  const lines = text.split('\n');
  const parsed: ParsedUser[] = [];
  
  // Detect blocks: starts with a number-only line
  const blocks: string[][] = [];
  let currentBlock: string[] = [];
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Check if this is a block separator (number only like "1", "2", "3")
    if (/^\d+$/.test(line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = [];
      continue;
    }
    if (line) {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  for (const block of blocks) {
    if (block.length < 2) continue;

    let full_name = '';
    let pipeline_status = 'pending';
    let phone = '';
    let email = '';
    let organization = '';
    let direct_manager = '';
    let experience = 'rookie';
    let active = true;

    // Expected block structure:
    // [0] Full Name
    // [1] Pipeline Status (Prospect Added, Contract Signed, etc.)
    // [2] Phone (optional, could be empty line before it)
    // [3] Email
    // [4] Organization/Office
    // [5] Direct Manager
    // [6] Extra info line (Undecided/Decided, Rookie/Veteran, Active/Inactive)

    // Parse each line by content detection
    for (let i = 0; i < block.length; i++) {
      const line = block[i];
      
      // Strip markdown link formatting: [text](mailto:text) → text
      const cleanLine = line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
      
      // Is it an email?
      if (cleanLine.includes('@') && !email) {
        email = cleanLine.toLowerCase();
        continue;
      }
      
      // Is it a phone number? (mostly digits, 7+ chars)
      const digits = cleanLine.replace(/\D/g, '');
      if (digits.length >= 7 && digits.length <= 15 && !phone) {
        phone = cleanLine;
        continue;
      }
      
      // Is it a known pipeline status?
      const statusNormalized = normalizeStatus(cleanLine);
      if (statusNormalized !== 'pending' ||
          ['prospect added', 'pending'].some(s => cleanLine.toLowerCase().includes(s))) {
        if (i <= 2 && !full_name) {
          // Name is usually before status
        } else if (cleanLine.toLowerCase().match(/^(prospect added|contract signed|info added|onboarded|summer ready)$/i)) {
          pipeline_status = statusNormalized;
          continue;
        }
      }
      
      // Is it the extra info line? (contains Rookie/Veteran/Active keywords separated by spaces/tabs)
      const lowerLine = cleanLine.toLowerCase();
      if ((lowerLine.includes('rookie') || lowerLine.includes('veteran')) &&
          (lowerLine.includes('active') || lowerLine.includes('inactive') || lowerLine.includes('undecided') || lowerLine.includes('decided'))) {
        if (lowerLine.includes('veteran')) experience = 'veteran';
        if (lowerLine.includes('inactive')) active = false;
        continue;
      }
      
      // First unclassified line with 2+ words is likely the name
      if (!full_name && cleanLine.split(/\s+/).length >= 2 && i < 3) {
        full_name = cleanLine;
        continue;
      }
      
      // If name is set but no status yet, check for status
      if (full_name && i === 1) {
        const maybeStatus = normalizeStatus(cleanLine);
        if (maybeStatus !== 'pending' || cleanLine.toLowerCase().includes('prospect')) {
          pipeline_status = maybeStatus;
          continue;
        }
      }
      
      // Organization (usually after email, before manager)
      // Manager detection: check if it matches a known manager
      const managerMatch = managerList.find(m => matchNames(m.full_name, cleanLine) > 0.7);
      if (managerMatch) {
        direct_manager = managerMatch.full_name;
        continue;
      }
      
      // If we have name, email, phone — remaining multi-word lines are org or manager
      if (full_name && email && phone) {
        if (!organization && cleanLine.split(/\s+/).length >= 1 && !direct_manager) {
          // Could be org or manager — if 2+ words and looks like a name, treat as manager
          if (cleanLine.split(/\s+/).length >= 2 && !organization) {
            // Check if previous lines already had org — use this as manager
            if (block.indexOf(line) > block.findIndex(l => l === email)) {
              if (!organization) {
                organization = cleanLine;
              } else {
                direct_manager = cleanLine;
              }
              continue;
            }
          }
          if (!organization) {
            organization = cleanLine;
            continue;
          }
        }
        if (!direct_manager && cleanLine.split(/\s+/).length >= 2) {
          direct_manager = cleanLine;
          continue;
        }
      }
    }

    if (!full_name) continue;

    // Auto-match manager
    if (direct_manager && !managerList.find(m => m.full_name === direct_manager)) {
      const best = managerList.find(m => matchNames(m.full_name, direct_manager) > 0.7);
      if (best) direct_manager = best.full_name;
    }

    // Generate email if not found
    if (!email) {
      const parts = full_name.toLowerCase().split(/\s+/);
      email = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}@summitmktg.com` : `${parts[0]}@summitmktg.com`;
    }

    // Check existing
    let alreadyExists = false;
    let matchedName: string | undefined;
    let updateFields: string[] = [];
    for (const p of existingProfiles) {
      const score = matchNames(p.full_name, full_name);
      if (score > 0.7 || p.email.toLowerCase() === email.toLowerCase()) {
        alreadyExists = true;
        matchedName = p.full_name;
        updateFields = [];
        if (pipeline_status !== 'pending') updateFields.push('pipeline');
        if (phone) updateFields.push('phone');
        if (organization) updateFields.push('organization');
        break;
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
      organization,
      experience,
      onboarding_status: pipeline_status,
      active,
      alreadyExists,
      matchedName,
      updateFields,
    });
  }

  return parsed;
}

/* ── Standard delimiter parser ── */
function parseDelimited(
  text: string,
  existingProfiles: { full_name: string; email: string }[],
  managerList: { full_name: string }[]
): ParsedUser[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  
  const delimiter = detectDelimiter(lines);
  const parsed: ParsedUser[] = [];
  let colMap = { nameIdx: 0, managerIdx: -1, statusIdx: -1, emailIdx: -1, phoneIdx: -1 };
  let startLine = 0;
  
  if (delimiter !== 'none') {
    const splitter = delimiter === 'tab' ? '\t' : delimiter === 'pipe' ? '|' : ',';
    const firstCells = lines[0].split(splitter).map(c => c.trim());
    if (isHeaderRow(firstCells)) {
      colMap = detectColumns(firstCells);
      startLine = 1;
    } else {
      colMap = { nameIdx: 0, managerIdx: 1, statusIdx: 2, emailIdx: 3, phoneIdx: 4 };
    }
  }
  
  for (let i = startLine; i < lines.length; i++) {
    const cleanLine = lines[i].replace(/^\d+[\.\)\-]\s*/, '');
    let full_name = '', email = '', phone = '', direct_manager = '', onboarding_status = 'pending';
    
    if (delimiter !== 'none') {
      const splitter = delimiter === 'tab' ? '\t' : delimiter === 'pipe' ? '|' : ',';
      const cells = cleanLine.split(splitter).map(c => c.trim());
      full_name = cells[colMap.nameIdx] || '';
      if (colMap.managerIdx >= 0) direct_manager = (cells[colMap.managerIdx] || '').replace(/^manager:\s*/i, '');
      if (colMap.statusIdx >= 0) onboarding_status = normalizeStatus((cells[colMap.statusIdx] || '').replace(/^status:\s*/i, ''));
      if (colMap.emailIdx >= 0) email = cells[colMap.emailIdx] || '';
      if (colMap.phoneIdx >= 0) phone = cells[colMap.phoneIdx] || '';
    } else {
      full_name = cleanLine;
    }
    
    if (!full_name) continue;
    
    if (direct_manager) {
      const best = managerList.find(m => matchNames(m.full_name, direct_manager) > 0.7);
      if (best) direct_manager = best.full_name;
    }
    
    let alreadyExists = false;
    let matchedName: string | undefined;
    for (const p of existingProfiles) {
      if (matchNames(p.full_name, full_name) > 0.7) { alreadyExists = true; matchedName = p.full_name; break; }
    }
    
    if (!email) {
      const parts = full_name.toLowerCase().split(/\s+/);
      email = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}@summitmktg.com` : `${parts[0]}@summitmktg.com`;
    }
    
    parsed.push({
      id: crypto.randomUUID(), full_name, email, phone, role: 'rookie', direct_manager,
      team_name: '', organization: '', experience: 'rookie', onboarding_status,
      active: true, alreadyExists, matchedName,
    });
  }
  
  return parsed;
}

/* ── Detect if input looks like GetHawx blocks ── */
function isGetHawxFormat(text: string): boolean {
  const lines = text.split('\n').map(l => l.trim());
  // GetHawx blocks start with standalone numbers
  let numberLineCount = 0;
  for (const line of lines.slice(0, 30)) {
    if (/^\d+$/.test(line)) numberLineCount++;
  }
  return numberLineCount >= 2;
}

/* ── Main Component ── */
export default function AdminMassImport({ profiles, managers, teams, onRefresh }: MassImportProps) {
  const [rawText, setRawText] = useState('');
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [results, setResults] = useState<{ success: string[]; updated: string[]; failed: { email: string; error: string }[] } | null>(null);
  const [defaultManager, setDefaultManager] = useState('');
  const [defaultTeam, setDefaultTeam] = useState('');

  const handleParse = () => {
    let parsed: ParsedUser[];
    
    if (isGetHawxFormat(rawText)) {
      parsed = parseGetHawxBlocks(rawText, profiles, managers);
    } else {
      parsed = parseDelimited(rawText, profiles, managers);
    }
    
    setParsedUsers(parsed);
    setResults(null);
    
    if (parsed.length === 0) {
      toast({ title: 'No records detected', description: 'Check your formatting and try again.', variant: 'destructive' });
    } else {
      const existing = parsed.filter(u => u.alreadyExists).length;
      const newCount = parsed.length - existing;
      toast({ title: `Parsed ${parsed.length} entries`, description: `${newCount} new, ${existing} existing to update` });
    }
  };

  const handleRemove = (id: string) => {
    setParsedUsers(prev => prev.filter(u => u.id !== id));
  };

  const newUsers = parsedUsers.filter(u => !u.alreadyExists);
  const existingUsers = parsedUsers.filter(u => u.alreadyExists);

  const handleImport = async () => {
    if (newUsers.length === 0 && existingUsers.length === 0) {
      toast({ title: 'Nothing to import', variant: 'destructive' });
      return;
    }

    setImporting(true);
    const successList: string[] = [];
    const updatedList: string[] = [];
    const failedList: { email: string; error: string }[] = [];

    try {
      // Create new users
      if (newUsers.length > 0) {
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
          body: { users: usersToCreate },
        });

        if (error) throw error;
        if (data?.success) successList.push(...data.success);
        if (data?.failed) failedList.push(...data.failed);
      }

      // Update existing users (pipeline status, fill blanks)
      for (const user of existingUsers) {
        try {
          const existingProfile = profiles.find(p => 
            matchNames(p.full_name, user.full_name) > 0.7 || p.email.toLowerCase() === user.email.toLowerCase()
          );
          if (!existingProfile) continue;

          const updates: Record<string, any> = {};
          
          // Always update pipeline status from import
          if (user.onboarding_status && user.onboarding_status !== 'pending') {
            updates.onboarding_status = user.onboarding_status;
          }
          
          // Only fill blanks for phone, organization
          // We'd need to fetch the full profile to check blanks — for now update pipeline
          if (Object.keys(updates).length > 0) {
            const { error } = await supabase.from('profiles')
              .update(updates as any)
              .eq('user_id', existingProfile.user_id);
            if (!error) updatedList.push(existingProfile.full_name);
          }
        } catch (err: any) {
          failedList.push({ email: user.email, error: err.message });
        }
      }

      setResults({ success: successList, updated: updatedList, failed: failedList });
      toast({
        title: 'Import Complete',
        description: `${successList.length} created, ${updatedList.length} updated, ${failedList.length} failed`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const detectedFormat = rawText.trim() ? (
    isGetHawxFormat(rawText) ? 'GetHawx block format' :
    rawText.includes('\t') ? 'Tab-separated (spreadsheet)' :
    rawText.includes('|') ? 'Pipe-separated' :
    rawText.includes(',') ? 'Comma-separated' : 'Plain names'
  ) : null;

  const PIPELINE_LABELS: Record<string, string> = {
    pending: 'Prospect Added',
    contract_signed: 'Contract Signed',
    info_added: 'Info Added',
    onboarded: 'Onboarded',
    summer_ready: 'Summer Ready',
  };

  const PIPELINE_COLORS: Record<string, string> = {
    pending: 'text-muted-foreground border-border/40',
    contract_signed: 'text-amber-400 border-amber-500/30',
    info_added: 'text-orange-400 border-orange-500/30',
    onboarded: 'text-blue-400 border-blue-500/30',
    summer_ready: 'text-green-400 border-green-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Input Area */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Paste from GetHawx or Spreadsheet</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Supports GetHawx block format (numbered blocks with name, status, phone, email, office, manager),
            tab-separated spreadsheet data, pipe-separated, comma-separated, or plain names.
          </p>
        </div>
        <Textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`Paste here...\n\nGetHawx format example:\n1\nJohn Smith\nProspect Added\n\n5551234567\njohn@email.com\nThe Academy\nManager Name\nUndecided    Rookie    Active\n\n2\nJane Doe\nContract Signed\n...\n\nAlso supports: tab/pipe/comma separated data`}
          className="min-h-[180px] bg-muted/30 border-border/50 font-mono text-xs"
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleParse} disabled={!rawText.trim()} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Parse Records
          </Button>
          <span className="text-xs text-muted-foreground">
            {rawText.split('\n').filter(l => l.trim()).length} lines
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
                {managers.map(m => <SelectItem key={m.user_id} value={m.full_name} className="text-xs">{m.full_name}</SelectItem>)}
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
                {teams.map(t => <SelectItem key={t.id} value={t.name} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Review Summary */}
      {parsedUsers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
            <p className="text-2xl font-black text-green-400">{newUsers.length}</p>
            <p className="text-[10px] text-green-400/70 uppercase tracking-wider">New Users</p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
            <p className="text-2xl font-black text-blue-400">{existingUsers.length}</p>
            <p className="text-[10px] text-blue-400/70 uppercase tracking-wider">To Update</p>
          </div>
          <div className="p-3 bg-muted/20 border border-border/30 rounded-lg text-center">
            <p className="text-2xl font-black text-foreground">{parsedUsers.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Parsed</p>
          </div>
        </div>
      )}

      {/* Existing Users to Update */}
      {existingUsers.length > 0 && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400">{existingUsers.length} Existing Users to Update</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {existingUsers.map(u => (
              <span key={u.id} className="text-[10px] px-2 py-0.5 bg-blue-500/10 rounded text-blue-400">
                {u.full_name} → {u.matchedName}
                {u.updateFields?.length ? ` (${u.updateFields.join(', ')})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* New Users Preview */}
      {newUsers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              <UserPlus className="w-4 h-4 inline mr-1.5 text-green-400" />
              {newUsers.length} New Users to Create
            </h3>
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
                <div className="flex items-center gap-3 mb-1.5">
                  <UserAvatar fullName={user.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${PIPELINE_COLORS[user.onboarding_status] || PIPELINE_COLORS.pending}`}>
                    {PIPELINE_LABELS[user.onboarding_status] || 'Prospect Added'}
                  </span>
                </div>
                <div className="ml-9 space-y-0.5">
                  {user.phone && <p className="text-[10px] text-muted-foreground">📱 {user.phone}</p>}
                  {user.organization && <p className="text-[10px] text-muted-foreground">🏢 {user.organization}</p>}
                  {user.direct_manager && <p className="text-[10px] text-muted-foreground">👤 {user.direct_manager}</p>}
                  {user.experience === 'veteran' && <span className="text-[9px] px-1.5 py-0.5 bg-primary/15 text-primary rounded">Veteran</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Button */}
      {parsedUsers.length > 0 && !results && (
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={importing || (newUsers.length === 0 && existingUsers.length === 0)}
            className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
            size="lg"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import {newUsers.length > 0 ? `${newUsers.length} New` : ''}{existingUsers.length > 0 ? `${newUsers.length > 0 ? ' + ' : ''}${existingUsers.length} Updates` : ''}
          </Button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {results.success.length > 0 && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400">{results.success.length} Created Successfully</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {results.success.map((email, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-green-500/10 rounded text-green-400">{email}</span>
                ))}
              </div>
            </div>
          )}
          {results.updated.length > 0 && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">{results.updated.length} Updated</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {results.updated.map((name, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-500/10 rounded text-blue-400">{name}</span>
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
          <Button variant="outline" onClick={() => { setParsedUsers([]); setResults(null); setRawText(''); }} className="gap-1.5 text-xs">
            Start New Import
          </Button>
        </div>
      )}
    </div>
  );
}
