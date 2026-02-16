import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2 } from 'lucide-react';

const CHECKLIST_ITEMS = [
  'I have sunblock and will apply it daily',
  'I will stay hydrated and prepared',
  'I will dress professionally',
  'I will ride with my team daily',
  'I understand preparation equals production',
];

export default function BootcampPhase1() {
  const navigate = useNavigate();
  const { progress, isLoading, updatePhase } = useBootcamp();
  const [checked, setChecked] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && progress?.phase_1_complete) {
      navigate('/bootcamp/phase-2', { replace: true });
    }
  }, [isLoading, progress, navigate]);

  const allChecked = checked.every(Boolean);

  const handleSubmit = async () => {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    const success = await updatePhase(1, {});
    if (success) {
      navigate('/bootcamp/phase-2', { replace: true });
    }
    setSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Phase indicator */}
        <PhaseIndicator current={1} />

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-10">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
            PHASE 1
          </h1>
          <p className="text-white/40 text-sm mb-8">SUNBLOCK & STANDARDS</p>

          <div className="space-y-4 mb-8">
            {CHECKLIST_ITEMS.map((item, i) => (
              <label
                key={i}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <Checkbox
                  checked={checked[i]}
                  onCheckedChange={(val) => {
                    const next = [...checked];
                    next[i] = !!val;
                    setChecked(next);
                  }}
                  className="mt-0.5 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <span
                  className={`text-sm transition-colors ${
                    checked[i] ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                  }`}
                >
                  {item}
                </span>
              </label>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!allChecked || submitting}
            size="lg"
            className="w-full bg-white text-black hover:bg-white/90 font-black text-base h-12 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'NEXT →'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PhaseIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((p, i) => (
        <div key={p} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              p < current
                ? 'bg-white text-black border-white'
                : p === current
                ? 'border-white text-white'
                : 'border-white/20 text-white/20'
            }`}
          >
            {p < current ? <CheckCircle2 className="w-4 h-4" /> : p}
          </div>
          {i < 2 && (
            <div className={`w-12 h-0.5 mx-1 ${p < current ? 'bg-white' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
