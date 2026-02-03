import { useState } from 'react';
import { Users, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    totalMembers: number;
    managerCount: number;
    rookieCount: number;
    points: number;
    rank: number;
  };
  onClick: () => void;
  canUploadLogo?: boolean;
  isAdmin?: boolean;
  onLogoUpdate?: () => void;
}

export function TeamCard({ team, onClick, canUploadLogo = false, isAdmin = false, onLogoUpdate }: TeamCardProps) {
  // Only admins can actually upload logos
  const canActuallyUpload = canUploadLogo && isAdmin;
  const [isUploading, setIsUploading] = useState(false);
  const [memberCountPulse, setMemberCountPulse] = useState(false);

  // Get border color based on rank
  const getBorderStyle = () => {
    switch (team.rank) {
      case 1:
        return 'border-2 border-yellow-400 shadow-[0_0_20px_-5px_rgba(250,204,21,0.5)]';
      case 2:
        return 'border-2 border-gray-300 shadow-[0_0_15px_-5px_rgba(156,163,175,0.4)]';
      case 3:
        return 'border-2 border-amber-600 shadow-[0_0_15px_-5px_rgba(217,119,6,0.4)]';
      default:
        return 'border border-border/50';
    }
  };

  // Get rank badge
  const getRankBadge = () => {
    if (team.rank > 3) return null;
    
    const colors = {
      1: 'bg-yellow-400 text-black',
      2: 'bg-gray-300 text-black',
      3: 'bg-amber-600 text-white',
    };
    
    const icons = {
      1: '🥇',
      2: '🥈',
      3: '🥉',
    };

    return (
      <div className={cn(
        'absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm',
        colors[team.rank as 1 | 2 | 3]
      )}>
        {icons[team.rank as 1 | 2 | 3]}
      </div>
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${team.id}-${Date.now()}.${fileExt}`;
      const filePath = `team-logos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update team record
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: publicUrl })
        .eq('id', team.id);

      if (updateError) throw updateError;

      toast.success('Team logo updated!');
      onLogoUpdate?.();
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-card rounded-2xl p-5 cursor-pointer transition-all duration-300 group',
        'hover:-translate-y-1 hover:shadow-xl',
        getBorderStyle(),
        team.rank <= 3 && 'scale-[1.02]'
      )}
    >
      {getRankBadge()}

      {/* Logo Section */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <div className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden',
            'bg-muted/50 border border-border/30',
            'group-hover:border-primary/30 transition-colors'
          )}>
            {team.logo_url ? (
              <img 
                src={team.logo_url} 
                alt={team.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
            )}
          </div>
          
          {/* Upload overlay for admins only */}
          {canActuallyUpload && (
            <label 
              className={cn(
                'absolute inset-0 flex items-center justify-center cursor-pointer',
                'bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity',
                isUploading && 'opacity-100'
              )}
              onClick={(e) => e.stopPropagation()}
              title="Upload team logo"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-white" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={isUploading}
              />
            </label>
          )}
          {/* Non-admin managers see tooltip */}
          {canUploadLogo && !isAdmin && (
            <div 
              className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/60"
              onClick={(e) => e.stopPropagation()}
              title="Contact admin to change team photo"
            >
              <span className="text-[9px] text-white/80 text-center px-1">Admin only</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-lg truncate group-hover:text-primary transition-colors">
            {team.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={cn(
              'text-sm text-muted-foreground transition-all',
              memberCountPulse && 'animate-pulse text-primary font-medium'
            )}>
              {team.totalMembers} members
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-2">
        <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium">
          {team.managerCount} {team.managerCount === 1 ? 'manager' : 'managers'}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-success/15 text-success text-xs font-medium">
          {team.rookieCount} {team.rookieCount === 1 ? 'rookie' : 'rookies'}
        </span>
      </div>

      {/* Hover glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100',
        'bg-gradient-to-br from-primary/5 via-transparent to-transparent'
      )} />
    </div>
  );
}