// Hierarchy utility functions for Summit team structure

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

// Pillar owners mapping - source of truth
export const PILLAR_OWNERS: Record<string, string> = {
  'mafia': 'Luc Robert Chevalier',
  'quality-control': 'Joshua Bingham',
  'altitude': 'Cole Wesley Bundren',
  'atlas': 'Sean Douglas Jablonski',
  'apex': 'Hunter Terry Shannon',
  'minions': 'Colton Joyce',
  'paper-route': 'Liam Gardner',
};

// Top admin name variations
export const TOP_ADMIN_NAMES = [
  'mathew daniel joyce',
  'mathew joyce',
];

// Check if a name is the top admin
export function isTopAdmin(name: string | null | undefined): boolean {
  if (!name) return false;
  return TOP_ADMIN_NAMES.includes(normalizeName(name));
}

// Normalize name for comparison
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '');
}

// Check if two names match (case-insensitive, normalized)
export function namesMatch(name1: string | null | undefined, name2: string | null | undefined): boolean {
  return normalizeName(name1) === normalizeName(name2);
}

// Find a person by name in the roster (normalized)
export function findPersonByName(roster: TeamMember[], name: string | null | undefined): TeamMember | undefined {
  if (!name) return undefined;
  const normalized = normalizeName(name);
  return roster.find(p => normalizeName(p.full_name) === normalized);
}

// Walk the manager chain to find which pillar a person belongs to
export function findPillarForPerson(
  person: TeamMember,
  roster: TeamMember[],
  pillarOwnerNames: string[],
  maxDepth: number = 20
): { pillar: string | null; chain: string[] } {
  const chain: string[] = [];
  let current: TeamMember | undefined = person;
  let depth = 0;

  while (current && depth < maxDepth) {
    chain.push(current.full_name);

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

    // Check if current person reports directly to top admin
    if (current.direct_manager && isTopAdmin(current.direct_manager)) {
      // This person reports to top admin - check if they are a pillar owner
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

    // Move up the chain
    if (!current.direct_manager) break;
    
    // Check if manager is a pillar owner by name (even if not in roster)
    const managerIsPillarOwner = pillarOwnerNames.find(ownerName =>
      namesMatch(current!.direct_manager, ownerName)
    );
    if (managerIsPillarOwner) {
      const pillarEntry = Object.entries(PILLAR_OWNERS).find(([_, name]) => 
        namesMatch(name, managerIsPillarOwner)
      );
      return { pillar: pillarEntry ? pillarEntry[0] : null, chain };
    }
    
    const manager = findPersonByName(roster, current.direct_manager);
    if (!manager) {
      // Manager not found in dataset - stop here
      break;
    }
    
    current = manager;
    depth++;
  }

  return { pillar: null, chain };
}

// Build a tree structure from flat roster
export function buildTree(
  roster: TeamMember[],
  rootName: string
): TeamMember | null {
  const root = findPersonByName(roster, rootName);
  if (!root) return null;

  const buildNode = (person: TeamMember): TeamMember => {
    const children = roster.filter(p => 
      namesMatch(p.direct_manager, person.full_name) && 
      !namesMatch(p.full_name, person.full_name)
    );

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
  maxDepth: number = 20
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

// Assign pillars to all members
export function assignPillarsToRoster(
  roster: TeamMember[],
  pillars: { id: string; slug: string; name: string }[]
): { enrichedRoster: TeamMember[]; dataIssues: { person: TeamMember; issue: string }[] } {
  const pillarOwnerNames = Object.values(PILLAR_OWNERS);
  const dataIssues: { person: TeamMember; issue: string }[] = [];

  const enrichedRoster = roster.map(person => {
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
    const { pillar } = findPillarForPerson(person, roster, pillarOwnerNames);
    
    if (pillar) {
      const pillarData = pillars.find(p => p.slug === pillar);
      return {
        ...person,
        pillar,
        pillarId: pillarData?.id,
      };
    }

    // Check if manager exists
    if (person.direct_manager) {
      const manager = findPersonByName(roster, person.direct_manager);
      if (!manager) {
        dataIssues.push({ 
          person, 
          issue: `Manager "${person.direct_manager}" not found in dataset` 
        });
      }
    }

    dataIssues.push({ 
      person, 
      issue: 'Could not trace to any pillar owner' 
    });

    return {
      ...person,
      pillar: 'unassigned',
      dataIssue: 'Needs Review',
    };
  });

  return { enrichedRoster, dataIssues };
}

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
