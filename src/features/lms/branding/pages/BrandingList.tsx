import { useMemo } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, FilterBar, PageHead, useGo } from '../../../../components/ui';
import type { PageMeta } from '../../../../services/api-client';
import type { Option } from '../../../../types/legacy';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterKpis from '../../../cms/components/MasterKpis';
import { STATUS_OPTIONS } from '../../../cms/components/MasterFilters';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn, type MasterQuery } from '../../../cms/components/MasterTable';
import { fmtDateTime, useApiData } from '../../../cms/shared';
import { usePageTitle, useMasterQuery } from '../../../cms/useMasterQuery';
import { ConfigBadge, Swatch } from '../components/SettingValue';
import {
  configState, coloursOf, lastUpdated, loadBrandingOverview, logoOf, missingLabels, valuesSet, type BrandingConfigState, type BrandingOverviewRow,
} from '../services/brandingOverview';
import { settingOf } from '../validation/branding.validation';

const LIST = '/lms/branding';

interface BrandingListQuery extends MasterQuery {
  /* '' = any; 'complete' = no required setting missing; 'missing' = a required setting (support email) is not set. */
  config: '' | 'complete' | 'missing';
}

const CONFIG_OPTIONS: Option[] = [
  { v: '', l: 'All configurations' },
  { v: 'complete', l: 'Complete' },
  { v: 'missing', l: 'Missing required settings' },
];

const CONFIG_ORDER: Record<BrandingConfigState, number> = { missing: 0, error: 1, complete: 2 };

const displayNameOf = (r: BrandingOverviewRow): string => {
  const v = r.branding ? settingOf(r.branding, 'display_name')?.effectiveValue : null;
  return typeof v === 'string' && v ? v : r.name;
};

const sortValue = (r: BrandingOverviewRow, k: string): string | number => {
  switch (k) {
    case 'code':
      return r.code;
    case 'displayName':
      return displayNameOf(r).toLowerCase();
    case 'config':
      return CONFIG_ORDER[configState(r)];
    case 'updatedAt':
      return lastUpdated(r.branding) ?? '';
    default:
      return r.name.toLowerCase();
  }
};

/*
 * Branding & Settings listing (UI-312): every LMS entity with the state of its branding and settings — pick one
 * to view or edit it. Branding is configuration, not a catalogue, so nothing is added or deleted here.
 *
 * The API reads branding per entity, so this list is assembled in the browser (entities, then each entity's
 * settings); search, filters, sorting and paging run over that small set.
 */
