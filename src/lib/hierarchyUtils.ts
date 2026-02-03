// Hierarchy utility functions for Summit team structure
// SYSTEM-LEVEL HIERARCHY - Rebuilt with strict normalization rules

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string | null;
  experience: string | null;
  direct_manager: string | null;
  role?: 'rookie' | 'manager' | 'admin';
  children?: TeamMember[];
  pillar?: string;
  pillarId?: string;
  dataIssue?: string;
  isNLC?: boolean;
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

export interface HierarchyDiagnostics {
  totalMembers: number;
  totalManagers: number;
  totalRookies: number;
  nlcCount: number;
  unresolvedManagerRefs: { name: string; referencedBy: string[] }[];
  pillarsWithMissingOwners: string[];
  deprecatedManagerRefs: { deprecated: string; rewrittenTo: string; affectedCount: number }[];
  pillarStats: { slug: string; name: string; count: number; hasOwner: boolean }[];
}

// ============================================================
// SECTION 1: CANONICAL ROOT DEFINITION
// ============================================================

// The ONE and ONLY canonical root user
export const CANONICAL_ROOT_NAME = 'Mathew Daniel Joyce';
export const CANONICAL_ROOT_NORMALIZED = 'mathew daniel joyce';

// All name variants that should resolve to the canonical root
export const ROOT_NAME_VARIANTS = [
  'mathew daniel joyce',
  'matthew daniel joyce',
  'matthew joyce',
  'mathew joyce',
  'matt joyce',
  'matthew joyce (manager)',
  'mathew joyce (manager)',
  'scoots',  // Display alias
];

// ============================================================
// SECTION 2: PILLAR OWNERS (report directly to root)
// ============================================================

// Pillar owners mapping - source of truth
// All pillar owners report directly to Mathew Daniel Joyce
// NOTE: Use canonical display names here - the alias system handles DB variations
export const PILLAR_OWNERS: Record<string, string> = {
  'mafia': 'Luc Robert Chevalier',
  'quality-control': 'Joshua Bingham',
  'altitude': 'Cole Wesley Bundren',  // NOTE: May not exist in DB yet
  'atlas': 'Sean Douglas Jablonski',
  'apex': 'Hunter Terry Shannon',
  'minions': 'Colton Joyce',
  'paper-route': 'Liam Gardner',  // Same person as William James Gardner in DB
};

// ============================================================
// SECTION 2b: COMPREHENSIVE NAME ALIAS SYSTEM
// ============================================================

