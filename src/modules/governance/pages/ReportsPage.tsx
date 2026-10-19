import { useEffect } from 'react';
import AS from '../../../legacy';
import { PageHead, Callout, DemoNote, useGo } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { REPORTS } from '../../../services/mock/governanceService';

export default function ReportsPage() {
  const go = useGo();
  useEffect(() => {
    document.title = 'Reports & MIS — AMRUT × SUMAGO Admin';
  }, []);
  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Reports & MIS' }]}
        title="Reports & MIS"
        sub="Standard programme reports with filters and Excel / CSV / PDF export."
        actions={
          <button type="button" className="btn primary" onClick={() => AS.ui.toast('MIS pack generation queued (demo).', 'ok')}>
            <Icon name="download" />
            Export full MIS pack
          </button>
        }
      />
      <div className="grid g3">
        {REPORTS.map(([id, title, desc], i) => (
          <div key={id} className="card pad pointer" onClick={() => go('#/reports/' + id)}>
            <div className="f ac gp10">
              <div className="icon-sq" style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}>
                {i + 1}
              </div>
              <div className="flex1">
                <b className="fs13">{title}</b>
                <div className="fs11 muted">{desc}</div>
              </div>
              <Icon name="chevR" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt14">
        <Callout tone="info" title="Export formats">
          CSV and Excel exports download immediately. PDF opens a print-ready preview — use the browser print dialog to save as PDF.
        </Callout>
      </div>
      <DemoNote />
    </div>
  );
}