export default function BrandingList() {
  usePageTitle('Branding & Settings');
  const go = useGo();
  const can = useCan();
  /* Inactive entities can be configured before activation, but only the Entity Master list includes them. */
  const allEntities = can('viewLmsEntities');
  const initial = useMemo<BrandingListQuery>(() => ({ ...masterQuery('name'), config: '' }), []);
  const { query: q, patch, reset } = useMasterQuery<BrandingListQuery>(initial);
  const overview = useApiData(() => loadBrandingOverview(allEntities), [allEntities]);

  const all = useMemo(() => overview.data ?? [], [overview.data]);

  const matching = useMemo(() => {
    const term = q.search.trim().toLowerCase();
    const rows = all.filter(
      (r) =>
        (!term || [r.name, r.code, displayNameOf(r)].some((t) => t.toLowerCase().includes(term))) &&
        (q.status === '' || String(r.isActive) === q.status) &&
        (q.config === '' || configState(r) === q.config),
    );
    const dir = q.sortOrder === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = sortValue(a, q.sortBy);
      const y = sortValue(b, q.sortBy);
      return (x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name)) * dir;
    });
  }, [all, q.search, q.status, q.config, q.sortBy, q.sortOrder]);

  const rows = matching.slice((q.page - 1) * q.limit, q.page * q.limit);
  const meta: PageMeta | undefined = overview.data
    ? { page: q.page, limit: q.limit, total: matching.length, totalPages: Math.ceil(matching.length / q.limit) }
    : undefined;

  /* Totals over every entity listed (not the current search or page). */
  const stats = overview.data
    ? {
        total: all.length,
        complete: all.filter((r) => configState(r) === 'complete').length,
        missing: all.filter((r) => configState(r) === 'missing').length,
        logo: all.filter((r) => logoOf(r.branding)).length,
      }
    : undefined;

  const columns: MasterColumn<BrandingOverviewRow>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'name', l: 'Entity Name', render: (r) => <b className="lnk">{r.name}</b> },
    { k: 'code', l: 'Entity Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    {
      k: 'displayName',
      l: 'Display Name',
      render: (r) =>
        !r.branding ? <span className="muted">—</span> : settingOf(r.branding, 'display_name')?.hasValue ? (
          <span>{displayNameOf(r)}</span>
        ) : (
          <span className="muted" title="Not set: the entity name is used">{displayNameOf(r)} (entity name)</span>
        ),
    },
    {
      k: 'logo',
      l: 'Logo',
      sortable: false,
      render: (r) => (!r.branding ? <span className="muted">—</span> : logoOf(r.branding) ? <Badge tone="green">Uploaded</Badge> : <span className="muted fs12">Platform default</span>),
    },
    {
      k: 'colours',
      l: 'Colours',
      sortable: false,
      render: (r) => {
        const c = coloursOf(r.branding);
        if (!r.branding) return <span className="muted">—</span>;
        if (!c || (!c.primary && !c.accent)) return <span className="muted fs12">Platform default</span>;
        return (
          <span className="f ac gp8 wrap">
            {c.primary ? <Swatch hex={c.primary} /> : null}
            {c.accent ? <Swatch hex={c.accent} /> : null}
          </span>
        );
      },
    },
    {
      k: 'supportEmail',
      l: 'Support Email',
      sortable: false,
      render: (r) => {
        if (!r.branding) return <span className="muted">—</span>;
        const v = settingOf(r.branding, 'support_email')?.effectiveValue;
        return typeof v === 'string' && v ? <span className="fs12" style={{ wordBreak: 'break-all' }}>{v}</span> : <span className="fs12" style={{ color: 'var(--red)', fontWeight: 600 }}>Not set</span>;
      },
    },
    {
      k: 'languages',
      l: 'Languages',
      sortable: false,
      render: (r) => {
        const v = r.branding ? settingOf(r.branding, 'languages')?.effectiveValue : null;
        return Array.isArray(v) && v.length ? <span className="mono fs12">{(v as string[]).join(', ')}</span> : <span className="muted">—</span>;
      },
    },
    {
      k: 'config',
      l: 'Configuration',
      render: (r) => (
        <span className="f ac gp4 wrap">
          <ConfigBadge state={configState(r)} missing={r.branding ? missingLabels(r.branding) : undefined} />
          {r.branding ? <span className="muted fs12">{valuesSet(r.branding)} of {r.branding.settings.length} set</span> : null}
          {r.error ? <span className="muted fs12" title={r.error.fullMessage}>{r.error.message}</span> : null}
        </span>
      ),
    },
    { k: 'isActive', l: 'Entity Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    {
      k: 'updatedAt',
      l: 'Last Updated',
      render: (r) => {
        const at = lastUpdated(r.branding);
        return at ? <span className="fs12">{fmtDateTime(at)}</span> : <span className="muted fs12">{r.branding ? 'Never set' : '—'}</span>;
      },
    },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View branding of ${r.name}`} onClick={() => go(`${LIST}/${r.id}`)}><Icon name="eye" /></button>
          <Can action="editLmsBranding">
            <button type="button" className="btn xs" title="Edit" aria-label={`Edit branding of ${r.name}`} onClick={() => go(`${LIST}/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = q.search !== '' || q.status !== '' || q.config !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Branding & Settings' }]}
        title="Branding & Settings"
        sub="Per entity: the display name, logo and colours learners see, the support contact, and the enabled languages."
        back={<BackButton to="/dashboard" />}
      />

      <MasterKpis
        items={[
          { label: allEntities ? 'Entities' : 'Active entities', value: stats?.total, tone: 'b' },
          { label: 'Configuration complete', value: stats?.complete, tone: 'g', title: 'Every required setting is set' },
          { label: 'Missing required settings', value: stats?.missing, tone: 'a', title: 'A required setting without a default (support email) is not set yet' },
          { label: 'Custom logo', value: stats?.logo, tone: 'v', title: 'Entities with an uploaded logo; the others use the platform default' },
        ]}
      />

      <FilterBar
        id="lms-branding"
        fields={[
          { k: 'config', l: 'Configuration', options: CONFIG_OPTIONS },
          ...(allEntities ? [{ k: 'status' as const, l: 'Entity Status', options: STATUS_OPTIONS }] : []),
        ]}
        value={{ config: q.config, status: q.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<BrandingListQuery>)}
        onReset={reset}
      />

      <div className="card">
        <div className="card-h">
          <h3>Entities <span className="sub">live from the backend</span></h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        {!allEntities ? (
          <div className="card-b muted fs12" style={{ paddingBottom: 0 }}>
            Active entities only. Inactive entities, which can be configured before they are activated, are listed for users who can also view the Entity Master.
          </div>
        ) : null}
        <MasterTable
          columns={columns}
          rows={rows}
          meta={meta}
          loading={overview.loading}
          error={overview.error}
          query={q}
          onQuery={patch}
          onRetry={() => void overview.reload()}
          searchLabel="entity name, code or display name"
          emptyMsg={
            filtered
              ? 'No entity matches the current search and filters.'
              : allEntities
                ? 'No LMS entity exists yet. Branding is set per entity: add one in the Entity Master first.'
                : 'No active LMS entity is available. Branding is set per entity.'
          }
          rowLink={can('viewLmsBranding') ? (r) => `${LIST}/${r.id}` : undefined}
        />
      </div>
    </div>
  );
}
