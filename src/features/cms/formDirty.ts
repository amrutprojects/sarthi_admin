/*
 * Which CMS forms on screen hold unsaved changes.
 *
 * MasterFormActions (the Save / Cancel footer every CMS form uses) reports its form's dirty flag here, so
 * a control outside the form — the Back button in the page header — can ask for the same "Discard
 * changes?" confirmation as Cancel without each page threading the flag through props.
 */
const dirtyForms = new Set<string>();

export function setFormDirty(formId: string, dirty: boolean): void {
  if (dirty) dirtyForms.add(formId);
  else dirtyForms.delete(formId);
}

export const hasUnsavedForm = (): boolean => dirtyForms.size > 0;
