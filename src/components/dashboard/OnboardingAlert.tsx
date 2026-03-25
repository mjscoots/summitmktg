import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG: Record<string, { label: string; message: string; severity: 'warn' | 'info' }> = {
  pending: {
    label: 'Pending',
    message: 'Your profile is pending. Hop on the next onboarding Zoom to get started.',
    severity: 'warn',
  },
  info_added: {
    label: 'Info Added',
    message: 'Your info has been added — join the next onboarding Zoom to become Summer Ready.',
    severity: 'warn',
  },
  contract_signed: {
    label: 'Contract Signed',
    message: 'Contract signed! Join the next onboarding Zoom to get marked Summer Ready.',
    severity: 'warn',
  },
  onboarded: {
    label: 'Onboarded',
    message: 'You\'re almost there — just a few more steps to become Summer Ready!',
    severity: 'info',
  },
};

export function OnboardingAlert() {
  const { profile } = useAuth();

  const status = profile?.onboarding_status;

  // Only show for reps that are contract_signed or info_added
  if (!status || status === 'summer_ready' || status === 'pending' || status === 'onboarded') return null;

  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const isWarn = config.severity === 'warn';

  return (
    <Card className={`mb-4 border ${isWarn ? 'border-primary/40 bg-primary/5' : 'border-blue-500/40 bg-blue-500/5'}`}>
      <div className="p-4 flex items-start gap-3">
        <div className={`rounded-full p-1.5 ${isWarn ? 'bg-primary/15' : 'bg-blue-500/15'}`}>
          <AlertTriangle className={`w-4 h-4 ${isWarn ? 'text-primary' : 'text-blue-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">Join Onboarding Zoom</h3>
            <Badge variant="outline" className={`text-[9px] ${isWarn ? 'text-primary border-primary/30' : 'text-blue-400 border-blue-500/30'}`}>
              {config.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{config.message}</p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              className={`gap-1.5 text-xs h-7 ${isWarn ? 'border-primary/30 text-primary/80 hover:bg-primary/10' : 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10'}`}
              onClick={() => window.location.href = '/app/links'}
            >
              <ExternalLink className="w-3 h-3" />
              Join Onboarding
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
