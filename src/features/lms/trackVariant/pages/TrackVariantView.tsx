import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import { ApiError } from '../../../../services/api-client';
import BackButton from '../../../cms/components/BackButton';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, toastError, toastOk, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import CompletenessPanel from '../components/CompletenessPanel';
import CurriculumStatusBadge from '../components/CurriculumStatusBadge';
import CurriculumTabs from '../components/CurriculumTabs';
import RichText from '../components/RichText';
import { trackVariantService } from '../services/trackVariantService';
import type { ApiTrackVariant } from '../types/trackVariant.types';

const LIST = '/lms/track-variants';

const hours = (n: number | null) => (n === null ? '—' : `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} h`);
const variantName = (v: ApiTrackVariant) => `${v.track.code} · ${v.track.name}`;

type Lifecycle = 'publish' | 'retire' | 'delete' | 'restore' | 'status';

/*
 * View Track Variant — the variant's details, its completeness check against the Module 3 shape, and its curriculum
 * (one tab per child collection, each with add / edit / delete). Publish is refused by the server while the variant
 * is incomplete (its reason is shown here); Retire ends a published variant; Delete archives a draft.
 */
export default function TrackVariantView() {
  usePageTitle('Track Variant');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => trackVariantService.get(id), [id]);
  const options = useApiData(() => trackVariantService.formOptions(), []);
  const { busy, run } = useAction();
  const [confirm, setConfirm] = useState<Lifecycle | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [refused, setRefused] = useState<{ message: string; details: string[] } | null>(null);
  /* Archived from this page: the record is gone from the API (404), so the page keeps the last copy and offers Restore. */
  const [archived, setArchived] = useState(false);

  const variant = detail.data;
  const c = variant?.completeness;

  async function publish(v: ApiTrackVariant) {
    setConfirm(null);
    setPublishing(true);
    setRefused(null);
    try {
      await trackVariantService.publish(v.id);
      toastOk('Track variant published');
      await detail.reload();
    } catch (err) {
      /* 409 "The track variant is incomplete and cannot be published." with each missing item as a detail. */
      if (err instanceof ApiError) {
        setRefused({ message: err.message, details: err.details.map((d) => d.message) });
        await detail.reload();
      } else toastError(err);
    } finally {
      setPublishing(false);
    }
  }

  const publishMessage = (v: ApiTrackVariant) => {
    const what =
      v.status === 'DRAFT'
        ? `Publish the track variant ${variantName(v)}? Its draft OFT cards are published with it, which freezes their codes.`
        : `Publish the track variant ${variantName(v)} again? The draft OFT cards added since are published, which freezes their codes.`;
    return v.completeness.complete
      ? what
      : `${what} The completeness check lists ${v.completeness.missing.length} missing item(s): the server refuses to publish an incomplete variant.`;
  };

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Track Variant Master', link: LIST }, { l: variant ? variantName(variant) : 'Track Variant' }]}
        title={variant ? variantName(variant) : 'Track Variant'}
        badge={variant ? <span style={{ marginLeft: 8 }}><CurriculumStatusBadge status={variant.status} /></span> : undefined}
        sub={variant ? `${variant.course.code} · ${variant.course.title} — Module ${variant.courseModule.moduleNumber} · ${variant.courseModule.title}` : undefined}
        back={<BackButton to={LIST} />}
        actions={
          variant && !archived ? (
            <div className="f ac gp8 wrap">
              <Can action="updateLmsTrackVariant">
                <button type="button" className="btn" disabled={busy || publishing} onClick={() => setConfirm('status')}>
                  {variant.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </Can>
              {variant.status === 'DRAFT' ? (
                <Can action="deleteLmsTrackVariant">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy || publishing} onClick={() => setConfirm('delete')}>Delete</button>
                </Can>
              ) : null}
              {variant.status === 'PUBLISHED' ? (
                <Can action="deleteLmsTrackVariant">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy || publishing} onClick={() => setConfirm('retire')}>Retire</button>
                </Can>
              ) : null}
              {variant.status !== 'RETIRED' ? (
                <Can action="updateLmsTrackVariant">
                  <button type="button" className="btn" onClick={() => go(`${LIST}/${variant.id}/edit`)}>Edit</button>
                </Can>
              ) : null}
              {variant.status !== 'RETIRED' ? (
                <Can action="updateLmsTrackVariant">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy || publishing}
                    title={variant.completeness.complete ? undefined : 'The variant is incomplete: the server will refuse to publish it.'}
                    onClick={() => setConfirm('publish')}
                  >
                    {publishing ? 'Publishing…' : variant.status === 'DRAFT' ? 'Publish' : 'Publish again'}
                  </button>
                </Can>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading && !variant} error={detail.error} onRetry={() => void detail.reload()} />

      {variant && archived ? (
        <div className="callout c-warn mb14" role="status">
          <div>
            <b>This track variant has been archived. </b>
            It is no longer listed or offered; its curriculum is kept, so it can be restored (it comes back inactive).{' '}
            <Can action="deleteLmsTrackVariant">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setConfirm('restore')}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => go(LIST)}>Back to the list</button>
          </div>
        </div>
      ) : null}

      {refused ? (
        <div className="callout c-err mb14" role="alert">
          <div>
            <b>Not published. </b>
            {refused.message}
            {refused.details.length ? (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }} aria-label="Reasons publishing was refused">
                {refused.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}{' '}
            <button type="button" className="btn xs" onClick={() => setRefused(null)}>Dismiss</button>
          </div>
        </div>
      ) : null}

      {variant && !archived && !variant.track.isActive ? (
        <div className="callout c-warn mb14" role="status">
          <div>The track {variant.track.code} has been deactivated in the Admin Panel. The variant is kept (L-07).</div>
        </div>
      ) : null}

      {variant && c ? (
        <>
          <div className="grid g2">
            <div className="card">
              <div className="card-h"><h3>Variant details</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Course', <span><span className="mono">{variant.course.code}</span> · {variant.course.title}</span>],
                    ['Module', `Module ${variant.courseModule.moduleNumber} · ${variant.courseModule.title}`],
                    [
                      'Technology track',
                      <span>
                        <span className="mono">{variant.track.code}</span> · {variant.track.name}
                        {variant.track.isActive ? null : <span className="muted fs12"> · inactive</span>}
                      </span>,
                    ],
                    ['Stage', <CurriculumStatusBadge status={variant.status} />],
                    ['Status', <MasterStatusBadge isActive={variant.isActive} />],
                    ['Track modules (syllabus)', variant.expectedTrackModules ?? 'Not entered'],
                    ['OFT cards (syllabus)', variant.expectedOftCards ?? 'Not entered'],
                    ['Syllabus reference', variant.syllabusReference ?? '—'],
                    ['Published', fmtDateTime(variant.publishedAt)],
                    ['Created', fmtDateTime(variant.createdAt)],
                    ['Last updated', fmtDateTime(variant.updatedAt)],
                  ]}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Module 3 hours and description</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Core hours of the module', hours(variant.courseModule.coreHours)],
                    [
                      'OFT hours of the module',
                      variant.courseModule.oftHoursMin === null && variant.courseModule.oftHoursMax === null
                        ? '—'
                        : `${hours(variant.courseModule.oftHoursMin)} to ${hours(variant.courseModule.oftHoursMax)}`,
                    ],
                  ]}
                />
                <div className="fs12 muted" style={{ margin: '10px 0 4px' }}>Description</div>
                <RichText text={variant.description} empty="No description." />
              </div>
            </div>
          </div>

          <CompletenessPanel completeness={c} />

          {archived ? null : (
            <>
              <LoadState loading={options.loading} error={options.error} onRetry={() => void options.reload()} />
              {options.data ? <CurriculumTabs variant={variant} formOptions={options.data} onChanged={() => detail.reload()} /> : null}
            </>
          )}
        </>
      ) : null}

      {variant && confirm === 'status' ? (
        <ConfirmModal
          title={variant.isActive ? 'Deactivate track variant' : 'Activate track variant'}
          busy={busy}
          confirmLabel={variant.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${variant.isActive ? 'deactivate' : 'activate'} the track variant ${variantName(variant)}?`}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            run(() => trackVariantService.setStatus(variant.id, !variant.isActive), variant.isActive ? 'Track variant deactivated' : 'Track variant activated', async () => {
              setConfirm(null);
              await detail.reload();
            })
          }
        />
      ) : null}
      {variant && confirm === 'publish' ? (
        <ConfirmModal
          title={variant.status === 'DRAFT' ? 'Publish track variant' : 'Publish track variant again'}
          busy={publishing}
          confirmLabel="Yes, publish"
          message={publishMessage(variant)}
          onClose={() => setConfirm(null)}
          onConfirm={() => void publish(variant)}
        />
      ) : null}
      {variant && confirm === 'retire' ? (
        <ConfirmModal
          title="Retire track variant"
          danger
          busy={busy}
          confirmLabel="Retire"
          message={`Retire the track variant ${variantName(variant)}? It is kept for the records that use it but no longer offered, and its curriculum can no longer be changed. A retired variant cannot be published again.`}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            run(() => trackVariantService.retire(variant.id), 'Track variant retired', async () => {
              setConfirm(null);
              setRefused(null);
              await detail.reload();
            })
          }
        />
      ) : null}
      {variant && confirm === 'delete' ? (
        <ConfirmModal
          title="Delete track variant"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete the draft track variant ${variantName(variant)}? It is archived (soft-deleted) with its curriculum and kept for audit history; it can be restored.`}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            run(() => trackVariantService.remove(variant.id), 'Track variant deleted', () => {
              setConfirm(null);
              setRefused(null);
              setArchived(true);
            })
          }
        />
      ) : null}
      {variant && confirm === 'restore' ? (
        <ConfirmModal
          title="Restore track variant"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the track variant ${variantName(variant)}? It comes back inactive, with its curriculum. It cannot be restored while its module is deleted or another variant now uses the same module and track.`}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            run(() => trackVariantService.restore(variant.id), 'Track variant restored (inactive)', async () => {
              setConfirm(null);
              setArchived(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}