// ALL name variants mapping (normalized lowercase -> canonical name)
// This is the SINGLE SOURCE OF TRUTH for name resolution
// Updated with comprehensive mappings from actual database data
export const NAME_ALIASES: Record<string, string> = {
  // === ROOT ADMIN (Mathew Daniel Joyce) ===
  'mathew daniel joyce': 'Mathew Daniel Joyce',
  'matthew daniel joyce': 'Mathew Daniel Joyce',
  'matthew joyce': 'Mathew Daniel Joyce',
  'mathew joyce': 'Mathew Daniel Joyce',  // DB variant found
  'matt joyce': 'Mathew Daniel Joyce',
  'matthew joyce manager': 'Mathew Daniel Joyce',
  'mathew joyce manager': 'Mathew Daniel Joyce',
  'scoots': 'Mathew Daniel Joyce',
  
  // === Luc Robert Chevalier (Mafia) ===
  'luc robert chevalier': 'Luc Robert Chevalier',
  'luc chevalier': 'Luc Robert Chevalier',
  'luke chevalier': 'Luc Robert Chevalier',
  'luke robert chevalier': 'Luc Robert Chevalier',
  
  // === Joshua Bingham (Quality Control) ===
  'joshua bingham': 'Joshua Bingham',
  'josh bingham': 'Joshua Bingham',
  
  // === Cole Wesley Bundren (Altitude) ===
  // NOTE: Not in DB as profile - needs to be added or reports reassigned
  'cole wesley bundren': 'Cole Wesley Bundren',
  'cole bundren': 'Cole Wesley Bundren',
  
  // === Sean Douglas Jablonski (Atlas) ===
  'sean douglas jablonski': 'Sean Douglas Jablonski',
  'sean jablonski': 'Sean Douglas Jablonski',
  
  // === Hunter Terry Shannon (Apex) ===
  'hunter terry shannon': 'Hunter Terry Shannon',
  'hunter shannon': 'Hunter Terry Shannon',
  
  // === Colton Joyce (Minions) ===
  'colton joyce': 'Colton Joyce',
  
  // === Liam Gardner / William James Gardner (Paper Route) ===
  // Per user confirmation: these are THE SAME PERSON
  // DB stores as "Liam Gardner" but manager refs use "William James Gardner"
  'liam gardner': 'Liam Gardner',
  'liam james gardner': 'Liam Gardner',
  'william james gardner': 'Liam Gardner',
  'william gardner': 'Liam Gardner',
  'will gardner': 'Liam Gardner',
  
  // === Other key managers found in DB ===
  'troy thomas dela vega': 'Troy Thomas Dela Vega',
  'troy dela vega': 'Troy Thomas Dela Vega',
  'mathew peter rubino': 'Mathew Peter Rubino',
  'matt rubino': 'Mathew Peter Rubino',
  'adam matthew mcelfresh': 'Adam Matthew Mcelfresh',
  'adam mcelfresh': 'Adam Matthew Mcelfresh',
  'spencer john yanbin mamrick': 'Spencer John Yanbin Mamrick',
  'spencer mamrick': 'Spencer John Yanbin Mamrick',
  'ian reilly mcclurg': 'Ian Reilly Mcclurg',
  'ian mcclurg': 'Ian Reilly Mcclurg',
  'hewitt brandon mcbride': 'Hewitt Brandon Mcbride',
  'hewitt mcbride': 'Hewitt Brandon Mcbride',
  'jack dawson spiess': 'Jack Dawson Spiess',
  'jack spiess': 'Jack Dawson Spiess',
  'james jay harjak': 'James Jay Harjak',
  'james harjak': 'James Jay Harjak',
  'jessica lynne johnson': 'Jessica Lynne Johnson',
  'jessica johnson': 'Jessica Lynne Johnson',
  'caleb ryan hammond': 'Caleb Ryan Hammond',
  'caleb hammond': 'Caleb Ryan Hammond',
  'gabe thomas perron': 'Gabe Thomas Perron',
  'gabe perron': 'Gabe Thomas Perron',
  'corey john haden morgan': 'Corey John Haden Morgan',
  'corey morgan': 'Corey John Haden Morgan',
  'hassan omer hassan ahmed sati': 'Hassan Omer Hassan Ahmed Sati',
  'hassan sati': 'Hassan Omer Hassan Ahmed Sati',
  'elijah abraham wiater': 'Elijah Abraham Wiater',
  'elijah wiater': 'Elijah Abraham Wiater',
  'mitchell madison ingram bailey': 'Mitchell Madison Ingram Bailey',
  'mitchell bailey': 'Mitchell Madison Ingram Bailey',
  'gabriel joseph salvatore brugellis': 'Gabriel Joseph Salvatore Brugellis',
  'gabriel brugellis': 'Gabriel Joseph Salvatore Brugellis',
  'justin gordon casarotti': 'Justin Gordon Casarotti',
  'justin casarotti': 'Justin Gordon Casarotti',
  'jayce christian nelson': 'Jayce Christian Nelson',
  'jayce nelson': 'Jayce Christian Nelson',
  'jacob robert jazwin': 'Jacob Robert Jazwin',
  'jacob jazwin': 'Jacob Robert Jazwin',
  'jake jazwin': 'Jacob Robert Jazwin',
  'jake dennis keller': 'Jake Dennis Keller',
  'jake keller': 'Jake Dennis Keller',
  'branson christopher liles': 'Branson Christopher Liles',
  'branson liles': 'Branson Christopher Liles',
  'brendon austin luke': 'Brendon Austin Luke',
  'brendon luke': 'Brendon Austin Luke',
  'dean patrick vincent': 'Dean Patrick Vincent',
  'dean vincent': 'Dean Patrick Vincent',
  'jacob eugene handy': 'Jacob Eugene Handy',
  'jacob handy': 'Jacob Eugene Handy',
  'justin william handy': 'Justin William Handy',
  'justin handy': 'Justin William Handy',
  'christopher cole wright': 'Christopher Cole Wright',
  'chris wright': 'Christopher Cole Wright',
  'mikail harms hassoun': 'Mikail Harms Hassoun',
  'mikail hassoun': 'Mikail Harms Hassoun',
  'nicholas singh batth': 'Nicholas Singh Batth',
  'nicholas batth': 'Nicholas Singh Batth',
  'nick batth': 'Nicholas Singh Batth',
  'seth michael dyer': 'Seth Michael Dyer',
  'seth dyer': 'Seth Michael Dyer',
  'skyler thomas smith': 'Skyler Thomas Smith',
  'skyler smith': 'Skyler Thomas Smith',
};

