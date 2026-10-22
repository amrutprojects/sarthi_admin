import { useState, type ReactNode } from 'react';
import { Badge, EmptyState } from '../../../../components/ui';
import Icon from '../../../../components/ui/Icon';
import { useCan } from '../../../../modules/auth';
import { ApiError } from '../../../../services/api-client';
import { ConfirmModal, LoadState, toastError, toastOk, useApiData } from '../../../cms/shared';
import { trackVariantService as svc } from '../services/trackVariantService';
import {
  EVIDENCE_TYPE_LABELS, GATE_CLEARANCE_LABELS, LEARNING_COMPONENT_KINDS, LEARNING_COMPONENT_LABELS, type ApiAssessmentComponent,
  type ApiLearningComponent, type ApiOftCard, type ApiPhase, type ApiReadinessGate, type ApiTrackModule, type ApiTrackVariant,
  type EvidenceType, type ItemPath, type TrackVariantFormOptions,
} from '../types/trackVariant.types';
import {
  OFT_CODE_FROZEN, assessmentComponentFormConfig, learningComponentFormConfig, moduleLabel, oftCardFormConfig, phaseFormConfig,
  readinessGateFormConfig, trackModuleFormConfig, type ItemFormConfig, type ItemFormContext,
} from '../validation/itemForms';
import CurriculumStatusBadge from './CurriculumStatusBadge';
import ItemFormModal from './ItemFormModal';

const NOUN: Record<ItemPath, string> = {
  phases: 'Phase',
  'track-modules': 'Track module',
  'learning-components': 'Learning component',
  'oft-cards': 'OFT card',
  'assessment-components': 'Assessment component',
  'readiness-gates': 'Readiness gate',
};

const TABS: { path: ItemPath; l: string }[] = [
  { path: 'phases', l: 'Phases' },
  { path: 'track-modules', l: 'Track modules' },
  { path: 'learning-components', l: 'Learning components' },
  { path: 'oft-cards', l: 'OFT cards' },
  { path: 'assessment-components', l: 'Assessment components' },
  { path: 'readiness-gates', l: 'Readiness gates' },
];

