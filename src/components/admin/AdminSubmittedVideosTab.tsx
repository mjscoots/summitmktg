import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Play, Video, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface VideoEntry {
  label: string;
  video_url: string;
  type: 'bootcamp' | 'pitch';
  status?: string;
  submitted_at: string;
}

interface PersonVideos {
  user_id: string;
  full_name: string;
  team_name: string;
  team_id: string | null;
  videos: VideoEntry[];
}

export default function AdminSubmittedVideosTab() {
  const [people, setPeople] = useState<PersonVideos[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'bootcamp' | 'pitch'>('all');
  const [previewVideo, setPreviewVideo] = useState<{ label: string; url: string; name: string; status?: string } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const [profilesRes, bootcampRes, pitchRes, teamsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, team_id'),
      supabase.from('bootcamp_progress').select('user_id, sunblock_video_url, motivation_video_url, final_commitment_video_url, phase_2_video_url, phase_3_video_url, created_at'),
      supabase.from('pitch_approval_requests').select('id, user_id, video_url, status, submitted_at, lesson_id'),
      supabase.from('teams').select('id, name'),
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const teamMap = new Map((teamsRes.data || []).map(t => [t.id, t.name]));

    const personMap = new Map<string, PersonVideos>();

    const getOrCreate = (userId: string): PersonVideos | null => {
      if (personMap.has(userId)) return personMap.get(userId)!;
      const profile = profileMap.get(userId);
      if (!profile) return null;
      const entry: PersonVideos = {
        user_id: userId,
        full_name: profile.full_name,
        team_name: profile.team_id ? (teamMap.get(profile.team_id) || '—') : '—',
        team_id: profile.team_id,
        videos: [],
      };
      personMap.set(userId, entry);
      return entry;
    };

    for (const bc of (bootcampRes.data || [])) {
      const person = getOrCreate(bc.user_id);
      if (!person) continue;
      const bootcampVideos = [
        { url: bc.sunblock_video_url, label: 'Sunblock Video' },
        { url: bc.motivation_video_url || bc.phase_2_video_url, label: 'Motivation Video' },
        { url: bc.final_commitment_video_url || bc.phase_3_video_url, label: 'Final Commitment' },
      ];
      for (const v of bootcampVideos) {
        if (v.url) {
          person.videos.push({ label: v.label, video_url: v.url, type: 'bootcamp', submitted_at: bc.created_at || '' });
        }
      }
    }

    for (const pitch of (pitchRes.data || [])) {
      const person = getOrCreate(pitch.user_id);
      if (!person) continue;
      person.videos.push({ label: 'Pitch Recording', video_url: pitch.video_url, type: 'pitch', status: pitch.status, submitted_at: pitch.submitted_at || '' });
    }

    setPeople(Array.from(personMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setLoading(false);
  };

  const resolveUrl = async (path: string): Promise<string> => {
    if (path.startsWith('http')) return path;
    for (const bucket of ['bootcamp-videos', 'pitch-approval-videos', 'summer-checklist-videos']) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (data?.signedUrl) return data.signedUrl;
    }
    return path;
  };

  const handlePlay = async (video: VideoEntry, personName: string) => {
    setVideoLoading(true);
    setPreviewVideo({ label: video.label, url: '', name: personName, status: video.status });
    const url = await resolveUrl(video.video_url);
    setPreviewVideo({ label: video.label, url, name: personName, status: video.status });
    setVideoLoading(false);
  };

  const teamNames = [...new Set(people.map(p => p.team_name).filter(t => t !== '—'))].sort();

  const filtered = people.filter(p => {
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (teamFilter !== 'all' && p.team_name !== teamFilter) return false;
    if (typeFilter !== 'all' && !p.videos.some(v => v.type === typeFilter)) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, PersonVideos[]>>((acc, p) => {
    const key = p.team_name || '—';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const sortedTeams = Object.keys(grouped).sort((a, b) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b));

  const totalVideos = filtered.reduce((sum, p) => sum + p.videos.length, 0);

  const statusIcon = (status?: string) => {
    if (status === 'approved') return <CheckCircle className="w-3 h-3 text-primary" />;
    if (status === 'rejected') return <XCircle className="w-3 h-3 text-destructive" />;
    if (status === 'pending') return <Clock className="w-3 h-3 text-muted-foreground" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">All submitted bootcamp and pitch videos, organized by team and person.</p>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="pl-9 bg-card border-border" />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[180px] bg-card border-border text-xs">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teamNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[160px] bg-card border-border text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bootcamp">Bootcamp</SelectItem>
            <SelectItem value="pitch">Pitch</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">{totalVideos} video{totalVideos !== 1 ? 's' : ''}</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No submitted videos found</p>
        </div>
      ) : (
        sortedTeams.map(teamName => (
          <div key={teamName} className="space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {teamName}
              <span className="text-xs font-normal text-muted-foreground">({grouped[teamName].length} reps)</span>
            </h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Rep</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Videos</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[teamName].map(person => {
                    const displayVideos = typeFilter !== 'all' ? person.videos.filter(v => v.type === typeFilter) : person.videos;
                    return (
                      <tr key={person.user_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap align-top">
                          {person.full_name}
                          <div className="text-[10px] text-muted-foreground">{displayVideos.length} video{displayVideos.length !== 1 ? 's' : ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {displayVideos.map((video, i) => (
                              <Button
                                key={i}
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1.5 hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer"
                                onClick={() => handlePlay(video, person.full_name)}
                              >
                                <Play className="w-3 h-3 text-primary flex-shrink-0" />
                                <span>{video.label}</span>
                                {video.type === 'pitch' && <Badge variant="default" className="text-[8px] px-1 py-0 h-3.5">Pitch</Badge>}
                                {video.type === 'bootcamp' && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">BC</Badge>}
                                {video.status && statusIcon(video.status)}
                              </Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Video Player Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => { if (!open) setPreviewVideo(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewVideo?.name} — {previewVideo?.label}
              {previewVideo?.status && (
                <Badge variant={previewVideo.status === 'approved' ? 'default' : previewVideo.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                  {previewVideo.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {videoLoading ? (
            <div className="aspect-video flex items-center justify-center bg-black rounded-lg">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : previewVideo?.url ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
