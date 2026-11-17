import { useState, type FormEvent } from 'react';
import { Modal } from '../../../../components/ui/Overlay';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import { NAME_MAX, namePayload, serverNameErrors, validateName, type NameField } from '../../navmenu/validation/navmenu.validation';
import { toastError, toastOk } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { highlightService } from '../services/highlightService';
import { factRowName, type ApiProgrammeHighlight, type Bilingual, type HighlightFactRow } from '../types/highlight.types';

const FORM_ID = 'cms-highlight-row-name-form';

/*
 * Edit name — one fact table row's name on the home page, in both languages, in a dialog over the tab. A sibling of
 * the Navigation Menu's NavMenuNameModal, with the same rules (navmenu.validation, mirrored by the server): opens with
 * the name the website shows now; both blank (or the default name itself) saves as the default name; "Reset to
 * default" does the same at once and is offered only while the row has a name of its own. Whether the row is shown
 * does not change here. The PATCH answers with the whole section, handed to onSaved. The dialog stays open on any
 * failure, with what was typed.
 */
export default function HighlightRowNameModal({
  row,
  rowLabels,
  onClose,
  onSaved,
}: {
  row: HighlightFactRow;
  rowLabels: ApiProgrammeHighlight['rowLabels'] | undefined;
  onClose: () => void;
  onSaved: (page: ApiProgrammeHighlight) => void | Promise<void>;
}) {
  const defaults = row.label;
  const current = factRowName(row, rowLabels);
  const isCustom = current !== defaults;
  const [values, setValues] = useState<Bilingual>(() => ({ ...current }));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<NameField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const local = validateName(values);
  const show = (f: NameField) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];

  async function save(label: Bilingual | null) {
    setBusy(true);
    setServer({});
    try {
      const page = await highlightService.setRowLabel(row.key, label);
      toastOk(label ? `Fact table row renamed to "${label.en}"` : `"${defaults.en}" now uses its default name`);
      await onSaved(page);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverNameErrors(err.details);
        setServer(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    if (!isValid(local)) return;
    await save(namePayload(values, defaults));
  }

  return (
    <Modal
      title={`Edit name — ${current.en}`}
      onClose={onClose}
      footer={
        <>
          {isCustom ? (
            <button type="button" className="btn" style={{ marginRight: 'auto' }} disabled={busy} onClick={() => void save(null)}>
              Reset to default
            </button>
          ) : null}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <BilingualField
          id="highlight-row-name"
          label="Name"
          required={false}
          maxLength={NAME_MAX}
          value={values}
          onChange={(next) => setValues(next)}
          onBlur={(half) => setTouched((t) => ({ ...t, [`label.${half}`]: true }))}
          /* A server message on the name as a whole ("body.label") is shown on its Marathi half. */
          errorMr={show('label.mr') ?? server.label}
          errorEn={show('label.en')}
        />
        <div className="hint">Shown as the row name in the home page fact table. Leave both blank to use the default name.</div>
        <div className="hint mt4">
          Default name: {defaults.en}
          <span lang="mr"> &middot; {defaults.mr}</span>
        </div>
      </form>
    </Modal>
  );
}
