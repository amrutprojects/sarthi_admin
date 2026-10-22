import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Badge, FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import type { Option } from '../../../../types/legacy';
import BackButton from '../../../cms/components/BackButton';
import MasterKpis from '../../../cms/components/MasterKpis';
import { STATUS_OPTIONS, geoFilterOptions } from '../../../cms/components/MasterFilters';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import StatusToggle from '../../../cms/components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../../cms/components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle, useMasterQuery } from '../../../cms/useMasterQuery';
import CompletenessBadge from '../components/CompletenessBadge';
import CurriculumStatusBadge from '../components/CurriculumStatusBadge';
import { trackVariantService, type TrackVariantQuery } from '../services/trackVariantService';
import { CURRICULUM_STATUSES, CURRICULUM_STATUS_LABELS, type ApiTrackVariant } from '../types/trackVariant.types';

const LIST = '/lms/track-variants';

const VARIANT_STATUS_OPTIONS: Option[] = [{ v: '', l: 'All stages' }, ...CURRICULUM_STATUSES.map((s) => ({ v: s, l: CURRICULUM_STATUS_LABELS[s] }))];
const COMPLETENESS_OPTIONS: Option[] = [
  { v: '', l: 'Complete or not' },
  { v: 'complete', l: 'Complete' },
  { v: 'incomplete', l: 'Incomplete' },
];

const variantName = (v: ApiTrackVariant) => `${v.track.code} · ${v.track.name}`;

/*
 * Track Variant Master listing (L-07 / UI-317): one row per Module 3 variant of a technology track (T01–T12), with
 * its course and module, lifecycle stage, completeness badge and active flag. Search by track or course; filter by
 * completeness, track, course, stage and active flag; sorting and paging — all served by the backend.
 */
