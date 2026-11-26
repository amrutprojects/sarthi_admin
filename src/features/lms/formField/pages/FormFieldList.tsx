import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Badge, FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import type { Option } from '../../../../types/legacy';
import BackButton from '../../../cms/components/BackButton';
import MasterKpis from '../../../cms/components/MasterKpis';
import MasterTable, { masterQuery, type MasterColumn } from '../../../cms/components/MasterTable';
import { ConfirmModal, useAction, useApiData } from '../../../cms/shared';
import { usePageTitle, useMasterQuery } from '../../../cms/useMasterQuery';
import EffectivePreview from '../components/EffectivePreview';
import { FieldStatusBadge, LockTag, OriginTag } from '../components/FieldBadges';
import { yesNo } from '../components/fieldFormat';
import { useFormSections } from '../components/useFormSections';
import { formFieldService, type FormFieldQuery } from '../services/formFieldService';
import {
  DEFAULT_FORM_CODE, LOCK_MESSAGES, dataTypeLabel, isChoiceType, sectionChoiceLabel, stageLabel, type ApiFormField,
} from '../types/formField.types';

const LIST = '/lms/form-fields';

const ORIGIN_OPTIONS: Option[] = [
  { v: '', l: 'Standard and custom' },
  { v: 'false', l: 'Standard fields' },
  { v: 'true', l: 'Custom fields' },
];
const REQUIRED_OPTIONS: Option[] = [
  { v: '', l: 'Compulsory or optional' },
  { v: 'true', l: 'Compulsory only' },
  { v: 'false', l: 'Optional only' },
];
const VISIBLE_OPTIONS: Option[] = [
  { v: '', l: 'Visible or hidden' },
  { v: 'true', l: 'Visible only' },
  { v: 'false', l: 'Hidden only' },
];
const STATUS_OPTIONS: Option[] = [
  { v: '', l: 'All statuses' },
  { v: 'true', l: 'Active only' },
  { v: 'false', l: 'Archived only' },
];

type Tab = 'fields' | 'preview';

/*
 * Form Field Configuration listing (L-38 / UI-361): filter by form (Trainer Profile by default), section,
 * standard / custom, compulsory, visible and status; search label or key; sorting and paging — all served by
 * the backend. The second tab is the effective form: what the form renders and the server enforces now.
 * "Show deleted" (lms-form-fields.delete) lists only the soft-deleted fields (?deleted=true), each with a
 * Restore action; the section filter offers every section of the form (GET /forms/:formCode/sections).
 */
