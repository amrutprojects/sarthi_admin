import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Html, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { NOT_DELETABLE, deliveryText, fmtHours, moduleLabel, oftShare, oftText, releaseLabel } from '../components/format';
import { courseLabel, courseModuleService } from '../services/courseModuleService';
import { MODULE_STATUS_LABELS, MODULE_STATUS_TONES, type ApiCourseModule, type PrescribedModule } from '../types/courseModule.types';
import { DELIVERY_PATTERN_LABELS, patternOf } from '../validation/courseModule.validation';
import { isAllowedRichText } from '../validation/richText';

const LIST = '/lms/modules';

/* "Required before release" (F-LMS-07): what is still empty, as the API reports it in missingForRelease. */
function ReleaseReadiness({ missing }: { missing: string[] }) {
  if (!missing.length) {
    return (
      <div className="callout c-ok mb14" role="status">
        <div><b>Ready for release. </b>Every field required before release is filled.</div>
      </div>
    );
  }
  return (
    <div className="callout c-warn mb14" role="status">
      <div>
        <b>Not ready for release. </b>Still empty and required before release:
        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }} aria-label="Missing for release">
          {missing.map((f) => (
            <li key={f}>{releaseLabel(f)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* The stored description: markup on the allow-list is shown formatted, anything else as plain text. */
function Description({ text }: { text: string | null }) {
  if (!text) return <p className="muted fs12" style={{ margin: 0 }}>No description yet.</p>;
  return isAllowedRichText(text) && /<[a-z]/.test(text) ? <Html html={text} /> : <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>;
}

/* This module's values next to the prescribed ones of the final syllabus documents, differences flagged. */
function PrescribedComparison({ m, p }: { m: ApiCourseModule; p: PrescribedModule }) {
  const rows: [string, string, string][] = [
    ['Title', m.title, p.title],
    ['Core hours', fmtHours(m.coreHours), fmtHours(p.coreHours)],
    ['Delivery pattern', deliveryText(m), deliveryText(p)],
    ['OFT hours', oftText(m), oftText(p)],
  ];
  return (
    <div className="tbl-wrap">
      <table className="tbl" aria-label="Compared with the prescribed values">
        <thead>
          <tr><th>Field</th><th>This module</th><th>Prescribed</th></tr>
        </thead>
        <tbody>
          {rows.map(([label, mine, theirs]) => (
            <tr key={label} className="norow">
              <td className="fs12">{label}</td>
              <td className="fs12">
                {mine}
                {mine !== theirs ? <> <span className="tag">differs</span></> : null}
              </td>
              <td className="fs12 muted">{theirs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* View Module — read-only detail page with release readiness, usage and the prescribed values for comparison. */
export default function CourseModuleView() {
  usePageTitle('Module');
  const { id = '' } = useParams();
  const go = useGo();
  const can = useCan();
  const detail = useApiData(() => courseModuleService.get(id), [id]);
  const prescribed = useApiData(() => courseModuleService.prescribed(), []);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  /* Deleted from this page: the record is gone from the API (404), so the page keeps the last copy and offers Restore. */
  const [archived, setArchived] = useState(false);

  const m = detail.data;
  const name = m ? `${moduleLabel(m.moduleNumber)}: ${m.title}` : 'Module';
  const references = m?.references ?? [];
  const p = m ? prescribed.data?.modules.find((x) => x.moduleNumber === m.moduleNumber) : undefined;

  const courseCell: ReactNode = m?.course ? (
    <span>
      {can('viewLmsCourses') ? (
        <a className="lnk" onClick={() => go(`/lms/courses/${m.course!.id}`)}>{m.course.title}</a>
      ) : (
        m.course.title
      )}{' '}
      <span className="mono fs12">({m.course.code})</span>
    </span>
  ) : (
    'Unknown course'
  );

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Module Master', link: LIST }, { l: name }]}
        title={name}
        badge={m ? <span className="tag">{MODULE_STATUS_LABELS[m.status]}</span> : undefined}
        sub={m?.course ? courseLabel(m.course) : undefined}
        back={<BackButton to={m ? `${LIST}?courseId=${encodeURIComponent(m.courseId)}` : LIST} />}
        actions={
          m && !archived ? (
            <div className="f ac gp8 wrap">
              <Can action="updateLmsCourseModule">
                <button type="button" className="btn" disabled={busy} onClick={() => setConfirming(true)}>
                  {m.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </Can>
              <Can action="deleteLmsCourseModule">
                <button
                  type="button"
                  className="btn"
                  style={{ color: 'var(--red)' }}
                  title={m.status !== 'DRAFT' ? NOT_DELETABLE : references.length ? 'LMS records use this module: deactivate it instead.' : undefined}
                  disabled={busy || m.status !== 'DRAFT' || references.length > 0}
                  onClick={() => setDeleting(true)}
                >
                  Delete
                </button>
              </Can>
              <Can action="updateLmsCourseModule">
                <button type="button" className="btn primary" onClick={() => go(`${LIST}/${m.id}/edit`)}>Edit</button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading && !m} error={detail.error} onRetry={() => void detail.reload()} />

      {m && archived ? (
        <div className="callout c-warn mb14" role="status">
          <div>
            <b>This module has been deleted. </b>
            It is no longer listed or offered and is kept for audit history; it can be restored (it comes back inactive).{' '}
            <Can action="deleteLmsCourseModule">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setRestoring(true)}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => go(`${LIST}?courseId=${encodeURIComponent(m.courseId)}`)}>Back to the list</button>
          </div>
        </div>
      ) : null}

      {m ? (
        <>
          {archived ? null : <ReleaseReadiness missing={m.missingForRelease} />}

          <div className="grid g2">
            <div className="card">
              <div className="card-h"><h3>Module details</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Course', courseCell],
                    ['Module number', moduleLabel(m.moduleNumber)],
                    ['Title', m.title],
                    ['Lifecycle', <span><Badge tone={MODULE_STATUS_TONES[m.status]}>{MODULE_STATUS_LABELS[m.status]}</Badge> <span className="muted fs12">set through content releases</span></span>],
                    ['Status', <MasterStatusBadge isActive={m.isActive} />],
                    ['Created', fmtDateTime(m.createdAt)],
                    ['Last updated', fmtDateTime(m.updatedAt)],
                  ]}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Hours and delivery</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Core hours', fmtHours(m.coreHours)],
                    ['Syllabus reference', m.syllabusRef ?? '—'],
                    ['Delivery pattern', DELIVERY_PATTERN_LABELS[patternOf(m)]],
                    [
                      'Sessions × session hours',
                      m.sessions !== null && m.sessionHours !== null ? `${m.sessions} × ${m.sessionHours} h = ${fmtHours(m.sessions * m.sessionHours)}` : '—',
                    ],
                    [
                      'Lecture + practical hours',
                      m.lectureHours !== null && m.practicalHours !== null
                        ? `${fmtHours(m.lectureHours)} + ${fmtHours(m.practicalHours)} = ${fmtHours(m.lectureHours + m.practicalHours)}`
                        : '—',
                    ],
                    ['OFT hours', oftShare(m) ? `${oftText(m)} (${oftShare(m)})` : oftText(m)],
                  ]}
                />
                <p className="muted fs12" style={{ marginTop: 8 }}>OFT hours are additional to the core hours and never deducted from them.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Description and outcomes</h3></div>
            <div className="card-b"><Description text={m.description} /></div>
          </div>

          <div className="grid g2">
            <div className="card">
              <div className="card-h">
                <h3>Prescribed values <span className="sub">final syllabus documents</span></h3>
                {prescribed.data && !prescribed.data.confirmedByCompetentAuthority ? <span className="tag">draft values</span> : null}
              </div>
              {p ? (
                <PrescribedComparison m={m} p={p} />
              ) : (
                <div className="card-b">
                  <LoadState loading={prescribed.loading} error={prescribed.error} onRetry={() => void prescribed.reload()} />
                  {prescribed.data ? <p className="muted fs12" style={{ margin: 0 }}>No prescribed values exist for this module number.</p> : null}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-h"><h3>Usage</h3></div>
              <div className="card-b">
                {references.length ? (
                  <>
                    <KvList pairs={references.map((r) => [r.label, 'Blocks deletion'])} />
                    <p className="muted fs12" style={{ marginTop: 8 }}>This module cannot be deleted while LMS records use it. Deactivate it instead.</p>
                  </>
                ) : (
                  <p className="muted fs12" style={{ margin: 0 }}>No LMS record uses this module yet.</p>
                )}
                {m.status !== 'DRAFT' ? <p className="muted fs12" style={{ marginTop: 8 }}>{NOT_DELETABLE}</p> : null}
                <button type="button" className="btn sm mt8" onClick={() => go(`${LIST}?courseId=${encodeURIComponent(m.courseId)}`)}>
                  Other modules of this course
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {confirming && m ? (
        <ConfirmModal
          title={m.isActive ? 'Deactivate module' : 'Activate module'}
          busy={busy}
          confirmLabel={m.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${m.isActive ? 'deactivate' : 'activate'} ${name}?`}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => courseModuleService.setStatus(m.id, !m.isActive), m.isActive ? 'Module deactivated' : 'Module activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
      {deleting && m ? (
        <ConfirmModal
          title="Delete module"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'lms-course-module', id: m.id }}
          message={`Delete ${name}? It is archived (soft-deleted) and kept for audit history; it can be restored.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(() => courseModuleService.remove(m.id), 'Module deleted', () => {
              setDeleting(false);
              setArchived(true);
            })
          }
        />
      ) : null}
      {restoring && m ? (
        <ConfirmModal
          title="Restore module"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore ${name}? It comes back inactive. It cannot be restored while its course is deleted or the course already has another ${moduleLabel(m.moduleNumber)}.`}
          onClose={() => setRestoring(false)}
          onConfirm={() =>
            run(() => courseModuleService.restore(m.id), 'Module restored (inactive)', async () => {
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
