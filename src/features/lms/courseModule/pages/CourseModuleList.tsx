import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Badge, FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import type { Option } from '../../../../types/legacy';
import { listBackTarget } from '../../../cms/backTarget';
import BackButton from '../../../cms/components/BackButton';
import MasterKpis from '../../../cms/components/MasterKpis';
import { STATUS_OPTIONS } from '../../../cms/components/MasterFilters';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn } from '../../../cms/components/MasterTable';
import StatusToggle from '../../../cms/components/StatusToggle';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle, useMasterQuery } from '../../../cms/useMasterQuery';
import CreatePrescribedDialog from '../components/CreatePrescribedDialog';
import PrescribedModulesCard from '../components/PrescribedModulesCard';
import { NOT_DELETABLE, deliveryText, fmtHours, moduleLabel, oftText, releaseLabel } from '../components/format';
import { lmsOptions } from '../../options';
import { courseLabel, courseModuleService, type CourseModuleQuery } from '../services/courseModuleService';
import {
  MODULE_NUMBERS, MODULE_STATUSES, MODULE_STATUS_LABELS, MODULE_STATUS_TONES, type ApiCourseModule,
} from '../types/courseModule.types';

const LIST = '/lms/modules';

const MODULE_OPTIONS: Option[] = [{ v: '', l: 'All modules' }, ...MODULE_NUMBERS.map((n) => ({ v: String(n), l: moduleLabel(n) }))];
const LIFECYCLE_OPTIONS: Option[] = [{ v: '', l: 'All lifecycle states' }, ...MODULE_STATUSES.map((s) => ({ v: s, l: MODULE_STATUS_LABELS[s] }))];

/* The listing with no search and no filters; courseId comes from a ?courseId= deep link (the Course view links here). */
const emptyQuery = (courseId = ''): CourseModuleQuery => ({ ...masterQuery('moduleNumber'), courseId, moduleNumber: '', lifecycle: '', deleted: false });

/* "Ready", or how many "Required before release" fields are still empty. */
function Readiness({ missing }: { missing: string[] }) {
  if (!missing.length) return <Badge tone="green">Ready</Badge>;
  return (
    <span title={`Still empty: ${missing.map(releaseLabel).join('; ')}`}>
      <Badge tone="amber">{missing.length} missing</Badge>
    </span>
  );
}

/*
 * Module Master listing (L-06 / FR-306): the four programme modules of each course. Search by title, filter by
 * course (also from ?courseId=), module number, lifecycle state and status; sorting and paging by the backend.
 * Below the list, the four prescribed modules of the final syllabus documents.
 */
