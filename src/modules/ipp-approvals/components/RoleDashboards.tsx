import type { ReactNode } from 'react';
import { Card, fmt } from '../../../components/ui';
import type { DashboardFigures } from '../types/ippApprovals.types';
import { HBars, MeterList, MonthLine, PairBars, TargetMeter, type Series } from './DashboardCharts';

/*
 * The dashboards of the Head Office, the COEP and the Divisional Officer. Their figures come from GET /dashboard; what
 * SARTHI does not record (attendance, assessments and their scores, certification, placement) shows 0, and the note
 * under the charts says so. The placement target is the programme's 80%.
 */
const NOT_RECORDED = 0;
const PLACEMENT_TARGET = 80;

/* Maharashtra's six revenue divisions, in the order the programme reports them. */
const DIVISIONS = ['Pune', 'Chhatrapati Sambhajinagar', 'Nashik', 'Konkan', 'Nagpur', 'Amravati'];

const CERTIFIED: Series = { name: 'Certified', tone: 's1' };
const PLACED: Series = { name: 'Placed', tone: 's2' };
const ENROLLED: Series = { name: 'Enrolled', tone: 's2' };

function Tile({ label, value, sub, hero }: { label: string; value: string | number; sub?: ReactNode; hero?: boolean }) {
  return (
    <div className={'kpi' + (hero ? ' hero' : '')}>
      <div className="kpi-t">{label}</div>
      <div className="kpi-v">{typeof value === 'number' ? fmt(value) : value}</div>
      {sub ? <div className="kpi-d">{sub}</div> : null}
    </div>
  );
}

function Pipeline({ figures }: { figures: DashboardFigures }) {
  const p = figures.pipeline;
  return (
    <Card title="Approval pipeline" sub="Where the forms are now">
      <HBars
        label="Approval pipeline"
        rows={[
          { label: 'Applications', value: p.received },
          { label: 'Auditor approved', value: p.auditorApproved },
          { label: 'Division approved', value: p.divisionApproved },
          { label: 'COEP approved', value: p.coepApproved },
          { label: 'SARTHI HO approved', value: p.finalApproved },
        ]}
      />
    </Card>
  );
}

function Placement() {
  return (
    <Card title={`Placement vs ${PLACEMENT_TARGET}% target`}>
      <TargetMeter part={NOT_RECORDED} whole={NOT_RECORDED} target={PLACEMENT_TARGET} partLabel="placed" wholeLabel="certified" />
    </Card>
  );
}

/* Applications, Approved, Batches, Avg. attendance, Certified, Placed. */
function ProgrammeTiles({ figures }: { figures: DashboardFigures }) {
  return (
    <div className="dash-kpis mb14">
      <Tile label="Applications" value={figures.pipeline.received} sub="Received from IPP" />
      <Tile label="Approved" value={figures.pipeline.finalApproved} sub="Final approved" />
      <Tile
        label="Batches"
        value={figures.batches.total}
        sub={`${fmt(figures.batches.ongoing)} ongoing · ${fmt(figures.batches.ended)} ended`}
      />
      <Tile label="Avg. attendance" value={`${NOT_RECORDED}%`} sub="Not recorded yet" />
      <Tile label="Certified" value={NOT_RECORDED} sub="Not recorded yet" />
      <Tile label="Placed" value={NOT_RECORDED} sub="Not recorded yet" hero />
    </div>
  );
}

const zeros = (labels: string[]) => labels.map((label) => ({ label, values: [NOT_RECORDED, NOT_RECORDED] as [number, number] }));

/* Statewide: the pipeline, certified vs placed by division, placement against the target. */
export function HeadOfficeDashboard({ figures }: { figures: DashboardFigures }) {
  return (
    <>
      <ProgrammeTiles figures={figures} />
      <div className="dash-charts">
        <Pipeline figures={figures} />
        <Card title="Division-wise: certified vs placed">
          <PairBars label="Division-wise: certified vs placed" series={[CERTIFIED, PLACED]} rows={zeros(DIVISIONS)} />
        </Card>
        <Placement />
      </div>
    </>
  );
}

/* The officer's districts (all divisions for a user not limited to districts): the same figures, district by district. */
export function DivisionDashboard({ figures }: { figures: DashboardFigures }) {
  const districts = figures.districts;
  return (
    <>
      <ProgrammeTiles figures={figures} />
      <div className="dash-charts">
        <Pipeline figures={figures} />
        {districts ? (
          <Card title="District-wise: certified vs placed">
            {districts.length ? (
              <PairBars
                label="District-wise: certified vs placed"
                series={[CERTIFIED, PLACED]}
                rows={zeros(districts.map((d) => d.name))}
              />
            ) : (
              <p className="muted fs12 tw-m-0">No district is assigned to you yet.</p>
            )}
          </Card>
        ) : (
          <Card title="Division-wise: certified vs placed">
            <PairBars label="Division-wise: certified vs placed" series={[CERTIFIED, PLACED]} rows={zeros(DIVISIONS)} />
          </Card>
        )}
        <Placement />
      </div>
    </>
  );
}

/* Training, assessment and certification: ongoing batches, candidates in training, courses, attendance, certification. */
export function CoepDashboard({ figures }: { figures: DashboardFigures }) {
  const pending = Math.max(0, figures.inTraining - NOT_RECORDED);
  return (
    <>
      <div className="dash-kpis mb14">
        <Tile
          label="Batches ongoing"
          value={figures.batches.ongoing}
          sub={`of ${fmt(figures.batches.total)} · ${fmt(figures.batches.ended)} ended`}
        />
        <Tile label="Candidates in training" value={figures.inTraining} sub="Final approved, batch ongoing" />
        <Tile label="Assessments done" value={NOT_RECORDED} sub="Not recorded yet" />
        <Tile label="Avg. score" value={`${NOT_RECORDED}%`} sub="Not recorded yet" />
        <Tile label="Certified" value={NOT_RECORDED} sub="Not recorded yet" hero />
        <Tile label="Pending" value={pending} sub="In training, not certified" />
      </div>
      <div className="dash-charts lead-wide">
        <Card title="Course-wise: enrolled vs certified" sub="Enrolled = final approved">
          {figures.courses.length ? (
            <PairBars
              label="Course-wise: enrolled vs certified"
              series={[ENROLLED, CERTIFIED]}
              rows={figures.courses.map((c) => ({ label: c.name, values: [c.enrolled, NOT_RECORDED] as [number, number] }))}
            />
          ) : (
            <p className="muted fs12 tw-m-0">No course yet: courses appear when IPP sends batches.</p>
          )}
        </Card>
        <Card title="Attendance by month">
          <MonthLine
            label="Attendance by month"
            points={['Month 1', 'Month 2', 'Month 3'].map((label) => ({ label, value: NOT_RECORDED }))}
          />
        </Card>
        <Card title="Certification status">
          <MeterList
            label="Certification status"
            rows={[
              { label: 'Certified', value: NOT_RECORDED },
              { label: 'In final assessment', value: NOT_RECORDED },
              { label: 'Pending', value: pending },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
