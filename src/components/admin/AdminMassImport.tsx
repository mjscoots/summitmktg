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
  profiles: { user_id: string; full_name: string; email: string; phone?: string | null; region?: string | null; organization?: string | null; office_name?: string | null; direct_manager?: string | null; experience?: string | null; team_id?: string | null; onboarding_status?: string | null; status?: string | null; recruiter?: string | null; nickname?: string | null; role?: string | null }[];
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

interface ReviewQueueItem {
  full_name: string;
  email?: string;
  phone?: string;
  proposed_pipeline_status?: string;
  proposed_rep_status?: 'active' | 'nlc';
  reason: string;
}

interface BulkImportBatchResponse {
  success?: string[];
  updated?: string[];
  no_changes?: string[];
  failed?: { email: string; error: string }[];
  flagged?: ReviewQueueItem[];
  invalid?: { full_name?: string; email?: string; reason: string }[];
  outcome_counts?: {
    created: number;
    updated: number;
    no_change: number;
    review: number;
    invalid: number;
  };
  status_sync?: {
    summer_ready_imported: number;
    summer_ready_applied: number;
    nlc_imported: number;
    nlc_applied: number;
  };
  canonical_gap_warnings?: string[];
}

interface ImportResults {
  created: number;
  updated: number;
  noChange: number;
  review: number;
  invalid: number;
  details: {
    newUsers: string[];
    updatedUsers: string[];
    noChangeUsers: string[];
    reviewRows: ReviewQueueItem[];
    invalidRows: { value: string; reason: string }[];
    failedRows: { value: string; reason: string }[];
  };
  validation?: {
    summerReadyImported: number;
    summerReadyApplied: number;
    nlcImported: number;
    nlcApplied: number;
    warnings: string[];
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
  'the academy', 'freedom', 'undecided', 'decided', 'active', 'inactive', 'nlc',
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

function detectPipelineStatus(raw: string): string | null {
  const value = raw.toLowerCase().replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!value) return null;
  if (/\bsummer\s*ready\b/.test(value)) return 'summer_ready';
  if (/\bonboard(ed|ing)?\b/.test(value)) return 'onboarded';
  if (/\binfo\s*added\b/.test(value)) return 'info_added';
  if (/\bcontract\s*signed\b/.test(value)) return 'contract_signed';
  if (/\bprospect\s*added\b/.test(value) || /\bpending\b/.test(value) || /\bprospect\b/.test(value)) return 'pending';
  return null;
}

function isPipelineStatus(val: string): boolean {
  return detectPipelineStatus(val) !== null;
}

function normalizePipeline(raw: string): string {
  return detectPipelineStatus(raw) || 'pending';
}

function strongestPipeline(a: string, b: string): string {
  return (PIPELINE_RANK[b] ?? 0) > (PIPELINE_RANK[a] ?? 0) ? b : a;
}

function normalizeRepStatus(raw: string): 'active' | 'nlc' | null {
  const key = raw
    .toLowerCase()
    .trim()
    .replace(/[_()]/g, ' ')
    .replace(/\s+/g, ' ');

  if (!key) return null;
  if (/^active(s)?$/.test(key)) return 'active';
  if (/^(inactive|disabled|deactivated|dropped|quit|terminated|released|cut)$/.test(key)) return 'nlc';
  if (/\bno\s+longer\s+coming\b/.test(key)) return 'nlc';
  if (/\bn\s*[- ]?\s*nlc(s)?\b/.test(key)) return 'nlc';
  if (/\bnlc(s)?\b/.test(key)) return 'nlc';

  return null;
}

function extractInlineNameAndRepStatus(line: string): { name: string; repStatus: 'active' | 'nlc' } | null {
  const normalizedLine = line.replace(/\s+/g, ' ').trim();

  const nameThenStatus = normalizedLine.match(
    /^(.+?)\s+(active|inactive|n\s*[- ]?\s*nlc(?:s)?|nlc(?:s)?|no\s+longer\s+coming(?:\s*\(nlc\))?)$/i
  );
  if (nameThenStatus) {
    const name = nameThenStatus[1].trim();
    const repStatus = normalizeRepStatus(nameThenStatus[2]);
    if (repStatus && isLikelyName(name)) return { name, repStatus };
  }

  const statusThenName = normalizedLine.match(
    /^(active|inactive|n\s*[- ]?\s*nlc(?:s)?|nlc(?:s)?|no\s+longer\s+coming(?:\s*\(nlc\))?)\s+(.+)$/i
  );
  if (statusThenName) {
    const name = statusThenName[2].trim();
    const repStatus = normalizeRepStatus(statusThenName[1]);
    if (repStatus && isLikelyName(name)) return { name, repStatus };
  }

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
    // Only treat short digit strings (1-4 digits) as row number separators
    // Phone numbers (7+ digits) must NOT be treated as separators
    if (/^\d{1,4}$/.test(line)) {
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

      // Handle single-line rows like "John Smith N-NLCs"
      if (!full_name) {
        const inlineNameStatus = extractInlineNameAndRepStatus(line);
        if (inlineNameStatus) {
          full_name = inlineNameStatus.name;
          rep_status = inlineNameStatus.repStatus;
          repStatusProvided = true;
          continue;
        }
      }

      const pipelineMatch = isPipelineStatus(line) ? normalizePipeline(line) : null;
      if (pipelineMatch) {
        pipeline_status = pipelineMatch;
        pipelineProvided = true;
        continue;
      }

      // Check compound line BEFORE whole-line repStatus check
      // so "Undecided    Rookie    NLC" gets split into its parts
      if (line.includes('\t') || /\s{3,}/.test(line)) {
        const parts = line.split(/\s{2,}|\t+/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          let handled = 0;
          const leftoverParts: string[] = [];
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
              if (part.toLowerCase() === 'decided') office_name = 'Decided';
              if (part.toLowerCase() === 'freedom') office_name = 'Freedom';
              handled++;
              continue;
            }

            // Capture region values like Boston, Phoenix, Providence
            leftoverParts.push(part);
          }
          // If we handled at least 2 known parts, treat leftovers as region/office/manager
          if (handled >= 2) {
            for (const leftover of leftoverParts) {
              // If the leftover looks like a person name, it's likely a manager
              if (isLikelyName(leftover) && !recruiter_or_manager) {
                // Check if it matches a known manager
                const mgrMatch = managerList.find(m => matchNames(m.full_name, leftover) > 0.7);
                recruiter_or_manager = mgrMatch ? mgrMatch.full_name : leftover;
              } else if (!region && !isLikelyName(leftover)) {
                region = leftover;
              } else if (!office_name) {
                office_name = leftover;
              }
            }
            continue;
          }
        }
      }