// ============================================================
// SECTION 2c: DEPRECATED MANAGER REDIRECTS
// ============================================================

// Managers who have been removed - their reports get reassigned
// Format: normalized deprecated name -> { rewriteTo: canonical name, reason: string }
export const DEPRECATED_MANAGERS: Record<string, { rewriteTo: string; reason: string }> = {
  'joshua robert heacox': { rewriteTo: 'Joshua Bingham', reason: 'Terminated - all reports reassigned' },
  'joshua heacox': { rewriteTo: 'Joshua Bingham', reason: 'Terminated - all reports reassigned' },
  'josh heacox': { rewriteTo: 'Joshua Bingham', reason: 'Terminated - all reports reassigned' },
  'joshua robert hecocks': { rewriteTo: 'Joshua Bingham', reason: 'Terminated - all reports reassigned' },
  'joshua hecocks': { rewriteTo: 'Joshua Bingham', reason: 'Terminated - all reports reassigned' },
};

// ============================================================
// SECTION 3: NAME NORMALIZATION (CRITICAL)
// ============================================================

// Normalize name for comparison
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

// Get display name (First Last only, no middle names)
// Database stores full name, this is for display only
export function getDisplayName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  
  if (parts.length <= 2) {
    return trimmed; // Already first + last or single name
  }
  
  // Return first and last name only
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

// Get the canonical name for any input (resolves all aliases)
export function getCanonicalName(name: string | null | undefined): string {
  if (!name) return '';
  const normalized = normalizeName(name);
  
  // Check if it's an alias
  if (NAME_ALIASES[normalized]) {
    return NAME_ALIASES[normalized];
  }
  
  // Check if it's a deprecated manager
  if (DEPRECATED_MANAGERS[normalized]) {
    return DEPRECATED_MANAGERS[normalized].rewriteTo;
  }
  
  // Return the original name with proper casing (title case)
  return name.trim();
}

// Check if a name matches the canonical root
export function isTopAdmin(name: string | null | undefined): boolean {
  if (!name) return false;
  const canonical = getCanonicalName(name);
  return canonical === CANONICAL_ROOT_NAME;
}

// Check if a name is a deprecated manager
export function isDeprecatedManager(name: string | null | undefined): { isDeprecated: boolean; rewriteTo?: string; reason?: string } {
  if (!name) return { isDeprecated: false };
  const normalized = normalizeName(name);
  const deprecated = DEPRECATED_MANAGERS[normalized];
  if (deprecated) {
    return { isDeprecated: true, rewriteTo: deprecated.rewriteTo, reason: deprecated.reason };
  }
  return { isDeprecated: false };
}

// Get effective manager name (applies redirects and aliases)
export function getEffectiveManager(managerName: string | null | undefined): string | null {
  if (!managerName) return null;
  
  const { isDeprecated, rewriteTo } = isDeprecatedManager(managerName);
  if (isDeprecated && rewriteTo) {
    return rewriteTo;
  }
  
  return getCanonicalName(managerName);
}

// Check if two names match (using canonical resolution)
export function namesMatch(name1: string | null | undefined, name2: string | null | undefined): boolean {
  if (!name1 || !name2) return false;
  
  const canonical1 = getCanonicalName(name1);
  const canonical2 = getCanonicalName(name2);
  
  return normalizeName(canonical1) === normalizeName(canonical2);
}

