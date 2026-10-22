import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import { LoadState, toastOk, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { useFormSections } from '../components/useFormSections';
import { formFieldService } from '../services/formFieldService';
import { DEFAULT_FORM_CODE } from '../types/formField.types';
import { createFormFieldPayload, emptyFormFieldForm } from '../validation/formField.validation';
import FormFieldForm from './FormFieldForm';

const LIST = '/lms/form-fields';

/*
 * Add Custom Field — a dedicated page, reached from the listing (?formCode= / ?sectionCode= pre-select the
 * listing's filters). Standard fields come only from the catalogue, so only custom fields are added here.
 * The route needs lms-form-fields.view; adding needs lms-form-fields.create, so a viewer is told so.
 */
export default function FormFieldCreate() {
  usePageTitle('Add Custom Field');
  const navigate = useNavigate();
  const can = useCan();
  const allowed = can('createLmsFormField');
  const [params] = useSearchParams();
  const options = useApiData(() => (allowed ? formFieldService.formOptions() : Promise.resolve(null)), [allowed]);

  const formOptions = options.data;
  const urlForm = params.get('formCode') ?? '';
  const urlSection = params.get('sectionCode') ?? '';
  const form = formOptions
    ? (formOptions.forms.find((f) => f.code === urlForm) ?? formOptions.forms.find((f) => f.code === DEFAULT_FORM_CODE) ?? formOptions.forms[0])
    : undefined;
  /* The form's sections, custom ones in use included, so a custom section from the listing is pre-selected. */
  const sectionFeed = useFormSections(allowed ? (form?.code ?? '') : '', formOptions);
  const sections = sectionFeed.ready ? sectionFeed.sections : null;
  const initial = useMemo(() => {
    if (!formOptions || !sections) return null;
    return emptyFormFieldForm({
      formCode: form?.code ?? '',
      sectionCode: form && form.code === urlForm ? urlSection.toUpperCase() : '',
      languages: formOptions.languages,
      sections,
    });
  }, [formOptions, form, sections, urlForm, urlSection]);

  const listLink = urlForm ? `${LIST}?formCode=${encodeURIComponent(urlForm)}` : LIST;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Form Field Configuration', link: LIST }, { l: 'Add Custom Field' }]}
        title="Add Custom Field"
        sub="A field of your own on a configurable form: its label per language, type and rules, section and whether it is compulsory. It applies on the next request."
        back={<BackButton to={listLink} />}
      />

      {!allowed ? (
        <div className="card">
          <EmptyState title="You can view the form fields but not add one" msg="Adding a custom field needs the Form Field Configuration add permission.">
            <button type="button" className="btn" onClick={() => navigate(listLink)}>Open the list</button>
          </EmptyState>
        </div>
      ) : (
        <>
          <LoadState loading={(options.loading && !formOptions) || (!!formOptions && !sections)} error={options.error} onRetry={() => void options.reload()} />
          {formOptions && sections && initial ? (
            <FormFieldForm
              mode="create"
              initial={initial}
              formOptions={formOptions}
              sections={sections}
              submitLabel="Add custom field"
              backTo={listLink}
              onSave={async (values) => {
                const created = await formFieldService.create(createFormFieldPayload(values));
                toastOk('Custom field added');
                navigate(`${LIST}/${created.id}`);
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
