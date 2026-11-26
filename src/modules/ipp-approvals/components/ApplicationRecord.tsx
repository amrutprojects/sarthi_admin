import { Link } from 'react-router-dom';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
import { Card, KvList, Timeline, type TimelineItem } from '../../../components/ui';
import { eventLabel, stageMove, whoLabel } from '../labels';
import type { ApplicationDetail, ApplicationEdit, ApplicationField, ApprovalEvent } from '../types/ippApprovals.types';
import { batchPath, fieldText } from '../utils';
import { FieldRows, Wrap } from './common';

/* The parts of an application's page that only show what was recorded. */

export function SummaryCard({ application: a }: { application: ApplicationDetail }) {
  return (
    <Card title="Application">
      <KvList
        pairs={[
          ['Registration ID', <span className="mono">{a.registrationId}</span>],
          ['Registration number', <span className="mono">{a.registrationNumber ?? '—'}</span>],
          ['Mobile', a.mobile],
          ['Email', a.email],
          ['Aadhaar', <span className="mono">{a.aadhaarMasked ?? '—'}</span>],
          ['District of the batch', a.district.name],
          ['District in the form', a.formDistrict ?? '—'],
          ['Category', a.category ?? '—'],
          ['Centre', a.centre ?? '—'],
          ['Technology', a.technology ?? '—'],
          ['Batch', <Link to={batchPath(a.batch.id)}>{`${a.batch.code} · ${a.batch.name}`}</Link>],
          ['Submitted', fmtDateTime(a.submittedAt)],
          [
            'Approved by the IPP Auditor',
            a.auditor.approvedAt ? `${fmtDateTime(a.auditor.approvedAt)}${a.auditor.by ? `, ${a.auditor.by}` : ''}` : '—',
          ],
        ]}
      />
    </Card>
  );
}

const STEPS: { step: ApplicationField['step']; title: string }[] = [
  { step: 1, title: 'Basic Details' },
  { step: 2, title: 'Main Form' },
];

/* The form as the student filled it (and the Auditor corrected it), one card per step. */
export function FormCards({ fields }: { fields: ApplicationField[] }) {
  return (
    <>
      {STEPS.map(({ step, title }) => {
        const rows = fields
          .filter((f) => f.step === step)
          .map((f) => ({ key: f.key, label: f.labelEn || f.labelMr || f.key, value: fieldText(f) }));
        return (
          <Card key={step} title={title}>
            {rows.length ? <FieldRows rows={rows} /> : <span className="muted">No fields in this step.</span>}
          </Card>
        );
      })}
    </>
  );
}

export function EditsCard({ edits }: { edits: ApplicationEdit[] }) {
  return (
    <Card title="Corrections by the IPP Auditor">
      {edits.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Before</th>
                <th scope="col">After</th>
                <th scope="col">Corrected</th>
              </tr>
            </thead>
            <tbody>
              {edits.flatMap((e, i) =>
                e.changes.map((c) => (
                  <tr key={`${i}-${c.key}`} className="norow">
                    <td>
                      <Wrap min={90}>{c.label}</Wrap>
                    </td>
                    <td className="muted">
                      <Wrap min={90}>{c.from}</Wrap>
                    </td>
                    <td>
                      <Wrap min={90}>{c.to}</Wrap>
                    </td>
                    <td className="fs12">
                      <Wrap min={110}>
                        {fmtDateTime(e.at)}
                        {e.by ? <div className="muted">by {e.by}</div> : null}
                      </Wrap>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <span className="muted">The Auditor has corrected nothing in this form.</span>
      )}
    </Card>
  );
}

const STATE: Record<string, TimelineItem['state']> = { APPROVED: 'done', REJECTED: 'fail' };

/* Newest first, as the API sends it. */
export function HistoryCard({ history }: { history: ApprovalEvent[] }) {
  return (
    <Card title="History">
      {history.length ? (
        <Timeline
          items={history.map((e) => ({
            title: `${eventLabel(e.event)} · ${stageMove(e)}`,
            state: STATE[e.event] ?? '',
            sub: (
              <>
                {e.reason ? <em className="tw-block tw-not-italic tw-text-danger">“{e.reason}”</em> : null}
                {whoLabel(e)} · {fmtDateTime(e.at)}
              </>
            ),
          }))}
        />
      ) : (
        <span className="muted">Nothing is recorded yet.</span>
      )}
    </Card>
  );
}