// Fuzzy match for partial names
function fuzzyNameMatch(input: string, target: string): boolean {
  const normInput = normalizeName(input);
  const normTarget = normalizeName(target);
  
  if (normInput === normTarget) return true;
  if (normTarget.includes(normInput) || normInput.includes(normTarget)) return true;
  
  const inputParts = normInput.split(' ');
  const targetParts = normTarget.split(' ');
  
  if (inputParts.every(part => targetParts.some(tp => tp.startsWith(part) || tp === part))) {
    return true;
  }
  
  return false;
}

// ============================================================
// SECTION 4: ROSTER LOOKUP FUNCTIONS
// ============================================================

// Find a person by name in the roster (using canonical resolution)
export function findPersonByName(roster: TeamMember[], name: string | null | undefined): TeamMember | undefined {
  if (!name) return undefined;
  
  const canonicalName = getCanonicalName(name);
  const normalized = normalizeName(canonicalName);
  
  // First try exact canonical match
  const exactMatch = roster.find(p => normalizeName(getCanonicalName(p.full_name)) === normalized);
  if (exactMatch) return exactMatch;
  
  // Try direct normalized match
  const directMatch = roster.find(p => normalizeName(p.full_name) === normalized);
  if (directMatch) return directMatch;
  
  // Try fuzzy match
  const fuzzyMatch = roster.find(p => fuzzyNameMatch(name, p.full_name));
  if (fuzzyMatch) return fuzzyMatch;
  
  return undefined;
}

// Check if a person is NLC
export function isNLC(person: TeamMember): boolean {
  return person.status === 'nlc';
}

// ============================================================
// SECTION 5: HIERARCHY TRAVERSAL
// ============================================================

// Get all pillar owner names (canonical)
export function getPillarOwnerNames(): string[] {
  return Object.values(PILLAR_OWNERS);
}

// Find which pillar a person belongs to
export function findPillarForPerson(
  person: TeamMember,
  roster: TeamMember[],
  maxDepth: number = 25
): { pillar: string | null; chain: string[]; issue?: string } {
  const pillarOwnerNames = getPillarOwnerNames();
  const chain: string[] = [];
  let current: TeamMember | undefined = person;
  let depth = 0;
  const visited = new Set<string>();

  while (current && depth < maxDepth) {
    const currentNorm = normalizeName(current.full_name);
    
    if (visited.has(currentNorm)) {
      return { pillar: null, chain, issue: 'Circular reference detected' };
    }
    visited.add(currentNorm);
    chain.push(current.full_name);

    // Check if current person IS the root admin
    if (isTopAdmin(current.full_name)) {
      return { pillar: 'root', chain };
    }

    // Check if current person is a pillar owner
    const canonicalCurrent = getCanonicalName(current.full_name);
    for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
      if (namesMatch(canonicalCurrent, ownerName)) {
        return { pillar: slug, chain };
      }
    }

    // Move up to manager
    if (!current.direct_manager) {
      return { pillar: null, chain, issue: 'No manager specified' };
    }
    
    // Apply deprecated manager redirect
    const effectiveManager = getEffectiveManager(current.direct_manager);
    
    // Check if manager is root
    if (effectiveManager && isTopAdmin(effectiveManager)) {
      // Person reports to root - check if they are a pillar owner
      for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
        if (namesMatch(current.full_name, ownerName)) {
          return { pillar: slug, chain };
        }
      }
      return { pillar: null, chain, issue: 'Reports to root but not a pillar owner' };
    }
    
    // Check if manager is a pillar owner (even if not in roster)
    for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
      if (effectiveManager && namesMatch(effectiveManager, ownerName)) {
        return { pillar: slug, chain };
      }
    }

    const manager = findPersonByName(roster, effectiveManager);
    if (!manager) {
      // Manager not found - flag issue
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
      const effectiveManager = getEffectiveManager(p.direct_manager);
      return namesMatch(effectiveManager, person.full_name) && 
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
    
    const directReports = roster.filter(p => {
      const effectiveManager = getEffectiveManager(p.direct_manager);
      return namesMatch(effectiveManager, name) && 
             !visited.has(normalizeName(p.full_name));
    });

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
  return roster.some(p => {
    const effectiveManager = getEffectiveManager(p.direct_manager);
    return namesMatch(effectiveManager, personName);
  });
}

