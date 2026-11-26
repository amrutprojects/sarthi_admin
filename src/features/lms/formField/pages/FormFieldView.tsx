import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import FieldPreview from '../components/FieldPreview';
import { FieldStatusBadge, OriginTag } from '../components/FieldBadges';
import { ruleSummary, yesNo } from '../components/fieldFormat';
import { formFieldService } from '../services/formFieldService';
import { LOCK_MESSAGES, dataTypeLabel, hasValuesMessage, sensitivityLabel, stageLabel, type ApiFormField } from '../types/formField.types';

const LIST = '/lms/form-fields';

/* What the backend refuses for this field, said before anyone tries (the FIELD_* answers). */
function LockNotes({ field }: { field: ApiFormField }) {
  const notes: { title: string; text: string }[] = [];
  if (field.isSystemLocked) notes.push({ title: 'System-locked field. ', text: `${LOCK_MESSAGES.FIELD_SYSTEM_LOCKED} It stays visible and compulsory on every save.` });
  if (!field.isCustom) notes.push({ title: 'Standard field. ', text: `${LOCK_MESSAGES.FIELD_STANDARD} ${LOCK_MESSAGES.FIELD_STANDARD_DELETE}` });
  if (field.typeLocked) notes.push({ title: 'Type locked. ', text: LOCK_MESSAGES.FIELD_TYPE_LOCKED });
  if (field.isCustom && field.storedValues) notes.push({ title: 'Values stored. ', text: hasValuesMessage(field.storedValues) });
  if (!notes.length) return null;
  return (
    <div className="callout c-info mb14" role="note">
      <div>
        {notes.map((n) => (
          <div key={n.title}>
            <b>{n.title}</b>
            {n.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* View a field's configuration — read-only detail with its labels per language, rules and a preview. */
export default function FormFieldView() {
  usePageTitle('Form Field');
  const { id = '' } = useParams();
  const go = useGo();
  const detail = useApiData(() => formFieldService.get(id), [id]);
  /* Languages and the file rule for the preview; the page still works without them. */
  const options = useApiData(() => formFieldService.formOptions(), []);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  /* Deleted from this page: the record is gone from the API (404), so the page keeps the last copy and offers Restore. */
  const [deleted, setDeleted] = useState(false);
  const [lang, setLang] = useState('');

  const field = detail.data;
  const languages = options.data?.languages ?? [];
  const storedValues = field?.storedValues ?? 0;
  const listLink = field ? `${LIST}?formCode=${encodeURIComponent(field.formCode)}` : LIST;
  const deleteBlocked = field ? (!field.isCustom ? LOCK_MESSAGES.FIELD_STANDARD_DELETE : storedValues > 0 ? hasValuesMessage(storedValues) : null) : null;
  const rules = field ? ruleSummary(field.dataType, field.rules, options.data?.fileConstraints) : [];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Form Field Configuration', link: LIST }, { l: field ? field.label : 'Form Field' }]}
        title={field ? field.label : 'Form Field'}
        badge={field ? <span className="tag mono">{field.fieldCode}</span> : undefined}
        sub={field ? `${field.formLabel ?? field.formCode} · Section ${field.sectionCode} · ${field.sectionLabel}` : undefined}
        back={<BackButton to={listLink} />}
        actions={
          field && !deleted ? (
            <div className="f ac gp8 wrap">
              <Can action="updateLmsFormField">
                <button
                  type="button"
                  className="btn"
                  disabled={busy || !field.isCustom}
                  title={field.isCustom ? undefined : LOCK_MESSAGES.FIELD_STANDARD_ARCHIVE}
                  onClick={() => setConfirming(true)}
                >
                  {field.isActive ? 'Archive' : 'Activate'}
                </button>
              </Can>
              <Can action="deleteLmsFormField">
                <button
                  type="button"
                  className="btn"
                  style={{ color: 'var(--red)' }}
                  disabled={busy || !!deleteBlocked}
                  title={deleteBlocked ?? undefined}
                  onClick={() => setDeleting(true)}
                >
                  Delete
                </button>
              </Can>
              <Can action="updateLmsFormField">
                <button type="button" className="btn primary" onClick={() => go(`${LIST}/${field.id}/edit`)}>Edit</button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading && !field} error={detail.error} onRetry={() => void detail.reload()} />

      {field && deleted ? (
        <div className="callout c-warn mb14" role="status">
          <div>
            <b>This custom field has been deleted. </b>
            It is no longer listed or shown on the form. It can be restored (it comes back archived) unless its key or label has been taken since.{' '}
            <Can action="deleteLmsFormField">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setRestoring(true)}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => go(listLink)}>Back to the list</button>
          </div>
        </div>
      ) : null}

      {field ? (
        <>
          {deleted ? null : <LockNotes field={field} />}

          <div className="grid g2">
            <div className="card">
              <div className="card-h"><h3>Field details</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Form', `${field.formLabel ?? field.formCode} (${field.formCode})`],
                    ['Field key', <span className="mono">{field.fieldCode}</span>],
                    ['Label', field.label],
                    ['Help text', field.helpText ?? '—'],
                    ['Section', `${field.sectionCode} · ${field.sectionLabel}`],
                    ['Order', String(field.sortOrder)],
                    ['Data type', dataTypeLabel(field.dataType)],
                    ['Origin', <OriginTag isCustom={field.isCustom} />],
                    ['System locked', yesNo(field.isSystemLocked)],
                    ['Status', deleted ? 'Deleted' : <FieldStatusBadge isActive={field.isActive} />],
                    ['Created', fmtDateTime(field.createdAt)],
                    ['Last updated', fmtDateTime(field.updatedAt)],
                  ]}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Behaviour and rules</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Visible', yesNo(field.isVisible)],
                    ['Compulsory', field.isRequired ? `Yes · ${stageLabel(field.requiredStage)}` : 'No'],
                    ['Sensitivity', sensitivityLabel(field.sensitivity)],
                    ['Exportable', yesNo(field.isExportable)],
                    ['Options', field.options?.length ? field.options.join(', ') : '—'],
                    ['Rules', rules.length ? rules.join(' · ') : 'None'],
                    ['Records holding a value', String(storedValues)],
                    ['Type locked', yesNo(!!field.typeLocked)],
                  ]}
                />
                {field.isVisible && field.isActive ? null : (
                  <p className="muted fs12" style={{ marginTop: 8, marginBottom: 0 }}>
                    {field.isActive ? 'Hidden: the form does not show this field; its stored values are kept.' : 'Archived: the form does not show this field; its stored values are kept.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h"><h3>Labels per language</h3></div>
            {languages.length ? (
              <div className="tbl-wrap">
                <table className="tbl" aria-label="Labels per language">
                  <thead>
                    <tr><th style={{ width: 170 }}>Language</th><th>Label</th><th>Help text</th></tr>
                  </thead>
                  <tbody>
                    {languages.map((l) => {
                      const t = field.translations?.[l.code];
                      return (
                        <tr key={l.code} className="norow">
                          <td className="fs13">{l.label} <span className="muted mono fs12">({l.code})</span></td>
                          <td>{t?.label ?? <span className="muted fs12">Default: {field.label}</span>}</td>
                          <td>{t?.helpText ?? <span className="muted fs12">{field.helpText ? `Default: ${field.helpText}` : '—'}</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-b">
                <LoadState loading={options.loading} error={options.error} onRetry={() => void options.reload()} />
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Preview</h3>
              {languages.length ? (
                <select className="inp sm" style={{ width: 'auto' }} aria-label="Preview language" value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="">Default label</option>
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="card-b">
              <div className="grid g2">
                <FieldPreview field={field} lang={lang} fileConstraints={options.data?.fileConstraints} idPrefix="view" />
              </div>
              <p className="muted fs12" style={{ margin: '8px 0 0' }}>
                The whole form, as it is rendered now, is under Effective form preview on the list.
              </p>
            </div>
          </div>
        </>
      ) : null}

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
      {deleting && field ? (
        <ConfirmModal
          title="Delete custom field"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'lms-form-field', id: field.id }}
          message={`Delete the custom field ${field.label} (${field.fieldCode})? No record holds a value for it. It is removed from the form and kept for audit history; it can be restored.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(() => formFieldService.remove(field.id), 'Custom field deleted', () => {
              setDeleting(false);
              setDeleted(true);
            })
          }
        />
      ) : null}
      {restoring && field ? (
        <ConfirmModal
          title="Restore custom field"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the custom field ${field.label}? It comes back archived. It cannot be restored while another field of the form now uses its key or label.`}
          onClose={() => setRestoring(false)}
          onConfirm={() =>
            run(() => formFieldService.restore(field.id), 'Custom field restored (archived)', async () => {
              setRestoring(false);
              setDeleted(false);
              await detail.reload();
            })
          }
        />
      ) : null}
    </div>
  );
}