      const repStatusMatch = normalizeRepStatus(line);
      if (repStatusMatch && (!isLikelyName(line) || !!full_name)) {
        rep_status = repStatusMatch;
        repStatusProvided = true;
        continue;
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

      if (!full_name) {
        const inlineNameStatus = extractInlineNameAndRepStatus(val);
        if (inlineNameStatus) {
          full_name = inlineNameStatus.name;
          rep_status = inlineNameStatus.repStatus;
          repStatusProvided = true;
          continue;
        }
      }

      const valPipeline = isPipelineStatus(val) ? normalizePipeline(val) : null;
      if (valPipeline) {
        pipeline_status = valPipeline;
        pipelineProvided = true;
        continue;
      }

      const valRepStatus = normalizeRepStatus(val);
      if (valRepStatus && (!isLikelyName(val) || !!full_name)) {
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

    // Final fallback: if status wasn't captured by line, detect from whole block text
    if (!repStatusProvided) {
      const blockLevelStatus = normalizeRepStatus(block.join(' '));
      if (blockLevelStatus) {
        rep_status = blockLevelStatus;
        repStatusProvided = true;
      }
    }

    // Validate: must have a real name
    if (!full_name || isJunkValue(full_name)) {
      if (full_name) {
        console.log(`[IMPORT SKIP] "${full_name}" — not a valid person name`);
        skipped.push({ value: full_name, reason: 'Not a valid person name' });
      }
      continue;
    }

    // Manager-role people are NO LONGER skipped — they get sent to the edge function
    // so their onboarding_status, manager, and other fields can be updated.

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

        const matchReason = emailMatch ? 'email' : phoneMatch ? 'phone' : normalizedMatch ? 'normalized_name' : `fuzzy(${nameScore.toFixed(2)})`;
        console.log(`[IMPORT MATCH] "${full_name}" → "${p.full_name}" via ${matchReason} | userId=${p.user_id}`);

        // ALWAYS send pipeline if provided — let edge function decide strongest
        if (pipelineProvided) updateFields.push('pipeline');
        // ALWAYS send rep_status if provided — NLC must always sync
        if (repStatusProvided) updateFields.push('rep_status');
        if (phone && !p.phone) updateFields.push('phone');
        if (email && !p.email) updateFields.push('email');
        if (region && !p.region) updateFields.push('region');
        if (office_name && !p.office_name) updateFields.push('office_name');
        if (experience && !p.experience) updateFields.push('experience');
        if (recruiter_or_manager && !p.direct_manager) updateFields.push('manager');
        console.log(`[IMPORT MATCH] "${full_name}" updateFields=[${updateFields.join(', ')}] pipeline=${pipeline_status} rep_status=${rep_status} manager=${recruiter_or_manager}`);
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

  console.group(`[IMPORT PARSE SUMMARY] ${parsed.length} parsed, ${skipped.length} skipped`);
  console.log('Skipped:', skipped);
  const matched = parsed.filter(p => p.alreadyExists);
  const newPeople = parsed.filter(p => !p.alreadyExists);
  console.log(`Matched existing: ${matched.length}`, matched.map(p => `${p.full_name} → ${p.matchedName} [pipeline=${p.pipeline_status}, rep_status=${p.rep_status}, manager=${p.recruiter_or_manager}]`));
  console.log(`New people: ${newPeople.length}`, newPeople.map(p => `${p.full_name} [pipeline=${p.pipeline_status}, rep_status=${p.rep_status}, manager=${p.recruiter_or_manager}]`));
  console.groupEnd();

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
      const { parsed, skipped } = parseBlocks(rawText, profiles, managers);

      if (parsed.length === 0) {
        toast({ title: 'No valid records found', description: `${skipped.length} rows were skipped. Check your data format.`, variant: 'destructive' });
        setImporting(false);
        return;
      }

      setLoadingStep(1);
      await new Promise(r => setTimeout(r, 250));

      const allRows = parsed.map(u => {
        const row = {
          full_name: u.full_name,
          email: u.email,
          phone: u.phone,
          role: (u.alreadyExists && u.matchedUserId
            ? (profiles.find(p => p.user_id === u.matchedUserId) as any)?.role ?? 'rookie'
            : 'rookie') as any,
          direct_manager: u.recruiter_or_manager || defaultManager,
          team_name: defaultTeam,
          onboarding_status: u.pipelineProvided ? u.pipeline_status : undefined,
          rep_status: u.repStatusProvided ? u.rep_status : undefined,
          region: u.region,
          office_name: u.office_name,
          experience: u.experience,
          organization: '',
        };
        console.log(`[IMPORT ROW→API] ${row.full_name} | role=${row.role} | onboarding=${row.onboarding_status} | rep_status=${row.rep_status} | manager=${row.direct_manager}`);
        return row;
      });

      const createdNames: string[] = [];
      const updatedNames: string[] = [];
      const noChangeNames: string[] = [];
      const reviewRows: ReviewQueueItem[] = [];
      const invalidRows: { value: string; reason: string }[] = skipped.map((s) => ({ value: s.value, reason: s.reason }));
      const failedRows: { value: string; reason: string }[] = [];

      const outcomeCounts = {
        created: 0,
        updated: 0,
        no_change: 0,
        review: 0,
        invalid: skipped.length,
      };

      const statusSyncTotals = {
        summer_ready_imported: 0,
        summer_ready_applied: 0,
        nlc_imported: 0,
        nlc_applied: 0,
      };

      const allWarnings: string[] = [];

      const emailToName = new Map(
        parsed
          .filter(u => u.email)
          .map((u) => [u.email.toLowerCase(), u.full_name])
      );

      const BATCH_SIZE = 50;
      setLoadingStep(2);

      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);

        try {
          const { data, error } = await supabase.functions.invoke('bulk-create-users', {
            body: { users: batch, is_import: true },
          });

          if (error) {
            failedRows.push({ value: `Batch ${Math.floor(i / BATCH_SIZE) + 1}`, reason: error.message || 'Batch failed' });
            outcomeCounts.invalid += batch.length;
            continue;
          }

          const payload = (data || {}) as BulkImportBatchResponse;

          console.group(`[IMPORT BATCH ${Math.floor(i / BATCH_SIZE) + 1} RESULTS]`);
          console.log('Created:', payload.success);
          console.log('Updated:', payload.updated);
          console.log('No changes:', payload.no_changes);
          console.log('Review:', payload.flagged);
          console.log('Invalid:', payload.invalid);
          console.log('Failed:', payload.failed);
          console.log('Status sync:', payload.status_sync);
          console.log('Warnings:', payload.canonical_gap_warnings);
          console.groupEnd();

          const createdEmails = payload.success || [];
          const batchCreatedNames = createdEmails.map((email) => emailToName.get((email || '').toLowerCase()) || email);
          createdNames.push(...batchCreatedNames);

          const batchUpdated = payload.updated || [];
          updatedNames.push(...batchUpdated);

          const batchNoChange = payload.no_changes || [];
          noChangeNames.push(...batchNoChange);

          const batchReview = payload.flagged || [];
          reviewRows.push(...batchReview);

          const batchInvalid = payload.invalid || [];
          invalidRows.push(...batchInvalid.map((r) => ({ value: r.full_name || r.email || 'Unknown', reason: r.reason })));

          const batchFailed = payload.failed || [];
          failedRows.push(...batchFailed.map((f) => ({ value: f.email, reason: f.error })));

          if (payload.outcome_counts) {
            outcomeCounts.created += payload.outcome_counts.created;
            outcomeCounts.updated += payload.outcome_counts.updated;
            outcomeCounts.no_change += payload.outcome_counts.no_change;
            outcomeCounts.review += payload.outcome_counts.review;
            outcomeCounts.invalid += payload.outcome_counts.invalid;
          } else {
            outcomeCounts.created += batchCreatedNames.length;
            outcomeCounts.updated += batchUpdated.length;
            outcomeCounts.no_change += batchNoChange.length;
            outcomeCounts.review += batchReview.length;
            outcomeCounts.invalid += batchInvalid.length + batchFailed.length;
          }

          if (payload.status_sync) {
            statusSyncTotals.summer_ready_imported += payload.status_sync.summer_ready_imported;
            statusSyncTotals.summer_ready_applied += payload.status_sync.summer_ready_applied;
            statusSyncTotals.nlc_imported += payload.status_sync.nlc_imported;
            statusSyncTotals.nlc_applied += payload.status_sync.nlc_applied;
          }

          if (payload.canonical_gap_warnings?.length) {
            allWarnings.push(...payload.canonical_gap_warnings);
          }

          setLoadingStep(3);
        } catch (batchErr: any) {
          failedRows.push({ value: `Batch ${Math.floor(i / BATCH_SIZE) + 1}`, reason: batchErr.message || 'Unknown batch error' });
          outcomeCounts.invalid += batch.length;
        }
      }

