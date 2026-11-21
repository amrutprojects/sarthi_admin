import type { ReactNode } from 'react';
import { Badge } from '../../../components/ui';
import { useLiveDataSource } from '../hooks/useLiveData';
import { fetchedAtLabel } from '../utils/format';

/* The small source badge of every LMS screen: "Live from LMS" (with the fetch time) or "Local data". */
export function DataSourceBadge({ source, fetchedAt }: { source: 'live' | 'local'; fetchedAt?: string | null }) {
  return source === 'live' ? (
    <span className="data-source" data-testid="data-source">
      <Badge tone="green">Live from LMS</Badge>{' '}
      <span className="muted" style={{ fontSize: 12 }}>
        fetched {fetchedAtLabel(fetchedAt)}
      </span>
    </span>
  ) : (
    <span className="data-source" data-testid="data-source">
      <Badge tone="grey">Local data</Badge>
    </span>
  );
}

/*
 * Picks the source of one LMS screen (G-2). `local` is the screen as it was before G-2, rendered unchanged under a
 * "Local data" badge; `live` reads only from the LMS (its own error state, never local data). While the state is first
 * asked for, neither is shown, so a screen never flashes one source and then the other.
 */
export function LmsDataSource({ local, live }: { local: ReactNode; live: ReactNode }) {
  const s = useLiveDataSource();
  if (s.pending)
    return (
      <div className="page">
        <p className="muted" role="status">
          Loading…
        </p>
      </div>
    );
  if (s.live) return <>{live}</>;
  return (
    <>
      <div className="data-source-bar" style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px 0' }}>
        <DataSourceBadge source="local" />
      </div>
      {local}
    </>
  );
}
