import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Play, Video, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoPlayer } from '@/components/VideoPlayer';
import { format } from 'date-fns';

interface SubmittedVideo {
  id: string;
  user_id: string;
  full_name: string;
  team_name: string;
  team_id: string | null;
  video_url: string;
  type: 'bootcamp' | 'pitch';
  label: string;
  status?: string;
  submitted_at: string;
}

export default function AdminSubmittedVideosTab() {
  const [videos, setVideos] = useState<SubmittedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'bootcamp' | 'pitch'>('all');
  const [previewVideo, setPreviewVideo] = useState<SubmittedVideo | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

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

    const allVideos: SubmittedVideo[] = [];

    // Bootcamp videos
    for (const bc of (bootcampRes.data || [])) {
      const profile = profileMap.get(bc.user_id);
      if (!profile) continue;
      const teamName = profile.team_id ? (teamMap.get(profile.team_id) || '—') : '—';

      const bootcampVideos = [
        { url: bc.sunblock_video_url, label: 'Sunblock Video' },
        { url: bc.motivation_video_url || bc.phase_2_video_url, label: 'Motivation Video' },
        { url: bc.final_commitment_video_url || bc.phase_3_video_url, label: 'Final Commitment Video' },
      ];

      for (const v of bootcampVideos) {
        if (v.url) {
          allVideos.push({
            id: `bc-${bc.user_id}-${v.label}`,
            user_id: bc.user_id,
            full_name: profile.full_name,
            team_name: teamName,
            team_id: profile.team_id,
            video_url: v.url,
            type: 'bootcamp',
            label: v.label,
            submitted_at: bc.created_at || '',
          });
        }
      }
    }

    // Pitch videos
    for (const pitch of (pitchRes.data || [])) {
      const profile = profileMap.get(pitch.user_id);
      if (!profile) continue;
      const teamName = profile.team_id ? (teamMap.get(profile.team_id) || '—') : '—';

      allVideos.push({
        id: pitch.id,
        user_id: pitch.user_id,
        full_name: profile.full_name,
        team_name: teamName,
        team_id: profile.team_id,
        video_url: pitch.video_url,
        type: 'pitch',
        label: 'Pitch Recording',
        status: pitch.status,
        submitted_at: pitch.submitted_at || '',
      });
    }

    // Sort by date descending
    allVideos.sort((a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime());
    setVideos(allVideos);
    setLoading(false);
  };

  const getSignedUrl = async (path: string): Promise<string> => {
    if (signedUrls[path]) return signedUrls[path];
    // Try different buckets
    for (const bucket of ['bootcamp-videos', 'pitch-approval-videos', 'summer-checklist-videos']) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        setSignedUrls(prev => ({ ...prev, [path]: data.signedUrl }));
        return data.signedUrl;
      }
    }
    return path; // fallback to raw URL
  };

  const handlePlayVideo = async (video: SubmittedVideo) => {
    // If it's a full URL already, just preview it
    if (video.video_url.startsWith('http')) {
      setPreviewVideo(video);
      return;
    }
    // Otherwise get signed URL first
    const url = await getSignedUrl(video.video_url);
    setPreviewVideo({ ...video, video_url: url });
  };

  const teamNames = [...new Set(videos.map(v => v.team_name).filter(t => t !== '—'))].sort();

  const filtered = videos.filter(v => {
    if (search && !v.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (teamFilter !== 'all' && v.team_name !== teamFilter) return false;
    if (typeFilter !== 'all' && v.type !== typeFilter) return false;
    return true;
  });

  // Group by team
  const groupedByTeam = filtered.reduce<Record<string, SubmittedVideo[]>>((acc, v) => {
    const key = v.team_name || '—';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  const sortedTeamKeys = Object.keys(groupedByTeam).sort((a, b) => {
    if (a === '—') return 1;
    if (b === '—') return -1;
    return a.localeCompare(b);
  });

  const statusIcon = (status?: string) => {
    if (status === 'approved') return <CheckCircle className="w-3.5 h-3.5 text-primary" />;
    if (status === 'rejected') return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    if (status === 'pending') return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
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
      <p className="text-sm text-muted-foreground">View all submitted bootcamp and pitch videos, organized by team.</p>

      {/* Filters */}
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
        <Badge variant="secondary" className="text-xs">{filtered.length} video{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Grouped by team */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No submitted videos found</p>
        </div>
      ) : (
        sortedTeamKeys.map(teamName => (
          <div key={teamName} className="space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {teamName}
              <span className="text-xs font-normal text-muted-foreground">({groupedByTeam[teamName].length})</span>
            </h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Rep</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Video</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByTeam[teamName].map(video => (
                    <tr key={video.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{video.full_name}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={video.type === 'pitch' ? 'default' : 'secondary'} className="text-[10px]">
                          {video.type === 'pitch' ? '🎤 Pitch' : '📋 Bootcamp'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{video.label}</td>
                      <td className="px-4 py-2.5">
                        {video.status ? (
                          <div className="flex items-center gap-1.5">
                            {statusIcon(video.status)}
                            <span className="text-xs capitalize text-muted-foreground">{video.status}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {video.submitted_at ? format(new Date(video.submitted_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handlePlayVideo(video)}>
                          <Play className="w-3 h-3" /> Watch
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => { if (!open) setPreviewVideo(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewVideo?.full_name} — {previewVideo?.label}
              {previewVideo?.status && (
                <Badge variant={previewVideo.status === 'approved' ? 'default' : previewVideo.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                  {previewVideo.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewVideo?.video_url && (
            <div className="aspect-video">
              <VideoPlayer src={previewVideo.video_url} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
