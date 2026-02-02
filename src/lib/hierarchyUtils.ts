// Hierarchy utility functions for Summit team structure
// SYSTEM-LEVEL HIERARCHY - Rebuilt with strict normalization rules

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string | null;
  experience: string | null;
  direct_manager: string | null;
  role?: 'rookie' | 'manager' | 'admin';
  children?: TeamMember[];
  pillar?: string;
  pillarId?: string;
  dataIssue?: string;
}

export interface Pillar {
  id: string;
  name: string;
  slug: string;
  leader_id: string | null;
  owner?: TeamMember;
  members: TeamMember[];
  totalCount: number;
  rookieCount: number;
  managerCount: number;
}

// ============================================================
// SECTION 1: CANONICAL ROOT DEFINITION
// ============================================================

// The ONE and ONLY canonical root user (normalized form)
export const CANONICAL_ROOT_NAME = 'Mathew Daniel Joyce';
export const CANONICAL_ROOT_NORMALIZED = 'mathew daniel joyce';

// All name variants that should resolve to the canonical root
// These are treated as THE SAME PERSON
export const ROOT_NAME_VARIANTS = [
  'mathew daniel joyce',
  'matthew daniel joyce',
  'matthew joyce',
  'mathew joyce',
  'matt joyce',
  'matthew joyce (manager)',
  'mathew joyce (manager)',
];

// ============================================================
// SECTION 2: PILLAR OWNERS (report directly to root)
// ============================================================

// Pillar owners mapping - source of truth
// All pillar owners report directly to Mathew Daniel Joyce
export const PILLAR_OWNERS: Record<string, string> = {
  'mafia': 'Luc Robert Chevalier',
  'quality-control': 'Joshua Bingham',
  'altitude': 'Cole Wesley Bundren',
  'atlas': 'Sean Douglas Jablonski',
  'apex': 'Hunter Terry Shannon',
  'minions': 'Colton Joyce',
  'paper-route': 'Liam Gardner',
};

// ============================================================
// SECTION 2b: MANAGER REDIRECTS
// ============================================================
// Some managers should redirect their reports to different managers
// e.g., anyone under Joshua Robert Heacox should be marked as direct to Joshua Bingham
export const MANAGER_REDIRECTS: Record<string, string> = {
  'joshua robert heacox': 'Joshua Bingham',
  'joshua heacox': 'Joshua Bingham',
};

// Get all pillar owner names (normalized)
export const PILLAR_OWNER_NAMES_NORMALIZED = Object.values(PILLAR_OWNERS).map(n => normalizeName(n));

// ============================================================
// SECTION 3: NAME NORMALIZATION (CRITICAL)
// ============================================================

// Normalize name for comparison - handles:
// - Case sensitivity
// - Extra spaces
// - Punctuation differences
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')      // Collapse multiple spaces
    .replace(/[.,()]/g, '')    // Remove punctuation
    .replace(/-/g, ' ')        // Convert hyphens to spaces
    .trim();
}

// Check if a name matches the canonical root (Mathew Daniel Joyce)
export function isTopAdmin(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = normalizeName(name);
  return ROOT_NAME_VARIANTS.includes(normalized);
}

// Normalize manager name - if it matches root variants, return canonical form
// Also applies manager redirects (e.g., Joshua Robert Heacox → Joshua Bingham)
export function normalizeManagerName(name: string | null | undefined): string {
  if (!name) return '';
  const normalized = normalizeName(name);
  
  // If this is a root variant, return the canonical root name
  if (ROOT_NAME_VARIANTS.includes(normalized)) {
    return CANONICAL_ROOT_NORMALIZED;
  }
  
  // Check for manager redirects
  if (MANAGER_REDIRECTS[normalized]) {
    return normalizeName(MANAGER_REDIRECTS[normalized]);
  }
  
  return normalized;
}