export default function FormFieldList() {
  usePageTitle('Form Field Configuration');
  const go = useGo();
  const can = useCan();
  const [params] = useSearchParams();
  const urlForm = params.get('formCode') || DEFAULT_FORM_CODE;
  const initial = useMemo<FormFieldQuery>(
    () => ({ ...masterQuery('position', 25), formCode: urlForm, sectionCode: '', isRequired: '', isVisible: '', isCustom: '', deleted: false }),
    [urlForm],
  );
  const { query: q, patch, reset } = useMasterQuery<FormFieldQuery>(initial);
  const [tab, setTab] = useState<Tab>('fields');
  const options = useApiData(() => formFieldService.formOptions(), []);
  const page = useApiData(() => formFieldService.list(q), [q]);
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState<ApiFormField | null>(null);
  const [deleting, setDeleting] = useState<ApiFormField | null>(null);
  /* The last field deleted here, offered for restore until another one is deleted or it is restored. */
  const [deleted, setDeleted] = useState<ApiFormField | null>(null);
  /* The deleted field whose restore is being confirmed (from a "Show deleted" row or the notice above). */
  const [restoring, setRestoring] = useState<ApiFormField | null>(null);

  /* KPI totals and the effective form follow the form filter; any write reloads them. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { formCode: q.formCode };
      const [total, custom, required, hidden] = await Promise.all([
        formFieldService.count(scope),
        formFieldService.count({ ...scope, isCustom: 'true' }),
        formFieldService.count({ ...scope, isRequired: 'true' }),
        formFieldService.count({ ...scope, isVisible: 'false' }),
      ]);
      return { total, custom, required, hidden };
    },
    [statsKey, q.formCode],
  );
  const effective = useApiData(() => formFieldService.effective(q.formCode), [statsKey, q.formCode]);
  /* Every section of the form, including those whose fields are all hidden or archived. */
  const sectionFeed = useFormSections(q.formCode, options.data, statsKey);

  /* A form the backend does not offer (an old link) falls back to the default form. */
  const forms = options.data?.forms;
  useEffect(() => {
    if (forms?.length && !forms.some((f) => f.code === q.formCode)) {
      patch({ formCode: (forms.find((f) => f.code === DEFAULT_FORM_CODE) ?? forms[0]).code, sectionCode: '' });
    }
  }, [forms, q.formCode, patch]);

  const rows = page.data?.items ?? [];
  /* The rows on screen came from the deleted=true listing (not merely the toggle, which runs ahead of the reload). */
  const showingDeleted = page.data?.deleted === true;
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const form = forms?.find((f) => f.code === q.formCode);
  const formOptionsList: Option[] = forms
    ? forms.map((f) => ({ v: f.code, l: f.label }))
    : [{ v: q.formCode, l: options.loading ? 'Loading…' : q.formCode }];
  const sectionOptions: Option[] = [{ v: '', l: 'All sections' }, ...sectionFeed.sections.map((s) => ({ v: s.code, l: sectionChoiceLabel(s) }))];
  if (q.sectionCode && !sectionOptions.some((o) => o.v === q.sectionCode)) sectionOptions.push({ v: q.sectionCode, l: q.sectionCode });

  const columns: MasterColumn<ApiFormField>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '70px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'position',
      l: 'Order',
      w: '120px',
      render: (r) => (
        <span className="fs12">
          <span className="mono">{r.sectionCode}</span> · {r.sortOrder}
          <div className="muted fs12">{r.sectionLabel}</div>
        </span>
      ),
    },
    { k: 'fieldCode', l: 'Key', render: (r) => <span className="mono fs12">{r.fieldCode}</span> },
    {
      k: 'label',
      l: 'Label',
      render: (r) => {
        const other = Object.entries(r.translations ?? {}).filter(([, t]) => t?.label);
        return (
          <span>
            <b className="lnk">{r.label}</b>
            {other.length ? <div className="muted fs12">{other.map(([code, t]) => `${code}: ${t?.label}`).join(' · ')}</div> : null}
          </span>
        );
      },
    },
    {
      k: 'dataType',
      l: 'Type',
      sortable: false,
      render: (r) => (
        <span className="fs12">
          {dataTypeLabel(r.dataType)}
          {isChoiceType(r.dataType) && r.options ? <div className="muted fs12">{r.options.length} options</div> : null}
        </span>
      ),
    },
    {
      k: 'isRequired',
      l: 'Compulsory',
      sortable: false,
      render: (r) => <span className="fs12">{r.isRequired ? <>Yes<div className="muted fs12">{stageLabel(r.requiredStage)}</div></> : 'No'}</span>,
    },
    { k: 'isVisible', l: 'Visible', sortable: false, render: (r) => <span className="fs12">{yesNo(r.isVisible)}</span> },
    { k: 'isCustom', l: 'Standard / Custom', sortable: false, render: (r) => <OriginTag isCustom={r.isCustom} /> },
    { k: 'isSystemLocked', l: 'Locked', sortable: false, render: (r) => <LockTag locked={r.isSystemLocked} /> },
    {
      k: 'isActive',
      l: 'Status',
      sortable: false,
      render: (r) => (showingDeleted ? <Badge tone="red">Deleted</Badge> : <FieldStatusBadge isActive={r.isActive} />),
    },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f ac gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${r.label}`} onClick={() => go(`${LIST}/${r.id}`)}><Icon name="eye" /></button>
          <Can action="updateLmsFormField">
            <button type="button" className="btn xs" title="Edit" aria-label={`Edit ${r.label}`} onClick={() => go(`${LIST}/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateLmsFormField">
            <button
              type="button"
              role="switch"
              aria-checked={r.isActive}
              aria-label={`${r.label}: ${r.isActive ? 'active' : 'archived'}`}
              title={r.isCustom ? (r.isActive ? 'Active — switch off to archive' : 'Archived — switch on to activate') : LOCK_MESSAGES.FIELD_STANDARD_ARCHIVE}
              className={'switch sm' + (r.isActive ? ' on' : '')}
              disabled={busy || !r.isCustom}
              onClick={() => setConfirming(r)}
            />
          </Can>
          <Can action="deleteLmsFormField">
            <button
              type="button"
              className="btn xs"
              title={r.isCustom ? 'Delete' : LOCK_MESSAGES.FIELD_STANDARD_DELETE}
              aria-label={`Delete ${r.label}`}
              style={{ color: 'var(--red)' }}
              disabled={busy || !r.isCustom}
              onClick={() => setDeleting(r)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];
  /* A deleted field cannot be opened, edited or archived (the API answers 404): its only action is Restore. */
  const restoreColumn: MasterColumn<ApiFormField> = {
    k: 'actions',
    l: 'Action',
    sortable: false,
    render: (r) => (
      <Can action="deleteLmsFormField">
        <button type="button" className="btn xs" title="Restore: it comes back archived" aria-label={`Restore ${r.label}`} disabled={busy} onClick={() => setRestoring(r)}>
          Restore
        </button>
      </Can>
    ),
  };
  const shownColumns = showingDeleted ? [...columns.filter((c) => c.k !== 'actions'), restoreColumn] : columns;

  const filtered = q.search !== '' || q.status !== '' || q.sectionCode !== '' || q.isCustom !== '' || q.isRequired !== '' || q.isVisible !== '';

  const emptyMsg = showingDeleted
    ? filtered
      ? 'No deleted field matches the current search and filters.'
      : 'This form has no deleted fields.'
    : filtered
      ? 'No field matches the current search and filters.'
      : 'This form has no fields yet. Use Add Custom Field to add the first one.';
  const createLink = `${LIST}/create?formCode=${encodeURIComponent(q.formCode)}${q.sectionCode ? `&sectionCode=${encodeURIComponent(q.sectionCode)}` : ''}`;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Form Field Configuration' }]}
        title="Form Field Configuration"
        sub="Which fields a configurable form shows, which are compulsory and from when, their labels per language and the custom fields added to it. Changes apply on the next request."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createLmsFormField">
              <button type="button" className="btn primary" onClick={() => go(createLink)}>
                <Icon name="plus" />Add Custom Field
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: form ? `Fields of ${form.label}` : 'Fields of the form', value: stats.data?.total, tone: 'b' },
          { label: 'Custom fields', value: stats.data?.custom, tone: 'v', title: 'Added in Form Field Configuration (active and archived)' },
          { label: 'Compulsory', value: stats.data?.required, tone: 'g', title: 'Must be filled in, on save or on verification' },
          { label: 'Hidden', value: stats.data?.hidden, tone: 'a', title: 'Not shown on the form; stored values are kept' },
        ]}
      />

      <FilterBar
        id="lms-form-fields"
        fields={[
          { k: 'formCode', l: 'Form', options: formOptionsList },
          { k: 'sectionCode', l: 'Section', options: sectionOptions },
          { k: 'isCustom', l: 'Standard / Custom', options: ORIGIN_OPTIONS },
          { k: 'isRequired', l: 'Compulsory', options: REQUIRED_OPTIONS },
          { k: 'isVisible', l: 'Visible', options: VISIBLE_OPTIONS },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ formCode: q.formCode, sectionCode: q.sectionCode, isCustom: q.isCustom, isRequired: q.isRequired, isVisible: q.isVisible, status: q.status }}
        onChange={(key, value) => patch((key === 'formCode' ? { formCode: value, sectionCode: '' } : { [key]: value }) as Partial<FormFieldQuery>)}
        onReset={reset}
        extra={
          /* The deleted custom fields, to restore one: for those who may delete (and so restore) fields. */
          <Can action="deleteLmsFormField">
            <span className="f ac gp8 fs12">
              <button
                type="button"
                role="switch"
                aria-checked={q.deleted}
                aria-label="Show deleted"
                className={'switch sm' + (q.deleted ? ' on' : '')}
                onClick={() => patch({ deleted: !q.deleted })}
              />
              Show deleted
            </span>
          </Can>
        }
      />

      {options.error ? (
        <div className="callout c-err mb14" role="alert">
          <div>
            <b>Could not load the forms and sections. </b>
            {options.error.fullMessage}{' '}
            <button type="button" className="btn xs" onClick={() => void options.reload()}>Retry</button>
          </div>
        </div>
      ) : null}

      {deleted ? (
        <div className="callout c-ok mb14" role="status">
          <div>
            The custom field <b>{deleted.label}</b> was deleted.{' '}
            <Can action="deleteLmsFormField">
              <button type="button" className="btn xs" disabled={busy} onClick={() => setRestoring(deleted)}>Restore</button>
            </Can>{' '}
            <button type="button" className="btn xs" onClick={() => setDeleted(null)}>Dismiss</button>
          </div>
        </div>
      ) : null}

      <div className="tabs" role="tablist" aria-label="Form field configuration">
        <button type="button" role="tab" aria-selected={tab === 'fields'} className={tab === 'fields' ? 'on' : ''} onClick={() => setTab('fields')}>
          Fields
        </button>
        <button type="button" role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>
          Effective form preview
        </button>
      </div>

      {tab === 'fields' ? (
        <div className="card" role="tabpanel" aria-label="Fields">
          <div className="card-h">
            <h3>{showingDeleted ? 'Deleted fields' : 'Fields'} <span className="sub">{form ? form.label : q.formCode}</span></h3>
            {filtered ? <span className="tag">filtered</span> : null}
          </div>
          <MasterTable
            columns={shownColumns}
            rows={rows}
            meta={page.data?.meta}
            loading={page.loading}
            error={page.error}
            query={q}
            onQuery={patch}
            onRetry={reload}
            searchLabel="label or key"
            emptyMsg={emptyMsg}
            rowLink={can('viewLmsFormFields') && !showingDeleted ? (r) => `${LIST}/${r.id}` : undefined}
          />
        </div>
      ) : (
        <div role="tabpanel" aria-label="Effective form preview">
          <EffectivePreview
            config={effective.data}
            loading={effective.loading}
            error={effective.error}
            onRetry={() => void effective.reload()}
            languages={options.data?.languages ?? []}
            fileConstraints={options.data?.fileConstraints}
          />
        </div>
      )}

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Archive custom field' : 'Activate custom field'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, archive' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Archive the custom field ${confirming.label}? It is no longer shown on the form; its stored values are kept.`
              : `Activate the custom field ${confirming.label}? It is shown on the form again (when visible).`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => formFieldService.setStatus(row.id, !row.isActive), row.isActive ? 'Custom field archived' : 'Form field activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete custom field"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'lms-form-field', id: deleting.id }}
          message={`Delete the custom field ${deleting.label} (${deleting.fieldCode})? It is removed from the form and kept for audit history; it can be restored. A custom field that records hold a value for cannot be deleted: archive it instead.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const row = deleting;
            run(() => formFieldService.remove(row.id), 'Custom field deleted', async () => {
              setDeleting(null);
              setDeleted(row);
              await reload();
            });
          }}
        />
      ) : null}
      {restoring ? (
        <ConfirmModal
          title="Restore custom field"
          busy={busy}
          confirmLabel="Restore"
          message={`Restore the custom field ${restoring.label} (${restoring.fieldCode})? It comes back archived. It cannot be restored while another field of the form now uses its key or label.`}
          onClose={() => setRestoring(null)}
          onConfirm={() => {
            const row = restoring;
            /* A 409 (key or label taken meanwhile) is toasted with the server's message; the dialog stays open. */
            run(() => formFieldService.restore(row.id), 'Custom field restored (archived)', async () => {
              setRestoring(null);
              if (deleted?.id === row.id) setDeleted(null);
              await reload();
            });
          }}
        />
      ) : null}
    </div>
  );
}
