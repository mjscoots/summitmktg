import { useState } from 'react';
import { Phone, MessageSquare, X, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CALL_OUTCOMES, leadActions, money, smsHref, telHref, type LeadRow } from '@/hooks/useLeads';

interface Props {
  open: boolean;
  leads: LeadRow[];
  onClose: () => void;
  onDone?: () => void;
}

/** One lead at a time: call, pick an outcome, move on. */
export default function CallMode({ open, leads, onClose, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState('');
  const [callbackAt, setCallbackAt] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const lead = leads[index];

  const advance = () => {
    setNote('');
    setCallbackAt('');
    setPending(null);
    if (index + 1 >= leads.length) {
      onDone?.();
      onClose();
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
  };

  const save = async (outcome: string) => {
    if (!lead) return;
    if (outcome === 'callback' && !callbackAt) {
      setPending('callback');
      return;
    }
    const { error } = await leadActions.log(
      lead.id,
      'call',
      outcome,
      note || null,
      outcome === 'callback' && callbackAt ? new Date(callbackAt).toISOString() : null
    );
    if (error) toast.error(error.message);
    else advance();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setIndex(0);
        }
      }}
    >
      <DialogContent className="max-w-[440px] p-0">
        {!lead ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">No leads left to call.</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="micro-label">
                  {index + 1} of {leads.length}
                </p>
                <h2 className="truncate text-lg font-bold text-foreground">{lead.full_name}</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {[lead.system, lead.former_manager_name, money(lead.season_revenue)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  setIndex(0);
                }}
                aria-label="Close call mode"
                className="shrink-0 rounded-lg border border-border/60 p-2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              {telHref(lead.phone) ? (
                <a
                  href={telHref(lead.phone) as string}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground"
                >
                  <Phone className="h-4 w-4" /> Call {lead.phone}
                </a>
              ) : (
                <p className="flex-1 rounded-xl border border-border/60 bg-surface px-3 py-3 text-[13px] text-muted-foreground">
                  No phone on file
                </p>
              )}
              {smsHref(lead.phone) && (
                <a
                  href={smsHref(lead.phone) as string}
                  aria-label="Text this lead"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border/60 bg-surface px-3 text-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                </a>
              )}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Note"
              className="mt-3 w-full resize-y rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-[13px] outline-none focus:border-primary/40"
            />

            {pending === 'callback' && (
              <Input
                type="datetime-local"
                value={callbackAt}
                onChange={(e) => setCallbackAt(e.target.value)}
                className="mt-2 h-10 text-[13px]"
              />
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              {CALL_OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => save(o.value)}
                  className="min-h-11 rounded-xl border border-border/60 bg-surface text-[13px] font-semibold text-foreground hover:border-primary/40"
                >
                  {o.label}
                </button>
              ))}
            </div>

            <button
              onClick={advance}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border/60 text-[13px] font-semibold text-muted-foreground"
            >
              Skip <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