      setLoadingStep(4);
      await new Promise(r => setTimeout(r, 200));

      setResults({
        created: outcomeCounts.created,
        updated: outcomeCounts.updated,
        noChange: outcomeCounts.no_change,
        review: outcomeCounts.review,
        invalid: outcomeCounts.invalid,
        details: {
          newUsers: createdNames,
          updatedUsers: updatedNames,
          noChangeUsers: noChangeNames,
          reviewRows,
          invalidRows,
          failedRows,
        },
        validation: {
          summerReadyImported: statusSyncTotals.summer_ready_imported,
          summerReadyApplied: statusSyncTotals.summer_ready_applied,
          nlcImported: statusSyncTotals.nlc_imported,
          nlcApplied: statusSyncTotals.nlc_applied,
          warnings: [...new Set(allWarnings)],
        },
      });

      setRawText('');
      onRefresh();

      toast({
        title: 'Import Complete',
        description: `${outcomeCounts.created} created, ${outcomeCounts.updated} updated, ${outcomeCounts.no_change} no-change, ${outcomeCounts.review} review, ${outcomeCounts.invalid} invalid`,
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-muted/30 border border-border/30 rounded-lg text-center">
              <p className="text-2xl font-black text-foreground">{results.created}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
            </div>
            <div className="p-3 bg-muted/30 border border-border/30 rounded-lg text-center">
              <p className="text-2xl font-black text-foreground">{results.updated}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Updated</p>
            </div>
            <div className="p-3 bg-muted/30 border border-border/30 rounded-lg text-center">
              <p className="text-2xl font-black text-foreground">{results.noChange}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No Change</p>
            </div>
            <div className="p-3 bg-muted/30 border border-border/30 rounded-lg text-center">
              <p className="text-2xl font-black text-foreground">{results.review}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Review</p>
            </div>
            <div className="p-3 bg-muted/30 border border-border/30 rounded-lg text-center">
              <p className="text-2xl font-black text-foreground">{results.invalid}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Invalid</p>
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
                <div className="p-3 bg-muted/20 border border-border/20 rounded-lg">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                    <CheckCircle className="w-3 h-3 inline mr-1" />{results.details.newUsers.length} Created
                  </p>
                </div>
              )}

