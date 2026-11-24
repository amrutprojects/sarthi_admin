import { useEffect } from 'react';
import { PageHead, NoDataLabel, useGo } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { REPORT_CATALOGUE } from '../reportCatalogue';

/* The report catalogue. No report has a live source yet, so every card says so; no sample rows are ever shown. */
export default function ReportsPage() {
  const go = useGo();
  useEffect(() => {
    document.title = 'Reports & MIS — AMRUT × SUMAGO Admin';
  }, []);
  return (
    <div className="page">
      <PageHead crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Reports & MIS' }]} title="Reports & MIS" />
      <div className="grid g3">
        {REPORT_CATALOGUE.map(([id, title, desc], i) => (
          <div key={id} className="card pad pointer" onClick={() => go('#/reports/' + id)}>
            <div className="f ac gp10">
              <div className="icon-sq" style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}>
                {i + 1}
              </div>
              <div className="flex1">
                <b className="fs13">{title}</b>
                <div className="fs11 muted">{desc}</div>
                <div className="fs11 mt4">
                  <NoDataLabel />
                </div>
              </div>
              <Icon name="chevR" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
