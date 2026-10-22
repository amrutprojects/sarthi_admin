import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterField from '../../../cms/components/MasterField';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { ConfirmModal, LoadState, toastOk, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { trackVariantService } from '../services/trackVariantService';
import { trackVariantFormFrom, updateTrackVariantPayload } from '../validation/trackVariant.validation';
import TrackVariantForm from './TrackVariantForm';

const LIST = '/lms/track-variants';

/*
 * Edit Track Variant — a dedicated page for the variant's own fields (per-track counts, syllabus reference,
 * description). The module and track are fixed; status has its own endpoint (toggle with confirmation); the
 * curriculum is edited on the View page. A retired variant cannot be changed.
 */
export default function TrackVariantEdit() {
  usePageTitle('Edit Track Variant');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const detail = useApiData(() => trackVariantService.get(id), [id]);
  const options = useApiData(() => trackVariantService.formOptions(), []);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  const variant = detail.data;
  const name = variant ? `${variant.track.code} · ${variant.track.name}` : 'Track Variant';

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'LMS Admin' },
          { l: 'Track Variant Master', link: LIST },
          ...(variant ? [{ l: name, link: `${LIST}/${variant.id}` }] : []),
          { l: 'Edit' },
        ]}
        title={variant ? `Edit ${name}` : 'Edit Track Variant'}
        sub={variant ? `${variant.course.code} · ${variant.course.title} — Module ${variant.courseModule.moduleNumber}` : undefined}
        back={<BackButton to={variant ? `${LIST}/${variant.id}` : LIST} />}
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {variant ? <LoadState loading={options.loading} error={options.error} onRetry={() => void options.reload()} /> : null}

      {variant && variant.status === 'RETIRED' ? (
        <div className="callout c-warn mb14" role="status">
          <div>A retired track variant cannot be changed. It is kept for the records that use it.</div>
        </div>
      ) : null}

      {variant && variant.status !== 'RETIRED' && options.data ? (
        <TrackVariantForm
          mode="edit"
          initial={trackVariantFormFrom(variant)}
          formOptions={options.data}
          variant={variant}
          submitLabel="Save changes"
          confirmMessage="Are you sure you want to save the changes to this track variant?"
          backTo={`${LIST}/${variant.id}`}
          onSave={async (values) => {
            await trackVariantService.update(variant.id, updateTrackVariantPayload(values));
            toastOk('Track variant updated');
            navigate(`${LIST}/${variant.id}`);
          }}
          statusSlot={
            <MasterField id="tv-status-current" label="Status" hint="An inactive variant is kept but no longer offered to the screens that pick a variant.">
              <div className="f ac gp8" style={{ minHeight: 36 }}>
                <MasterStatusBadge isActive={variant.isActive} />
                <Can action="updateLmsTrackVariant">
                  <button type="button" className="btn xs" disabled={busy} onClick={() => setConfirming(true)}>
                    {variant.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
              </div>
            </MasterField>
          }
        />
      ) : null}

      {confirming && variant ? (
        <ConfirmModal
          title={variant.isActive ? 'Deactivate track variant' : 'Activate track variant'}
          busy={busy}
          confirmLabel={variant.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={`Are you sure you want to ${variant.isActive ? 'deactivate' : 'activate'} the track variant ${name}?`}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => trackVariantService.setStatus(variant.id, !variant.isActive), variant.isActive ? 'Track variant deactivated' : 'Track variant activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}
