import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Understated veteran path: a plain text link under the calculator that opens a short
 * bid-request form. Submitting creates a vet lead and notifies the owner and admins.
 * No veteran pay scale is shown anywhere on the public site.
 */
const FIELDS = [
  { key: "full_name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: true, type: "tel" },
  { key: "email", label: "Email", required: true, type: "email" },
  { key: "current_company", label: "Current company", required: false },
  { key: "years_d2d", label: "Years in D2D", required: false },
  { key: "last_season_active_revenue", label: "Last season active revenue (optional)", required: false },
  { key: "best_time_to_call", label: "Best time to call", required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"] | "markets";

export default function VetBidForm() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    full_name: "",
    phone: "",
    email: "",
    current_company: "",
    years_d2d: "",
    last_season_active_revenue: "",
    best_time_to_call: "",
    markets: "",
  });

  const set = (k: FieldKey, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!values.full_name.trim() || !values.phone.trim() || !values.email.trim()) {
      toast.error("That did not go through. Check the phone and email and try again.");
      return;
    }
    setSending(true);
    const { error } = await supabase.functions.invoke("submit-vet-lead", {
      body: {
        full_name: values.full_name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        current_company: values.current_company.trim() || null,
        years_d2d: values.years_d2d.trim() || null,
        last_season_active_revenue: values.last_season_active_revenue.trim() || null,
        markets: values.markets.trim() || null,
        best_time_to_call: values.best_time_to_call.trim() || null,
      },
    });
    setSending(false);
    if (error) {
      toast.error("That did not go through. Check the phone and email and try again.");
      return;
    }
    setDone(true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setDone(false);
      }}
    >
      <DialogTrigger asChild>
        <button className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Already sold before?
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Already sold before?</DialogTitle>
        </DialogHeader>

        {done ? (
          <p className="py-6 text-center text-base font-semibold text-foreground">
            We'll call you with a bid.
          </p>
        ) : (
          <div className="space-y-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </span>
                <Input
                  type={"type" in f ? (f.type as string) : "text"}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="text-base"
                />
              </label>
            ))}
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                Markets
              </span>
              <Textarea
                value={values.markets}
                onChange={(e) => set("markets", e.target.value)}
                rows={2}
                className="text-base"
              />
            </label>
            <button
              onClick={submit}
              disabled={sending}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold tracking-wide text-primary-foreground disabled:opacity-60"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />} Request a bid
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