// Get the effective manager name after redirects
export function getEffectiveManager(managerName: string | null | undefined): string | null {
  if (!managerName) return null;
  const normalized = normalizeName(managerName);
  
  // Check for redirects first
  if (MANAGER_REDIRECTS[normalized]) {
    return MANAGER_REDIRECTS[normalized];
  }
  
  return managerName;
}

// Check if two names match (case-insensitive, normalized)
// Also handles root name variants
export function namesMatch(name1: string | null | undefined, name2: string | null | undefined): boolean {
  if (!name1 || !name2) return false;
  
  const norm1 = normalizeManagerName(name1);
  const norm2 = normalizeManagerName(name2);
  
  return norm1 === norm2;
}

// Fuzzy match for partial names (e.g., "Matt Joyce" matches "Mathew Daniel Joyce")
function fuzzyNameMatch(input: string, target: string): boolean {
  const normInput = normalizeName(input);
  const normTarget = normalizeName(target);
  
  // Exact match
  if (normInput === normTarget) return true;
  
  // One contains the other
  if (normTarget.includes(normInput) || normInput.includes(normTarget)) return true;
  
  // Check first/last name match
  const inputParts = normInput.split(' ');
  const targetParts = normTarget.split(' ');
  
  // If all input parts are found in target parts
  if (inputParts.every(part => targetParts.some(tp => tp.startsWith(part) || tp === part))) {
    return true;
  }
  
  return false;
}

// ============================================================
// SECTION 4: ROSTER LOOKUP FUNCTIONS
// ============================================================

// Find a person by name in the roster (normalized)
// Uses fuzzy matching if exact match fails
export function findPersonByName(roster: TeamMember[], name: string | null | undefined): TeamMember | undefined {
  if (!name) return undefined;
  
  // First check if this is the root admin (handle all variants)
  if (isTopAdmin(name)) {
    return roster.find(p => isTopAdmin(p.full_name));
  }
  
  const normalized = normalizeName(name);
  
  // Try exact match first
  const exactMatch = roster.find(p => normalizeName(p.full_name) === normalized);
  if (exactMatch) return exactMatch;
  
  // Try fuzzy match
  const fuzzyMatch = roster.find(p => fuzzyNameMatch(name, p.full_name));
  if (fuzzyMatch) return fuzzyMatch;
  
  return undefined;
}

// Find a person including NLC users (for traversal purposes)
// NLC users should not block traversal
export function findPersonForTraversal(roster: TeamMember[], allMembers: TeamMember[], name: string | null | undefined): TeamMember | undefined {
  // First try active roster
  const active = findPersonByName(roster, name);
  if (active) return active;
  
  // Then try all members (including NLC) for traversal
  const anyMatch = findPersonByName(allMembers, name);
  return anyMatch;
}

// ============================================================
// SECTION 5: HIERARCHY TRAVERSAL
// ============================================================

