import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, PageHead } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterField from '../../../cms/components/MasterField';
import { ConfirmModal, LoadState, toastOk, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { FieldStatusBadge } from '../components/FieldBadges';
import { useFormSections } from '../components/useFormSections';
import { formFieldService } from '../services/formFieldService';
import { LOCK_MESSAGES } from '../types/formField.types';
import { formFieldFormFrom, updateFormFieldPayload } from '../validation/formField.validation';
import FormFieldForm from './FormFieldForm';

const LIST = '/lms/form-fields';

/*
 * Edit a field's configuration — a dedicated page (lms-form-fields.update). Standard fields keep their type,
 * options, rules and classification; system-locked ones their visibility and compulsory rule; a field with
 * stored values its type. Status (custom fields only) has its own endpoint: toggled here with confirmation.
 */
export default function FormFieldEdit() {
  usePageTitle('Edit Form Field');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const allowed = can('updateLmsFormField');
  const detail = useApiData(() => (allowed ? formFieldService.get(id) : Promise.resolve(null)), [id, allowed]);
  const options = useApiData(() => (allowed ? formFieldService.formOptions() : Promise.resolve(null)), [allowed]);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  const field = detail.data;
  const formOptions = options.data;
  const viewPath = `${LIST}/${id}`;
  /* The form's sections, custom ones in use included (hidden and archived fields counted). */
  const sectionFeed = useFormSections(field?.formCode ?? '', formOptions);
  const sections = field && sectionFeed.ready ? sectionFeed.sections : null;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'LMS Admin' },
          { l: 'Form Field Configuration', link: LIST },
          ...(field ? [{ l: field.label, link: viewPath }] : []),
          { l: 'Edit' },
        ]}
        title={field ? `Edit ${field.label}` : 'Edit Form Field'}
        badge={field ? <span className="tag mono">{field.fieldCode}</span> : undefined}
        sub="Label per language, section and order, visibility and compulsory rule; for a custom field also its type, options, rules and classification. Changes apply on the next request."
        back={<BackButton to={viewPath} />}
      />

      {!allowed ? (
        <div className="card">
          <EmptyState title="You can view this field but not change it" msg="Changing a field's configuration needs the Form Field Configuration update permission.">
            <button type="button" className="btn" onClick={() => navigate(viewPath)}>Open the field</button>
          </EmptyState>
        </div>
      ) : (
        <>
          <LoadState loading={detail.loading && !field} error={detail.error} onRetry={() => void detail.reload()} />
          {field ? (
            <LoadState loading={(options.loading && !formOptions) || (!!formOptions && !sections)} error={options.error} onRetry={() => void options.reload()} />
          ) : null}

          {field && formOptions && sections ? (
            <FormFieldForm
              /* A reload after a status change must not reset what the user typed. */
              key={field.id}
              mode="edit"
              field={field}
              initial={formFieldFormFrom(field, formOptions.languages, sections)}
              formOptions={formOptions}
              sections={sections}
              submitLabel="Save changes"
              confirmMessage={`Are you sure you want to save the changes to the field ${field.label}? The form applies them on the next request.`}
              backTo={viewPath}
              onSave={async (values) => {
                await formFieldService.update(field.id, updateFormFieldPayload(values, field));
                toastOk('Form field updated');
                navigate(viewPath);
              }}
              statusSlot={
                <MasterField
                  id="ff-status-current"
                  label="Status"
                  hint={field.isCustom ? 'An archived custom field keeps its values but is no longer shown on the form.' : LOCK_MESSAGES.FIELD_STANDARD_ARCHIVE}
                >
                  <div className="f ac gp8" style={{ minHeight: 36 }}>
                    <FieldStatusBadge isActive={field.isActive} />
                    {field.isCustom ? (
                      <Can action="updateLmsFormField">
                        <button type="button" className="btn xs" disabled={busy} onClick={() => setConfirming(true)}>
                          {field.isActive ? 'Archive' : 'Activate'}
                        </button>
                      </Can>
                    ) : null}
                  </div>
                </MasterField>
              }
            />
          ) : null}
        </>
      )}

      {confirming && field ? (
        <ConfirmModal
          title={field.isActive ? 'Archive custom field' : 'Activate custom field'}
          busy={busy}
          confirmLabel={field.isActive ? 'Yes, archive' : 'Yes, activate'}
          message={
            field.isActive
              ? `Archive the custom field ${field.label}? It is no longer shown on the form; its stored values are kept.`
              : `Activate the custom field ${field.label}? It is shown on the form again (when visible).`
          }
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            run(() => formFieldService.setStatus(field.id, !field.isActive), field.isActive ? 'Custom field archived' : 'Form field activated', async () => {
              setConfirming(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}
