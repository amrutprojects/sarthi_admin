import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { GenBadge, Html, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import CourseStatusBadge from '../components/CourseStatusBadge';
import { courseService } from '../services/courseService';
import { COURSE_STATUSES, MODULE_NUMBERS, type ApiLmsCourseDetail, type CourseModuleSummary, type CourseStatus } from '../types/course.types';
import { hasMarkup, isAllowedRichText, isCodeLocked } from '../validation/course.validation';

const LIST = '/lms/courses';
/* Module Master listing, filtered by course (router: lmsCourseModuleList). */
const MODULES = '/lms/modules';

const isCourseStatus = (s: string): s is CourseStatus => (COURSE_STATUSES as readonly string[]).includes(s);
const hours = (n: number | null) => (n == null ? '—' : String(n));
const oftRange = (m: CourseModuleSummary) =>
  m.oftHoursMin == null && m.oftHoursMax == null ? '—' : m.oftHoursMin === m.oftHoursMax ? hours(m.oftHoursMin) : `${hours(m.oftHoursMin)}–${hours(m.oftHoursMax)}`;
const listNumbers = (n: number[]) => (n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`);

/* The description as the server stored it: allow-listed markup is rendered, anything else is shown as plain text. */
function Description({ text }: { text: string | null }) {
  if (!text) return <p className="muted fs12" style={{ margin: 0 }}>No description.</p>;
  if (hasMarkup(text) && isAllowedRichText(text)) return <Html html={text} className="fs13" />;
  return <p className="fs13" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>;
}

/* Modules 1 to 4: the saved ones and a "missing" row for each number the course still lacks (UI-316). */
function ModuleSummary({ course }: { course: ApiLmsCourseDetail }) {
  const go = useGo();
  const rows = [
    ...course.modules.map((m) => ({ n: m.moduleNumber, m })),
    ...course.missingModuleNumbers.map((n) => ({ n, m: null as CourseModuleSummary | null })),
  ].sort((a, b) => a.n - b.n);

  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>
          Programme modules <span className="sub">{course.modules.length} of {MODULE_NUMBERS.length}</span>
        </h3>
        <Can action="viewLmsCourseModules">
          <button type="button" className="btn sm" onClick={() => go(`${MODULES}?courseId=${encodeURIComponent(course.id)}`)}>
            Open in Module Master
          </button>
        </Can>
      </div>
      <div className="card-b" style={{ paddingBottom: 0 }}>
        {course.hasAllModules ? (
          <div className="callout c-ok mb14" role="status">
            <div>
              <b>All four modules are present. </b>
              The course has modules 1 to 4, so it can be included in a content release.
            </div>
          </div>
        ) : (
          <div className="callout c-warn mb14" role="status">
            <div>
              <b>
                Missing module{course.missingModuleNumbers.length === 1 ? '' : 's'} {listNumbers(course.missingModuleNumbers)}.{' '}
              </b>
              A course cannot be included in a release unless it has modules 1 to 4. Modules are added in the Module Master.
            </div>
          </div>
        )}
      </div>
      <div className="tbl-wrap">
        <table className="tbl" aria-label="Programme modules">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Module No.</th>
              <th>Title</th>
              <th className="num">Core Hours</th>
              <th className="num">OFT Hours</th>
              <th>Syllabus Reference</th>
              <th>Module Status</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ n, m }) =>
              m ? (
                <tr key={m.id} className="norow">
                  <td className="mono fs12">{n}</td>
                  <td>{m.title}</td>
                  <td className="num fs12">{hours(m.coreHours)}</td>
                  <td className="num fs12">{oftRange(m)}</td>
                  <td className="fs12">{m.syllabusRef ?? <span className="muted">—</span>}</td>
                  <td>{isCourseStatus(m.status) ? <CourseStatusBadge status={m.status} /> : <GenBadge status={m.status} />}</td>
                  <td><MasterStatusBadge isActive={m.isActive} /></td>
                </tr>
              ) : (
                <tr key={`missing-${n}`} className="norow">
                  <td className="mono fs12">{n}</td>
                  <td colSpan={6} className="muted fs12">Missing: module {n} has not been added yet.</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* View Course — read-only detail page with the lifecycle, the module summary and what references the course. */
export default function CourseView() {
  usePageTitle('Course');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => courseService.get(id), [id]);
  /* Labels for the language codes, from the entity's language list; a code it does not list is shown as the code. */
  const entityId = detail.data?.entityId;
  const languages = useApiData(() => (entityId ? courseService.languages(entityId) : Promise.resolve(null)), [entityId]);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  /* Deleted from this page: the record is gone from the API (404), so the page keeps the last copy and offers Restore. */
  const [archived, setArchived] = useState(false);

  const course = detail.data;
  const languageLabel = (code: string) => {
    const found = languages.data?.languages.find((l) => l.code === code);
    return found ? `${found.label} (${found.code})` : code;
  };

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Course Master', link: LIST }, { l: course ? course.title : 'Course' }]}
        title={course ? course.title : 'Course'}
        badge={course ? <span className="tag">{course.code}</span> : undefined}
        sub={course ? `${course.entity ? course.entity.name : 'Unknown entity'} · course status set by the system` : undefined}
        back={<BackButton to={LIST} />}
        actions={
          course && !archived ? (
            <div className="f ac gp8 wrap">
              <Can action="updateLmsCourse">
                <button type="button" className="btn" disabled={busy} onClick={() => setConfirming(true)}>
                  {course.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </Can>
              {course.status === 'PUBLISHED' ? (
                <Can action="deleteLmsCourse">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setRetiring(true)}>Retire</button>
                </Can>
              ) : null}
              {course.status === 'DRAFT' ? (
                <Can action="deleteLmsCourse">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>Delete</button>
                </Can>
              ) : null}
              <Can action="updateLmsCourse">
                <button type="button" className="btn primary" onClick={() => go(`${LIST}/${course.id}/edit`)}>Edit</button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading && !course} error={detail.error} onRetry={() => void detail.reload()} />

      {course && archived ? (
        <div className="callout c-warn mb14" role="status">
          <div>
            <b>This course has been deleted. </b>
            It is no longer listed or offered; it can be restored (it comes back inactive).{' '}
            <Can action="deleteLmsCourse">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setRestoring(true)}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => go(LIST)}>Back to the list</button>
          </div>
        </div>
      ) : null}

      {course ? (
        <>
          {!archived && !course.entity ? (
            <div className="callout c-warn mb14" role="status">
              <div>The entity of this course can no longer be read.</div>
            </div>
          ) : null}

          <div className="grid g2">
            <div className="card">
              <div className="card-h"><h3>Course details</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Course title', course.title],
                    [
                      'Course code',
                      <span>
                        <span className="mono">{course.code}</span>
                        {isCodeLocked(course.status) ? <span className="muted fs12"> · locked (in a published release)</span> : null}
                      </span>,
                    ],
                    ['Entity', course.entity ? <span>{course.entity.name} <span className="mono fs12">({course.entity.code})</span></span> : '—'],
                    ['Languages', course.languages.length ? course.languages.map(languageLabel).join(', ') : '—'],
                    ['Active', archived ? 'Deleted' : <MasterStatusBadge isActive={course.isActive} />],
                    ['Created', fmtDateTime(course.createdAt)],
                    ['Last updated', fmtDateTime(course.updatedAt)],
                  ]}
                />
                <h4 className="fs12 muted" style={{ margin: '12px 0 6px' }}>Description</h4>
                <Description text={course.description} />
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Lifecycle and content release</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Course status', <CourseStatusBadge status={course.status} />],
                    ['Latest published release', course.publishedReleaseNo != null ? `Release ${course.publishedReleaseNo}` : 'None yet'],
                    ['Release record', course.publishedReleaseId ? <span className="mono fs12">{course.publishedReleaseId}</span> : '—'],
                  ]}
                />
                <p className="muted fs12" style={{ marginTop: 8 }}>
                  The status is set by the system: Draft when the course is created, Published by its first published content release, Retired by
                  the Retire action. Only a draft course's code can change; a draft is deleted, a published course is retired, never deleted.
                </p>
                <div className="callout c-info" style={{ marginTop: 10 }}>
                  <div>
                    <b>Not available yet. </b>
                    Content releases (L-30) are not built in this system, so no course becomes Published and the release fields stay empty.
                  </div>
                </div>

                <h4 className="fs12 muted" style={{ margin: '14px 0 6px' }}>Usage</h4>
                {course.references.length ? (
                  <>
                    <KvList pairs={course.references.map((r) => [r.label, 'Blocks deletion'])} />
                    <p className="muted fs12" style={{ marginTop: 8 }}>This course cannot be deleted while LMS records use it.</p>
                  </>
                ) : (
                  <p className="muted fs12" style={{ margin: 0 }}>No LMS record uses this course yet.</p>
                )}
              </div>
            </div>
          </div>

          <ModuleSummary course={course} />
        </>
      ) : null}

      {confirming && course ? (
        <ConfirmModal
          title={course.isActive ? 'Deactivate course' : 'Activate course'}
          busy={busy}
          confirmLabel={course.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${course.isActive ? 'deactivate' : 'activate'} the course ${course.title} (${course.code})?`}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => courseService.setStatus(course.id, !course.isActive), course.isActive ? 'Course deactivated' : 'Course activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
      {retiring && course ? (
        <ConfirmModal
          title="Retire course"
          danger
          busy={busy}
          confirmLabel="Yes, retire"
          message={`Retire the course ${course.title} (${course.code})? A retired course stays in its published releases and is kept for history, but is no longer offered for new modules or track variants. This cannot be undone here.`}
          onClose={() => setRetiring(false)}
          onConfirm={() =>
            run(() => courseService.retire(course.id), 'Course retired', async () => {
              setRetiring(false);
              await detail.reload();
            })
          }
        />
      ) : null}
      {deleting && course ? (
        <ConfirmModal
          title="Delete course"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete the draft course ${course.title} (${course.code})? It is archived (soft-deleted) and kept for audit history; it can be restored. A course with programme modules cannot be deleted.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(() => courseService.remove(course.id), 'Course deleted', () => {
              setDeleting(false);
              setArchived(true);
            })
          }
        />
      ) : null}
      {restoring && course ? (
        <ConfirmModal
          title="Restore course"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the course ${course.title} (${course.code})? It comes back inactive. It cannot be restored while its entity is deleted or another course now uses its code.`}
          onClose={() => setRestoring(false)}
          onConfirm={() =>
            run(() => courseService.restore(course.id), 'Course restored (inactive)', async () => {
              setRestoring(false);
              setArchived(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}