              {results.details.updatedUsers.length > 0 && (
                <div className="p-3 bg-muted/20 border border-border/20 rounded-lg">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                    <RefreshCw className="w-3 h-3 inline mr-1" />{results.details.updatedUsers.length} Updated
                  </p>
                </div>
              )}

              {results.details.noChangeUsers.length > 0 && (
                <div className="p-3 bg-muted/20 border border-border/20 rounded-lg">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                    {results.details.noChangeUsers.length} No Change
                  </p>
                </div>
              )}

              {results.details.reviewRows.length > 0 && (
                <div className="p-3 bg-muted/20 border border-border/20 rounded-lg">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                    {results.details.reviewRows.length} Review Queue
                  </p>
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {results.details.reviewRows.map((s, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground">
                        <span className="text-foreground/60">{s.full_name}</span> — {s.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {(results.details.invalidRows.length > 0 || results.details.failedRows.length > 0) && (
                <div className="p-3 bg-muted/20 border border-border/20 rounded-lg">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    <XCircle className="w-3 h-3 inline mr-1" />{results.details.invalidRows.length + results.details.failedRows.length} Invalid / Failed
                  </p>
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {[...results.details.invalidRows, ...results.details.failedRows].map((s, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground">
                        <span className="text-foreground/60">{s.value}</span> — {s.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {results.validation && (
                <div className="p-3 bg-muted/20 border border-border/20 rounded-lg space-y-1">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Status Sync Validation</p>
                  <p className="text-xs text-muted-foreground">Summer Ready rows imported: <span className="text-foreground font-semibold">{results.validation.summerReadyImported}</span> · Summer Ready rows applied: <span className="text-foreground font-semibold">{results.validation.summerReadyApplied}</span></p>
                  <p className="text-xs text-muted-foreground">NLC rows imported: <span className="text-foreground font-semibold">{results.validation.nlcImported}</span> · NLC rows applied: <span className="text-foreground font-semibold">{results.validation.nlcApplied}</span></p>
                  {results.validation.warnings.length > 0 && (
                    <div className="space-y-0.5">
                      {results.validation.warnings.map((warning, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground">{warning}</p>
                      ))}
                    </div>
                  )}
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
