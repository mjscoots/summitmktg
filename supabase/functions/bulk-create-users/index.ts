import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserData {
  full_name: string;
  email?: string;
  phone?: string;
  role?: "rookie" | "manager" | "admin" | "owner" | "spectator";
  direct_manager?: string;
  team_name?: string;
  password?: string;
  onboarding_status?: string;
  rep_status?: string;
  region?: string;
  office_name?: string;
  experience?: string;
  organization?: string;
  matched_user_id?: string;
  update_only?: boolean;
}

interface NormalizedImportRow {
  full_name: string;
  full_name_normalized: string;
  first_last_normalized: string;
  email?: string;
  phone?: string;
  phone_digits?: string;
  role: "rookie" | "manager" | "admin" | "owner" | "spectator";
  direct_manager?: string;
  team_name?: string;
  password?: string;
  onboarding_status?: string;
  pipelineProvided: boolean;
  rep_status?: "active" | "nlc";
  repStatusProvided: boolean;
  region?: string;
  office_name?: string;
  experience?: string;
  organization?: string;
  matched_user_id?: string;
  update_only: boolean;
}

interface ProfileRecord {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  nickname: string | null;
  onboarding_status: string | null;
  status: string | null;
  approved: boolean | null;
  region: string | null;
  office_name: string | null;
  experience: string | null;
  direct_manager: string | null;
  organization: string | null;
}

interface ReviewQueueItem {
  full_name: string;
  email?: string;
  phone?: string;
  proposed_pipeline_status?: string;
  proposed_rep_status?: "active" | "nlc";
  reason: string;
}

interface ImportResponse {
  success: string[];
  updated: string[];
  no_changes: string[];
  failed: { email: string; error: string }[];
  flagged: ReviewQueueItem[];
  invalid: { full_name?: string; email?: string; reason: string }[];
  outcome_counts: {
    created: number;
    updated: number;
    no_change: number;
    review: number;
    invalid: number;
  };
  status_sync: {
    summer_ready_imported: number;
    summer_ready_applied: number;
    nlc_imported: number;
    nlc_applied: number;
  };
  canonical_gap_warnings: string[];
  review_queue: ReviewQueueItem[];
}

const PIPELINE_RANK: Record<string, number> = {
  pending: 0,
  contract_signed: 1,
  info_added: 2,
  onboarded: 3,
  summer_ready: 4,
};

function cleanText(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  const cleaned = input.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeEmail(raw: string | null | undefined): string | undefined {
  const value = cleanText(raw);
  if (!value) return undefined;
  const lowered = value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowered)) return undefined;
  return lowered;
}

