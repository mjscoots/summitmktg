import { Link } from 'react-router-dom';

/**
 * Pass 159 - the same wall the route guard puts up, for content reached by
 * slug. One quiet line naming the industry the item belongs to.
 */
export function OtherWorkspaceNotice({
  vertical,
  backTo = '/app/training',
  backLabel = 'Back to Training',
}: {
  vertical: string;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="rounded-xl border border-border bg-card px-5 py-8">
        <h1 className="text-base font-semibold text-foreground">That lives in {vertical}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Switch your workspace to {vertical} to open it.
        </p>
        <Link
          to={backTo}
          className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

export default OtherWorkspaceNotice;
