import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Callout, EmptyState, FilterBar, ModeTag, PageHead } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import type { Option } from '../../../../types/legacy';
import BackButton from '../../../cms/components/BackButton';
import MasterKpis from '../../../cms/components/MasterKpis';
import { geoFilterOptions } from '../../../cms/components/MasterFilters';
import { LoadState, fmtDateTime, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { lmsOptions } from '../../options';
import CalendarTabs from '../components/CalendarTabs';
import ConfigSourceBadge from '../components/ConfigSourceBadge';
import LearningConfigEditModal from '../components/LearningConfigEditModal';
import { calendarService } from '../services/calendarService';
import { configRowId, type ApiLearningConfigValue } from '../types/learningConfig.types';
import { formatConfigValue, sameConfigValue } from '../validation/learningConfig.validation';

type SourceFilter = '' | 'TBC' | 'SYLLABUS' | 'CONFIGURED';

const SOURCE_OPTIONS: Option[] = [
  { v: '', l: 'All values' },
  { v: 'TBC', l: 'To Be Confirmed' },
  { v: 'SYLLABUS', l: 'Syllabus default' },
  { v: 'CONFIGURED', l: 'Configured' },
];

const sourceOf = (r: ApiLearningConfigValue): SourceFilter => (r.toBeConfirmed || r.valueSource === null ? 'TBC' : r.valueSource);

interface Filters {
  group: string;
  source: SourceFilter;
  search: string;
}

const NO_FILTERS: Filters = { group: '', source: '', search: '' };

function GroupTable({ group, rows, onEdit }: { group: string; rows: ApiLearningConfigValue[]; onEdit: (r: ApiLearningConfigValue) => void }) {
  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>{group} <span className="sub">{rows.length}</span></h3>
      </div>
      <div className="tbl-wrap">
        <table className="tbl" aria-label={group}>
          <thead>
            <tr>
              <th style={{ width: 70 }}>Sr. No.</th>
              <th>Setting</th>
              <th style={{ width: 110 }}>Mode</th>
              <th>Value</th>
              <th>Source</th>
              <th>Last change</th>
              <th style={{ width: 70 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={configRowId(r)} className="norow">
                <td className="muted fs12">{i + 1}</td>
                <td>
                  <b className="fs13">{r.label}</b>
                  <div className="muted mono fs12">{r.key}</div>
                </td>
                <td>{r.mode ? <ModeTag mode={r.mode} /> : <span className="muted fs12">All modes</span>}</td>
                <td className="fs13">
                  {r.value === null ? <span className="muted">—</span> : formatConfigValue(r, r.value)}
                  {r.kind === 'SYLLABUS' && r.valueSource === 'CONFIGURED' && !sameConfigValue(r.value, r.syllabusValue) ? (
                    <div className="muted fs12">Syllabus: {formatConfigValue(r, r.syllabusValue)}</div>
                  ) : null}
                </td>
                <td>
                  <ConfigSourceBadge row={r} />
                  {r.valueSource !== 'CONFIGURED' && r.sourceNote ? <div className="muted fs12" style={{ marginTop: 2 }}>{r.sourceNote}</div> : null}
                  {r.openQuestions.length ? <div className="muted fs12 mono" style={{ marginTop: 2 }}>{r.openQuestions.join(' · ')}</div> : null}
                </td>
                <td className="fs12">
                  {r.reason ? (
                    <>
                      <div>{r.reason}</div>
                      <div className="muted">{fmtDateTime(r.updatedAt)}</div>
                    </>
                  ) : (
                    <span className="muted">Never changed</span>
                  )}
                </td>
                <td>
                  <Can action="updateLmsLearningConfig">
                    <button
                      type="button"
                      className="btn xs"
                      title="Edit"
                      aria-label={`Edit ${r.label}${r.mode ? ` (${r.mode.toLowerCase()})` : ''}`}
                      onClick={() => onEdit(r)}
                    >
                      <Icon name="edit" />
                    </button>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/*
 * Learning configuration (L-05 learning-configuration tab, F-LMS-05-07; UI-313): every key of one entity with
 * its value, where the value comes from (syllabus document or a saved change) and the keys still To Be
 * Confirmed; mode-specific keys have one row for Offline and one for Online. Editing needs a reason.
 *
 * Its own menu and codes (L-05 config.learning.view / update → lms-learning-config.view / .update): the route
 * needs .view, Edit needs .update. The calendar tabs show only to a user who may also open the calendars.
 */
export default function LearningConfig() {
  usePageTitle('Learning Configuration');
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const entities = useApiData(() => lmsOptions.entities(), []);
  /* The entity in the link, or the only one there is. */
  const requested = params.get('entityId') ?? '';
  const entityId = requested || (entities.data?.length === 1 ? entities.data[0].id : '');
  const config = useApiData(() => (entityId ? calendarService.learningConfig(entityId) : Promise.resolve(null)), [entityId]);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [editing, setEditing] = useState<ApiLearningConfigValue | null>(null);

  const keys = useMemo(() => (config.data && config.data.entityId === entityId ? config.data.keys : []), [config.data, entityId]);
  const groups = useMemo(() => [...new Set(keys.map((k) => k.group))], [keys]);
  const groupOptions: Option[] = [{ v: '', l: 'All groups' }, ...groups.map((g) => ({ v: g, l: g }))];
  const entity = entities.data?.find((e) => e.id === entityId);

  const needle = filters.search.trim().toLowerCase();
  const visible = keys.filter(
    (k) =>
      (!filters.group || k.group === filters.group) &&
      (!filters.source || sourceOf(k) === filters.source) &&
      (!needle || k.label.toLowerCase().includes(needle) || k.key.toLowerCase().includes(needle)),
  );
  const filtered = filters.group !== '' || filters.source !== '' || needle !== '';

  const count = (s: SourceFilter) => (config.data ? keys.filter((k) => sourceOf(k) === s).length : undefined);

  const selectEntity = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set('entityId', id);
        else next.delete('entityId');
        return next;
      },
      { replace: true },
    );

  let body;
  if (!entityId) {
    body = entities.error ? (
      <LoadState loading={false} error={entities.error} onRetry={() => void entities.reload()} />
    ) : entities.loading ? (
      <LoadState loading error={null} onRetry={() => undefined} />
    ) : (
      <div className="card">
        <EmptyState
          title={entities.data?.length ? 'Select an entity' : 'No entity yet'}
          msg={
            entities.data?.length
              ? 'The learning configuration is kept per entity. Choose one in the Entity filter above.'
              : 'No active entity exists yet. Create one in the Entity Master first.'
          }
        />
      </div>
    );
  } else if (config.error) {
    body = <LoadState loading={false} error={config.error} onRetry={() => void config.reload()} />;
  } else if (config.loading && !keys.length) {
    body = <LoadState loading error={null} onRetry={() => undefined} />;
  } else if (!visible.length) {
    body = (
      <div className="card">
        <EmptyState
          title="No records found"
          msg={filtered ? 'No configuration value matches the current search and filters.' : 'The server returned no configuration keys.'}
        />
      </div>
    );
  } else {
    body = groups
      .map((g) => ({ g, rows: visible.filter((k) => k.group === g) }))
      .filter((x) => x.rows.length)
      .map((x) => <GroupTable key={x.g} group={x.g} rows={x.rows} onEdit={setEditing} />);
  }

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Learning Configuration' }]}
        title="Learning Configuration"
        badge={entity ? <span className="tag">{entity.name}</span> : undefined}
        sub="Hours, sessions, assessment, attendance and progress rules of an entity, with their source and the values still To Be Confirmed."
        back={<BackButton to="/dashboard" />}
      />

      {can('viewLmsCalendars') ? <CalendarTabs active="learning" entityId={entityId || undefined} /> : null}

      <MasterKpis
        items={[
          { label: 'Configuration values', value: config.data ? keys.length : undefined, tone: 'b', title: 'One per key, and one per delivery mode for mode-specific keys' },
          { label: 'Syllabus defaults', value: count('SYLLABUS'), tone: 'v', title: 'Values of the final syllabus documents, pending approval (OQ-012)' },
          { label: 'Configured', value: count('CONFIGURED'), tone: 'g', title: 'Values saved by an authorised user' },
          { label: 'To Be Confirmed', value: count('TBC'), tone: 'a', title: 'No value until the competent authority prescribes it' },
        ]}
      />

      <FilterBar
        id="lms-learning-config"
        fields={[
          {
            k: 'entityId',
            l: 'Entity',
            options: geoFilterOptions({ options: entities.data ?? [], loading: entities.loading, allLabel: 'Select an entity', selected: entityId }),
          },
          { k: 'group', l: 'Group', options: groupOptions },
          { k: 'source', l: 'Value', options: SOURCE_OPTIONS },
          { k: 'search', l: 'Search', type: 'text', ph: 'Setting or key' },
        ]}
        value={{ entityId, group: filters.group, source: filters.source, search: filters.search }}
        onChange={(key, value) => {
          if (key === 'entityId') {
            selectEntity(value);
            setFilters(NO_FILTERS);
          } else setFilters((f) => ({ ...f, [key]: value }));
        }}
        onReset={() => setFilters(NO_FILTERS)}
      />

      <div className="mb14">
        <Callout tone="info" title="How these values work. ">
          Syllabus keys show the value of the final syllabus documents (pending approval by the competent authority, OQ-012) until an
          authorised user changes it; they can be changed but not emptied. Prescribed keys stay <b>To Be Confirmed</b> until the competent
          authority prescribes them (OQ-013 to OQ-015); no default is assumed. Delivery-mode rules hold one value for Offline and one for
          Online (OQ-042). Every change needs a reason, is audited, and never rewrites past records.
        </Callout>
      </div>

      {body}

      {editing && entityId ? (
        <LearningConfigEditModal
          row={editing}
          entityId={entityId}
          entityName={entity?.name}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await config.reload();
          }}
        />
      ) : null}
    </div>
  );
}