function normalizePhoneE164(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`;
  return undefined;
}

function normalizePhoneDigits(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 ? digits : undefined;
}

function normalizeImportRepStatus(raw: string | undefined | null): "active" | "nlc" | undefined {
  if (!raw) return undefined;
  const value = raw.toLowerCase().trim().replace(/[_()]/g, " ").replace(/\s+/g, " ");
  if (!value) return undefined;
  if (/^active(s)?$/.test(value)) return "active";
  if (/^(inactive|disabled|deactivated|dropped|quit|terminated|released|cut)$/.test(value)) return "nlc";
  if (/\bno\s+longer\s+coming\b/.test(value)) return "nlc";
  if (/\bn\s*[- ]?\s*nlc(s)?\b/.test(value)) return "nlc";
  if (/\bnlc(s)?\b/.test(value)) return "nlc";
  return undefined;
}

function normalizeImportPipeline(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase().replace(/[_\-]/g, " ").replace(/\s+/g, " ").trim();
  if (/\bsummer\s*ready\b/.test(v)) return "summer_ready";
  if (/\bonboard(ed|ing)?\b/.test(v)) return "onboarded";
  if (/\binfo\s*added\b/.test(v)) return "info_added";
  if (/\bcontract\s*signed\b/.test(v)) return "contract_signed";
  if (/\bprospect\s*added\b/.test(v) || /\bpending\b/.test(v)) return "pending";
  if (PIPELINE_RANK[v] !== undefined) return v;
  return undefined;
}

function normalizeNameForMatch(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFirstLast(raw: string | undefined | null): string {
  const normalized = normalizeNameForMatch(raw);
  if (!normalized) return "";
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function isLikelyPersonName(raw: string | undefined | null): boolean {
  const normalized = normalizeNameForMatch(raw);
  if (!normalized) return false;
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((p) => /^[a-z0-9]+$/.test(p));
}

/** Always use the incoming (latest) pipeline value — the import is authoritative */
function strongestPipeline(_existing: string | undefined | null, incoming: string | undefined | null): string {
  return incoming ?? _existing ?? "pending";
}

function toBigrams(value: string): Set<string> {
  const v = ` ${value} `;
  const bigrams = new Set<string>();
  for (let i = 0; i < v.length - 1; i += 1) {
    bigrams.add(v.slice(i, i + 2));
  }
  return bigrams;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aBigrams = toBigrams(a);
  const bBigrams = toBigrams(b);
  let overlap = 0;
  for (const bg of aBigrams) {
    if (bBigrams.has(bg)) overlap += 1;
  }
  return (2 * overlap) / (aBigrams.size + bBigrams.size);
}

function buildSyntheticEmail(row: NormalizedImportRow): string {
  if (row.email) return row.email;
  const baseName = row.first_last_normalized || row.full_name_normalized || "imported user";
  const slug = baseName
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");

  const fingerprintSource = `${row.full_name_normalized}|${row.phone_digits ?? ""}`;
  const fallbackHash = Array.from(fingerprintSource).reduce((acc, ch) => {
    return (acc * 31 + ch.charCodeAt(0)) % 1000000;
  }, 7);

  return `${slug || "import"}.${fallbackHash}@summit-import.local`;
}

function normalizeImportRow(input: UserData): NormalizedImportRow {
  const fullName = cleanText(input.full_name) ?? "";
  const onboarding = normalizeImportPipeline(input.onboarding_status);
  const repStatus = normalizeImportRepStatus(input.rep_status);
  const phoneNormalized = normalizePhoneE164(input.phone);

  return {
    full_name: fullName,
    full_name_normalized: normalizeNameForMatch(fullName),
    first_last_normalized: normalizeFirstLast(fullName),
    email: normalizeEmail(input.email),
    phone: cleanText(input.phone) ?? phoneNormalized,
    phone_digits: normalizePhoneDigits(phoneNormalized ?? input.phone),
    role: input.role ?? "rookie",
    direct_manager: cleanText(input.direct_manager),
    team_name: cleanText(input.team_name),
    password: cleanText(input.password),
    onboarding_status: onboarding,
    pipelineProvided: Boolean(onboarding),
    rep_status: repStatus,
    repStatusProvided: Boolean(repStatus),
    region: cleanText(input.region),
    office_name: cleanText(input.office_name),
    experience: cleanText(input.experience),
    organization: cleanText(input.organization),
    matched_user_id: cleanText(input.matched_user_id),
    update_only: Boolean(input.update_only),
  };
}

function mergeRows(base: NormalizedImportRow, incoming: NormalizedImportRow): NormalizedImportRow {
  const merged: NormalizedImportRow = { ...base };

  if (incoming.pipelineProvided) {
    merged.pipelineProvided = true;
    merged.onboarding_status = incoming.onboarding_status;
  }

  if (incoming.repStatusProvided) {
    merged.repStatusProvided = true;
    if (merged.rep_status === "nlc" || incoming.rep_status === "nlc") {
      merged.rep_status = "nlc";
    } else if (incoming.rep_status) {
      merged.rep_status = incoming.rep_status;
    }
  }

  if (!merged.email && incoming.email) merged.email = incoming.email;
  if (!merged.phone && incoming.phone) merged.phone = incoming.phone;
  if (!merged.phone_digits && incoming.phone_digits) merged.phone_digits = incoming.phone_digits;
  if (!merged.region && incoming.region) merged.region = incoming.region;
  if (!merged.office_name && incoming.office_name) merged.office_name = incoming.office_name;
  if (!merged.experience && incoming.experience) merged.experience = incoming.experience;
  if (!merged.direct_manager && incoming.direct_manager) merged.direct_manager = incoming.direct_manager;
  if (!merged.organization && incoming.organization) merged.organization = incoming.organization;
  if (!merged.team_name && incoming.team_name) merged.team_name = incoming.team_name;
  if (!merged.password && incoming.password) merged.password = incoming.password;
  if (!merged.matched_user_id && incoming.matched_user_id) merged.matched_user_id = incoming.matched_user_id;
  if (!merged.update_only && incoming.update_only) merged.update_only = true;

  return merged;
}

function dedupeImportRows(rows: NormalizedImportRow[]): NormalizedImportRow[] {
  const deduped = new Map<string, NormalizedImportRow>();

  for (const row of rows) {
    const key = row.update_only && row.matched_user_id
      ? `update:${row.matched_user_id}`
      : row.email
      ? `email:${row.email}`
      : row.phone_digits
      ? `phone:${row.phone_digits}`
      : `name:${row.full_name_normalized}`;

    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, row);
    } else {
      deduped.set(key, mergeRows(existing, row));
    }
  }

  return Array.from(deduped.values());
}

async function fetchAllProfiles(supabaseAdmin: ReturnType<typeof createClient>): Promise<ProfileRecord[]> {
  const allProfiles: ProfileRecord[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, email, phone, nickname, onboarding_status, status, approved, region, office_name, experience, direct_manager, organization")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allProfiles.push(...(data as ProfileRecord[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return allProfiles;
}

interface ProfileIndexes {
  byUserId: Map<string, ProfileRecord>;
  byEmail: Map<string, ProfileRecord[]>;
  byPhone: Map<string, ProfileRecord[]>;
  byFullName: Map<string, ProfileRecord[]>;
  byFirstLast: Map<string, ProfileRecord[]>;
  byNickname: Map<string, ProfileRecord[]>;
}

function createEmptyIndexes(): ProfileIndexes {
  return {
    byUserId: new Map(),
    byEmail: new Map(),
    byPhone: new Map(),
    byFullName: new Map(),
    byFirstLast: new Map(),
    byNickname: new Map(),
  };
}

function pushToIndex(map: Map<string, ProfileRecord[]>, key: string | undefined, profile: ProfileRecord) {
  if (!key) return;
  const list = map.get(key) ?? [];
  list.push(profile);
  map.set(key, list);
}

function addProfileToIndexes(indexes: ProfileIndexes, profile: ProfileRecord) {
  indexes.byUserId.set(profile.user_id, profile);
  pushToIndex(indexes.byEmail, normalizeEmail(profile.email), profile);
  pushToIndex(indexes.byPhone, normalizePhoneDigits(profile.phone), profile);
  pushToIndex(indexes.byFullName, normalizeNameForMatch(profile.full_name), profile);
  pushToIndex(indexes.byFirstLast, normalizeFirstLast(profile.full_name), profile);
  if (profile.nickname) {
    pushToIndex(indexes.byNickname, normalizeNameForMatch(profile.nickname), profile);
    pushToIndex(indexes.byNickname, normalizeFirstLast(profile.nickname), profile);
  }
}

function removeProfileFromIndexes(indexes: ProfileIndexes, profile: ProfileRecord) {
  const remove = (map: Map<string, ProfileRecord[]>, key: string | undefined) => {
    if (!key) return;
    const current = map.get(key);
    if (!current) return;
    const next = current.filter((p) => p.user_id !== profile.user_id);
    if (next.length === 0) map.delete(key);
    else map.set(key, next);
  };

  remove(indexes.byEmail, normalizeEmail(profile.email));
  remove(indexes.byPhone, normalizePhoneDigits(profile.phone));
  remove(indexes.byFullName, normalizeNameForMatch(profile.full_name));
  remove(indexes.byFirstLast, normalizeFirstLast(profile.full_name));
  if (profile.nickname) {
    remove(indexes.byNickname, normalizeNameForMatch(profile.nickname));
    remove(indexes.byNickname, normalizeFirstLast(profile.nickname));
  }
  indexes.byUserId.delete(profile.user_id);
}

function refreshProfileIndexes(indexes: ProfileIndexes, previous: ProfileRecord, updated: ProfileRecord) {
  removeProfileFromIndexes(indexes, previous);
  addProfileToIndexes(indexes, updated);
}

type MatchResult =
  | { type: "matched"; profile: ProfileRecord; reason: string }
  | { type: "review"; reason: string }
  | { type: "new" };

function pickUniqueCandidate(candidates: ProfileRecord[] | undefined): ProfileRecord | null {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return null;
}

function matchCanonicalProfile(
  row: NormalizedImportRow,
  indexes: ProfileIndexes,
  allProfiles: ProfileRecord[]
): MatchResult {
  if (row.email) {
    const emailMatches = indexes.byEmail.get(row.email) ?? [];
    if (emailMatches.length === 1) return { type: "matched", profile: emailMatches[0], reason: "exact_email" };
    if (emailMatches.length > 1) return { type: "review", reason: "Ambiguous exact email match" };
  }

  if (row.phone_digits) {
    const phoneMatches = indexes.byPhone.get(row.phone_digits) ?? [];
    if (phoneMatches.length === 1) return { type: "matched", profile: phoneMatches[0], reason: "exact_phone" };
    if (phoneMatches.length > 1) return { type: "review", reason: "Ambiguous exact phone match" };
  }

  const exactName = pickUniqueCandidate(indexes.byFullName.get(row.full_name_normalized));
  if (exactName) return { type: "matched", profile: exactName, reason: "exact_normalized_name" };
  if ((indexes.byFullName.get(row.full_name_normalized) ?? []).length > 1) {
    return { type: "review", reason: "Ambiguous exact normalized full-name match" };
  }

  const firstLast = pickUniqueCandidate(indexes.byFirstLast.get(row.first_last_normalized));
  if (firstLast) return { type: "matched", profile: firstLast, reason: "exact_first_last" };
  if ((indexes.byFirstLast.get(row.first_last_normalized) ?? []).length > 1) {
    return { type: "review", reason: "Ambiguous first+last match" };
  }

  // Check nickname index
  const nicknameMatch = pickUniqueCandidate(indexes.byNickname.get(row.full_name_normalized));
  if (nicknameMatch) return { type: "matched", profile: nicknameMatch, reason: "nickname_match" };
  const nicknameFirstLast = pickUniqueCandidate(indexes.byNickname.get(row.first_last_normalized));
  if (nicknameFirstLast) return { type: "matched", profile: nicknameFirstLast, reason: "nickname_first_last" };

  let best: ProfileRecord | null = null;
  let bestScore = 0;
  let secondScore = 0;

  for (const profile of allProfiles) {
    // Check against both full_name and nickname
    const nameScore = diceCoefficient(row.full_name_normalized, normalizeNameForMatch(profile.full_name));
    const nicknameScore = profile.nickname
      ? diceCoefficient(row.full_name_normalized, normalizeNameForMatch(profile.nickname))
      : 0;
    const score = Math.max(nameScore, nicknameScore);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = profile;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (best && bestScore >= 0.95 && bestScore - secondScore >= 0.04) {
    return { type: "matched", profile: best, reason: `high_confidence_fuzzy:${bestScore.toFixed(2)}` };
  }

  if (best && bestScore >= 0.88) {
    return { type: "review", reason: `Low-confidence fuzzy match candidate (${best.full_name}, score ${bestScore.toFixed(2)})` };
  }

  return { type: "new" };
}

function buildUpdatesFromImport(
  row: NormalizedImportRow,
  currentProfile: ProfileRecord | null
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  // ALWAYS OVERWRITE: if import provides a pipeline status, use it directly
  if (row.pipelineProvided && row.onboarding_status) {
    const currentPipeline = currentProfile?.onboarding_status ?? "pending";
    if (row.onboarding_status !== currentPipeline) {
      updates.onboarding_status = row.onboarding_status;
    }
  }

  if (row.repStatusProvided && row.rep_status) {
    const currentStatus = (currentProfile?.status ?? "active").toLowerCase();
    if (currentStatus !== row.rep_status) {
      updates.status = row.rep_status;
    }
  }

  const currentPhone = cleanText(currentProfile?.phone ?? undefined);
  if (row.phone && (!currentPhone || normalizePhoneDigits(currentPhone) !== normalizePhoneDigits(row.phone))) {
    updates.phone = row.phone;
  }

  const currentEmail = normalizeEmail(currentProfile?.email ?? undefined);
  if (row.email && !currentEmail) {
    updates.email = row.email;
  }

  if (row.region && !cleanText(currentProfile?.region ?? undefined)) updates.region = row.region;
  if (row.office_name && !cleanText(currentProfile?.office_name ?? undefined)) updates.office_name = row.office_name;
  if (row.experience && !cleanText(currentProfile?.experience ?? undefined)) updates.experience = row.experience;
  if (row.direct_manager) {
    const currentManager = cleanText(currentProfile?.direct_manager ?? undefined);
    if (!currentManager || currentManager !== row.direct_manager) {
      updates.direct_manager = row.direct_manager;
    }
  }
  if (row.organization && !cleanText(currentProfile?.organization ?? undefined)) updates.organization = row.organization;

  return updates;
}

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string
): Promise<{ id: string; email?: string } | null> {
  let page = 1;
  const perPage = 1000;

  while (page <= 25) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) return { id: found.id, email: found.email };

    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

function shouldTreatAsAlreadyExistsError(message: string | undefined): boolean {
  if (!message) return false;
  const value = message.toLowerCase();
  return value.includes("already been registered") || value.includes("already exists") || value.includes("duplicate");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;

    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "owner"])
      .maybeSingle();

    if (roleError || !callerRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { users, is_import } = await req.json() as { users: UserData[]; is_import?: boolean };

    if (!Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid input: users array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (users.length > 100) {
      return new Response(
        JSON.stringify({ error: "Batch size limited to 100 users" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response: ImportResponse = {
      success: [],
      updated: [],
      no_changes: [],
      failed: [],
      flagged: [],
      invalid: [],
      outcome_counts: {
        created: 0,
        updated: 0,
        no_change: 0,
        review: 0,
        invalid: 0,
      },
      status_sync: {
        summer_ready_imported: 0,
        summer_ready_applied: 0,
        nlc_imported: 0,
        nlc_applied: 0,
      },
      canonical_gap_warnings: [],
      review_queue: [],
    };

    const normalizedRows = users.map(normalizeImportRow);
    const validRows: NormalizedImportRow[] = [];

    for (const row of normalizedRows) {
      if (!row.full_name || !isLikelyPersonName(row.full_name)) {
        response.invalid.push({ full_name: row.full_name, email: row.email, reason: "Invalid or missing full_name" });
        response.outcome_counts.invalid += 1;
        continue;
      }

      if (row.update_only && !row.matched_user_id) {
        response.invalid.push({ full_name: row.full_name, email: row.email, reason: "update_only rows must include matched_user_id" });
        response.outcome_counts.invalid += 1;
        continue;
      }

      validRows.push(row);
    }

    const dedupedRows = dedupeImportRows(validRows);

    const allProfiles = await fetchAllProfiles(supabaseAdmin);
    const indexes = createEmptyIndexes();
    for (const profile of allProfiles) addProfileToIndexes(indexes, profile);

    for (const row of dedupedRows) {
      try {
        if (row.pipelineProvided && row.onboarding_status === "summer_ready") {
          response.status_sync.summer_ready_imported += 1;
        }
        if (row.repStatusProvided && row.rep_status === "nlc") {
          response.status_sync.nlc_imported += 1;
        }

        let finalProfileState: { onboarding_status: string | null; status: string | null } | null = null;

        if (row.update_only && row.matched_user_id) {
          const existing = indexes.byUserId.get(row.matched_user_id);
          if (!existing) {
            response.invalid.push({ full_name: row.full_name, email: row.email, reason: "Matched user not found" });
            response.outcome_counts.invalid += 1;
            continue;
          }

          const updates = buildUpdatesFromImport(row, existing);

          if (Object.keys(updates).length === 0) {
            response.no_changes.push(row.full_name);
            response.outcome_counts.no_change += 1;
            finalProfileState = {
              onboarding_status: existing.onboarding_status,
              status: existing.status,
            };
          } else {
            const { error: updateErr } = await supabaseAdmin
              .from("profiles")
              .update(updates)
              .eq("user_id", row.matched_user_id);

            if (updateErr) {
              response.failed.push({ email: row.email ?? row.full_name, error: updateErr.message });
              response.outcome_counts.invalid += 1;
              continue;
            }

            const updatedProfile: ProfileRecord = {
              ...existing,
              ...updates,
            } as ProfileRecord;
            refreshProfileIndexes(indexes, existing, updatedProfile);

            response.updated.push(`${row.full_name} (${Object.keys(updates).join(", ")})`);
            response.outcome_counts.updated += 1;
            finalProfileState = {
              onboarding_status: (updates.onboarding_status as string) ?? existing.onboarding_status,
              status: (updates.status as string) ?? existing.status,
            };
          }
        } else {
          const match = matchCanonicalProfile(row, indexes, Array.from(indexes.byUserId.values()));

          if (match.type === "review") {
            const reviewItem: ReviewQueueItem = {
              full_name: row.full_name,
              email: row.email,
              phone: row.phone,
              proposed_pipeline_status: row.onboarding_status,
              proposed_rep_status: row.rep_status,
              reason: match.reason,
            };
            response.flagged.push(reviewItem);
            response.review_queue.push(reviewItem);
            response.outcome_counts.review += 1;
            continue;
          }

          if (match.type === "matched") {
            const currentProfile = match.profile;
            const updates = buildUpdatesFromImport(row, currentProfile);

            if (Object.keys(updates).length === 0) {
              response.no_changes.push(`${row.full_name} (already up to date)`);
              response.outcome_counts.no_change += 1;
              finalProfileState = {
                onboarding_status: currentProfile.onboarding_status,
                status: currentProfile.status,
              };
            } else {
              const { error: updateErr } = await supabaseAdmin
                .from("profiles")
                .update(updates)
                .eq("user_id", currentProfile.user_id);

              if (updateErr) {
                response.failed.push({ email: row.email ?? row.full_name, error: updateErr.message });
                response.outcome_counts.invalid += 1;
                continue;
              }

              const updatedProfile: ProfileRecord = {
                ...currentProfile,
                ...updates,
              } as ProfileRecord;
              refreshProfileIndexes(indexes, currentProfile, updatedProfile);

              response.updated.push(`${row.full_name} (${Object.keys(updates).join(", ")})`);
              response.outcome_counts.updated += 1;
              finalProfileState = {
                onboarding_status: (updates.onboarding_status as string) ?? currentProfile.onboarding_status,
                status: (updates.status as string) ?? currentProfile.status,
              };
            }
          } else {
            const emailForCreate = row.email ?? buildSyntheticEmail(row);
            const password = row.password || crypto.randomUUID().slice(0, 16);
            const normalizedPhone = normalizePhoneE164(row.phone);

            let userId: string | null = null;

            const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: emailForCreate,
              phone: normalizedPhone,
              password,
              email_confirm: true,
              user_metadata: {
                full_name: row.full_name,
                phone: row.phone,
                direct_manager: row.direct_manager,
                selected_role: row.role || "rookie",
              },
            });

            if (createError) {
              if (shouldTreatAsAlreadyExistsError(createError.message)) {
                const matchedByEmail = normalizeEmail(emailForCreate)
                  ? pickUniqueCandidate(indexes.byEmail.get(normalizeEmail(emailForCreate)!))
                  : null;

                if (matchedByEmail) {
                  const updates = buildUpdatesFromImport(row, matchedByEmail);
                  if (Object.keys(updates).length > 0) {
                    const { error: updateErr } = await supabaseAdmin
                      .from("profiles")
                      .update(updates)
                      .eq("user_id", matchedByEmail.user_id);

                    if (updateErr) {
                      response.failed.push({ email: row.email ?? row.full_name, error: updateErr.message });
                      response.outcome_counts.invalid += 1;
                      continue;
                    }

                    const updatedProfile: ProfileRecord = {
                      ...matchedByEmail,
                      ...updates,
                    } as ProfileRecord;
                    refreshProfileIndexes(indexes, matchedByEmail, updatedProfile);

                    response.updated.push(`${row.full_name} (${Object.keys(updates).join(", ")})`);
                    response.outcome_counts.updated += 1;
                    finalProfileState = {
                      onboarding_status: (updates.onboarding_status as string) ?? matchedByEmail.onboarding_status,
                      status: (updates.status as string) ?? matchedByEmail.status,
                    };
                  } else {
                    response.no_changes.push(`${row.full_name} (already up to date)`);
                    response.outcome_counts.no_change += 1;
                    finalProfileState = {
                      onboarding_status: matchedByEmail.onboarding_status,
                      status: matchedByEmail.status,
                    };
                  }
                  continue;
                }

                const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, emailForCreate);
                if (!existingAuthUser) {
                  response.failed.push({ email: row.email ?? row.full_name, error: createError.message });
                  response.outcome_counts.invalid += 1;
                  continue;
                }
                userId = existingAuthUser.id;
              } else {
                response.failed.push({ email: row.email ?? row.full_name, error: createError.message });
                response.outcome_counts.invalid += 1;
                continue;
              }
            } else {
              userId = created?.user?.id ?? null;
            }

            if (!userId) {
              response.failed.push({ email: row.email ?? row.full_name, error: "Unable to resolve user id for create" });
              response.outcome_counts.invalid += 1;
              continue;
            }

            const existingProfile = indexes.byUserId.get(userId) ?? null;
            if (!existingProfile) {
              const { error: insertProfileErr } = await supabaseAdmin
                .from("profiles")
                .insert({
                  user_id: userId,
                  full_name: row.full_name,
                  email: emailForCreate,
                  approved: is_import ? null : true,
                  status: row.repStatusProvided && row.rep_status ? row.rep_status : "active",
                  onboarding_status: row.onboarding_status ?? "pending",
                  phone: row.phone,
                  region: row.region,
                  office_name: row.office_name,
                  experience: row.experience,
                  direct_manager: row.direct_manager,
                  organization: row.organization,
                });

              if (insertProfileErr) {
                // If the insert failed because the handle_new_user trigger already created
                // the profile, DON'T treat it as fatal — fall through to the update step
                // so that manager, pipeline, and other import fields still get applied.
                const errMsg = (insertProfileErr.message ?? "").toLowerCase();
                const isDuplicate = errMsg.includes("duplicate") || errMsg.includes("unique") || errMsg.includes("already exists") || errMsg.includes("violates unique constraint") || errMsg.includes("23505");
                if (!isDuplicate) {
                  response.failed.push({ email: row.email ?? row.full_name, error: insertProfileErr.message });
                  response.outcome_counts.invalid += 1;
                  continue;
                }
                // Duplicate = trigger already created profile, proceed to update
              }
            }

            const profileBase = indexes.byUserId.get(userId) ?? {
              user_id: userId,
              full_name: row.full_name,
              email: emailForCreate,
              phone: row.phone ?? null,
              onboarding_status: "pending",
              status: "active",
              approved: is_import ? null : true,
              region: null,
              office_name: null,
              experience: null,
              direct_manager: null,
              organization: null,
            };

            const createUpdates: Record<string, unknown> = {
              approved: is_import ? null : true,
              status: row.repStatusProvided && row.rep_status ? row.rep_status : (profileBase.status ?? "active"),
              onboarding_status: row.pipelineProvided && row.onboarding_status
                ? row.onboarding_status
                : (profileBase.onboarding_status ?? "pending"),
            };

            if (row.phone) createUpdates.phone = row.phone;
            if (row.region) createUpdates.region = row.region;
            if (row.office_name) createUpdates.office_name = row.office_name;
            if (row.experience) createUpdates.experience = row.experience;
            if (row.direct_manager) createUpdates.direct_manager = row.direct_manager;
            if (row.organization) createUpdates.organization = row.organization;
            if (row.email) createUpdates.email = row.email;
            if (row.full_name) createUpdates.full_name = row.full_name;

            const { error: profileUpdateErr } = await supabaseAdmin
              .from("profiles")
              .update(createUpdates)
              .eq("user_id", userId);

            if (profileUpdateErr) {
              response.failed.push({ email: row.email ?? row.full_name, error: profileUpdateErr.message });
              response.outcome_counts.invalid += 1;
              continue;
            }

            await supabaseAdmin
              .from("user_roles")
              .upsert(
                { user_id: userId, role: row.role || "rookie" },
                { onConflict: "user_id,role" }
              );

            const finalProfile: ProfileRecord = {
              ...profileBase,
              ...createUpdates,
              email: (createUpdates.email as string) ?? profileBase.email,
              full_name: (createUpdates.full_name as string) ?? profileBase.full_name,
              phone: (createUpdates.phone as string) ?? profileBase.phone,
              onboarding_status: (createUpdates.onboarding_status as string) ?? profileBase.onboarding_status,
              status: (createUpdates.status as string) ?? profileBase.status,
              approved: (createUpdates.approved as boolean) ?? profileBase.approved,
              region: (createUpdates.region as string) ?? profileBase.region,
              office_name: (createUpdates.office_name as string) ?? profileBase.office_name,
              experience: (createUpdates.experience as string) ?? profileBase.experience,
              direct_manager: (createUpdates.direct_manager as string) ?? profileBase.direct_manager,
              organization: (createUpdates.organization as string) ?? profileBase.organization,
            };

            if (indexes.byUserId.has(userId)) {
              refreshProfileIndexes(indexes, indexes.byUserId.get(userId) as ProfileRecord, finalProfile);
            } else {
              addProfileToIndexes(indexes, finalProfile);
            }

            response.success.push(emailForCreate);
            response.outcome_counts.created += 1;
            finalProfileState = {
              onboarding_status: finalProfile.onboarding_status,
              status: finalProfile.status,
            };
          }
        }

        if (row.pipelineProvided && row.onboarding_status === "summer_ready" && finalProfileState?.onboarding_status === "summer_ready") {
          response.status_sync.summer_ready_applied += 1;
        }
        if (row.repStatusProvided && row.rep_status === "nlc" && finalProfileState?.status === "nlc") {
          response.status_sync.nlc_applied += 1;
        }
      } catch (error) {
        response.failed.push({
          email: row.email ?? row.full_name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        response.outcome_counts.invalid += 1;
      }
    }

    const summerReadyGap = response.status_sync.summer_ready_imported - response.status_sync.summer_ready_applied;
    if (summerReadyGap > 0) {
      response.canonical_gap_warnings.push(
        `${summerReadyGap} imported Summer Ready reps were not mapped to canonical records — review required.`
      );
    }

    const nlcGap = response.status_sync.nlc_imported - response.status_sync.nlc_applied;
    if (nlcGap > 0) {
      response.canonical_gap_warnings.push(
        `${nlcGap} imported NLC reps were not mapped to canonical records — review required.`
      );
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Bulk create error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
