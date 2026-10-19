import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHead, Card, Kpi, LinkButton, EmptyState, Badge, StatusBadge, ModeTag, AttendanceCell, ListRows } from '../../../components/ui';
import { Donut } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/networkService';
import type { Candidate } from '../../../types/domain';

const columns: Column<Candidate>[] = [
  { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
  { k: 'name', l: 'Name' },
  { k: 'mode', l: 'Mode', render: (x) => <ModeTag mode={x.mode} /> },
  { k: 'batchId', l: 'Batch', render: (x) => x.batchId || '—' },
  { k: 'status', l: 'Status', render: (x) => <StatusBadge status={x.status} /> },
  {
    k: 'attendance',
    l: 'Attendance',
    align: 'right',
    exportVal: (x) => x.attendance + '%',
    render: (x) => <AttendanceCell value={x.attendance} />,
  },
];

export default function TalukaDetailPage() {
  useLegacyTick();
  const { id = '', t: rawT = '' } = useParams();
  useEffect(() => {
    document.title = 'Taluka — AMRUT × SUMAGO Admin';
  }, []);

  const d = S.district(id);
  if (!d)
    return (
      <div className="page">
        <EmptyState title="District not found" msg="" />
      </div>
    );
  const t = decodeURIComponent(rawT);
  const rows = S.byTaluka(d.code, t);
  const k = S.kpis(rows, Math.round(d.target / d.talukas.length));
  const centres = S.centres().filter((c) => c.districtId === d.code && c.taluka === t);

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '#/dashboard' },
          { l: 'Districts', link: '#/districts' },
          { l: d.name, link: '#/districts/' + d.code },
          { l: t },
        ]}
        title={t + ' Taluka'}
        badge={<span className="tag">{d.name}</span>}
        sub="Taluka-level rollup — one level above centre in the drill-down hierarchy."
        actions={
          <LinkButton to={'#/districts/' + d.code} icon="chevL">
            Back to district
          </LinkButton>
        }
      />
      <div className="grid g6 mb14">
        <Kpi label="Indicative target" value={k.target} />
        <Kpi label="Applications" value={k.applications} tone="b" />
        <Kpi label="Enrolled" value={k.enrolled} tone="g" />
        <Kpi label="Training active" value={k.trainingActive} tone="s" />
        <Kpi label="Completed" value={k.completed} tone="g" />
        <Kpi label="Certified" value={k.certified} tone="v" />
      </div>
      <div className="grid g2 mb14">
        <Card title="Centres in this taluka" flush>
          {centres.length ? (
            <ListRows
              items={centres.map((c) => ({
                title: c.name,
                sub: c.students + ' students · ' + c.activeBatches + ' active batches',
                link: '#/centres/' + c.id,
                right: <Badge tone={c.score >= 80 ? 'green' : 'amber'}>{c.score}/100</Badge>,
                icon: 'building',
              }))}
            />
          ) : (
            <EmptyState title="No centre here" msg="Candidates from this taluka train at other centres or in online mode." />
          )}
        </Card>
        <Card title="Mode split">
          <Donut
            items={[
              { l: 'Offline', v: k.offline, c: '#8A4116' },
              { l: 'Online', v: k.online, c: '#1E7A46' },
            ]}
            opts={{ centerValue: k.enrolled, centerLabel: 'Enrolled', size: 160 }}
          />
        </Card>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Candidates</h3>
        </div>
        <DataTable
          key={d.code + t}
          rows={rows}
          columns={columns}
          pageSize={10}
          exportName="Taluka_Candidates"
          search={['id', 'name']}
          rowLink={(x) => '#/candidates/' + x.id}
        />
      </div>
    </div>
  );
}
