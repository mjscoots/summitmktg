import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
}

function parseInput(text: string, existingProfiles: { full_name: string }[], managerList: { full_name: string }[]): ParsedUser[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed: ParsedUser[] = [];

  for (const line of lines) {
    let full_name = '';
    let email = '';
    let phone = '';
    let direct_manager = '';
    let onboarding_status = 'pending';

    // Check numbered format: "1. Name | Manager: ..."
    const numberedMatch = line.match(/^\d+\.\s*(.+)/);
    const cleanLine = numberedMatch ? numberedMatch[1] : line;

    if (cleanLine.includes('|')) {
      const parts = cleanLine.split('|').map(p => p.trim());
      full_name = parts[0];
      
      // Part 2: could be manager name or "Manager: Name"
      if (parts[1]) {
        const managerPrefixed = parts[1].match(/^manager:\s*(.+)/i);
        if (managerPrefixed) {
          direct_manager = managerPrefixed[1].trim();
        } else {
          // Try to match against known managers
          const bestMatch = managerList.find(m => matchNames(m.full_name, parts[1]) > 0.7);
          if (bestMatch) {
            direct_manager = bestMatch.full_name;
          } else {
            direct_manager = parts[1]; // Use as-is
          }
        }
      }

      // Part 3: status
      if (parts[2]) {
        const statusPrefixed = parts[2].match(/^status:\s*(.+)/i);
        const rawStatus = statusPrefixed ? statusPrefixed[1].trim() : parts[2].trim();
        const statusMap: Record<string, string> = {
          'summer ready': 'summer_ready',
          'onboarded': 'onboarded',
          'contract signed': 'contract_signed',
          'info added': 'info_added',
          'pending': 'pending',
        };
        onboarding_status = statusMap[rawStatus.toLowerCase()] || 'pending';
      }
    } else if (cleanLine.includes(',')) {
      const parts = cleanLine.split(',').map(p => p.trim());
      full_name = parts[0] || '';
      email = parts[1] || '';
      phone = parts[2] || '';
      direct_manager = parts[3] || '';
    } else {
      full_name = cleanLine;
    }

    if (!full_name) continue;

    // Auto-match manager name against known managers
    if (direct_manager) {
      const bestMatch = managerList.find(m => matchNames(m.full_name, direct_manager) > 0.7);
      if (bestMatch) direct_manager = bestMatch.full_name;
    }

    // Check if already exists
    let alreadyExists = false;
    let matchedName: string | undefined;
    for (const p of existingProfiles) {
      const score = matchNames(p.full_name, full_name);
      if (score > 0.7) {
        alreadyExists = true;
        matchedName = p.full_name;
        break;
      }
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
        body: { users: usersToCreate },
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

  return (
    <div className="space-y-6">
      {/* Input Area */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Paste Names</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Paste a list — one per line. Supports: 
            <span className="text-foreground/50 ml-1">"Name | Manager Name | Status"</span> or 
            <span className="text-foreground/50 ml-1">"Name, email, phone, manager"</span> or plain names. Manager names are auto-matched.
          </p>
        </div>
        <Textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`Paste names here...\n\nExamples:\nJohn Smith | Jane Doe | summer ready\nBob Wilson | Manager: Jane Doe\nPlain Name`}
          className="min-h-[160px] bg-white/5 border-white/10 font-mono text-xs"
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleParse} disabled={!rawText.trim()} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            <Upload className="w-3.5 h-3.5" /> Parse Names
          </Button>
          <span className="text-xs text-muted-foreground">
            {rawText.split('\n').filter(l => l.trim()).length} lines detected
          </span>
        </div>
      </div>

      {/* Default Settings */}
      {parsedUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Default Manager</label>
            <Select value={defaultManager} onValueChange={setDefaultManager}>
              <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs">
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
              <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs">
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
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">{existingUsers.length} Already in App (will be skipped)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {existingUsers.map(u => (
              <span key={u.id} className="text-[10px] px-2 py-0.5 bg-amber-500/10 rounded text-amber-300">
                {u.full_name} → {u.matchedName}
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
              <UserPlus className="w-4 h-4 inline mr-1.5 text-green-400" />
              {newUsers.length} New Users to Import
            </h3>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Import {newUsers.length} Users
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {newUsers.map(user => (
              <div key={user.id} className="p-3 rounded-xl border border-white/10 bg-white/[0.02] group relative">
                <button
                  onClick={() => handleRemove(user.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <UserAvatar fullName={user.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-4">{user.role}</Badge>
                  <Badge variant="outline" className={`text-[9px] h-4 ${user.onboarding_status === 'summer_ready' ? 'text-green-400 border-green-500/30' : user.onboarding_status === 'onboarded' ? 'text-blue-400 border-blue-500/30' : user.onboarding_status === 'contract_signed' ? 'text-amber-400 border-amber-500/30' : 'text-muted-foreground'}`}>
                    {(user.onboarding_status || 'pending').replace(/_/g, ' ')}
                  </Badge>
                </div>
                {user.direct_manager && (
                  <p className="text-[10px] text-muted-foreground ml-10 truncate">
                    Manager: <span className="text-white/60">{user.direct_manager}</span>
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
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400">{results.success.length} Created Successfully</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {results.success.map((email, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-green-500/10 rounded text-green-300">{email}</span>
                ))}
              </div>
            </div>
          )}
          {results.failed.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400">{results.failed.length} Failed</span>
              </div>
              <div className="space-y-1">
                {results.failed.map((f, i) => (
                  <p key={i} className="text-[10px] text-red-300">{f.email}: {f.error}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
