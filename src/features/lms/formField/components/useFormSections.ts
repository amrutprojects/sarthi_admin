import { useMemo } from 'react';
import { useApiData } from '../../../cms/shared';
import { formFieldService } from '../services/formFieldService';
import type { FormFieldFormOptions, SectionChoice } from '../types/formField.types';

/*
 * The sections of one form, for the listing's section filter and the form's section picker:
 * GET /lms/form-fields/forms/:formCode/sections — the standard sections, then every custom section a
 * non-deleted field uses, including those whose fields are all hidden or archived (the effective form leaves
 * them out). Until it answers, or when it fails, the form's own sections from form-options stand in, so a
 * section can still be picked (a custom one typed). formCode '' reads nothing. reloadKey re-reads after writes.
 */
export function useFormSections(formCode: string, formOptions: FormFieldFormOptions | null | undefined, reloadKey = 0) {
  const feed = useApiData(async () => (formCode ? { formCode, sections: await formFieldService.sections(formCode) } : null), [formCode, reloadKey]);
  /* Answers for a form chosen earlier are not shown for this one. */
  const read: SectionChoice[] | null = feed.data && feed.data.formCode === formCode ? feed.data.sections : null;
  const standard = useMemo<SectionChoice[]>(
    () => (formOptions?.forms.find((f) => f.code === formCode)?.sections ?? []).map((s) => ({ code: s.code, label: s.label, isStandard: true, fieldCount: null })),
    [formOptions, formCode],
  );
  return {
    sections: read ?? standard,
    /* Read, failed (the standard sections stand in) or nothing to read. */
    ready: !formCode || !!read || (!!feed.error && !feed.loading),
    error: feed.error,
    reload: feed.reload,
  };
}
