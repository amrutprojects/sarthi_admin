import { useEffect, useState } from 'react';
import AS from '../../legacy';
import { PageHead, Kpi, FilterBar, DemoNote, GenBadge, Dash, dateFmt } from '../../components/ui';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Icon from '../../components/Icon';
import { useLegacyTick } from '../../utils/legacyBus';
import usePersistentState from '../../hooks/usePersistentState';
import * as G from '../../services/governanceService';
import { DocumentDrawer } from '../candidates/CandidateDialogs';
import type { DocumentRecord } from '../../types/domain';
import { Can } from '../../auth/Can';

export default function DocumentsPage() {
  useLegacyTick();
  const [f, setF] = usePersistentState('doc', G.DEFAULT_DOC);
  const [viewing, setViewing] = useState<string | null>(null);
  useEffect(() => { document.title = 'Documents — AMRUT × SUMAGO Admin'; }, []);

  const all = G.db().documents;
  const cats: Record<string, number> = {};
  all.forEach((d) => { cats[d.category] = (cats[d.category] || 0) + 1; });
  const count = (s: string) => all.filter((d) => d.status === s).length;
  const columns: Column<DocumentRecord>[] = [
    { k: 'id', l: 'Doc ID', render: (d) => <span className="mono">{d.id}</span> },
    { k: 'name', l: 'Document', render: (d) => <b>{d.name}</b> },
    { k: 'category', l: 'Category' },
    { k: 'owner', l: 'Owner' },
    { k: 'districtId', l: 'District', exportVal: (d) => (d.districtId ? G.districtName(d.districtId) : '—'), render: (d) => (d.districtId ? G.districtName(d.districtId) : <Dash />) },
    { k: 'type', l: 'Type', render: (d) => <span className="tag">{d.type}</span> },
    { k: 'size', l: 'Size', align: 'right' },
    { k: 'uploaded', l: 'Uploaded', exportVal: (d) => dateFmt(d.uploaded), render: (d) => dateFmt(d.uploaded) },
    { k: 'status', l: 'Status', render: (d) => <GenBadge status={d.status} /> },
    { k: 'act', l: '', sortable: false, exportVal: () => '', render: (d) => <button type="button" className="btn xs" onClick={() => setViewing(d.name)}>View</button> },
  ];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Documents' }]}
        title="Document Management"
        sub="Central repository with verification workflow. Files would be stored in configurable cloud/object storage with signed URLs."
        actions={<Can action="manageDocuments"><button type="button" className="btn primary" onClick={() => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok')}><Icon name="plus" />Upload document</button></Can>}
      />
      <div className="grid g4 mb14">
        <Kpi label="Total documents" value={all.length} tone="b" />
        <Kpi label="Verified" value={count('VERIFIED')} tone="g" />
        <Kpi label="Pending verification" value={count('PENDING')} tone="a" />
        <Kpi label="Rejected" value={count('REJECTED')} tone="r" />
      </div>
      <div className="grid g4 mb14">
        {Object.keys(cats).map((c) => (
          <div key={c} className="card pad pointer" onClick={() => setF((x) => ({ ...x, category: c }))}>
            <div className="f ac gp10">
              <div className="icon-sq" style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}><Icon name="folder" /></div>
              <div className="flex1"><b className="fs13">{c}</b><div className="fs11 muted">{cats[c]} documents</div></div>
            </div>
          </div>
        ))}
      </div>
      <FilterBar
        fields={[
          { k: 'category', l: 'Category', options: [{ v: 'ALL', l: 'All categories' }].concat(Object.keys(cats).map((c) => ({ v: c, l: c }))) },
          { k: 'status', l: 'Verification status', options: [{ v: 'ALL', l: 'All' }, { v: 'VERIFIED', l: 'Verified' }, { v: 'PENDING', l: 'Pending' }, { v: 'REJECTED', l: 'Rejected' }] },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF(G.DEFAULT_DOC)}
      />
      <div className="card">
        <div className="card-h"><h3>Document repository</h3></div>
        <DataTable key={JSON.stringify(f)} rows={G.filterDocs(f)} columns={columns} pageSize={12} exportName="Document_Repository" search={['name', 'owner', 'category']} />
      </div>
      <DemoNote />
      {viewing && <DocumentDrawer name={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