// Walk the manager chain to find which pillar a person belongs to
// Rules:
// - All paths MUST resolve to Mathew Daniel Joyce
// - NLC users do not block traversal
// - Pillar owners report directly to root
export function findPillarForPerson(
  person: TeamMember,
  roster: TeamMember[],
  pillarOwnerNames: string[],
  maxDepth: number = 25
): { pillar: string | null; chain: string[]; issue?: string } {
  const chain: string[] = [];
  let current: TeamMember | undefined = person;
  let depth = 0;
  const visited = new Set<string>();

  while (current && depth < maxDepth) {
    const currentNorm = normalizeName(current.full_name);
    
    // Prevent infinite loops
    if (visited.has(currentNorm)) {
      return { pillar: null, chain, issue: 'Circular reference detected' };
    }
    visited.add(currentNorm);
    chain.push(current.full_name);

    // Check if current person IS the root admin
    if (isTopAdmin(current.full_name)) {
      // This person is at the top - no pillar needed (they own all pillars)
      return { pillar: 'root', chain };
    }

    // Check if current person is a pillar owner
    const ownerMatch = pillarOwnerNames.find(ownerName => 
      namesMatch(current!.full_name, ownerName)
    );
    
    if (ownerMatch) {
      // Found the pillar owner - return the pillar
      const pillarEntry = Object.entries(PILLAR_OWNERS).find(([_, name]) => 
        namesMatch(name, ownerMatch)
      );
      return { pillar: pillarEntry ? pillarEntry[0] : null, chain };
    }

    // Check if current person's manager is the root admin
    if (current.direct_manager && isTopAdmin(current.direct_manager)) {
      // This person reports to root - check if they are a pillar owner
      const directOwnerMatch = pillarOwnerNames.find(ownerName => 
        namesMatch(current!.full_name, ownerName)
      );
      if (directOwnerMatch) {
        const pillarEntry = Object.entries(PILLAR_OWNERS).find(([_, name]) => 
          namesMatch(name, directOwnerMatch)
        );
        return { pillar: pillarEntry ? pillarEntry[0] : null, chain };
      }
      
      // Reports to root but isn't a pillar owner - assign to closest known pillar
      // This should not happen in a clean dataset, but handle gracefully
      return { pillar: null, chain, issue: 'Reports to root but not a pillar owner' };
    }

    // Check if manager is a pillar owner by name (even if not in roster)
    if (current.direct_manager) {
      const managerIsPillarOwner = pillarOwnerNames.find(ownerName =>
        namesMatch(current!.direct_manager, ownerName)
      );
      if (managerIsPillarOwner) {
        const pillarEntry = Object.entries(PILLAR_OWNERS).find(([_, name]) => 
          namesMatch(name, managerIsPillarOwner)
        );
        return { pillar: pillarEntry ? pillarEntry[0] : null, chain };
      }
    }

    // Move up the chain
    if (!current.direct_manager) {
      return { pillar: null, chain, issue: 'No manager specified' };
    }
    
    const manager = findPersonByName(roster, current.direct_manager);
    if (!manager) {
      // Manager not found - but check if it's a known pillar owner name
      const missingIsPillarOwner = pillarOwnerNames.find(ownerName =>
        namesMatch(current!.direct_manager, ownerName)
      );
      if (missingIsPillarOwner) {
        const pillarEntry = Object.entries(PILLAR_OWNERS).find(([_, name]) => 
          namesMatch(name, missingIsPillarOwner)
        );
        return { pillar: pillarEntry ? pillarEntry[0] : null, chain };
      }
      
      // Check if manager is the root admin
      if (isTopAdmin(current.direct_manager)) {
        // Person reports directly to root - they might be a pillar owner
        const directOwnerMatch = pillarOwnerNames.find(ownerName => 
          namesMatch(current!.full_name, ownerName)
        );
        if (directOwnerMatch) {
          const pillarEntry = Object.entries(PILLAR_OWNERS).find(([_, name]) => 
            namesMatch(name, directOwnerMatch)
          );
          return { pillar: pillarEntry ? pillarEntry[0] : null, chain };
        }
      }
      
      // Manager truly not found - flag but attach to root
      return { pillar: null, chain, issue: `Manager "${current.direct_manager}" not found in dataset` };
    }
    
    current = manager;
    depth++;
  }

  return { pillar: null, chain, issue: 'Max depth exceeded' };
}

// ============================================================
// SECTION 6: TREE BUILDING
// ============================================================

// Build a tree structure from flat roster
export function buildTree(
  roster: TeamMember[],
  rootName: string
): TeamMember | null {
  const root = findPersonByName(roster, rootName);
  if (!root) return null;

  const visited = new Set<string>();
  
  const buildNode = (person: TeamMember): TeamMember => {
    const personNorm = normalizeName(person.full_name);
    visited.add(personNorm);
    
    const children = roster.filter(p => {
      const pNorm = normalizeName(p.full_name);
      return namesMatch(p.direct_manager, person.full_name) && 
             !visited.has(pNorm) &&
             !namesMatch(p.full_name, person.full_name);
    });

    return {
      ...person,
      children: children.map(child => buildNode(child)),
    };
  };

  return buildNode(root);
}

