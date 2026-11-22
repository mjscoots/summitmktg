/**
 * LeadFormSlot
 *
 * Clearly labeled placeholder for the future Headhunter lead funnel.
 * It renders no inputs, no buttons and no submit behavior - it exists so the
 * placement on each page is already wired and the real form can be dropped in
 * here later without touching the pages.
 */
/**
 * Public pages (/recruiting, /apply/rookie, /apply/veteran) keep the placement
 * wired but render nothing until the real form is ready, so applicants never
 * read "not open yet" next to the open application. Flip this to true to show
 * the placeholder again. The portal placement always renders.
 */
export const SHOW_PUBLIC_LEAD_FORM_SLOT = false;

const LeadFormSlot = ({ placement = 'portal' }: { placement?: 'public' | 'portal' }) => {
  if (placement === 'public' && !SHOW_PUBLIC_LEAD_FORM_SLOT) return null;
  return (
    <section
      aria-label="Lead form coming soon"
      className="my-10 rounded-lg border border-dashed border-border bg-card p-6"
    >
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        Lead form coming soon
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This form is being designed and is not open yet.
      </p>
    </section>
  );
};

export default LeadFormSlot;
