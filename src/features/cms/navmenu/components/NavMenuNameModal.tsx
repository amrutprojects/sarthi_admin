import { useState, type FormEvent } from 'react';
import { Modal } from '../../../../components/ui/Overlay';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import { toastError, toastOk } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { navMenuEntry, navMenuName } from '../constants';
import { navMenuService } from '../services/navMenuService';
import type { Bilingual, NavMenuItem } from '../types/navmenu.types';
import { NAME_MAX, namePayload, serverNameErrors, validateName, type NameField } from '../validation/navmenu.validation';

const FORM_ID = 'cms-navmenu-name-form';

/*
 * Edit name — one menu bar item's name on the website, in both languages, in a dialog over the list. Opens with the
 * name the website shows now. Both blank (or the default name itself) saves as the default name; "Reset to default"
 * does the same at once and is offered only while the item has a name of its own. Whether the item is shown does
 * not change here. The dialog stays open on any failure, with what was typed.
 */
export default function NavMenuNameModal({
  item,
  onClose,
  onSaved,
}: {
  item: NavMenuItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const defaults = navMenuEntry(item.key).label;
  const [values, setValues] = useState<Bilingual>(() => ({ ...navMenuName(item) }));
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
      await navMenuService.setLabel(item.key, label);
      toastOk(label ? `Menu item renamed to "${label.en}"` : `"${defaults.en}" now uses its default name`);
      await onSaved();
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
      title={`Edit name — ${navMenuName(item).en}`}
      onClose={onClose}
      footer={
        <>
          {item.label ? (
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
          id="navmenu-name"
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
        <div className="hint">Shown in the website&rsquo;s menu bar and mobile menu. Leave both blank to use the default name.</div>
        <div className="hint mt4">
          Default name: {defaults.en}
          {defaults.mr ? <span lang="mr"> &middot; {defaults.mr}</span> : null}
        </div>
      </form>
    </Modal>
  );
}
