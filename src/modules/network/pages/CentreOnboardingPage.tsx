import { useEffect, useState } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, KvList, Callout, DemoNote, Badge, GenBadge, Timeline } from '../../../components/ui';
import { Drawer } from '../../../components/ui/Overlay';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import * as S from '../../../services/mock/networkService';
import type { Centre } from '../../../types/domain';
import { Can } from '../../auth';

const ONBOARD_STEPS: [title: string, desc: string][] = [
  ['Centre identified', 'Coordinator identifies a candidate institution'],
  ['Application', 'Institution submits centre application'],
  ['Document verification', 'Registration, ownership and compliance documents'],
  ['Infrastructure verification', 'Physical inspection of classrooms, PCs, internet, power'],
  ['Trainer verification', 'Trainer qualification and availability check'],
  ['Centre evaluation', '100-point scorecard against configurable benchmark'],
  ['Approval', 'PMO / AMRUT approval decision'],
  ['MoU / agreement', 'Agreement execution'],
  ['Centre ID issued', 'Unique centre ID generated'],
  ['Portal access', 'Centre manager account provisioned'],
  ['Readiness check', 'Final go-live readiness confirmation'],
  ['Batch allocation', 'First batch allocated to the centre'],
];
const SCORE_MODEL: [criterion: string, max: number][] = [
  ['Computer Infrastructure', 25],
  ['Classroom', 15],
  ['Working PCs', 15],
  ['Trainer Availability', 15],
  ['Internet / Power', 10],
  ['Accessibility', 5],
  ['Experience', 5],
  ['Documentation', 5],
  ['Institutional Capability', 5],
];
const PIPELINE = [
  { name: 'Latur Institute of Technical Skills', district: 'LAT', step: 6, score: 78 },
  { name: 'Amravati Community Skill Centre', district: 'AMR', step: 4, score: 71 },
  { name: 'Nagpur Digital Training Hub', district: 'NAG', step: 9, score: 86 },
  { name: 'Solapur Vocational Institute', district: 'SOL', step: 3, score: null },
  { name: 'Dhule Rural Skill Centre', district: 'DHU', step: 2, score: null },
  { name: 'Ratnagiri Coastal Skill Academy', district: 'RAT', step: 11, score: 82 },
];
const demoToast = () => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok');

const columns: Column<Centre>[] = [
  { k: 'name', l: 'Centre', render: (c) => <b className="lnk">{c.name}</b> },
  ...SCORE_MODEL.map(
    ([k, max]): Column<Centre> => ({
      k,
      l: k + ' (' + max + ')',
      align: 'right',
      sortVal: (c) => c.scorecard[k],
      exportVal: (c) => c.scorecard[k] + '/' + max,
      render: (c) => c.scorecard[k] + '/' + max,
    }),
  ),
  {
    k: 'score',
    l: 'Total',
    align: 'right',
    exportVal: (c) => c.score + '/100',
    render: (c) => <b style={{ color: c.score >= 70 ? 'var(--green)' : 'var(--red)' }}>{c.score}/100</b>,
  },
  { k: 'status', l: 'Status', render: (c) => <GenBadge status={c.status} /> },
];

export default function CentreOnboardingPage() {
  const [detail, setDetail] = useState<string | null>(null);
  useEffect(() => {
    document.title = 'Centre onboarding — AMRUT × SUMAGO Admin';
  }, []);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Training centres', link: '#/centres' }, { l: 'Centre onboarding' }]}
        title="Centre Onboarding Workflow"
        sub="Structured 12-step approval workflow with a configurable 100-point evaluation model."
        actions={
          <Can action="manageCentre">
            <button type="button" className="btn primary" onClick={demoToast}>
              <Icon name="plus" />
              Start new onboarding
            </button>
          </Can>
        }
      />
      <div className="grid g4 mb14">
        <Kpi label="In pipeline" value={PIPELINE.length} tone="b" />
        <Kpi label="Awaiting approval" value={PIPELINE.filter((p) => p.step >= 6 && p.step < 7).length} tone="a" />
        <Kpi label="Approved & live" value={S.centres().length} tone="g" link="#/centres" />
        <Kpi label="Benchmark score" value="70 / 100" tone="" sub="Configurable in Administration" />
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Onboarding workflow</h3>
          <span className="sub">12 steps</span>
        </div>
        <div className="card-b">
          <div className="steps">
            {ONBOARD_STEPS.map(([t, desc], i) => (
              <div key={t} className={'step ' + (i < 7 ? 'done' : i === 7 ? 'cur' : '')} title={desc}>
                <b>{t}</b>
                <span>Step {i + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt14">
            <Callout tone="info" title="Checklist driven">
              Each step carries a document checklist and an owner. A centre cannot progress until the prior step is signed off.
            </Callout>
          </div>
        </div>
      </div>

      <div className="grid g-1-2 mb14">
        <Card title="Centre evaluation model (100 points)" sub="Configurable weights">
          <div>
            {SCORE_MODEL.map(([l, v]) => (
              <div key={l}>
                <div className="f jb ac mb6">
                  <span className="fs12">{l}</span>
                  <b className="fs13">{v}</b>
                </div>
                <div className="prog sm mb10">
                  <i style={{ width: (v / 25) * 100 + '%' }} />
                </div>
              </div>
            ))}
          </div>
          <KvList
            pairs={[
              ['Total', '100 points'],
              ['Approval benchmark', '70 (configurable)'],
              ['Re-inspection trigger', 'Below 70'],
            ]}
          />
        </Card>
        <Card title="Centres in onboarding pipeline" flush>
          <div className="list">
            {PIPELINE.map((p) => (
              <div key={p.name} className="list-row" onClick={() => setDetail(p.name)}>
                <div className="icon-sq" style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}>
                  <Icon name="building" />
                </div>
                <div className="lr-main">
                  <b>{p.name}</b>
                  <span>
                    {S.districtName(p.district)} · Step {p.step}/12 — {ONBOARD_STEPS[p.step - 1][0]}
                  </span>
                  <div className="prog sm mt4">
                    <i className={p.step >= 10 ? 'g' : ''} style={{ width: Math.round((p.step / 12) * 100) + '%' }} />
                  </div>
                </div>
                {p.score ? <Badge tone={p.score >= 70 ? 'green' : 'red'}>{p.score}/100</Badge> : <Badge tone="grey">Not scored</Badge>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Approved centres — evaluation breakdown" flush>
        <DataTable
          rows={S.centres()}
          columns={columns}
          pageSize={10}
          exportName="Centre_Evaluation"
          search={['name']}
          rowLink={(c) => '#/centres/' + c.id}
        />
      </Card>
      <DemoNote />

      {detail && (
        <Drawer
          title={detail}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setDetail(null)}>
                Close
              </button>
              <Can action="manageCentre">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setDetail(null);
                    demoToast();
                  }}
                >
                  Advance to next step
                </button>
              </Can>
            </>
          }
        >
          <Callout tone="info" title="Onboarding record">
            Demo pipeline record. In production this drawer shows the full document checklist, inspection photographs, evaluation sheet and
            approval trail.
          </Callout>
          <div className="mt14">
            <Timeline items={ONBOARD_STEPS.map(([t, s], i) => ({ title: t, sub: s, state: i < 6 ? 'done' : i === 6 ? 'cur' : '' }))} />
          </div>
        </Drawer>
      )}
    </div>
  );
}