// ============================================================
// SECTION 7: PILLAR ASSIGNMENT (WITH FULL RESOLUTION)
// ============================================================

export function assignPillarsToRoster(
  roster: TeamMember[],
  pillars: { id: string; slug: string; name: string }[]
): { enrichedRoster: TeamMember[]; dataIssues: { person: TeamMember; issue: string }[] } {
  const pillarOwnerNames = getPillarOwnerNames();
  const dataIssues: { person: TeamMember; issue: string }[] = [];

  const enrichedRoster = roster.map(person => {
    const personWithNLC = {
      ...person,
      isNLC: person.status === 'nlc',
    };
    
    // Check if this person IS the root admin
    if (isTopAdmin(person.full_name)) {
      return {
        ...personWithNLC,
        pillar: 'root',
        pillarId: undefined,
      };
    }
    
    // Check if this person IS a pillar owner
    for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
      if (namesMatch(person.full_name, ownerName)) {
        const pillarData = pillars.find(p => p.slug === slug);
        return {
          ...personWithNLC,
          pillar: slug,
          pillarId: pillarData?.id,
        };
      }
    }

    // Walk the chain to find pillar
    const { pillar, issue } = findPillarForPerson(person, roster);
    
    if (pillar && pillar !== 'root') {
      const pillarData = pillars.find(p => p.slug === pillar);
      return {
        ...personWithNLC,
        pillar,
        pillarId: pillarData?.id,
        dataIssue: issue,
      };
    }

    // === RESOLUTION FALLBACKS ===
    
    // 1. Check if manager name matches a pillar owner (fuzzy)
    if (person.direct_manager) {
      const effectiveManager = getEffectiveManager(person.direct_manager);
      for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
        if (effectiveManager && fuzzyNameMatch(effectiveManager, ownerName)) {
          const pillarData = pillars.find(p => p.slug === slug);
          return {
            ...personWithNLC,
            pillar: slug,
            pillarId: pillarData?.id,
          };
        }
      }
    }
    
    // 2. Check if direct manager is the root admin
    if (person.direct_manager && isTopAdmin(person.direct_manager)) {
      dataIssues.push({ 
        person, 
        issue: 'Reports directly to root but is not a pillar owner' 
      });
      
      // Check if they ARE a pillar owner we didn't recognize
      for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
        if (fuzzyNameMatch(person.full_name, ownerName)) {
          const pillarData = pillars.find(p => p.slug === slug);
          return {
            ...personWithNLC,
            pillar: slug,
            pillarId: pillarData?.id,
          };
        }
      }
    }
    
    // 3. Flag issue and mark as unassigned
    dataIssues.push({ 
      person, 
      issue: issue || 'Could not resolve manager chain'
    });

    return {
      ...personWithNLC,
      pillar: 'unassigned',
      pillarId: undefined,
      dataIssue: issue || 'Could not resolve manager chain',
    };
  });

  return { enrichedRoster, dataIssues };
}

// ============================================================
// SECTION 8: HIERARCHY DIAGNOSTICS
// ============================================================

