import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Users, UserX, Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HierarchyDiagnostics } from '@/lib/hierarchyUtils';

interface HierarchyDiagnosticsPanelProps {
  diagnostics: HierarchyDiagnostics;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function HierarchyDiagnosticsPanel({ 
  diagnostics, 
  onRefresh,
  isLoading 
}: HierarchyDiagnosticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUnresolved, setShowUnresolved] = useState(false);
  const [showPillarStats, setShowPillarStats] = useState(false);

  const hasIssues = 
    diagnostics.unresolvedManagerRefs.length > 0 || 
    diagnostics.pillarsWithMissingOwners.length > 0;

  const statusIcon = hasIssues ? (
    <AlertTriangle className="w-4 h-4 text-primary" />
  ) : (
    <CheckCircle2 className="w-4 h-4 text-success" />
  );

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">Hierarchy Diagnostics</span>
          {statusIcon}
          {hasIssues && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {diagnostics.unresolvedManagerRefs.length + diagnostics.pillarsWithMissingOwners.length} issues
            </span>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            disabled={isLoading}
            className="h-8"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/30 p-4 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="w-3 h-3" />
                Total Members
              </div>
              <div className="text-xl font-bold text-foreground">{diagnostics.totalMembers}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="w-3 h-3" />
                Managers
              </div>
              <div className="text-xl font-bold text-primary">{diagnostics.totalManagers}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="w-3 h-3" />
                Rookies
              </div>
              <div className="text-xl font-bold text-success">{diagnostics.totalRookies}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <UserX className="w-3 h-3" />
                NLC
              </div>
              <div className="text-xl font-bold text-muted-foreground">{diagnostics.nlcCount}</div>
            </div>
          </div>

          {/* Deprecated Manager Redirects */}
          {diagnostics.deprecatedManagerRefs.length > 0 && (
            <div className="bg-primary/10 border border-amber-500/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-primary mb-2">
                Deprecated Manager Redirects Applied
              </h4>
              <div className="space-y-1">
                {diagnostics.deprecatedManagerRefs.map((ref, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    <span className="line-through text-primary">{ref.deprecated}</span>
                    {' → '}
                    <span className="text-success">{ref.rewrittenTo}</span>
                    <span className="text-muted-foreground ml-2">({ref.affectedCount} affected)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unresolved Manager References */}
          {diagnostics.unresolvedManagerRefs.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <button
                onClick={() => setShowUnresolved(!showUnresolved)}
                className="w-full flex items-center justify-between"
              >
                <h4 className="text-sm font-medium text-primary">
                  Unresolved Manager References ({diagnostics.unresolvedManagerRefs.length})
                </h4>
                {showUnresolved ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {showUnresolved && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {diagnostics.unresolvedManagerRefs.map((ref, idx) => (
                    <div key={idx} className="text-xs">
                      <p className="font-medium text-foreground">"{ref.name}"</p>
                      <p className="text-muted-foreground pl-2">
                        Referenced by: {ref.referencedBy.slice(0, 3).join(', ')}
                        {ref.referencedBy.length > 3 && ` +${ref.referencedBy.length - 3} more`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pillars with Missing Owners */}
          {diagnostics.pillarsWithMissingOwners.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-primary mb-2">
                Pillars with Missing Owners
              </h4>
              <div className="flex flex-wrap gap-2">
                {diagnostics.pillarsWithMissingOwners.map((pillar, idx) => (
                  <span key={idx} className="text-xs bg-red-500/20 text-primary px-2 py-1 rounded">
                    {pillar}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* All Clear Message */}
          {!hasIssues && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm text-success">All hierarchy references resolved successfully</span>
            </div>
          )}

          {/* Pillar Stats */}
          <div>
            <button
              onClick={() => setShowPillarStats(!showPillarStats)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPillarStats ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Building2 className="w-4 h-4" />
              Pillar Stats
            </button>
            {showPillarStats && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {diagnostics.pillarStats.map((stat) => (
                  <div 
                    key={stat.slug} 
                    className={cn(
                      "p-2 rounded-lg border text-xs",
                      stat.hasOwner 
                        ? "bg-muted/30 border-border/30" 
                        : "bg-primary/10 border-amber-500/30"
                    )}
                  >
                    <p className="font-medium text-foreground">{stat.name}</p>
                    <p className="text-muted-foreground">
                      {stat.count} members
                      {!stat.hasOwner && (
                        <span className="text-primary ml-1">(no owner)</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