export default function TrackVariantList() {
  usePageTitle('Track Variant Master');
  const go = useGo();
  const can = useCan();
  const [params] = useSearchParams();
  const urlCourseId = params.get('courseId') ?? '';
  const initial = useMemo<TrackVariantQuery>(
    () => ({ ...masterQuery('track'), courseId: urlCourseId, trackId: '', variantStatus: '', completeness: '', deleted: false }),
    [urlCourseId],
  );
  const { query: q, patch, reset } = useMasterQuery<TrackVariantQuery>(initial);
  const page = useApiData(() => trackVariantService.list(q), [q]);
  const courses = useApiData(() => trackVariantService.courseOptions(), []);
  const tracks = useApiData(() => trackVariantService.trackOptions(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiTrackVariant | null>(null);
  const [confirming, setConfirming] = useState<ApiTrackVariant | null>(null);
  /* The last variant archived here, offered for restore until another one is archived or it is restored. */
  const [archived, setArchived] = useState<ApiTrackVariant | null>(null);
  const [restoring, setRestoring] = useState(false);
  /* A row of the "Show deleted" list whose Restore asks for confirmation. */
  const [restoringRow, setRestoringRow] = useState<ApiTrackVariant | null>(null);

  /* KPI totals, counted by the backend. They follow the course filter (the scope) but not search or the other filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { courseId: q.courseId };
      const [total, published, draft, incomplete] = await Promise.all([
        trackVariantService.count(scope),
        trackVariantService.count({ ...scope, status: 'PUBLISHED' }),
        trackVariantService.count({ ...scope, status: 'DRAFT' }),
        trackVariantService.count({ ...scope, completeness: 'incomplete' }),
      ]);
      return { total, published, draft, incomplete };
    },
    [statsKey, q.courseId],
  );

  const rows = page.data?.items ?? [];
  /* The rows on screen came from the deleted=true listing (not merely the toggle, which runs ahead of the reload). */
  const showingDeleted = page.data?.deleted === true;
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiTrackVariant>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'track',
      l: 'Track',
      render: (r) => (
        <span>
          <b className="lnk">{r.track.code}</b> <span>{r.track.name}</span>
          {r.track.isActive ? null : <div className="muted fs12">Track inactive in the Admin Panel</div>}
        </span>
      ),
    },
    {
      k: 'course',
      l: 'Course / Module',
      sortable: false,
      render: (r) => (
        <span className="fs12">
          <span className="mono">{r.course.code}</span> · {r.course.title}
          <div className="muted">Module {r.courseModule.moduleNumber} · {r.courseModule.title}</div>
        </span>
      ),
    },
    { k: 'status', l: 'Stage', w: '110px', render: (r) => <CurriculumStatusBadge status={r.status} /> },
    { k: 'completeness', l: 'Completeness', sortable: false, render: (r) => <CompletenessBadge completeness={r.completeness} /> },
    { k: 'isActive', l: 'Status', w: '100px', sortable: false, render: (r) => (showingDeleted ? <Badge tone="red">Deleted</Badge> : <MasterStatusBadge isActive={r.isActive} />) },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${variantName(r)}`} onClick={() => go(`${LIST}/${r.id}`)}><Icon name="eye" /></button>
          {r.status !== 'RETIRED' ? (
            <Can action="updateLmsTrackVariant">
              <button type="button" className="btn xs" title="Edit" aria-label={`Edit ${variantName(r)}`} onClick={() => go(`${LIST}/${r.id}/edit`)}><Icon name="edit" /></button>
            </Can>
          ) : null}
          <Can action="updateLmsTrackVariant">
            <StatusToggle compact isActive={r.isActive} name={variantName(r)} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          {/* A draft is deleted (archived); a published variant is retired from its page, never deleted. */}
          {r.status === 'DRAFT' ? (
            <Can action="deleteLmsTrackVariant">
              <button type="button" className="btn xs" title="Delete" aria-label={`Delete ${variantName(r)}`} style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
            </Can>
          ) : null}
        </div>
      ),
    },
  ];
  /* A deleted variant cannot be opened or edited (the API answers 404): its only action is Restore. */
  const restoreColumn: MasterColumn<ApiTrackVariant> = {
    k: 'actions',
    l: 'Action',
    sortable: false,
    render: (r) => (
      <Can action="deleteLmsTrackVariant">
        <button type="button" className="btn xs" aria-label={`Restore ${variantName(r)}`} disabled={busy} onClick={() => setRestoringRow(r)}>Restore</button>
      </Can>
    ),
  };
  const shownColumns = showingDeleted ? [...columns.filter((c) => c.k !== 'actions'), restoreColumn] : columns;

  const filtered = q.search !== '' || q.status !== '' || q.courseId !== '' || q.trackId !== '' || q.variantStatus !== '' || q.completeness !== '';
  const courseFeed = (courses.data ?? []).map((c) => ({ id: c.id, name: c.title, code: c.code }));
  const selectedCourse = courses.data?.find((c) => c.id === q.courseId);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Track Variant Master' }]}
        title="Track Variant Master"
        sub="Module 3 variants of the technology tracks (T01–T12): seven phases, 22 or 23 track modules, 12 or 13 OFT cards, six readiness gates and the assessment framework of each track."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createLmsTrackVariant">
              <button type="button" className="btn primary" onClick={() => go(q.courseId ? `${LIST}/create?courseId=${encodeURIComponent(q.courseId)}` : `${LIST}/create`)}>
                <Icon name="plus" />Add Track Variant
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: selectedCourse ? `Variants of ${selectedCourse.code}` : 'Total variants', value: stats.data?.total, tone: 'b' },
          { label: 'Published', value: stats.data?.published, tone: 'g', title: 'Published variants (the proxy for inclusion in a content release)' },
          { label: 'Draft', value: stats.data?.draft, tone: 'a', title: 'Variants still being built' },
          { label: 'Incomplete', value: stats.data?.incomplete, tone: 'r', title: 'Variants missing items of the Module 3 shape: they cannot be published' },
        ]}
      />

      <FilterBar
        id="lms-track-variants"
        fields={[
          { k: 'completeness', l: 'Completeness', options: COMPLETENESS_OPTIONS },
          {
            k: 'trackId',
            l: 'Track',
            options: geoFilterOptions({ options: tracks.data ?? [], loading: tracks.loading, allLabel: 'All tracks', selected: q.trackId }),
          },
          {
            k: 'courseId',
            l: 'Course',
            options: geoFilterOptions({ options: courseFeed, loading: courses.loading, allLabel: 'All courses', selected: q.courseId }),
          },
          { k: 'variantStatus', l: 'Stage', options: VARIANT_STATUS_OPTIONS },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ completeness: q.completeness, trackId: q.trackId, courseId: q.courseId, variantStatus: q.variantStatus, status: q.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<TrackVariantQuery>)}
        onReset={reset}
        extra={
          /* The deleted variants, to restore one: for those who may delete (and so restore) variants. */
          <Can action="deleteLmsTrackVariant">
            <span className="f ac gp8 fs12">
              <button
                type="button"
                role="switch"
                aria-checked={q.deleted}
                aria-label="Show deleted"
                className={'switch sm' + (q.deleted ? ' on' : '')}
                onClick={() => patch({ deleted: !q.deleted })}
              />
              Show deleted
            </span>
          </Can>
        }
      />

      {archived ? (
        <div className="callout c-ok mb14" role="status">
          <div>
            The track variant <b>{variantName(archived)}</b> was archived. Its curriculum is kept.{' '}
            <Can action="deleteLmsTrackVariant">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setRestoring(true)}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => setArchived(null)}>Dismiss</button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-h">
          <h3>{showingDeleted ? 'Deleted track variants' : 'Track variants'} <span className="sub">live from the backend</span></h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <MasterTable
          columns={shownColumns}
          rows={rows}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={q}
          onQuery={patch}
          onRetry={reload}
          searchLabel="track or course"
          emptyMsg={
            showingDeleted
              ? filtered ? 'No deleted track variant matches the current search and filters.' : 'No track variant has been deleted.'
              : filtered ? 'No track variant matches the current search and filters.' : 'No track variants have been added yet. Use Add Track Variant to create the first one.'
          }
          rowLink={can('viewLmsTrackVariants') && !showingDeleted ? (r) => `${LIST}/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate track variant' : 'Activate track variant'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} the track variant ${variantName(confirming)}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => trackVariantService.setStatus(row.id, !row.isActive), row.isActive ? 'Track variant deactivated' : 'Track variant activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete track variant"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete the draft track variant ${variantName(deleting)} of ${deleting.course.code}? It is archived (soft-deleted) with its curriculum and kept for audit history; it can be restored.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const row = deleting;
            run(() => trackVariantService.remove(row.id), 'Track variant deleted', async () => {
              setDeleting(null);
              setArchived(row);
              await reload();
            });
          }}
        />
      ) : null}
      {restoring && archived ? (
        <ConfirmModal
          title="Restore track variant"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the track variant ${variantName(archived)}? It comes back inactive, with its curriculum. It cannot be restored while its module is deleted or another variant now uses the same module and track.`}
          onClose={() => setRestoring(false)}
          onConfirm={() => {
            const row = archived;
            run(() => trackVariantService.restore(row.id), 'Track variant restored (inactive)', async () => {
              setRestoring(false);
              setArchived(null);
              await reload();
            });
          }}
        />
      ) : null}
      {restoringRow ? (
        <ConfirmModal
          title="Restore track variant"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the track variant ${variantName(restoringRow)} of ${restoringRow.course.code}? It comes back inactive, with its curriculum. It cannot be restored while its module is deleted or another variant now uses the same module and track.`}
          onClose={() => setRestoringRow(null)}
          onConfirm={() => {
            const row = restoringRow;
            /* A 409 (module and track taken meanwhile) is toasted with the server's message; the dialog stays open. */
            run(() => trackVariantService.restore(row.id), 'Track variant restored (inactive)', async () => {
              setRestoringRow(null);
              if (archived?.id === row.id) setArchived(null);
              await reload();
            });
          }}
        />
      ) : null}
    </div>
  );
}
