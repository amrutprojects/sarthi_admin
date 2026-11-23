import type { ReactNode } from 'react';
import { EmptyState, PageHead } from '../../../components/ui';
import { LmsDataSource } from './DataSource';

/*
 * A screen that exists only as a live LMS read (no local data behind it), e.g. the entity-owned tracks and districts
 * (lms-api ERD-1). While "Show live LMS data" is off it says so under the "Local data" badge and reads nothing; on, it
 * renders the live view.
 */
export function LiveOnlyPage({ title, crumbs, live }: { title: string; crumbs: { l: string; link?: string }[]; live: ReactNode }) {
  return (
    <LmsDataSource
      live={live}
      local={
        <div className="page">
          <PageHead crumbs={crumbs} title={title} />
          <EmptyState
            title="Live LMS data is switched off"
            msg="This screen shows data read live from the LMS only. Switch on “Show live LMS data” in System Settings to see it."
          />
        </div>
      }
    />
  );
}