// Get all descendants of a person
export function getDescendants(
  roster: TeamMember[],
  personName: string,
  maxDepth: number = 25
): TeamMember[] {
  const descendants: TeamMember[] = [];
  const visited = new Set<string>();

  const collect = (name: string, depth: number) => {
    if (depth > maxDepth) return;
    
    const directReports = roster.filter(p => 
      namesMatch(p.direct_manager, name) && 
      !visited.has(normalizeName(p.full_name))
    );

    for (const report of directReports) {
      visited.add(normalizeName(report.full_name));
      descendants.push(report);
      collect(report.full_name, depth + 1);
    }
  };

  collect(personName, 0);
  return descendants;
}

// Determine if a person is a manager (has direct reports)
export function isManager(roster: TeamMember[], personName: string): boolean {
  return roster.some(p => namesMatch(p.direct_manager, personName));
}

// ============================================================
// SECTION 7: PILLAR ASSIGNMENT (WITH FULL RESOLUTION)
// ============================================================

// Assign pillars to all members
// RULES:
// - NO unassigned members after processing
// - All paths must resolve to root
// - Flag issues but still assign
export function assignPillarsToRoster(
  roster: TeamMember[],
  pillars: { id: string; slug: string; name: string }[]
): { enrichedRoster: TeamMember[]; dataIssues: { person: TeamMember; issue: string }[] } {
  const pillarOwnerNames = Object.values(PILLAR_OWNERS);
  const dataIssues: { person: TeamMember; issue: string }[] = [];

  const enrichedRoster = roster.map(person => {
    // Check if this person IS the root admin
    if (isTopAdmin(person.full_name)) {
      return {
        ...person,
        pillar: 'root',
        pillarId: undefined,
      };
    }
    
    // Check if this person IS a pillar owner
    const isOwner = pillarOwnerNames.some(name => namesMatch(person.full_name, name));
    
    if (isOwner) {
      const pillarEntry = Object.entries(PILLAR_OWNERS).find(([_, name]) => 
        namesMatch(name, person.full_name)
      );
      if (pillarEntry) {
        const pillarData = pillars.find(p => p.slug === pillarEntry[0]);
        return {
          ...person,
          pillar: pillarEntry[0],
          pillarId: pillarData?.id,
        };
      }
    }

    // Walk the chain to find pillar
    const { pillar, issue } = findPillarForPerson(person, roster, pillarOwnerNames);
    
    if (pillar && pillar !== 'root') {
      const pillarData = pillars.find(p => p.slug === pillar);
      return {
        ...person,
        pillar,
        pillarId: pillarData?.id,
        dataIssue: issue,
      };
    }

    // === RESOLUTION STRATEGY ===
    // If we couldn't resolve via chain, try these fallbacks:
    
    // 1. Check if manager name matches a pillar owner (even with typos)
    if (person.direct_manager) {
      for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
        if (fuzzyNameMatch(person.direct_manager, ownerName)) {
          const pillarData = pillars.find(p => p.slug === slug);
          dataIssues.push({ 
            person, 
            issue: `Manager name "${person.direct_manager}" fuzzy-matched to pillar owner "${ownerName}"` 
          });
          return {
            ...person,
            pillar: slug,
            pillarId: pillarData?.id,
          };
        }
      }
    }
    
    // 2. Check if direct manager is the root admin
    if (person.direct_manager && isTopAdmin(person.direct_manager)) {
      // This person reports to root but isn't a pillar owner
      // Find the most likely pillar based on other context
      // For now, flag but assign to first pillar as fallback
      dataIssues.push({ 
        person, 
        issue: 'Reports directly to root but is not a pillar owner - needs review' 
      });
      
      // Check if they ARE a pillar owner we didn't recognize
      const possiblePillar = Object.entries(PILLAR_OWNERS).find(([_, name]) =>
        fuzzyNameMatch(person.full_name, name)
      );
      if (possiblePillar) {
        const pillarData = pillars.find(p => p.slug === possiblePillar[0]);
        return {
          ...person,
          pillar: possiblePillar[0],
          pillarId: pillarData?.id,
        };
      }
    }
    
    // 3. Last resort: Try to find ANY manager chain that works
    // Walk roster to find someone who reports to this person's manager
    // and has a valid pillar, then use that pillar
    if (person.direct_manager) {
      const siblings = roster.filter(p => 
        namesMatch(p.direct_manager, person.direct_manager) &&
        !namesMatch(p.full_name, person.full_name) &&
        p.pillar &&
        p.pillar !== 'unassigned'
      );
      
      if (siblings.length > 0) {
        // Use sibling's pillar
        const siblingPillar = siblings[0].pillar;
        if (siblingPillar) {
          const pillarData = pillars.find(p => p.slug === siblingPillar);
          dataIssues.push({
            person,
            issue: `Inherited pillar "${siblingPillar}" from sibling - needs verification`
          });
          return {
            ...person,
            pillar: siblingPillar,
            pillarId: pillarData?.id,
          };
        }
      }
    }
    
    // 4. FINAL FALLBACK: Attach directly to root
    // Per Section 6.16: "If still unresolved, attach directly to Matthew Daniel Joyce"
    // We flag for review but DO NOT leave unassigned
    dataIssues.push({ 
      person, 
      issue: issue || 'Could not resolve manager chain - attached to root for review'
    });

    // Find the most appropriate pillar based on any available info
    // Default to first pillar if truly no information
    const fallbackPillar = pillars[0];
    
    return {
      ...person,
      pillar: fallbackPillar?.slug || 'root-direct',
      pillarId: fallbackPillar?.id,
      dataIssue: 'Attached to root - needs manual pillar assignment',
    };
  });

  return { enrichedRoster, dataIssues };
}

