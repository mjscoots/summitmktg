import { useState, useEffect } from 'react';
import { Search, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InterviewResponse {
  id: string;
  interviewee: string;
  interview: 1 | 2 | 3;
  interviewer: string;
  submitted: string;
  data: Record<string, string>;
  pillar?: string; // Added pillar field
}

interface Team {
  id: string;
  name: string;
  slug: string;
}

// Load responses from localStorage
function getStoredResponses(): InterviewResponse[] {
  const stored = localStorage.getItem('summit_interview_responses');
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

export function InterviewResponsesTable() {
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  const [interviewFilter, setInterviewFilter] = useState('all');
  const [selectedResponse, setSelectedResponse] = useState<InterviewResponse | null>(null);

  useEffect(() => {
    setResponses(getStoredResponses());
    
    // Fetch teams/pillars for filter
    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, slug')
        .order('name');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  // Get unique interviewers for filter (deprecated - using pillar filter now)
  const uniqueInterviewers = Array.from(new Set(responses.map(r => r.interviewer)));

  // Filter responses
  const filteredResponses = responses.filter(response => {
    const matchesSearch = 
      response.interviewee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.interviewer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPillar = 
      pillarFilter === 'all' || response.pillar === pillarFilter;
    
    const matchesInterview = 
      interviewFilter === 'all' || response.interview.toString() === interviewFilter;

    return matchesSearch && matchesPillar && matchesInterview;
  });

  const getInterviewPillColor = () => {
    return 'bg-primary/15 text-primary border-primary/30';
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by interviewee or interviewer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
          />
        </div>

        {/* Pillar Filter */}
        <Select value={pillarFilter} onValueChange={setPillarFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Pillars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.slug} value={team.slug}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Interview Filter */}
        <Select value={interviewFilter} onValueChange={setInterviewFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Interviews" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interviews</SelectItem>
            <SelectItem value="1">Interview 1</SelectItem>
            <SelectItem value="2">Interview 2</SelectItem>
            <SelectItem value="3">Interview 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Interviewee</TableHead>
              <TableHead className="font-semibold">Interview</TableHead>
              <TableHead className="font-semibold">Interviewer</TableHead>
              <TableHead className="font-semibold">Submitted</TableHead>
              <TableHead className="font-semibold text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResponses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  {responses.length === 0 
                    ? 'No interview responses yet. Complete an interview form to see responses here.'
                    : 'No responses match your search criteria.'
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredResponses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell className="font-medium">{response.interviewee}</TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex px-2.5 py-1 rounded-full text-xs font-medium border',
                      getInterviewPillColor()
                    )}>
                      Interview {response.interview}
                    </span>
                  </TableCell>
                  <TableCell>{response.interviewer}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(response.submitted).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => setSelectedResponse(response)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/85 text-primary-foreground text-xs font-medium rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Response Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Interview {selectedResponse?.interview} Response
            </DialogTitle>
          </DialogHeader>
          
          {selectedResponse && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Interviewee</p>
                  <p className="font-medium text-foreground">{selectedResponse.interviewee}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Interviewer</p>
                  <p className="font-medium text-foreground">{selectedResponse.interviewer}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Submitted</p>
                  <p className="text-foreground">
                    {new Date(selectedResponse.submitted).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedResponse.data).map(([key, value]) => (
                  <div key={key} className="p-3 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{key}</p>
                    <p className="text-foreground">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
