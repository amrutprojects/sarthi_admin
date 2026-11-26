import { useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError, newIdempotencyKey } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { LoadState, toastError, toastOk, useApiData } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { usePageTitle } from '../../useMasterQuery';
import { ABOUT_CRUMBS, ABOUT_TAB_PATH, KINDS } from '../constants';
import { aboutService } from '../services/aboutService';
import type { AboutField, AboutItem, AboutKind } from '../types/about.types';
import {
  emptyItemForm,
  itemChanges,
  itemPayload,
  itemToForm,
  serverErrors,
  validateItemForm,
  type ItemFormValues,
} from '../validation/about.validation';

const FORM_ID = 'cms-about-item-form';

/*
 * Add / edit an information row or an About card — a dedicated page, like every other CMS form. Edit
 * loads the saved record by its id and sends only the fields changed, with the version it was opened
 * at; Add sends one Idempotency-Key per submission so a double click cannot add the record twice.
 */
export default function ItemEditor({ kind }: { kind: AboutKind }) {
  const k = KINDS[kind];
  const { id } = useParams();
  const isCreate = !id;
  usePageTitle(`${isCreate ? 'Add' : 'Edit'} ${k.noun} — About SARTHI Management`);
  const can = useCan();
  const detail = useApiData(() => (id ? aboutService.getItem(kind, id) : Promise.resolve(null)), [kind, id]);
  const allowed = isCreate ? can('createAboutItem') : can('updateAbout');

  return (
    <div className="page">
      <PageHead
        crumbs={[...ABOUT_CRUMBS, { l: isCreate ? `Add New ${k.noun}` : 'Edit' }]}
        title={isCreate ? `Add New ${k.noun}` : detail.data ? `Edit ${detail.data.first.en}` : `Edit ${k.noun}`}
        sub="Text is entered in Marathi and English — the public site defaults to Marathi. Changes appear on the website once saved."
        back={<BackButton to={ABOUT_TAB_PATH} />}
      />
      {!isCreate ? <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} /> : null}
      {!allowed ? (
        <Callout tone="warn" title="You can view this section but not change it">
          This needs the &ldquo;{isCreate ? 'Add' : 'Update'} About SARTHI Management&rdquo; permission.
        </Callout>
      ) : isCreate ? (
        <ItemForm kind={kind} initial={null} />
      ) : detail.data ? (
        <ItemForm key={detail.data.updatedAt} kind={kind} initial={detail.data} />
      ) : null}
    </div>
  );
}

function ItemForm({ kind, initial }: { kind: AboutKind; initial: AboutItem | null }) {
  const k = KINDS[kind];
  const navigate = useNavigate();
  const [values, setValues] = useState<ItemFormValues>(() => (initial ? itemToForm(initial) : emptyItemForm()));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<AboutField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  /* One key per submission; a definitive refusal (4xx) makes the next attempt a new submission. */
  const key = useRef(newIdempotencyKey());

  const local = validateItemForm(kind, values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof ItemFormValues>(field: K, value: ItemFormValues[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setDirty(true);
  };
  const required = initial?.isRequired ?? false;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    flushSync(() => setSubmitted(true));
    if (!isValid(local)) return;
    setBusy(true);
    setServer({});
    try {
      if (initial) await aboutService.updateItem(kind, initial.id, itemChanges(kind, initial, values));
      else {
        try {
          await aboutService.createItem(kind, itemPayload(kind, values), key.current);
        } catch (err) {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) key.current = newIdempotencyKey();
          throw err;
        }
      }
      setDirty(false);
      toastOk(initial ? `${k.noun} updated` : `${k.noun} added`);
      navigate(ABOUT_TAB_PATH);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverErrors(kind, err.details);
        setServer(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Preview</h3>
            <span className="muted fs12">As it will appear in the About SARTHI section</span>
          </div>
          <div className="card-b">
            <div className="f gp14 wrap">
              {(['mr', 'en'] as const).map((lang) =>
                kind === 'cards' ? (
                  <div
                    key={lang}
                    lang={lang}
                    role="figure"
                    aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
                    className="card pad"
                    style={{ width: 280 }}
                  >
                    <h4 style={{ fontFamily: 'var(--serif)', color: 'var(--maroon)', fontSize: 16, margin: 0 }}>
                      {values.first[lang] || '—'}
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '7px 0 0', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                      {values.second[lang] || '—'}
                    </p>
                  </div>
                ) : (
                  <div
                    key={lang}
                    lang={lang}
                    role="figure"
                    aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
                    className="f gp14"
                    style={{ width: 360, fontSize: 13, padding: '11px 0', borderBottom: '1px dashed var(--border)' }}
                  >
                    <span style={{ flex: '0 0 40%', color: 'var(--muted)', fontWeight: 600 }}>{values.first[lang] || '—'}</span>
                    <span style={{ flex: 1 }}>{values.second[lang] || '—'}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>{k.noun}</h3>
            {required ? <span className="tag">Required card</span> : null}
          </div>
          <div className="card-b">
            <BilingualField
              id="about-first"
              label={k.first.label}
              maxLength={k.first.max}
              value={values.first}
              onChange={(v) => set('first', v)}
              onBlur={(half) => touch(`first.${half}`)}
              errorMr={show('first.mr')}
              errorEn={show('first.en')}
              hint={k.first.hint}
            />
            <div className="mt10">
              <BilingualField
                id="about-second"
                label={k.second.label}
                maxLength={k.second.max}
                multiline={k.second.multiline}
                value={values.second}
                onChange={(v) => set('second', v)}
                onBlur={(half) => touch(`second.${half}`)}
                errorMr={show('second.mr')}
                errorEn={show('second.en')}
                hint={k.second.hint}
              />
            </div>
            <div className="grid g2 mt10">
              <MasterField
                id="about-order"
                label="Display order"
                error={show('displayOrder')}
                hint={initial ? 'Lower numbers are shown first.' : 'Leave blank to add it at the end.'}
              >
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  {...fieldAria('about-order', show('displayOrder'))}
                  value={values.displayOrder}
                  placeholder={initial ? undefined : 'End of the list'}
                  onChange={(e) => set('displayOrder', e.target.value)}
                  onBlur={() => touch('displayOrder')}
                />
              </MasterField>
              <MasterField
                id="about-active"
                label="Status"
                hint={
                  required ? 'Mission, Vision and Values are always shown.' : 'Inactive records stay here but are not shown on the website.'
                }
              >
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input
                    id="about-active"
                    type="checkbox"
                    checked={values.isActive}
                    disabled={required}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
                  Active — show on the website
                </label>
              </MasterField>
            </div>
          </div>
        </div>
      </form>
      <MasterFormActions
        formId={FORM_ID}
        submitLabel={initial ? 'Save changes' : `Save ${k.nounLower}`}
        busy={busy}
        dirty={dirty}
        backTo={ABOUT_TAB_PATH}
      />
    </>
  );
}
