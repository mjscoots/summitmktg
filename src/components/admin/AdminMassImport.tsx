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
  profiles: { user_id: string; full_name: string; email: string; phone?: string | null; region?: string | null; organization?: string | null; office_name?: string | null; direct_manager?: string | null; experience?: string | null; team_id?: string | null; onboarding_status?: string | null; status?: string | null; recruiter?: string | null }[];
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
  pipelineProvided: boolean;
  rep_status: 'active' | 'nlc';
  repStatusProvided: boolean;
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
  validation?: {
    imported: Record<string, number>;
    canonical: Record<string, number>;
    mismatches: string[];
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

const PIPELINE_RANK: Record<string, number> = {
  pending: 0,
  contract_signed: 1,
  info_added: 2,
  onboarded: 3,
  summer_ready: 4,
};

const IMPORT_DISTRIBUTION_KEYS = [
  'pending',
  'contract_signed',
  'info_added',
  'onboarded',
  'summer_ready',
  'active',
  'nlc',
] as const;

// Values that should NEVER become user records
const JUNK_VALUES = new Set([
  'the academy', 'undecided', 'decided', 'active', 'inactive', 'nlc',
  'rookie', 'veteran', 'prospect added', 'contract signed',
  'info added', 'onboarded', 'summer ready', 'name', 'contact',
  'region', 'recruiter', 'office name', 'experience', 'status',
  'actions', 'office', 'region / recruiter', 'region/recruiter',
  'n/a', 'none', 'tbd', 'unknown',
]);

function isJunkValue(val: string): boolean {
  const lower = val.toLowerCase().trim();
  if (JUNK_VALUES.has(lower)) return true;
  if (/^\d+$/.test(lower)) return true;
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

function strongestPipeline(a: string, b: string): string {
  return (PIPELINE_RANK[b] ?? 0) > (PIPELINE_RANK[a] ?? 0) ? b : a;
}

function normalizeRepStatus(raw: string): 'active' | 'nlc' | null {
  const key = raw.toLowerCase().trim().replace(/[_\-]/g, ' ');
  if (['active'].includes(key)) return 'active';
  if (['inactive', 'nlc', 'no longer coming', 'no longer coming nlc', 'disabled', 'deactivated',
       'no longer coming (nlc)', 'dropped', 'quit', 'terminated', 'released', 'cut'].includes(key)) return 'nlc';
  // Also catch "NLC" appearing anywhere in the string
  if (key.includes('nlc') || key.includes('no longer coming')) return 'nlc';
  return null;
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
  return parts.every(p => /^[A-Za-z'\-\.]+$/.test(p));
}

function isExperienceLabel(val: string): boolean {
  const l = val.toLowerCase().trim();
  return l === 'rookie' || l === 'veteran';
}

/** Normalize a name for matching: lowercase, remove middle names, just first+last */
function normalizeForMatch(name: string): string {
  const parts = name.toLowerCase().trim().split(/\s+/);
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

/** Check if a name is a known manager name — these should NOT become new reps */
function isKnownManagerName(name: string, managerList: { full_name: string }[], existingProfiles: MassImportProps['profiles']): boolean {
  const norm = normalizeForMatch(name);
  // Check against manager list
  for (const m of managerList) {
    if (normalizeForMatch(m.full_name) === norm) return true;
    if (matchNames(m.full_name, name) > 0.85) return true;
  }
  return false;
}

/** Deduplicate parsed results — merge entries that point to the same person */
function deduplicateParsed(users: ParsedUser[]): ParsedUser[] {
  const seen = new Map<string, ParsedUser>();
  const result: ParsedUser[] = [];

  for (const u of users) {
    const emailKey = u.email?.toLowerCase();
    const phoneKey = u.phone?.replace(/\D/g, '');
    const nameKey = normalizeForMatch(u.full_name);

    const existingByEmail = emailKey ? seen.get(`email:${emailKey}`) : undefined;
    const existingByPhone = phoneKey && phoneKey.length >= 7 ? seen.get(`phone:${phoneKey}`) : undefined;
    const existingByName = seen.get(`name:${nameKey}`);

    const existing = existingByEmail || existingByPhone || existingByName;

    if (existing) {
      if (u.pipelineProvided) {
        existing.pipelineProvided = true;
        existing.pipeline_status = strongestPipeline(existing.pipeline_status, u.pipeline_status);
      }
      if (u.repStatusProvided) {
        existing.repStatusProvided = true;
        existing.rep_status = existing.rep_status === 'nlc' || u.rep_status === 'nlc' ? 'nlc' : 'active';
      }
      if (u.phone && !existing.phone) existing.phone = u.phone;
      if (u.email && !existing.email) existing.email = u.email;
      if (u.region && !existing.region) existing.region = u.region;
      if (u.office_name && !existing.office_name) existing.office_name = u.office_name;
      if (u.recruiter_or_manager && !existing.recruiter_or_manager) existing.recruiter_or_manager = u.recruiter_or_manager;
      continue;
    }

    if (emailKey) seen.set(`email:${emailKey}`, u);
    if (phoneKey && phoneKey.length >= 7) seen.set(`phone:${phoneKey}`, u);
    seen.set(`name:${nameKey}`, u);
    result.push(u);
  }

  return result;
}

/* ── STRICT BLOCK PARSER ── */
function parseBlocks(
  text: string,
  existingProfiles: MassImportProps['profiles'],
  managerList: { full_name: string }[]
): { parsed: ParsedUser[]; skipped: { value: string; reason: string }[] } {
  const lines = text.split('\n');
  const rawParsed: ParsedUser[] = [];
  const skipped: { value: string; reason: string }[] = [];

  // Build a set of known manager names for quick lookup
  const managerNamesNorm = new Set(managerList.map(m => normalizeForMatch(m.full_name)));

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
    let pipelineProvided = false;
    let phone = '';
    let email = '';
    let region = '';
    let recruiter_or_manager = '';
    let office_name = '';
    let experience = 'rookie';
    let rep_status: 'active' | 'nlc' = 'active';
    let repStatusProvided = false;

    const unclassified: string[] = [];

    for (let i = 0; i < block.length; i++) {
      let line = block[i];
      line = line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
      if (!line) continue;

      const pipelineMatch = isPipelineStatus(line) ? normalizePipeline(line) : null;
      if (pipelineMatch) {
        pipeline_status = pipelineMatch;
        pipelineProvided = true;
        continue;
      }

      const repStatusMatch = normalizeRepStatus(line);
      if (repStatusMatch) {
        rep_status = repStatusMatch;
        repStatusProvided = true;
        continue;
      }

      // Check compound line
      if (line.includes('\t') || /\s{3,}/.test(line)) {
        const parts = line.split(/\s{2,}|\t+/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          let handled = 0;
          for (const part of parts) {
            const partPipeline = isPipelineStatus(part) ? normalizePipeline(part) : null;
            if (partPipeline) {
              pipeline_status = partPipeline;
              pipelineProvided = true;
              handled++;
              continue;
            }

            const partRepStatus = normalizeRepStatus(part);
            if (partRepStatus) {
              rep_status = partRepStatus;
              repStatusProvided = true;
              handled++;
              continue;
            }

            if (isExperienceLabel(part)) {
              experience = part.toLowerCase() === 'veteran' ? 'veteran' : 'rookie';
              handled++;
              continue;
            }

            if (isJunkValue(part)) {
              if (part.toLowerCase() === 'undecided') office_name = 'Undecided';
              handled++;
            }
          }
          if (handled >= 2) continue;
        }
      }

      // Skip junk
      if (isJunkValue(line)) {
        const parts = line.split(/\s{2,}|\t+/);
        for (const part of parts) {
          const p = part.trim();
          if (isExperienceLabel(p)) {
            experience = p.toLowerCase() === 'veteran' ? 'veteran' : 'rookie';
            continue;
          }
          const pRepStatus = normalizeRepStatus(p);
          if (pRepStatus) {
            rep_status = pRepStatus;
            repStatusProvided = true;
          }
        }
        continue;
      }

      if (isEmail(line) && !email) { email = line.toLowerCase(); continue; }
      if (isPhone(line) && !phone && !isLikelyName(line)) { phone = line; continue; }
      if (isExperienceLabel(line)) { experience = line.toLowerCase() === 'veteran' ? 'veteran' : 'rookie'; continue; }

      // First plausible name
      if (!full_name && isLikelyName(line) && i < 3) {
        full_name = line;
        continue;
      }

      unclassified.push(line);
    }

    // Classify unclassified lines
    for (let i = 0; i < unclassified.length; i++) {
      const val = unclassified[i];

      const valPipeline = isPipelineStatus(val) ? normalizePipeline(val) : null;
      if (valPipeline) {
        pipeline_status = valPipeline;
        pipelineProvided = true;
        continue;
      }

      const valRepStatus = normalizeRepStatus(val);
      if (valRepStatus) {
        rep_status = valRepStatus;
        repStatusProvided = true;
        continue;
      }

      if (isJunkValue(val)) continue;

      // Check if it matches a known manager
      const managerMatch = managerList.find(m => matchNames(m.full_name, val) > 0.7);
      if (managerMatch) {
        recruiter_or_manager = managerMatch.full_name;
        continue;
      }

      if (isLikelyName(val) && !recruiter_or_manager) {
        recruiter_or_manager = val;
        continue;
      }

      if (!region) { region = val; continue; }
      if (!office_name) { office_name = val; continue; }
    }

    // Validate: must have a real name
    if (!full_name || isJunkValue(full_name)) {
      if (full_name) skipped.push({ value: full_name, reason: 'Not a valid person name' });
      continue;
    }

    // *** CRITICAL: If this name is a known manager being imported as a "row",
    // treat it as a manager reference and skip creating a new rep record ***
    const nameNorm = normalizeForMatch(full_name);
    if (managerNamesNorm.has(nameNorm)) {
      // Check if this person already exists in profiles — only skip if they already have an account
      const existingManager = existingProfiles.find(p => normalizeForMatch(p.full_name) === nameNorm);
      if (existingManager) {
        // Manager already exists, skip creating duplicate
        skipped.push({ value: full_name, reason: 'Already exists as a manager — skipped' });
        continue;
      }
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
      const normalizedExisting = normalizeForMatch(p.full_name);
      const normalizedMatch = normalizedImport === normalizedExisting;
      const emailMatch = email && p.email && p.email.toLowerCase() === email.toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');
      const profilePhoneDigits = (p.phone || '').replace(/\D/g, '');
      const phoneMatch = phoneDigits.length >= 7 && profilePhoneDigits.length >= 7 && phoneDigits === profilePhoneDigits;
      const nameScore = matchNames(p.full_name, full_name);

      if (emailMatch || phoneMatch || nameScore > 0.8 || normalizedMatch) {
        alreadyExists = true;
        matchedUserId = p.user_id;
        matchedName = p.full_name;

        if (pipelineProvided && (p.onboarding_status || 'pending') !== pipeline_status) updateFields.push('pipeline');
        if (repStatusProvided && (p.status || 'active') !== rep_status) updateFields.push('rep_status');
        if (phone && !p.phone) updateFields.push('phone');
        if (email && !p.email) updateFields.push('email');
        if (region && !p.region) updateFields.push('region');
        if (office_name && !p.office_name) updateFields.push('office_name');
        if (experience && !p.experience) updateFields.push('experience');
        if (recruiter_or_manager && !p.direct_manager) updateFields.push('manager');
        break;
      }
    }

    rawParsed.push({
      id: crypto.randomUUID(),
      full_name,
      email,
      phone,
      region,
      recruiter_or_manager,
      office_name,
      experience,
      pipeline_status,
      pipelineProvided,
      rep_status,
      repStatusProvided,
      alreadyExists,
      matchedUserId,
      matchedName,
      updateFields,
    });
  }

  // Deduplicate within this import batch
  const parsed = deduplicateParsed(rawParsed);

  return { parsed, skipped };
}

/* ── LOADING STEPS ── */
const LOADING_STEPS = [
  'Importing...',
  'Matching existing people...',
  'Merging duplicates...',
  'Updating statuses...',
  'Finalizing...',
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
      const { parsed, skipped } = parseBlocks(rawText, profiles, managers);

      if (parsed.length === 0) {
        toast({ title: 'No valid records found', description: `${skipped.length} rows were skipped. Check your data format.`, variant: 'destructive' });
        setImporting(false);
        return;
      }

      const newUsers = parsed.filter(u => !u.alreadyExists);
      const existingUsers = parsed.filter(u => u.alreadyExists);

      const importedDistribution = Object.fromEntries(
        IMPORT_DISTRIBUTION_KEYS.map((k) => [k, 0])
      ) as Record<(typeof IMPORT_DISTRIBUTION_KEYS)[number], number>;

      for (const row of parsed) {
        if (row.pipelineProvided) {
          const key = row.pipeline_status as keyof typeof importedDistribution;
          if (key in importedDistribution) importedDistribution[key]++;
        }
        if (row.repStatusProvided) {
          importedDistribution[row.rep_status]++;
        }
      }

      // Step 2: Match
      setLoadingStep(1);
      await new Promise(r => setTimeout(r, 300));

      const createdNames: string[] = [];
      const updatedNames: string[] = [];
      const mergedCount = existingUsers.filter(u => u.updateFields.length > 0).length;
      const failedRows: { value: string; reason: string }[] = [...skipped];

      // Step 3: Create new users in batches via edge function
      setLoadingStep(2);
      if (newUsers.length > 0) {
        const usersToCreate = newUsers.map(u => ({
          full_name: u.full_name,
          email: u.email,
          phone: u.phone,
          role: 'rookie' as const,
          direct_manager: u.recruiter_or_manager || defaultManager,
          team_name: defaultTeam,
          onboarding_status: u.pipeline_status,
          rep_status: u.rep_status,
          region: u.region,
          office_name: u.office_name,
          experience: u.experience,
        }));

        const BATCH_SIZE = 50;
        for (let i = 0; i < usersToCreate.length; i += BATCH_SIZE) {
          const batch = usersToCreate.slice(i, i + BATCH_SIZE);
          try {
            const { data, error } = await supabase.functions.invoke('bulk-create-users', {
              body: { users: batch, is_import: true },
            });

            if (error) {
              console.error('Batch create error:', error);
              failedRows.push({ value: `Batch ${Math.floor(i / BATCH_SIZE) + 1}`, reason: error.message || 'Batch failed' });
              continue;
            }
            if (data?.success) createdNames.push(...data.success.map((e: string) => newUsers.find(u => u.email === e)?.full_name || e));
            if (data?.updated) updatedNames.push(...data.updated);
            if (data?.failed) {
              for (const f of data.failed) {
                failedRows.push({ value: f.email, reason: f.error });
              }
            }
          } catch (batchErr: any) {
            console.error('Batch invoke error:', batchErr);
            failedRows.push({ value: `Batch ${Math.floor(i / BATCH_SIZE) + 1}`, reason: batchErr.message || 'Unknown batch error' });
          }
        }
      }

      // Step 4: Update existing users via edge function (uses service role, bypasses RLS)
      setLoadingStep(3);
      const usersToUpdate = existingUsers.filter(u => u.matchedUserId && u.updateFields.length > 0);
      if (usersToUpdate.length > 0) {
        const updatePayload = usersToUpdate.map(u => ({
          full_name: u.full_name,
          email: u.email,
          matched_user_id: u.matchedUserId,
          update_only: true,
          onboarding_status: u.updateFields.includes('pipeline') ? u.pipeline_status : undefined,
          rep_status: u.updateFields.includes('rep_status') ? u.rep_status : undefined,
          phone: u.updateFields.includes('phone') ? u.phone : undefined,
          region: u.updateFields.includes('region') ? u.region : undefined,
          office_name: u.updateFields.includes('office_name') ? u.office_name : undefined,
          experience: u.updateFields.includes('experience') ? u.experience : undefined,
          direct_manager: u.updateFields.includes('manager') ? u.recruiter_or_manager : undefined,
        }));

        const BATCH_SIZE = 50;
        for (let i = 0; i < updatePayload.length; i += BATCH_SIZE) {
          const batch = updatePayload.slice(i, i + BATCH_SIZE);
          try {
            const { data, error } = await supabase.functions.invoke('bulk-create-users', {
              body: { users: batch, is_import: true },
            });

            if (error) {
              console.error('Batch update error:', error);
              failedRows.push({ value: `Update batch ${Math.floor(i / BATCH_SIZE) + 1}`, reason: error.message || 'Update batch failed' });
              continue;
            }
            if (data?.updated) updatedNames.push(...data.updated);
            if (data?.failed) {
              for (const f of data.failed) {
                failedRows.push({ value: f.email, reason: f.error });
              }
            }
          } catch (batchErr: any) {
            console.error('Update batch invoke error:', batchErr);
            failedRows.push({ value: `Update batch ${Math.floor(i / BATCH_SIZE) + 1}`, reason: batchErr.message || 'Unknown error' });
          }
        }
      }

      // Step 5: Finalize + validation
      setLoadingStep(4);
      await new Promise(r => setTimeout(r, 200));

      let validation: ImportResults['validation'];
      try {
        const canonicalDistribution = Object.fromEntries(
          IMPORT_DISTRIBUTION_KEYS.map((k) => [k, 0])
        ) as Record<(typeof IMPORT_DISTRIBUTION_KEYS)[number], number>;

        const parsedByEmail = new Map(parsed.map((u) => [u.email.toLowerCase(), u]));
        const importEmails = [...parsedByEmail.keys()];

        if (importEmails.length > 0) {
          const { data: canonicalRows } = await supabase
            .from('profiles')
            .select('email, onboarding_status, status')
            .in('email', importEmails);

          for (const row of canonicalRows || []) {
            const source = parsedByEmail.get((row.email || '').toLowerCase());
            if (!source) continue;
            if (source.pipelineProvided) {
              const key = (row.onboarding_status || 'pending') as keyof typeof canonicalDistribution;
              if (key in canonicalDistribution) canonicalDistribution[key]++;
            }
            if (source.repStatusProvided) {
              canonicalDistribution[row.status === 'nlc' ? 'nlc' : 'active']++;
            }
          }

          const mismatches = IMPORT_DISTRIBUTION_KEYS
            .filter((key) => importedDistribution[key] !== canonicalDistribution[key])
            .map((key) => `${key}: imported ${importedDistribution[key]}, canonical ${canonicalDistribution[key]}`);

          validation = {
            imported: importedDistribution,
            canonical: canonicalDistribution,
            mismatches,
          };
        }
      } catch {
        validation = undefined;
      }

      setResults({
        created: createdNames.length,
        updated: updatedNames.length,
        merged: mergedCount,
        skipped: failedRows.length,
        details: {
          newUsers: createdNames,
          updatedUsers: updatedNames,
          skippedRows: failedRows,
        },
        validation,
      });

      setRawText('');
      onRefresh();

      toast({
        title: 'Import Complete',
        description: `${createdNames.length} created, ${updatedNames.length} updated, ${mergedCount} merged, ${failedRows.length} skipped`,
      });
    } catch (err: any) {
      console.error('Import failed:', err);
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }, [rawText, profiles, managers, defaultManager, defaultTeam, onRefresh]);

  const lineCount = rawText.split('\n').filter(l => l.trim()).length;

  return (
    <div className="space-y-5">
      {/* Results Summary */}
      {results && (
        <div className="p-5 bg-card border border-border/40 rounded-xl space-y-4">
          <h3 className="text-base font-bold text-foreground">Import Complete</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
              <p className="text-2xl font-black text-green-400">{results.created}</p>
              <p className="text-[10px] text-green-400/70 uppercase tracking-wider">New</p>
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

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>

          {showDetails && (
            <div className="space-y-3">
              {results.details.newUsers.length > 0 && (
                <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                  <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1.5">
                    <CheckCircle className="w-3 h-3 inline mr-1" />{results.details.newUsers.length} New
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
                    <RefreshCw className="w-3 h-3 inline mr-1" />{results.details.updatedUsers.length} Updated
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
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
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
      )}

      {/* Import Input */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Paste User Data</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Paste from GetHawx, spreadsheets, or any tabular format. Manager names are treated as references, not new reps.
          </p>
        </div>
        <Textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`Paste here...\n\nExample:\n1\nMason James Thomas\nContract Signed\n5098447604\nthanoceros44@gmail.com\nThe Academy\nBodhi Jordan Miller\nUndecided    Rookie    Active`}
          className="min-h-[180px] bg-muted/30 border-border/50 font-mono text-xs"
        />

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
