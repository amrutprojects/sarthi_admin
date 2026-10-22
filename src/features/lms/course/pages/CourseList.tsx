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
import { lmsOptions } from '../../options';
import CourseStatusBadge from '../components/CourseStatusBadge';
import { courseService, type LmsCourseQuery } from '../services/courseService';
import { COURSE_STATUSES, COURSE_STATUS_LABELS, type ApiLmsCourse, type CourseStatus } from '../types/course.types';

const LIST = '/lms/courses';

const LIFECYCLE_OPTIONS: Option[] = [{ v: '', l: 'All course statuses' }, ...COURSE_STATUSES.map((s) => ({ v: s, l: COURSE_STATUS_LABELS[s] }))];

const isLifecycle = (v: string | null): v is CourseStatus => !!v && (COURSE_STATUSES as readonly string[]).includes(v);

/*
 * Course Master listing (L-06 / UI-315): search course code or title; filter by entity, course status and
 * Active / Inactive; sorting and paging — all served by the backend. Deep links: ?entityId= and ?status=.
 */
export default function CourseList() {
  usePageTitle('Course Master');
  const go = useGo();
  const can = useCan();
  const [params] = useSearchParams();
  const urlEntityId = params.get('entityId') ?? '';
  const urlStatus = params.get('status');
  const initial = useMemo<LmsCourseQuery>(
    () => ({ ...masterQuery('code'), entityId: urlEntityId, lifecycle: isLifecycle(urlStatus) ? urlStatus : '', deleted: false }),
    [urlEntityId, urlStatus],
  );
  const { query: q, patch, reset } = useMasterQuery<LmsCourseQuery>(initial);
  const page = useApiData(() => courseService.list(q), [q]);
  const entities = useApiData(() => lmsOptions.entities(), []);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState<ApiLmsCourse | null>(null);
  const [retiring, setRetiring] = useState<ApiLmsCourse | null>(null);
  const [deleting, setDeleting] = useState<ApiLmsCourse | null>(null);
  /* The last course deleted here, offered for restore until another one is deleted or it is restored. */
  const [archived, setArchived] = useState<ApiLmsCourse | null>(null);
  const [restoring, setRestoring] = useState(false);
  /* A row of the "Show deleted" list whose Restore asks for confirmation. */
  const [restoringRow, setRestoringRow] = useState<ApiLmsCourse | null>(null);

  /* KPI totals, counted by the backend. They follow the entity filter (the scope) but not search or the other filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { entityId: q.entityId };
      const [total, draft, published, retired] = await Promise.all([
        courseService.count(scope),
        courseService.count({ ...scope, lifecycle: 'DRAFT' }),
        courseService.count({ ...scope, lifecycle: 'PUBLISHED' }),
        courseService.count({ ...scope, lifecycle: 'RETIRED' }),
      ]);
      return { total, draft, published, retired };
    },
    [statsKey, q.entityId],
  );

  const rows = page.data?.items ?? [];
  /* The rows on screen came from the deleted=true listing (not merely the toggle, which runs ahead of the reload). */
  const showingDeleted = page.data?.deleted === true;
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiLmsCourse>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'code', l: 'Course Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    { k: 'title', l: 'Course Title', render: (r) => <b className="lnk">{r.title}</b> },
    {
      k: 'entity',
      l: 'Entity',
      sortable: false,
      render: (r) => (r.entity ? <span className="fs12">{r.entity.name} <span className="mono muted">({r.entity.code})</span></span> : <span className="muted fs12">—</span>),
    },
    { k: 'languages', l: 'Languages', sortable: false, render: (r) => <span className="mono fs12">{r.languages.join(' · ') || '—'}</span> },
    { k: 'status', l: 'Course Status', render: (r) => <CourseStatusBadge status={r.status} /> },
    {
      k: 'release',
      l: 'Latest Release',
      sortable: false,
      render: (r) => (r.publishedReleaseNo != null ? <span className="fs12">Release {r.publishedReleaseNo}</span> : <span className="muted fs12">None yet</span>),
    },
    { k: 'isActive', l: 'Active', sortable: false, render: (r) => (showingDeleted ? <Badge tone="red">Deleted</Badge> : <MasterStatusBadge isActive={r.isActive} />) },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${r.title}`} onClick={() => go(`${LIST}/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateLmsCourse">
            <button type="button" className="btn xs" title="Edit" aria-label={`Edit ${r.title}`} onClick={() => go(`${LIST}/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateLmsCourse">
            <StatusToggle compact isActive={r.isActive} name={r.title} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          {/* Retire is for a published course; a draft is deleted instead (F-LMS-06-06, L-06 "retired, never deleted"). */}
          {r.status === 'PUBLISHED' ? (
            <Can action="deleteLmsCourse">
              <button type="button" className="btn xs" title="Retire" aria-label={`Retire ${r.title}`} style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setRetiring(r)}>Retire</button>
            </Can>
          ) : null}
          {r.status === 'DRAFT' ? (
            <Can action="deleteLmsCourse">
              <button type="button" className="btn xs" title="Delete" aria-label={`Delete ${r.title}`} style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
            </Can>
          ) : null}
        </div>
      ),
    },
  ];
  /* A deleted course cannot be opened or edited (the API answers 404): its only action is Restore. */
  const restoreColumn: MasterColumn<ApiLmsCourse> = {
    k: 'actions',
    l: 'Action',
    sortable: false,
    render: (r) => (
      <Can action="deleteLmsCourse">
        <button type="button" className="btn xs" aria-label={`Restore ${r.title}`} disabled={busy} onClick={() => setRestoringRow(r)}>Restore</button>
      </Can>
    ),
  };
  const shownColumns = showingDeleted ? [...columns.filter((c) => c.k !== 'actions'), restoreColumn] : columns;

  const filtered = q.search !== '' || q.status !== '' || q.entityId !== '' || q.lifecycle !== '';
  const selectedEntity = entities.data?.find((e) => e.id === q.entityId);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Course Master' }]}
        title="Course Master"
        sub="Courses of each LMS entity, with their four programme modules. A course is a draft until its first content release is published."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createLmsCourse">
              <button type="button" className="btn primary" onClick={() => go(q.entityId ? `${LIST}/create?entityId=${encodeURIComponent(q.entityId)}` : `${LIST}/create`)}>
                <Icon name="plus" />Add Course
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: selectedEntity ? `Courses of ${selectedEntity.name}` : 'Total courses', value: stats.data?.total, tone: 'b' },
          { label: 'Draft', value: stats.data?.draft, tone: 'a', title: 'Not yet in a published content release' },
          { label: 'Published', value: stats.data?.published, tone: 'g', title: 'In a published content release' },
          { label: 'Retired', value: stats.data?.retired, tone: 'r', title: 'Retired, kept for history' },
        ]}
      />

      <FilterBar
        id="lms-courses"
        fields={[
          {
            k: 'entityId',
            l: 'Entity',
            options: geoFilterOptions({ options: entities.data ?? [], loading: entities.loading, allLabel: 'All entities', selected: q.entityId }),
          },
          { k: 'lifecycle', l: 'Course Status', options: LIFECYCLE_OPTIONS },
          { k: 'status', l: 'Active', options: STATUS_OPTIONS },
        ]}
        value={{ entityId: q.entityId, lifecycle: q.lifecycle, status: q.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<LmsCourseQuery>)}
        onReset={reset}
        extra={
          /* The deleted courses, to restore one: for those who may delete (and so restore) courses. */
          <Can action="deleteLmsCourse">
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
            The course <b>{archived.title}</b> ({archived.code}) was deleted.{' '}
            <Can action="deleteLmsCourse">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setRestoring(true)}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => setArchived(null)}>Dismiss</button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-h">
          <h3>{showingDeleted ? 'Deleted courses' : 'Courses'} <span className="sub">live from the backend</span></h3>
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
          searchLabel="course code or title"
          emptyMsg={
            showingDeleted
              ? filtered ? 'No deleted course matches the current search and filters.' : 'No course has been deleted.'
              : filtered ? 'No course matches the current search and filters.' : 'No courses have been added yet. Use Add Course to create the first one.'
          }
          rowLink={can('viewLmsCourses') && !showingDeleted ? (r) => `${LIST}/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate course' : 'Activate course'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} the course ${confirming.title} (${confirming.code})?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => courseService.setStatus(row.id, !row.isActive), row.isActive ? 'Course deactivated' : 'Course activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {retiring ? (
        <ConfirmModal
          title="Retire course"
          danger
          busy={busy}
          confirmLabel="Yes, retire"
          message={`Retire the course ${retiring.title} (${retiring.code})? A retired course stays in its published releases and is kept for history, but is no longer offered for new modules or track variants. This cannot be undone here.`}
          onClose={() => setRetiring(null)}
          onConfirm={() => {
            const row = retiring;
            run(() => courseService.retire(row.id), 'Course retired', async () => {
              setRetiring(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete course"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete the draft course ${deleting.title} (${deleting.code})? It is archived (soft-deleted) and kept for audit history; it can be restored. A course with programme modules cannot be deleted.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const row = deleting;
            run(() => courseService.remove(row.id), 'Course deleted', async () => {
              setDeleting(null);
              setArchived(row);
              await reload();
            });
          }}
        />
      ) : null}
      {restoring && archived ? (
        <ConfirmModal
          title="Restore course"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the course ${archived.title} (${archived.code})? It comes back inactive. It cannot be restored while its entity is deleted or another course now uses its code.`}
          onClose={() => setRestoring(false)}
          onConfirm={() => {
            const row = archived;
            run(() => courseService.restore(row.id), 'Course restored (inactive)', async () => {
              setRestoring(false);
              setArchived(null);
              await reload();
            });
          }}
        />
      ) : null}
      {restoringRow ? (
        <ConfirmModal
          title="Restore course"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the course ${restoringRow.title} (${restoringRow.code})? It comes back inactive. It cannot be restored while its entity is deleted or another course now uses its code.`}
          onClose={() => setRestoringRow(null)}
          onConfirm={() => {
            const row = restoringRow;
            /* A 409 (code taken meanwhile, entity deleted) is toasted with the server's message; the dialog stays open. */
            run(() => courseService.restore(row.id), 'Course restored (inactive)', async () => {
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
