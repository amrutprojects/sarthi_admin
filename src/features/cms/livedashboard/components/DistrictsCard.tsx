import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, fmt } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import { clientPage, type ClientListOptions } from '../../clientList';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { useApiData } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { DISTRICT_STATUSES, districtStatus } from '../constants';
import { liveDashboardService } from '../services/liveDashboardService';
import type { ApiLiveDashboardDistrict } from '../types/livedashboard.types';
import DistrictEditModal from './DistrictEditModal';

const LIST: ClientListOptions<ApiLiveDashboardDistrict> = {
  searchText: (d) => `${d.code} ${d.name.en} ${d.name.mr} ${districtStatus(d.status).en}`,
  sortValue: {
    displayOrder: (d) => d.displayOrder,
    name: (d) => d.name.en,
    /* In programme order (Not Started … Critical), not alphabetically. */
    status: (d) => DISTRICT_STATUSES.findIndex((s) => s.id === d.status),
    target: (d) => d.target,
    enrolled: (d) => d.enrolled,
    trainingActive: (d) => d.trainingActive,
    completed: (d) => d.completed,
    certified: (d) => d.certified,
    attendancePct: (d) => d.attendancePct,
  },
};

const num = (n: number) => <span className="mono">{fmt(n)}</span>;

/*
 * The 36 districts of the map: each one's status (its tile's colour) and figures (its tooltip, and its district
 * office page). They are a fixed set — edited one at a time in a dialog, never added, deleted or reordered.
 */
export default function DistrictsCard() {
  const districts = useApiData(() => liveDashboardService.listDistricts(), []);
  const initial = useMemo(() => masterQuery('displayOrder', 50), []);
  const { query, patch } = useMasterQuery(initial);
  const [editing, setEditing] = useState<ApiLiveDashboardDistrict | null>(null);

  const all = useMemo(() => districts.data ?? [], [districts.data]);
  const { rows, meta } = clientPage(all, query, LIST);

  const columns: MasterColumn<ApiLiveDashboardDistrict>[] = [
    { k: 'displayOrder', l: 'Sr. No.', w: '76px', render: (d) => <span className="muted fs12">{d.displayOrder}</span> },
    {
      k: 'name',
      l: 'District',
      render: (d) => (
        <div style={{ whiteSpace: 'normal', minWidth: 130 }}>
          <b lang="en">{d.name.en}</b> <span className="mono muted fs12">{d.code}</span>
          <div className="muted fs12" lang="mr">
            {d.name.mr}
          </div>
        </div>
      ),
    },
    {
      k: 'status',
      l: 'Status',
      render: (d) => {
        const s = districtStatus(d.status);
        return <Badge tone={s.tone}>{s.en}</Badge>;
      },
    },
    { k: 'target', l: 'Target', align: 'right', render: (d) => num(d.target) },
    { k: 'enrolled', l: 'Enrolled', align: 'right', render: (d) => num(d.enrolled) },
    { k: 'trainingActive', l: 'Training', align: 'right', render: (d) => num(d.trainingActive) },
    { k: 'completed', l: 'Completed', align: 'right', render: (d) => num(d.completed) },
    { k: 'certified', l: 'Certified', align: 'right', render: (d) => num(d.certified) },
    { k: 'attendancePct', l: 'Attendance', align: 'right', render: (d) => <span className="mono">{d.attendancePct}%</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (d) => (
        <Can action="updateLiveDashboard">
          <button type="button" className="btn xs" title="Edit" aria-label={`Edit ${d.name.en}`} onClick={() => setEditing(d)}>
            <Icon name="edit" />
          </button>
        </Can>
      ),
    },
  ];

  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>
          Districts <span className="sub">the map&rsquo;s tiles and tooltips, and each district office page&rsquo;s figures</span>
        </h3>
        <div className="f ac gp8 wrap">
          {query.search ? <span className="tag">filtered</span> : null}
          {districts.data ? <span className="tag">{all.length} districts</span> : null}
        </div>
      </div>
      <MasterTable
        columns={columns}
        rows={rows}
        meta={districts.data ? meta : undefined}
        loading={districts.loading}
        error={districts.error}
        query={query}
        onQuery={patch}
        onRetry={() => void districts.reload()}
        searchLabel="district, code or status"
        emptyMsg={query.search ? 'No district matches the current search.' : 'No districts yet: the map is drawn from the bundled figures until they are set up.'}
      />

      {editing ? (
        <DistrictEditModal
          district={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await districts.reload();
          }}
        />
      ) : null}
    </div>
  );
}
