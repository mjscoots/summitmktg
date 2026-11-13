/**
 * LeadFormSlot
 *
 * Clearly labeled placeholder for the future Headhunter lead funnel.
 * It renders no inputs, no buttons and no submit behavior - it exists so the
 * placement on each page is already wired and the real form can be dropped in
 * here later without touching the pages.
 */
const LeadFormSlot = () => {
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