export default function CourseModuleList() {
  usePageTitle('Module Master');
  const go = useGo();
  const can = useCan();
  const [params, setSearchParams] = useSearchParams();
  const urlCourseId = params.get('courseId') ?? '';

  const initial = useMemo<CourseModuleQuery>(() => emptyQuery(urlCourseId), [urlCourseId]);
  const { query: q, patch } = useMasterQuery<CourseModuleQuery>(initial);
  const page = useApiData(() => courseModuleService.list(q), [q]);
  const courses = useApiData(() => lmsOptions.courses(), []);
  const prescribed = useApiData(() => courseModuleService.prescribed(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiCourseModule | null>(null);
  const [confirming, setConfirming] = useState<ApiCourseModule | null>(null);
  const [creatingPrescribed, setCreatingPrescribed] = useState(false);
  /* A row of the "Show deleted" list whose Restore asks for confirmation. */
  const [restoring, setRestoring] = useState<ApiCourseModule | null>(null);

  /* A fresh ?courseId= (clicking through from a course) replaces the filter; the mount value is already in. */
  const appliedCourseId = useRef(urlCourseId);
  useEffect(() => {
    if (appliedCourseId.current === urlCourseId) return;
    appliedCourseId.current = urlCourseId;
    patch({ courseId: urlCourseId });
  }, [urlCourseId, patch]);

  /* Reset clears every filter, the deep-linked course included (?courseId= leaves the URL as well). */
  const resetFilters = () => {
    if (urlCourseId) {
      appliedCourseId.current = '';
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('courseId');
        return next;
      }, { replace: true });
    }
    patch(emptyQuery());
  };

  /* KPI totals, counted by the backend. They follow the course filter (the page is then about that course), nothing else. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = q.courseId ? { courseId: q.courseId } : {};
      const [total, active, draft, published] = await Promise.all([
        courseModuleService.count(scope),
        courseModuleService.count({ ...scope, isActive: 'true' }),
        courseModuleService.count({ ...scope, status: 'DRAFT' }),
        courseModuleService.count({ ...scope, status: 'PUBLISHED' }),
      ]);
      return { total, active, inactive: total - active, draft, published };
    },
    [statsKey, q.courseId],
  );
  /* The modules of the filtered course (1–4), to show which ones it still lacks. */
  const coverage = useApiData(() => (q.courseId ? courseModuleService.forCourse(q.courseId) : Promise.resolve(null)), [statsKey, q.courseId]);

  const rows = page.data?.items ?? [];
  /* The rows on screen came from the deleted=true listing (not merely the toggle, which runs ahead of the reload). */
  const showingDeleted = page.data?.deleted === true;
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  /* The filtered course: from the feed, else from a listed row (an inactive or retired course is not in the feed). */
  const feedCourse = (courses.data ?? []).find((c) => c.id === q.courseId);
  const rowCourse = rows.find((r) => r.courseId === q.courseId)?.course ?? coverage.data?.[0]?.course ?? null;
  const filteredCourseName = feedCourse ? courseLabel(feedCourse) : rowCourse ? courseLabel(rowCourse) : null;
  const courseOptions: Option[] = courses.loading
    ? [{ v: '', l: 'Loading…' }]
    : [{ v: '', l: 'All courses' }, ...(courses.data ?? []).map((c) => ({ v: c.id, l: courseLabel(c) }))];
  if (q.courseId && !courses.loading && !feedCourse) {
    courseOptions.push({ v: q.courseId, l: rowCourse ? `${courseLabel(rowCourse)} (inactive or retired)` : 'Selected course (inactive or retired)' });
  }

  const present = new Set((coverage.data ?? []).map((m) => m.moduleNumber));
  const missingNumbers = MODULE_NUMBERS.filter((n) => !present.has(n));

  const columns: MasterColumn<ApiCourseModule>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'moduleNumber', l: 'Module', w: '96px', render: (r) => <span className="tag">{moduleLabel(r.moduleNumber)}</span> },
    { k: 'title', l: 'Title', render: (r) => <b className="lnk">{r.title}</b> },
    {
      k: 'course',
      l: 'Course',
      sortable: false,
      render: (r) =>
        r.course ? (
          <span className="fs12">
            <span className="mono">{r.course.code}</span> <span className="muted">{r.course.title}</span>
          </span>
        ) : (
          <span className="muted fs12">Unknown course</span>
        ),
    },
    { k: 'coreHours', l: 'Core hours', sortable: false, render: (r) => <span className="fs12">{fmtHours(r.coreHours)}</span> },
    { k: 'delivery', l: 'Delivery pattern', sortable: false, render: (r) => <span className="fs12">{deliveryText(r)}</span> },
    { k: 'oft', l: 'OFT hours', sortable: false, render: (r) => <span className="fs12">{oftText(r)}</span> },
    { k: 'release', l: 'Release readiness', sortable: false, render: (r) => <Readiness missing={r.missingForRelease} /> },
    { k: 'lifecycle', l: 'Lifecycle', sortable: false, render: (r) => <Badge tone={MODULE_STATUS_TONES[r.status]}>{MODULE_STATUS_LABELS[r.status]}</Badge> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => (showingDeleted ? <Badge tone="red">Deleted</Badge> : <MasterStatusBadge isActive={r.isActive} />) },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${r.title}`} onClick={() => go(`${LIST}/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateLmsCourseModule">
            <button type="button" className="btn xs" title="Edit" aria-label={`Edit ${r.title}`} onClick={() => go(`${LIST}/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateLmsCourseModule">
            <StatusToggle compact isActive={r.isActive} name={r.title} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteLmsCourseModule">
            <button
              type="button"
              className="btn xs"
              title={r.status === 'DRAFT' ? 'Delete' : NOT_DELETABLE}
              aria-label={`Delete ${r.title}`}
              style={{ color: 'var(--red)' }}
              disabled={r.status !== 'DRAFT'}
              onClick={() => setDeleting(r)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];
  /* A deleted module cannot be opened or edited (the API answers 404): its only action is Restore. */
  const restoreColumn: MasterColumn<ApiCourseModule> = {
    k: 'actions',
    l: 'Action',
    sortable: false,
    render: (r) => (
      <Can action="deleteLmsCourseModule">
        <button type="button" className="btn xs" aria-label={`Restore ${r.title}`} disabled={busy} onClick={() => setRestoring(r)}>Restore</button>
      </Can>
    ),
  };
  const shownColumns = showingDeleted ? [...columns.filter((c) => c.k !== 'actions'), restoreColumn] : columns;

  const filtered = q.search !== '' || q.status !== '' || q.courseId !== '' || q.moduleNumber !== '' || q.lifecycle !== '';
  const addPath = q.courseId ? `${LIST}/create?courseId=${encodeURIComponent(q.courseId)}` : `${LIST}/create`;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Module Master' }]}
        title="Module Master"
        sub="The four programme modules of each course: core hours, delivery pattern, OFT hours and the syllabus reference they come from."
        back={<BackButton to={listBackTarget([[urlCourseId, '/lms/courses', can('viewLmsCourses')]])} />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createLmsCourseModule">
              <button type="button" className="btn" onClick={() => setCreatingPrescribed(true)}>Create missing prescribed modules</button>
            </Can>
            <Can action="createLmsCourseModule">
              <button type="button" className="btn primary" onClick={() => go(addPath)}>
                <Icon name="plus" />Add Module
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: 'Total modules', value: stats.data?.total, tone: 'b', sub: filteredCourseName ? `in ${filteredCourseName}` : 'all courses' },
          { label: 'Active', value: stats.data?.active, tone: 'g', sub: stats.data ? `${stats.data.inactive} inactive` : undefined },
          { label: 'Draft', value: stats.data?.draft, tone: 'a', title: 'Not in a published content release yet' },
          { label: 'Published', value: stats.data?.published, tone: 'v', title: 'In a published content release' },
        ]}
      />

      <FilterBar
        id="lms-modules"
        fields={[
          { k: 'courseId', l: 'Course', options: courseOptions },
          { k: 'moduleNumber', l: 'Module', options: MODULE_OPTIONS },
          { k: 'lifecycle', l: 'Lifecycle', options: LIFECYCLE_OPTIONS },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ courseId: q.courseId, moduleNumber: q.moduleNumber, lifecycle: q.lifecycle, status: q.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<CourseModuleQuery>)}
        onReset={resetFilters}
        extra={
          /* The deleted modules, to restore one: for those who may delete (and so restore) modules. */
          <Can action="deleteLmsCourseModule">
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

      {courses.error ? (
        <div className="callout c-warn mb14" role="status">
          <div>
            The course list could not be loaded ({courses.error.message}).{' '}
            <button type="button" className="btn xs" onClick={() => void courses.reload()}>Retry</button>
          </div>
        </div>
      ) : null}

      {q.courseId && coverage.data ? (
        <div className={'callout mb14 ' + (missingNumbers.length ? 'c-warn' : 'c-ok')} role="status">
          <div>
            <b>{filteredCourseName ?? 'This course'}: </b>
            {missingNumbers.length
              ? `${present.size} of 4 modules. Missing: ${missingNumbers.map(moduleLabel).join(', ')}.`
              : 'all four modules exist.'}
            {missingNumbers.length ? (
              <Can action="createLmsCourseModule">
                {' '}
                <button type="button" className="btn xs" onClick={() => setCreatingPrescribed(true)}>Create missing prescribed modules</button>
              </Can>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-h">
          <h3>{showingDeleted ? 'Deleted modules' : 'Modules'} <span className="sub">live from the backend</span></h3>
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
          searchLabel="module title"
          emptyMsg={
            showingDeleted
              ? filtered ? 'No deleted module matches the current search and filters.' : 'No module has been deleted.'
              : filtered
                ? 'No module matches the current search and filters.'
                : 'No modules have been added yet. Use Add Module, or Create missing prescribed modules for a course.'
          }
          rowLink={can('viewLmsCourseModules') && !showingDeleted ? (r) => `${LIST}/${r.id}` : undefined}
        />
      </div>

      <PrescribedModulesCard data={prescribed.data} loading={prescribed.loading} error={prescribed.error} onRetry={() => void prescribed.reload()} />

      {creatingPrescribed ? (
        <CreatePrescribedDialog
          courses={courses.loading ? null : (courses.data ?? [])}
          initialCourseId={q.courseId}
          onClose={() => setCreatingPrescribed(false)}
          onDone={(result) => {
            setCreatingPrescribed(false);
            if (result.courseId !== q.courseId) patch({ courseId: result.courseId });
            void reload();
          }}
        />
      ) : null}
      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate module' : 'Activate module'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${confirming.isActive ? 'deactivate' : 'activate'} ${moduleLabel(confirming.moduleNumber)}: ${confirming.title}?`}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => courseModuleService.setStatus(row.id, !row.isActive), row.isActive ? 'Module deactivated' : 'Module activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete module"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${moduleLabel(deleting.moduleNumber)}: ${deleting.title}? It is archived (soft-deleted) and kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => courseModuleService.remove(deleting.id), 'Module deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
      {restoring ? (
        <ConfirmModal
          title="Restore module"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore ${moduleLabel(restoring.moduleNumber)}: ${restoring.title}? It comes back inactive. It cannot be restored while its course is deleted or another module of the course now has its number.`}
          onClose={() => setRestoring(null)}
          onConfirm={() => {
            const row = restoring;
            /* A 409 (number taken meanwhile, course deleted) is toasted with the server's message; the dialog stays open. */
            run(() => courseModuleService.restore(row.id), 'Module restored (inactive)', async () => {
              setRestoring(null);
              await reload();
            });
          }}
        />
      ) : null}
    </div>
  );
}
