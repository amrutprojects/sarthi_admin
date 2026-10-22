import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHead } from '../../../../components/ui';
import BackButton from '../../../cms/components/BackButton';
import { LoadState, toastOk, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { trackVariantService } from '../services/trackVariantService';
import { createTrackVariantPayload, emptyTrackVariantForm } from '../validation/trackVariant.validation';
import TrackVariantForm from './TrackVariantForm';

const LIST = '/lms/track-variants';

/* Add Track Variant — a dedicated page, reached from the Add Track Variant button on the listing (?courseId= preselects). */
export default function TrackVariantCreate() {
  usePageTitle('Add Track Variant');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const courseId = params.get('courseId') ?? '';
  const initial = useMemo(() => emptyTrackVariantForm(courseId), [courseId]);
  const options = useApiData(() => trackVariantService.formOptions(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Track Variant Master', link: LIST }, { l: 'Add Track Variant' }]}
        title="Add Track Variant"
        sub="Creates the Module 3 variant of one technology track for a course, as a draft. Its curriculum is added on the variant's page."
        back={<BackButton to={LIST} />}
      />

      <LoadState loading={options.loading} error={options.error} onRetry={() => void options.reload()} />

      {options.data ? (
        <TrackVariantForm
          mode="create"
          initial={initial}
          formOptions={options.data}
          submitLabel="Create track variant"
          backTo={LIST}
          onSave={async (values) => {
            const created = await trackVariantService.create(createTrackVariantPayload(values));
            toastOk('Track variant created');
            navigate(`${LIST}/${created.id}`);
          }}
        />
      ) : null}
    </div>
  );
}
