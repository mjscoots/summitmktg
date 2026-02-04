import { useState } from 'react';
import { useTeamScripts } from '@/hooks/useTeamScripts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Pencil, Save, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeamScriptSelectorProps {
  moduleKey: 'module_2_1' | 'module_2_2' | 'module_2_3' | 'module_2_4';
  moduleTitle?: string;
}

export function TeamScriptSelector({ moduleKey, moduleTitle }: TeamScriptSelectorProps) {
  const {
    teams,
    selectedTeamId,
    setSelectedTeamId,
    isLoading,
    isSaving,
    saveScript,
    getScriptContent,
    getSelectedTeam,
    canEditScript,
    userTeamId,
  } = useTeamScripts(moduleKey);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const selectedTeam = getSelectedTeam();
  const currentScript = selectedTeamId ? getScriptContent(selectedTeamId) : '';
  const canEdit = selectedTeamId ? canEditScript(selectedTeamId) : false;

  const handleStartEdit = () => {
    setEditContent(currentScript === 'No script has been added for this team yet.' ? '' : currentScript);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!selectedTeamId) return;
    
    const success = await saveScript(selectedTeamId, editContent);
    if (success) {
      setIsEditing(false);
      setEditContent('');
      toast.success('Script updated successfully! ✓');
    } else {
      toast.error('Failed to save script');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No teams available.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Team Tabs */}
      <div className="border-b border-border bg-muted/30 overflow-x-auto">
        <Tabs 
          value={selectedTeamId || ''} 
          onValueChange={(value) => {
            setSelectedTeamId(value);
            setIsEditing(false);
          }}
        >
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none gap-0">
            {teams.map((team) => (
              <TabsTrigger
                key={team.id}
                value={team.id}
                className={cn(
                  "px-4 py-3 rounded-none border-b-2 border-transparent",
                  "text-sm font-medium transition-all",
                  "data-[state=active]:border-b-primary data-[state=active]:bg-transparent",
                  "data-[state=active]:text-primary data-[state=active]:shadow-none",
                  "hover:bg-muted/50",
                  team.id === userTeamId && "font-bold"
                )}
              >
                {team.name.toUpperCase()}
                {team.id === userTeamId && (
                  <span className="ml-1.5 text-[10px] text-primary opacity-70">(yours)</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Script Content Area */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">
              {selectedTeam?.name} Script{moduleTitle ? ` - ${moduleTitle}` : ''}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {canEdit ? 'You can edit this script' : 'Read-only view'}
            </p>
          </div>

          {canEdit && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit Script
            </Button>
          )}
        </div>

        {/* Script Display or Edit */}
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Enter the script content here..."
              className="min-h-[300px] font-mono text-sm resize-y"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="gap-2 bg-success hover:bg-success/90"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-4 min-h-[200px]">
            <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-mono leading-relaxed">
              {currentScript}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
