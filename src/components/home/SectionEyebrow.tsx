/**
 * Pass 95 — one eyebrow per section, always in the workspace accent. Pest is
 * cyan, Fiber is mint, Life is green, so the hue alone says where you are.
 */
export function SectionEyebrow({ children }: { children: string }) {
  return (
    <p
      className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
      style={{ color: 'hsl(var(--workspace-accent))' }}
    >
      {children}
    </p>
  );
}

export default SectionEyebrow;
