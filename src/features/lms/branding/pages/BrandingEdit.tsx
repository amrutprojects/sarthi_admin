import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import { LoadState, toastOk, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { brandingService } from '../services/brandingService';
import BrandingForm from './BrandingForm';

const LIST = '/lms/branding';

/*
 * Edit Branding & Settings of one entity — a dedicated page (lms-branding.update and / or .update-settings). The
 * route itself only needs lms-branding.view, so a viewer who opens it is told so instead of being shown a form the
 * server would refuse. L-04 splits the right: the branding section needs lms-branding.update, the contact and
 * settings sections lms-branding.update-settings; a section the user may not change is shown read-only.
 */
const editActionOf = (group: string) => (group === 'branding' ? 'updateLmsBranding' : 'updateLmsBrandingSettings');

export default function BrandingEdit() {
  usePageTitle('Edit Branding & Settings');
  const { entityId = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const allowed = can('editLmsBranding');
  const detail = useApiData(() => brandingService.get(entityId), [entityId]);
  const languages = useApiData(() => (allowed ? brandingService.languages() : Promise.resolve(null)), [allowed]);

  const b = detail.data;
  const viewPath = `${LIST}/${entityId}`;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'LMS Admin' },
          { l: 'Branding & Settings', link: LIST },
          ...(b ? [{ l: b.entity.name, link: viewPath }] : []),
          { l: 'Edit' },
        ]}
        title={b ? `Edit ${b.entity.name}` : 'Edit Branding & Settings'}
        badge={b ? <span className="tag">{b.entity.code}</span> : undefined}
        sub="Display name, logo, colours, support contact and enabled languages. Saved changes reach learners at once."
        back={<BackButton to={viewPath} />}
      />

      {!allowed ? (
        <div className="card">
          <EmptyState title="You can view these settings but not change them" msg="Changing branding and settings needs the Branding & Settings update permission.">
            <button type="button" className="btn" onClick={() => navigate(viewPath)}>Open the settings</button>
          </EmptyState>
        </div>
      ) : (
        <>
          <LoadState loading={detail.loading && !b} error={detail.error} onRetry={() => void detail.reload()} />
          {b ? <LoadState loading={languages.loading && !languages.data} error={languages.error} onRetry={() => void languages.reload()} /> : null}

          {b && !b.entity.isActive ? (
            <div className="callout c-info mb14">
              <div>This entity is inactive. Its branding and settings can be prepared now and apply once the entity is activated.</div>
            </div>
          ) : null}

          {b && languages.data ? (
            <BrandingForm
              key={b.entity.id}
              branding={b}
              languageOptions={languages.data}
              backTo={viewPath}
              confirmMessage={`Are you sure you want to save the changes to the branding and settings of ${b.entity.name}?`}
              canEdit={(group) => can(editActionOf(group))}
              onSave={async (payload) => {
                await brandingService.update(b.entity.id, payload);
                toastOk('Branding and settings updated');
                navigate(viewPath);
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
