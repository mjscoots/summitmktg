import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { matchNames } from '@/lib/externalRoster';
import { Upload, Loader2, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MassImportProps {
  profiles: { user_id: string; full_name: string; email: string; phone?: string | null; region?: string | null; organization?: string | null; office_name?: string | null; direct_manager?: string | null; experience?: string | null; team_id?: string | null }[];
  managers: { user_id: string; full_name: string }[];
  teams: { id: string; name: string }[];
  onRefresh: () => void;
}

interface ParsedUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  region: string;
  recruiter_or_manager: string;
  office_name: string;
  experience: string;
  pipeline_status: string;
  active: boolean;
  alreadyExists: boolean;
  matchedUserId?: string;
  matchedName?: string;
  updateFields: string[];
  flagged?: string;
}

interface ImportResults {
  created: number;
  updated: number;
  merged: number;
  skipped: number;
  details: {
    newUsers: string[];
    updatedUsers: string[];
    skippedRows: { value: string; reason: string }[];
  };
}

/* ── CONSTANTS ── */
const PIPELINE_MAP: Record<string, string> = {
  'prospect added': 'pending',
  'prospectadded': 'pending',
  'prospect_added': 'pending',
  'pending': 'pending',
  'contract signed': 'contract_signed',
  'contractsigned': 'contract_signed',
  'contract_signed': 'contract_signed',
  'info added': 'info_added',
  'infoadded': 'info_added',
  'info_added': 'info_added',
  'onboarded': 'onboarded',
  'summer ready': 'summer_ready',
  'summerready': 'summer_ready',
  'summer_ready': 'summer_ready',
};

const PIPELINE_LABELS: Record<string, string> = {
  pending: 'Prospect Added',
  contract_signed: 'Contract Signed',
  info_added: 'Info Added',
  onboarded: 'Onboarded',
  summer_ready: 'Summer Ready',
};

// Values that should NEVER become user records
const JUNK_VALUES = new Set([
  'the academy', 'undecided', 'decided', 'active', 'inactive',
  'rookie', 'veteran', 'prospect added', 'contract signed',
  'info added', 'onboarded', 'summer ready', 'name', 'contact',
  'region', 'recruiter', 'office name', 'experience', 'status',
  'actions', 'office', 'region / recruiter', 'region/recruiter',
]);

function isJunkValue(val: string): boolean {
  const lower = val.toLowerCase().trim();
  if (JUNK_VALUES.has(lower)) return true;
  if (/^\d+$/.test(lower)) return true; // row numbers
  if (lower.length < 3) return true;
  return false;
}

function isPipelineStatus(val: string): boolean {
  const key = val.toLowerCase().replace(/[_\-]/g, ' ').trim();
  return key in PIPELINE_MAP || PIPELINE_MAP[key.replace(/\s+/g, '')] !== undefined;
}

function normalizePipeline(raw: string): string {
  const key = raw.toLowerCase().replace(/[_\-]/g, ' ').trim();
  return PIPELINE_MAP[key] || PIPELINE_MAP[key.replace(/\s+/g, '')] || 'pending';
}

function isEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function isPhone(val: string): boolean {
  const digits = val.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isLikelyName(val: string): boolean {
  const parts = val.trim().split(/\s+/);
  if (parts.length < 2) return false;
  // All parts should be mostly alpha
  return parts.every(p => /^[A-Za-z'\-\.]+$/.test(p));
}

function isExperienceLabel(val: string): boolean {
  const l = val.toLowerCase().trim();
  return l === 'rookie' || l === 'veteran';
}

function isActiveLabel(val: string): boolean {
  const l = val.toLowerCase().trim();
  return l === 'active' || l === 'inactive';
}

/** Normalize a name for matching: lowercase, remove middle names, just first+last */
function normalizeForMatch(name: string): string {
  const parts = name.toLowerCase().trim().split(/\s+/);
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

/* ── STRICT BLOCK PARSER ── */
function parseBlocks(
  text: string,
  existingProfiles: MassImportProps['profiles'],
  managerList: { full_name: string }[]
): { parsed: ParsedUser[]; skipped: { value: string; reason: string }[] } {
  const lines = text.split('\n');
  const parsed: ParsedUser[] = [];
  const skipped: { value: string; reason: string }[] = [];

  // Split into blocks by standalone number lines
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^\d+$/.test(line)) {
      if (currentBlock.length > 0) blocks.push(currentBlock);
      currentBlock = [];
      continue;
    }
    if (line) currentBlock.push(line);
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  // If no numbered blocks detected, try line-by-line grouping
  if (blocks.length === 0) {
    const allLines = lines.map(l => l.trim()).filter(Boolean);
    if (allLines.length > 0) blocks.push(allLines);
  }

  for (const block of blocks) {
    if (block.length < 2) {
      if (block[0] && !isJunkValue(block[0])) {
        skipped.push({ value: block[0], reason: 'Too few fields to parse' });
      }
      continue;
    }

    let full_name = '';
    let pipeline_status = 'pending';
    let phone = '';
    let email = '';
    let region = '';
    let recruiter_or_manager = '';
    let office_name = '';
    let experience = 'rookie';
    let active = true;

    // Parse each line by content type detection
    const unclassified: string[] = [];

    for (let i = 0; i < block.length; i++) {
      let line = block[i];
      // Strip markdown link formatting
      line = line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();

      if (!line) continue;

      // Skip junk
      if (isJunkValue(line)) {
        // But check if it's a compound line: "Undecided    Rookie    Active"
        const parts = line.split(/\s{2,}|\t+/);
        for (const part of parts) {
          const p = part.trim();
          if (isExperienceLabel(p)) experience = p.toLowerCase() === 'veteran' ? 'veteran' : 'rookie';
          else if (isActiveLabel(p)) active = p.toLowerCase() === 'active';
        }
        continue;
      }

      // Check compound line (tab or multi-space separated): "Undecided    Rookie    Active"
      if (line.includes('\t') || /\s{3,}/.test(line)) {
        const parts = line.split(/\s{2,}|\t+/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          let handled = 0;
          for (const part of parts) {
            if (isExperienceLabel(part)) { experience = part.toLowerCase() === 'veteran' ? 'veteran' : 'rookie'; handled++; }
            else if (isActiveLabel(part)) { active = part.toLowerCase() === 'active'; handled++; }
            else if (isJunkValue(part)) { if (!office_name && part.toLowerCase() !== 'undecided') office_name = part; else if (part.toLowerCase() === 'undecided') office_name = 'Undecided'; handled++; }
          }
          if (handled >= 2) continue;
        }
      }

      // Email
      if (isEmail(line) && !email) { email = line.toLowerCase(); continue; }

      // Phone
      if (isPhone(line) && !phone && !isLikelyName(line)) { phone = line; continue; }

      // Pipeline status
      if (isPipelineStatus(line)) {
        pipeline_status = normalizePipeline(line);
        continue;
      }

      // Experience label standalone
      if (isExperienceLabel(line)) { experience = line.toLowerCase() === 'veteran' ? 'veteran' : 'rookie'; continue; }

      // Active label standalone  
      if (isActiveLabel(line)) { active = line.toLowerCase() === 'active'; continue; }

      // First plausible name
      if (!full_name && isLikelyName(line) && i < 3) {
        full_name = line;
        continue;
      }

      // Remaining unclassified lines
      unclassified.push(line);
    }

    // Classify unclassified lines by position
    // Expected order after name+status+phone+email: region, manager, office
    for (let i = 0; i < unclassified.length; i++) {
      const val = unclassified[i];
      if (isJunkValue(val)) continue;

      // Check if it matches a known manager
      const managerMatch = managerList.find(m => matchNames(m.full_name, val) > 0.7);
      if (managerMatch) {
        recruiter_or_manager = managerMatch.full_name;
        continue;
      }

      // If looks like a name, could be manager/recruiter
      if (isLikelyName(val) && !recruiter_or_manager) {
        recruiter_or_manager = val;
        continue;
      }

      // Otherwise assign to region or office
      if (!region) { region = val; continue; }
      if (!office_name) { office_name = val; continue; }
    }

    // Validate: must have a real name
    if (!full_name || isJunkValue(full_name)) {
      if (full_name) skipped.push({ value: full_name, reason: 'Does not look like a valid person name' });
      continue;
    }

    // Final junk check on the name
    if (JUNK_VALUES.has(full_name.toLowerCase().trim())) {
      skipped.push({ value: full_name, reason: 'Matched a known label/junk value' });
      continue;
    }

    // Generate email if not found
    if (!email) {
      const parts = full_name.toLowerCase().split(/\s+/);
      email = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}@summitmktg.com` : `${parts[0]}@summitmktg.com`;
    }

    // Match against existing profiles
    let alreadyExists = false;
    let matchedUserId: string | undefined;
    let matchedName: string | undefined;
    const updateFields: string[] = [];
    const normalizedImport = normalizeForMatch(full_name);

    for (const p of existingProfiles) {
      const nameScore = matchNames(p.full_name, full_name);
      const normalizedExisting = normalizeForMatch(p.full_name);
      const normalizedMatch = normalizedImport === normalizedExisting;
      const emailMatch = email && p.email && p.email.toLowerCase() === email.toLowerCase();
      const phoneMatch = phone && p.phone && p.phone.replace(/\D/g, '') === phone.replace(/\D/g, '');

      if (emailMatch || phoneMatch || nameScore > 0.7 || normalizedMatch) {
        alreadyExists = true;
        matchedUserId = p.user_id;
        matchedName = p.full_name;

        // Determine what fields to update
        if (pipeline_status !== 'pending') updateFields.push('pipeline');
        if (phone && !p.phone) updateFields.push('phone');
        if (email && !p.email) updateFields.push('email');
        if (region && !p.region) updateFields.push('region');
        if (office_name && !p.office_name) updateFields.push('office_name');
        if (experience && !p.experience) updateFields.push('experience');
        // Never overwrite direct_manager if already set
        if (recruiter_or_manager && !p.direct_manager) updateFields.push('manager');
        break;
      }
    }

    parsed.push({
      id: crypto.randomUUID(),
      full_name,
      email,
      phone,
      region,
      recruiter_or_manager,
      office_name,
      experience,
      pipeline_status,
      active,
      alreadyExists,
      matchedUserId,
      matchedName,
      updateFields,
    });
  }

  return { parsed, skipped };
}

/* ── LOADING STEPS ── */
const LOADING_STEPS = [
  'Importing users...',
  'Matching existing users...',
  'Updating statuses...',
  'Finalizing import...',
];

/* ── COMPONENT ── */
export default function AdminMassImport({ profiles, managers, teams, onRefresh }: MassImportProps) {
  const [rawText, setRawText] = useState('');
  const [importing, setImporting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [defaultManager, setDefaultManager] = useState('');
  const [defaultTeam, setDefaultTeam] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleImport = useCallback(async () => {
    if (!rawText.trim()) return;

    setImporting(true);
    setLoadingStep(0);
    setResults(null);

    try {
      // Step 1: Parse
      setLoadingStep(0);
      const { parsed, skipped } = parseBlocks(rawText, profiles, managers);

      if (parsed.length === 0) {
        toast({ title: 'No valid records found', description: `${skipped.length} rows were skipped. Check your data format.`, variant: 'destructive' });
        setImporting(false);
        return;
      }

      const newUsers = parsed.filter(u => !u.alreadyExists);
      const existingUsers = parsed.filter(u => u.alreadyExists);

      // Step 2: Match
      setLoadingStep(1);
      await new Promise(r => setTimeout(r, 300));

      const createdNames: string[] = [];
      const updatedNames: string[] = [];
      const failedRows: { value: string; reason: string }[] = [...skipped];

      // Step 3: Create new users in batches of 50
      if (newUsers.length > 0) {
        const usersToCreate = newUsers.map(u => ({
          full_name: u.full_name,
          email: u.email,
          phone: u.phone,
          role: 'rookie' as const,
          direct_manager: u.recruiter_or_manager || defaultManager,
          team_name: defaultTeam,
          onboarding_status: u.pipeline_status,
        }));

        const BATCH_SIZE = 50;
        for (let i = 0; i < usersToCreate.length; i += BATCH_SIZE) {
          const batch = usersToCreate.slice(i, i + BATCH_SIZE);
          const { data, error } = await supabase.functions.invoke('bulk-create-users', {
            body: { users: batch },
          });

          if (error) throw error;
          if (data?.success) createdNames.push(...data.success.map((e: string) => newUsers.find(u => u.email === e)?.full_name || e));
          if (data?.failed) {
            for (const f of data.failed) {
              failedRows.push({ value: f.email, reason: f.error });
            }
          }
        }
      }

      // Step 4: Update existing users
      setLoadingStep(2);
      for (const user of existingUsers) {
        if (!user.matchedUserId || user.updateFields.length === 0) continue;
        try {
          const updates: Record<string, any> = {};
          if (user.updateFields.includes('pipeline') && user.pipeline_status !== 'pending') {
            updates.onboarding_status = user.pipeline_status;
          }
          if (user.updateFields.includes('phone') && user.phone) updates.phone = user.phone;
          if (user.updateFields.includes('email') && user.email) updates.email = user.email;
          if (user.updateFields.includes('region') && user.region) updates.region = user.region;
          if (user.updateFields.includes('office_name') && user.office_name) updates.office_name = user.office_name;
          if (user.updateFields.includes('experience') && user.experience) updates.experience = user.experience;
          if (user.updateFields.includes('manager') && user.recruiter_or_manager) updates.direct_manager = user.recruiter_or_manager;

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase.from('profiles').update(updates as any).eq('user_id', user.matchedUserId);
            if (!error) updatedNames.push(user.matchedName || user.full_name);
          }
        } catch (err: any) {
          failedRows.push({ value: user.full_name, reason: err.message });
        }
      }

      // Step 5: Finalize
      setLoadingStep(3);
      await new Promise(r => setTimeout(r, 200));

      setResults({
        created: createdNames.length,
        updated: updatedNames.length,
        merged: existingUsers.filter(u => u.updateFields.length > 0).length,
        skipped: failedRows.length,
        details: {
          newUsers: createdNames,
          updatedUsers: updatedNames,
          skippedRows: failedRows,
        },
      });

      // Clear input
      setRawText('');
      onRefresh();

      toast({
        title: 'Import Complete',
        description: `${createdNames.length} created, ${updatedNames.length} updated, ${failedRows.length} skipped`,
      });
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }, [rawText, profiles, managers, defaultManager, defaultTeam, onRefresh]);

  const lineCount = rawText.split('\n').filter(l => l.trim()).length;

  return (
    <div className="space-y-5">
      {/* Results Summary (shown after import) */}
      {results && (
        <div className="space-y-4">
          <div className="p-5 bg-card border border-border/40 rounded-xl">
            <h3 className="text-base font-bold text-foreground mb-4">Import Complete</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <p className="text-2xl font-black text-green-400">{results.created}</p>
                <p className="text-[10px] text-green-400/70 uppercase tracking-wider">New Users</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                <p className="text-2xl font-black text-blue-400">{results.updated}</p>
                <p className="text-[10px] text-blue-400/70 uppercase tracking-wider">Updated</p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                <p className="text-2xl font-black text-amber-400">{results.merged}</p>
                <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">Merged</p>
              </div>
              <div className="p-3 bg-muted/30 border border-border/30 rounded-lg text-center">
                <p className="text-2xl font-black text-muted-foreground">{results.skipped}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Skipped</p>
              </div>
            </div>

            {/* Expandable Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showDetails ? 'Hide Details' : 'View Details'}
            </button>

            {showDetails && (
              <div className="mt-3 space-y-3">
                {results.details.newUsers.length > 0 && (
                  <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1.5">
                      <CheckCircle className="w-3 h-3 inline mr-1" />{results.details.newUsers.length} New Users Created
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {results.details.newUsers.map((n, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-green-500/10 rounded text-green-400">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
                {results.details.updatedUsers.length > 0 && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">
                      <RefreshCw className="w-3 h-3 inline mr-1" />{results.details.updatedUsers.length} Users Updated
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {results.details.updatedUsers.map((n, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-500/10 rounded text-blue-400">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
                {results.details.skippedRows.length > 0 && (
                  <div className="p-3 bg-muted/20 border border-border/20 rounded-lg">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      <XCircle className="w-3 h-3 inline mr-1" />{results.details.skippedRows.length} Skipped
                    </p>
                    <div className="space-y-0.5">
                      {results.details.skippedRows.map((s, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground">
                          <span className="text-foreground/60">{s.value}</span> — {s.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Input */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Paste User Data</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Paste from GetHawx, spreadsheets, or any tabular format. The parser will detect names,
            phone numbers, emails, pipeline stages, regions, and managers automatically.
          </p>
        </div>
        <Textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`Paste here...\n\nExample format:\n1\nMason James Thomas\nContract Signed\n\n5098447604\nthanoceros44@gmail.com\nThe Academy\nBodhi Jordan Miller\nUndecided    Rookie    Active`}
          className="min-h-[180px] bg-muted/30 border-border/50 font-mono text-xs"
        />

        {/* Default Settings */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Default Manager</label>
            <Select value={defaultManager} onValueChange={setDefaultManager}>
              <SelectTrigger className="h-8 bg-card/50 border-border/50 text-xs">
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
              <SelectTrigger className="h-8 bg-card/50 border-border/50 text-xs">
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map(t => <SelectItem key={t.id} value={t.name} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleImport}
            disabled={!rawText.trim() || importing}
            className="gap-1.5 bg-primary text-primary-foreground"
            size="lg"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import
          </Button>
          <span className="text-xs text-muted-foreground">
            {lineCount} lines detected
          </span>
        </div>

        {/* Loading State */}
        {importing && (
          <div className="p-4 bg-card border border-border/40 rounded-xl">
            <div className="space-y-2">
              {LOADING_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  {i < loadingStep ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : i === loadingStep ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border/40 flex-shrink-0" />
                  )}
                  <span className={cn(
                    'text-xs',
                    i < loadingStep ? 'text-green-400' : i === loadingStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
