import { useState, type FormEvent } from 'react';
import { Modal } from '../../../../components/ui/Overlay';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField from '../../components/MasterField';
import { toastError, toastOk } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { advisoryService } from '../services/advisoryService';
import type { AdvisoryField, ApiAdvisoryGroup } from '../types/advisory.types';
import {
  MAX,
  emptyGroupForm,
  groupChanges,
  groupPayload,
  groupToForm,
  serverErrors,
  validateGroupForm,
  type GroupFormValues,
} from '../validation/advisory.validation';

const FORM_ID = 'cms-advisory-group-form';

/*
 * Add / Edit group, in a dialog over the list: a group is only a two-language name and a switch, so a page of
 * its own would be more navigation than form. Edit sends only what changed, with the version it was opened at,
 * so a save over someone else's newer edit is refused (409) rather than overwriting it. The dialog stays open
 * on any failure, with what was typed.
 */
export default function GroupFormModal({
  group,
  onClose,
  onSaved,
}: {
  /* The group to edit, or null to add one. */
  group: ApiAdvisoryGroup | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [values, setValues] = useState<GroupFormValues>(() => (group ? groupToForm(group) : emptyGroupForm()));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<AdvisoryField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const local = validateGroupForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    if (!isValid(local)) return;
    setBusy(true);
    setServer({});
    try {
      if (group) await advisoryService.updateGroup(group.id, groupChanges(group, values));
      else await advisoryService.createGroup(groupPayload(values));
      toastOk(group ? 'Group updated' : 'Group added');
      await onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverErrors(err.details);
        setServer(mapped);
        if (!isValid(mapped)) return;
      }
      /* A duplicate name (409) or "changed after you opened it" (409), as the server words it. */
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={group ? 'Edit group' : 'Add group'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : group ? 'Save group' : 'Add group'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <BilingualField
          id="advisory-group-name"
          label="Group name"
          maxLength={MAX.groupName}
          value={values.name}
          onChange={(name) => setValues((v) => ({ ...v, name }))}
          onBlur={(half) => setTouched((t) => ({ ...t, [`name.${half}`]: true }))}
          /* A server message on the name as a whole ("body.name") is shown on its Marathi half. */
          errorMr={show('name.mr') ?? show('name')}
          errorEn={show('name.en')}
          hint="The heading printed above the group's Advisory Committee members on the website, e.g. the organisation they belong to."
        />
        <div className="mt10">
          <MasterField
            id="advisory-group-active"
            label="Status"
            hint="A hidden group hides its heading and its Advisory Committee members from the website; they stay in this list."
          >
            <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
              <input
                id="advisory-group-active"
                type="checkbox"
                checked={values.isActive}
                onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
              />
              Shown on the website
            </label>
          </MasterField>
        </div>
      </form>
    </Modal>
  );
}