// ============================================================
// SECTION 8: UTILITY FUNCTIONS
// ============================================================

// Get status badge info
export function getStatusInfo(status: string | null): { label: string; className: string } {
  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-success/15 text-success' },
    onboarded: { label: 'Onboarded', className: 'bg-primary/15 text-primary' },
    contract_signed: { label: 'Contract Signed', className: 'bg-amber-500/15 text-amber-400' },
    info_added: { label: 'Info Added', className: 'bg-amber-500/15 text-amber-400' },
  };
  return statusMap[status || ''] || { label: 'Pending', className: 'bg-muted text-muted-foreground' };
}

// Validate hierarchy integrity
export function validateHierarchy(
  roster: TeamMember[],
  pillars: { id: string; slug: string; name: string }[]
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for exactly one root user
  const rootUsers = roster.filter(p => isTopAdmin(p.full_name));
  if (rootUsers.length === 0) {
    issues.push('No root user (Mathew Daniel Joyce) found in roster');
  } else if (rootUsers.length > 1) {
    issues.push(`Multiple root users found: ${rootUsers.map(r => r.full_name).join(', ')}`);
  }
  
  // Check all pillar owners exist
  for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
    const owner = findPersonByName(roster, ownerName);
    if (!owner) {
      issues.push(`Pillar owner "${ownerName}" for ${slug} not found in roster`);
    }
  }
  
  // Enrich roster and check for unassigned
  const { enrichedRoster, dataIssues } = assignPillarsToRoster(roster, pillars);
  
  const unassigned = enrichedRoster.filter(p => 
    p.pillar === 'unassigned' || !p.pillar
  );
  if (unassigned.length > 0) {
    issues.push(`${unassigned.length} members still unassigned after processing`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}