export function generateHierarchyDiagnostics(
  roster: TeamMember[],
  pillars: { id: string; slug: string; name: string }[]
): HierarchyDiagnostics {
  const pillarOwnerNames = getPillarOwnerNames();
  
  // Count managers and rookies
  const totalManagers = roster.filter(p => 
    isManager(roster, p.full_name) || p.role === 'manager' || p.role === 'admin'
  ).length;
  
  const nlcMembers = roster.filter(p => p.status === 'nlc');
  
  // Find unresolved manager references
  const managerRefs = new Map<string, string[]>();
  roster.forEach(person => {
    if (person.direct_manager) {
      const effectiveManager = getEffectiveManager(person.direct_manager);
      if (effectiveManager) {
        const found = findPersonByName(roster, effectiveManager);
        if (!found && !isTopAdmin(effectiveManager)) {
          // Check if it's a known pillar owner
          const isPillarOwner = pillarOwnerNames.some(name => namesMatch(effectiveManager, name));
          if (!isPillarOwner) {
            const key = normalizeName(effectiveManager);
            if (!managerRefs.has(key)) {
              managerRefs.set(key, []);
            }
            managerRefs.get(key)!.push(person.full_name);
          }
        }
      }
    }
  });
  
  const unresolvedManagerRefs = Array.from(managerRefs.entries()).map(([name, refs]) => ({
    name,
    referencedBy: refs,
  }));
  
  // Find pillars with missing owners
  const pillarsWithMissingOwners: string[] = [];
  for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
    const owner = findPersonByName(roster, ownerName);
    if (!owner) {
      pillarsWithMissingOwners.push(`${slug} (${ownerName})`);
    }
  }
  
  // Count deprecated manager references
  const deprecatedCounts = new Map<string, number>();
  roster.forEach(person => {
    if (person.direct_manager) {
      const { isDeprecated, rewriteTo } = isDeprecatedManager(person.direct_manager);
      if (isDeprecated && rewriteTo) {
        const key = normalizeName(person.direct_manager);
        deprecatedCounts.set(key, (deprecatedCounts.get(key) || 0) + 1);
      }
    }
  });
  
  const deprecatedManagerRefs = Array.from(deprecatedCounts.entries()).map(([deprecated, count]) => {
    const info = DEPRECATED_MANAGERS[deprecated];
    return {
      deprecated,
      rewrittenTo: info?.rewriteTo || 'Unknown',
      affectedCount: count,
    };
  });
  
  // Pillar stats
  const { enrichedRoster } = assignPillarsToRoster(roster, pillars);
  const pillarStats = pillars.map(p => {
    const members = enrichedRoster.filter(m => m.pillar === p.slug);
    const ownerName = PILLAR_OWNERS[p.slug];
    const owner = findPersonByName(roster, ownerName);
    return {
      slug: p.slug,
      name: p.name,
      count: members.length,
      hasOwner: !!owner,
    };
  });
  
  return {
    totalMembers: roster.length,
    totalManagers,
    totalRookies: roster.length - totalManagers,
    nlcCount: nlcMembers.length,
    unresolvedManagerRefs,
    pillarsWithMissingOwners,
    deprecatedManagerRefs,
    pillarStats,
  };
}

// ============================================================
// SECTION 9: UTILITY FUNCTIONS
// ============================================================

export function getStatusInfo(status: string | null): { label: string; className: string } {
  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-success/15 text-success' },
    onboarded: { label: 'Onboarded', className: 'bg-primary/15 text-primary' },
    contract_signed: { label: 'Contract Signed', className: 'bg-amber-500/15 text-amber-400' },
    info_added: { label: 'Info Added', className: 'bg-amber-500/15 text-amber-400' },
    nlc: { label: 'NLC', className: 'bg-muted text-muted-foreground opacity-60' },
  };
  return statusMap[status || ''] || { label: 'Pending', className: 'bg-muted text-muted-foreground' };
}

// Validate hierarchy integrity
export function validateHierarchy(
  roster: TeamMember[],
  pillars: { id: string; slug: string; name: string }[]
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for root user
  const rootUsers = roster.filter(p => isTopAdmin(p.full_name));
  if (rootUsers.length === 0) {
    issues.push(`No root user (${CANONICAL_ROOT_NAME}) found in roster`);
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
  
  // Check for unassigned
  const { enrichedRoster } = assignPillarsToRoster(roster, pillars);
  const unassigned = enrichedRoster.filter(p => p.pillar === 'unassigned');
  if (unassigned.length > 0) {
    issues.push(`${unassigned.length} members still unassigned`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Legacy exports for backwards compatibility
export const PILLAR_OWNER_VARIANTS = NAME_ALIASES;
export const MANAGER_REDIRECTS: Record<string, string> = Object.fromEntries(
  Object.entries(DEPRECATED_MANAGERS).map(([k, v]) => [k, v.rewriteTo])
);
export function normalizeManagerName(name: string | null | undefined): string {
  return normalizeName(getCanonicalName(name));
}
export const PILLAR_OWNER_NAMES_NORMALIZED = getPillarOwnerNames().map(n => normalizeName(n));
