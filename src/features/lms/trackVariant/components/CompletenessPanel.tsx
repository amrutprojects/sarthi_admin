import type { ReactNode } from 'react';
import { Badge } from '../../../../components/ui';
import {
  LEARNING_COMPONENT_KINDS, LEARNING_COMPONENT_LABELS, type CountCheck, type TrackVariantCompleteness,
} from '../types/trackVariant.types';

const fmtNum = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const Ok = ({ ok }: { ok: boolean }) => (ok ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">Missing</Badge>);

const met = (c: CountCheck) => c.required !== null && c.actual === c.required;

/*
 * The completeness check of the variant (L-07): the Module 3 shape against what exists, the items that are missing
 * (a variant with any is incomplete and cannot be published) and the warnings that never block.
 */
export default function CompletenessPanel({ completeness: c }: { completeness: TrackVariantCompleteness }) {
  const weightsOk = !c.missing.some((m) => m.item === 'assessmentWeights');
  const rows: [string, ReactNode, ReactNode, boolean][] = [
    ['Phases', c.phases.actual, c.phases.required, met(c.phases)],
    ['Track modules', c.trackModules.actual, c.trackModules.required ?? <span className="muted">Not entered</span>, met(c.trackModules)],
    [
      'OFT cards',
      <span>
        {c.oftCards.actual}
        <span className="muted fs12"> · {fmtNum(c.oftCards.hoursMin)}–{fmtNum(c.oftCards.hoursMax)} h</span>
      </span>,
      c.oftCards.required ?? <span className="muted">Not entered</span>,
      met(c.oftCards),
    ],
    ['Readiness gates', c.readinessGates.actual, c.readinessGates.required, met(c.readinessGates)],
    [
      'Assessment components',
      <span>
        {c.assessmentComponents.actual}
        <span className="muted fs12">
          {' '}· {c.assessmentComponents.weightTotal === null ? 'no weights entered' : `weights total ${fmtNum(c.assessmentComponents.weightTotal)}`}
        </span>
      </span>,
      c.assessmentComponents.required,
      met(c.assessmentComponents) && weightsOk,
    ],
    ...LEARNING_COMPONENT_KINDS.map((k): [string, ReactNode, ReactNode, boolean] => [
      LEARNING_COMPONENT_LABELS[k],
      c.learningComponents[k],
      'At least 1',
      c.learningComponents[k] >= 1,
    ]),
  ];

  return (
    <div className="card">
      <div className="card-h">
        <h3>Completeness check <span className="sub">Module 3 shape</span></h3>
        {c.complete ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">Incomplete · {c.missing.length} missing</Badge>}
      </div>
      <div className="tbl-wrap">
        <table className="tbl" aria-label="Completeness check">
          <thead>
            <tr><th>Item</th><th>Now</th><th>Required</th><th>Check</th></tr>
          </thead>
          <tbody>
            {rows.map(([label, now, required, ok]) => (
              <tr key={label} className="norow">
                <td>{label}</td>
                <td className="fs12">{now}</td>
                <td className="fs12">{required}</td>
                <td><Ok ok={ok} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-b">
        {c.missing.length ? (
          <div className="callout c-warn mb14" role="status">
            <div>
              <b>Missing — the variant cannot be published until these are complete:</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }} aria-label="Missing items">
                {c.missing.map((m, i) => (
                  <li key={`${m.item}-${i}`}>{m.message}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="callout c-ok mb14" role="status">
            <div>Nothing is missing against the Module 3 shape. Sessions and lessons are not checked yet: the lesson master does not exist.</div>
          </div>
        )}
        {c.warnings.length ? (
          <div className="callout c-info" role="status">
            <div>
              <b>Warnings (they do not block publishing):</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }} aria-label="Warnings">
                {c.warnings.map((w, i) => (
                  <li key={`${w.item}-${i}`}>{w.message}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