const fmtNum = (n: number | null) => (n === null ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const evidence = (xs: EvidenceType[]) => xs.map((x) => EVIDENCE_TYPE_LABELS[x]).join(', ');

interface Column<R> {
  l: string;
  w?: number;
  render: (r: R) => ReactNode;
}

interface Loaded<R> {
  data: R[] | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => Promise<void>;
}

/* One collection: summary, Add button, the table with its row actions, and the loading / error / empty states. */
function ItemSection<R extends { id: string }>({
  title, summary, list, columns, actions, emptyMsg, addLabel, canAdd, addBlocked, onAdd, footer,
}: {
  title: string;
  summary: ReactNode;
  list: Loaded<R>;
  columns: Column<R>[];
  actions: ((r: R) => ReactNode) | null;
  emptyMsg: string;
  addLabel: string;
  canAdd: boolean;
  addBlocked: string | null;
  onAdd: () => void;
  footer?: ReactNode;
}) {
  const rows = list.data ?? [];
  const all = actions ? [...columns, { l: 'Action', w: 150, render: actions }] : columns;
  return (
    <div>
      <div className="f ac gp8 wrap mb14" style={{ justifyContent: 'space-between' }}>
        <div className="fs13">{summary}</div>
        {canAdd ? (
          <div className="f ac gp8 wrap">
            {addBlocked ? <span className="muted fs12">{addBlocked}</span> : null}
            <button type="button" className="btn sm primary" disabled={!!addBlocked || list.loading || !!list.error} onClick={onAdd}>
              <Icon name="plus" />{addLabel}
            </button>
          </div>
        ) : null}
      </div>
      <LoadState loading={list.loading && !rows.length} error={list.error} onRetry={() => void list.reload()} />
      {list.error || (list.loading && !rows.length) ? null : rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl" aria-label={title} aria-busy={list.loading}>
            <thead>
              <tr>
                {all.map((c) => (
                  <th key={c.l} style={c.w ? { width: c.w } : undefined}>{c.l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="norow">
                  {all.map((c) => (
                    <td key={c.l}>{c.render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={`No ${title.toLowerCase()} yet`} msg={emptyMsg} />
      )}
      {rows.length && footer ? <div className="muted fs12 mt8">{footer}</div> : null}
    </div>
  );
}

interface CurriculumTabsProps {
  variant: ApiTrackVariant;
  formOptions: TrackVariantFormOptions;
  /* After any curriculum write: the variant is read again (its completeness check changes). */
  onChanged: () => Promise<void> | void;
}

type Pending =
  | { kind: 'delete'; path: ItemPath; id: string; title: string; message: string }
  | { kind: 'retire'; path: 'oft-cards'; id: string; title: string; message: string };

/*
 * The curriculum of the variant, one tab per child collection (phases, track modules, learning components, OFT
 * cards, assessment components, readiness gates). Each tab is a small table with Add, Edit and Delete (a dialog
 * with the backend's rules); a published OFT card is retired instead of deleted, and its code is frozen. Writes need
 * lms-track-variants.create / .update / .delete; a retired variant is read-only.
 */
export default function CurriculumTabs({ variant, formOptions, onChanged }: CurriculumTabsProps) {
  const can = useCan();
  const id = variant.id;
  const [tab, setTab] = useState<ItemPath>('phases');
  const [form, setForm] = useState<{ path: ItemPath; rowId: string | null; config: ItemFormConfig } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /* Phases and track modules are also the choices of the other forms, so they are always loaded. */
  const phases = useApiData(() => svc.listItems(id, 'phases'), [id]);
  const modules = useApiData(() => svc.listItems(id, 'track-modules'), [id]);
  const components = useApiData(() => (tab === 'learning-components' ? svc.listItems(id, 'learning-components') : Promise.resolve(null)), [id, tab]);
  const cards = useApiData(() => (tab === 'oft-cards' ? svc.listItems(id, 'oft-cards') : Promise.resolve(null)), [id, tab]);
  const assessment = useApiData(() => (tab === 'assessment-components' ? svc.listItems(id, 'assessment-components') : Promise.resolve(null)), [id, tab]);
  const gates = useApiData(() => (tab === 'readiness-gates' ? svc.listItems(id, 'readiness-gates') : Promise.resolve(null)), [id, tab]);

  const lists: Record<ItemPath, { reload: () => Promise<void> }> = {
    phases, 'track-modules': modules, 'learning-components': components, 'oft-cards': cards, 'assessment-components': assessment, 'readiness-gates': gates,
  };

  const readOnly = variant.status === 'RETIRED';
  const canCreate = !readOnly && can('createLmsTrackVariant');
  const canUpdate = !readOnly && can('updateLmsTrackVariant');
  const canDelete = !readOnly && can('deleteLmsTrackVariant');
  const c = variant.completeness;
  const shape = formOptions.shape;

  const ctx: ItemFormContext = {
    shape,
    bands: formOptions.competencyBands,
    trackCode: variant.track.code,
    phases: phases.data ?? [],
    trackModules: modules.data ?? [],
  };
  const phaseOf = (pid: string) => (phases.data ?? []).find((p) => p.id === pid);
  const moduleOf = (mid: string | null) => (mid ? (modules.data ?? []).find((m) => m.id === mid) : undefined);

  const afterWrite = async (path: ItemPath) => {
    await lists[path].reload();
    await onChanged();
  };

  const open = (path: ItemPath, rowId: string | null, config: ItemFormConfig) => {
    setActionError(null);
    setForm({ path, rowId, config });
  };

  async function confirmPending() {
    if (!pending) return;
    const p = pending;
    setBusy(true);
    try {
      if (p.kind === 'retire') await svc.retireOftCard(id, p.id);
      else await svc.removeItem(id, p.path, p.id);
      toastOk(p.kind === 'retire' ? 'OFT card retired' : `${NOUN[p.path]} deleted`);
      setActionError(null);
      setPending(null);
      await afterWrite(p.path);
    } catch (err) {
      /* e.g. "This phase cannot be deleted while 3 track modules reference it." — kept on screen, not only toasted. */
      setActionError(err instanceof ApiError ? err.fullMessage : 'Something went wrong');
      setPending(null);
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const editButton = (name: string, onClick: () => void, blocked?: string | null) =>
    canUpdate ? (
      <button type="button" className="btn xs" title={blocked ?? 'Edit'} aria-label={`Edit ${name}`} disabled={!!blocked} onClick={onClick}>
        <Icon name="edit" />
      </button>
    ) : null;
  const deleteButton = (path: ItemPath, rowId: string, name: string, message: string) =>
    canDelete ? (
      <button
        type="button"
        className="btn xs"
        title="Delete"
        aria-label={`Delete ${name}`}
        style={{ color: 'var(--red)' }}
        onClick={() => setPending({ kind: 'delete', path, id: rowId, title: `Delete ${NOUN[path].toLowerCase()}`, message })}
      >
        <Icon name="trash" />
      </button>
    ) : null;
  const rowActions = canUpdate || canDelete;
  const deleteNote = 'It is archived (soft-deleted) and kept for audit history.';

  let section: ReactNode;
  switch (tab) {
    case 'phases': {
      const rows = phases.data ?? [];
      section = (
        <ItemSection<ApiPhase>
          title="Phases"
          summary={<span><b>{c.phases.actual}</b> of {shape.phases} phases</span>}
          list={phases}
          emptyMsg={`A Module 3 variant has ${shape.phases} phases, numbered 1 to ${shape.phases}.`}
          addLabel="Add phase"
          canAdd={canCreate}
          addBlocked={rows.length >= shape.phases ? `All ${shape.phases} phases exist.` : null}
          onAdd={() => open('phases', null, phaseFormConfig(ctx, rows, null))}
          columns={[
            { l: 'Phase', w: 70, render: (r) => <b>{r.phaseNumber}</b> },
            { l: 'Title', render: (r) => r.title },
            { l: 'Track modules', w: 120, render: (r) => (modules.data ?? []).filter((m) => m.phaseId === r.id).length },
          ]}
          actions={
            rowActions
              ? (r) => (
                  <div className="f gp4">
                    {editButton(`phase ${r.phaseNumber}`, () => open('phases', r.id, phaseFormConfig(ctx, rows, r)))}
                    {deleteButton('phases', r.id, `phase ${r.phaseNumber}`, `Delete phase ${r.phaseNumber} (${r.title})? ${deleteNote} A phase with track modules cannot be deleted.`)}
                  </div>
                )
              : null
          }
        />
      );
      break;
    }
    case 'track-modules': {
      const rows = modules.data ?? [];
      const total = rows.reduce((s, m) => s + (m.lectureHours ?? 0) + (m.practicalHours ?? 0), 0);
      section = (
        <ItemSection<ApiTrackModule>
          title="Track modules"
          summary={
            <span>
              <b>{c.trackModules.actual}</b> of {c.trackModules.required ?? `${shape.trackModules.min} or ${shape.trackModules.max} (count not entered)`} track modules
            </span>
          }
          list={modules}
          emptyMsg={`A Module 3 variant has ${shape.trackModules.min} or ${shape.trackModules.max} track modules, as its track syllabus states.`}
          addLabel="Add track module"
          canAdd={canCreate}
          addBlocked={phases.data && !phases.data.length ? 'Add the phases first.' : null}
          onAdd={() => open('track-modules', null, trackModuleFormConfig(ctx, rows, null))}
          columns={[
            { l: 'Pos.', w: 60, render: (r) => r.sortOrder },
            { l: 'Code', w: 120, render: (r) => <span className="mono fs12">{r.code}</span> },
            { l: 'Title', render: (r) => r.title },
            { l: 'Phase', w: 80, render: (r) => phaseOf(r.phaseId)?.phaseNumber ?? '—' },
            { l: 'Lecture h', w: 90, render: (r) => fmtNum(r.lectureHours) },
            { l: 'Practical h', w: 90, render: (r) => fmtNum(r.practicalHours) },
          ]}
          footer={`Total ${fmtNum(total)} hours${variant.courseModule.coreHours !== null ? ` · the module's core hours are ${fmtNum(variant.courseModule.coreHours)}` : ''}.`}
          actions={
            rowActions
              ? (r) => (
                  <div className="f gp4">
                    {editButton(`track module ${r.code}`, () => open('track-modules', r.id, trackModuleFormConfig(ctx, rows, r)))}
                    {deleteButton(
                      'track-modules', r.id, `track module ${r.code}`,
                      `Delete the track module ${r.code} (${r.title})? ${deleteNote} A module that a readiness gate, OFT card or learning component points at cannot be deleted.`,
                    )}
                  </div>
                )
              : null
          }
        />
      );
      break;
    }
    case 'learning-components': {
      const rows = components.data ?? [];
      const have = LEARNING_COMPONENT_KINDS.filter((k) => c.learningComponents[k] >= 1).length;
      section = (
        <ItemSection<ApiLearningComponent>
          title="Learning components"
          summary={<span><b>{have}</b> of {LEARNING_COMPONENT_KINDS.length} kinds present (mini and integration projects, capstone, business simulation, portfolio)</span>}
          list={components}
          emptyMsg="The Module 3 shape needs mini and integration projects, a capstone project, a business simulation and a portfolio."
          addLabel="Add component"
          canAdd={canCreate}
          addBlocked={null}
          onAdd={() => open('learning-components', null, learningComponentFormConfig(ctx, rows, null))}
          columns={[
            { l: 'Kind', w: 170, render: (r) => LEARNING_COMPONENT_LABELS[r.kind] },
            { l: 'Title', render: (r) => r.title },
            { l: 'Track module', render: (r) => { const m = moduleOf(r.trackModuleId); return m ? <span className="fs12">{moduleLabel(m)}</span> : <span className="muted">—</span>; } },
          ]}
          actions={
            rowActions
              ? (r) => (
                  <div className="f gp4">
                    {editButton(r.title, () => open('learning-components', r.id, learningComponentFormConfig(ctx, rows, r)))}
                    {deleteButton('learning-components', r.id, r.title, `Delete the ${LEARNING_COMPONENT_LABELS[r.kind].toLowerCase()} ${r.title}? ${deleteNote}`)}
                  </div>
                )
              : null
          }
        />
      );
      break;
    }
    case 'oft-cards': {
      const rows = cards.data ?? [];
      const retired = rows.filter((r) => r.status === 'RETIRED').length;
      section = (
        <ItemSection<ApiOftCard>
          title="OFT cards"
          summary={
            <span>
              <b>{c.oftCards.actual}</b> of {c.oftCards.required ?? `${shape.oftCards.min} or ${shape.oftCards.max} (count not entered)`} OFT cards
              <span className="muted fs12"> · {fmtNum(c.oftCards.hoursMin)}–{fmtNum(c.oftCards.hoursMax)} hours{retired ? ` · ${retired} retired, not counted` : ''}</span>
            </span>
          }
          list={cards}
          emptyMsg={`A Module 3 variant has ${shape.oftCards.min} or ${shape.oftCards.max} OFT cards, coded OFT-M3-${variant.track.code}-{nn}.`}
          addLabel="Add OFT card"
          canAdd={canCreate}
          addBlocked={null}
          onAdd={() => open('oft-cards', null, oftCardFormConfig(ctx, rows, null))}
          columns={[
            {
              l: 'Code',
              w: 170,
              render: (r) => (
                <span>
                  <span className="mono fs12">{r.oftCode}</span>
                  {r.status !== 'DRAFT' ? <div className="muted fs12" title={OFT_CODE_FROZEN}>Code frozen (published)</div> : null}
                </span>
              ),
            },
            { l: 'Title', render: (r) => r.title },
            { l: 'Stage', render: (r) => r.stage ?? <span className="muted">—</span> },
            { l: 'Hours', w: 90, render: (r) => `${fmtNum(r.hoursMin)}–${fmtNum(r.hoursMax)}` },
            { l: 'Evidence', render: (r) => <span className="fs12">{evidence(r.evidenceTypes)}</span> },
            { l: 'Host verification', w: 90, render: (r) => (r.hostVerificationRequired ? 'Required' : 'No') },
            { l: 'Status', w: 100, render: (r) => <CurriculumStatusBadge status={r.status} /> },
          ]}
          actions={
            rowActions
              ? (r) => (
                  <div className="f gp4">
                    {editButton(`OFT card ${r.oftCode}`, () => open('oft-cards', r.id, oftCardFormConfig(ctx, rows, r)), r.status === 'RETIRED' ? 'A retired OFT card cannot be changed.' : null)}
                    {r.status === 'DRAFT'
                      ? deleteButton('oft-cards', r.id, `OFT card ${r.oftCode}`, `Delete the draft OFT card ${r.oftCode} (${r.title})? ${deleteNote}`)
                      : null}
                    {r.status === 'PUBLISHED' && canDelete ? (
                      <button
                        type="button"
                        className="btn xs"
                        title="A published card is retired, never deleted"
                        aria-label={`Retire OFT card ${r.oftCode}`}
                        onClick={() =>
                          setPending({
                            kind: 'retire',
                            path: 'oft-cards',
                            id: r.id,
                            title: 'Retire OFT card',
                            message: `Retire the published OFT card ${r.oftCode} (${r.title})? It is kept for the records that use it but no longer counted or offered, and it cannot be changed again.`,
                          })
                        }
                      >
                        Retire
                      </button>
                    ) : null}
                  </div>
                )
              : null
          }
        />
      );
      break;
    }
    case 'assessment-components': {
      const rows = assessment.data ?? [];
      const n = shape.assessmentComponents;
      section = (
        <ItemSection<ApiAssessmentComponent>
          title="Assessment components"
          summary={
            <span>
              <b>{c.assessmentComponents.actual}</b> of {n} components
              <span className="muted fs12">
                {' '}· {c.assessmentComponents.weightTotal === null ? 'no weights entered' : `weights total ${fmtNum(c.assessmentComponents.weightTotal)} of 100`}
              </span>
            </span>
          }
          list={assessment}
          emptyMsg={`The Module 3 assessment framework has ${n} components; once any weight is entered, all must be, totalling 100.`}
          addLabel="Add component"
          canAdd={canCreate}
          addBlocked={rows.length >= n ? `All ${n} components exist.` : null}
          onAdd={() => open('assessment-components', null, assessmentComponentFormConfig(ctx, rows, null))}
          columns={[
            { l: 'Pos.', w: 60, render: (r) => r.sortOrder },
            { l: 'Code', w: 140, render: (r) => <span className="mono fs12">{r.componentCode}</span> },
            { l: 'Label', render: (r) => r.label },
            { l: 'Weight', w: 80, render: (r) => (r.weight === null ? <span className="muted">—</span> : `${fmtNum(r.weight)}%`) },
            { l: 'Source', render: (r) => <span className="fs12">{r.source ?? '—'}</span> },
            { l: 'Indicative', w: 90, render: (r) => (r.indicative ? <Badge tone="amber">Indicative</Badge> : <Badge tone="green">Prescribed</Badge>) },
          ]}
          actions={
            rowActions
              ? (r) => (
                  <div className="f gp4">
                    {editButton(`component ${r.componentCode}`, () => open('assessment-components', r.id, assessmentComponentFormConfig(ctx, rows, r)))}
                    {deleteButton('assessment-components', r.id, `component ${r.componentCode}`, `Delete the assessment component ${r.componentCode} (${r.label})? ${deleteNote}`)}
                  </div>
                )
              : null
          }
        />
      );
      break;
    }
    case 'readiness-gates': {
      const rows = gates.data ?? [];
      section = (
        <ItemSection<ApiReadinessGate>
          title="Readiness gates"
          summary={<span><b>{c.readinessGates.actual}</b> of {shape.readinessGates} readiness gates</span>}
          list={gates}
          emptyMsg={`A Module 3 variant has ${shape.readinessGates} readiness gates, each held after a later track module than the one before.`}
          addLabel="Add gate"
          canAdd={canCreate}
          addBlocked={
            rows.length >= shape.readinessGates
              ? `All ${shape.readinessGates} gates exist.`
              : modules.data && !modules.data.length
                ? 'Add the track modules first.'
                : null
          }
          onAdd={() => open('readiness-gates', null, readinessGateFormConfig(ctx, rows, null))}
          columns={[
            { l: 'Gate', w: 60, render: (r) => <b>{r.gateNumber}</b> },
            { l: 'Title', render: (r) => r.title },
            { l: 'Held after', render: (r) => { const m = moduleOf(r.heldAfterTrackModuleId); return <span className="fs12">{m ? moduleLabel(m) : '—'}</span>; } },
            { l: 'Evidence', render: (r) => <span className="fs12">{evidence(r.evidenceTypes)}</span> },
            {
              l: 'Clearance',
              w: 140,
              render: (r) => (r.clearanceMode === 'MINIMUM_BAND' ? `Minimum band ${r.clearanceMinBand ?? '—'}` : GATE_CLEARANCE_LABELS[r.clearanceMode]),
            },
          ]}
          actions={
            rowActions
              ? (r) => (
                  <div className="f gp4">
                    {editButton(`gate ${r.gateNumber}`, () => open('readiness-gates', r.id, readinessGateFormConfig(ctx, rows, r)))}
                    {deleteButton('readiness-gates', r.id, `gate ${r.gateNumber}`, `Delete readiness gate ${r.gateNumber} (${r.title})? ${deleteNote}`)}
                  </div>
                )
              : null
          }
        />
      );
      break;
    }
  }

  const counts: Record<ItemPath, number> = {
    phases: c.phases.actual,
    'track-modules': c.trackModules.actual,
    'learning-components': LEARNING_COMPONENT_KINDS.reduce((s, k) => s + c.learningComponents[k], 0),
    'oft-cards': c.oftCards.actual,
    'assessment-components': c.assessmentComponents.actual,
    'readiness-gates': c.readinessGates.actual,
  };

  return (
    <div className="card">
      <div className="card-h"><h3>Curriculum</h3></div>
      <div className="card-b">
        <div className="tabs" role="tablist" aria-label="Curriculum">
          {TABS.map((t) => (
            <button
              type="button"
              role="tab"
              key={t.path}
              aria-selected={tab === t.path}
              className={tab === t.path ? 'on' : ''}
              onClick={() => {
                setActionError(null);
                setTab(t.path);
              }}
            >
              {t.l} <span className="muted">({counts[t.path]})</span>
            </button>
          ))}
        </div>

        {readOnly ? (
          <div className="callout c-info mb14" role="status">
            <div>This variant is retired: its curriculum is kept for the records that use it and can no longer be changed.</div>
          </div>
        ) : null}
        {actionError ? (
          <div className="callout c-err mb14" role="alert">
            <div>
              <b>Not done. </b>
              {actionError}{' '}
              <button type="button" className="btn xs" onClick={() => setActionError(null)}>Dismiss</button>
            </div>
          </div>
        ) : null}

        <div role="tabpanel" aria-label={TABS.find((t) => t.path === tab)?.l}>{section}</div>
      </div>

      {form ? (
        <ItemFormModal
          config={form.config}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const f = form;
            if (f.rowId) await svc.updateItem(id, f.path, f.rowId, payload);
            else await svc.createItem(id, f.path, payload);
            toastOk(`${NOUN[f.path]} ${f.rowId ? 'updated' : 'added'}`);
            setForm(null);
            await afterWrite(f.path);
          }}
        />
      ) : null}
      {pending ? (
        <ConfirmModal
          title={pending.title}
          danger
          busy={busy}
          confirmLabel={pending.kind === 'retire' ? 'Retire' : 'Delete'}
          message={pending.message}
          onClose={() => setPending(null)}
          onConfirm={() => void confirmPending()}
        />
      ) : null}
    </div>
  );
}
