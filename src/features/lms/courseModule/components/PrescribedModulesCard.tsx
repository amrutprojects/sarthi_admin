import { LoadState } from '../../../cms/shared';
import type { ApiError } from '../../../../services/api-client';
import type { PrescribedModulesResponse } from '../types/courseModule.types';
import { deliveryText, fmtHours, moduleLabel, oftText } from './format';

interface PrescribedModulesCardProps {
  data: PrescribedModulesResponse | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

const structureText = (s: PrescribedModulesResponse['modules'][number]['structure']) =>
  [
    s.units ? `${s.units} units` : null,
    s.assignments ? `${s.assignments} assignments` : null,
    s.oftAssignments ? `${s.oftAssignments} OFT assignments` : null,
    s.note ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

/*
 * The four prescribed modules of the final syllabus documents (section 2.1, Table 7), from GET /prescribed.
 * They are the defaults offered when a module is created; an approved change is made on the module record.
 */
export default function PrescribedModulesCard({ data, loading, error, onRetry }: PrescribedModulesCardProps) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>Prescribed modules <span className="sub">final syllabus documents</span></h3>
        {data && !data.confirmedByCompetentAuthority ? <span className="tag">draft values</span> : null}
      </div>
      <div className="card-b" style={data ? { paddingBottom: 0 } : undefined}>
        <LoadState loading={loading && !data} error={error} onRetry={onRetry} />
        {data ? (
          <p className="muted fs12" style={{ margin: '0 0 10px' }}>
            {data.source}. These are the defaults offered when a module is created and by Create missing prescribed modules; each course keeps its own
            editable copy. {data.confirmedByCompetentAuthority ? null : 'The values await approval by the competent authority (OQ-012).'}
          </p>
        ) : null}
      </div>
      {data ? (
        data.modules.length ? (
          <div className="tbl-wrap">
            <table className="tbl" aria-label="Prescribed modules">
              <thead>
                <tr>
                  <th style={{ width: 96 }}>Module</th>
                  <th>Title</th>
                  <th>Core hours</th>
                  <th>Delivery pattern</th>
                  <th>OFT hours</th>
                  <th>Structure</th>
                  <th>Formal assessment</th>
                </tr>
              </thead>
              <tbody>
                {data.modules.map((m) => (
                  <tr key={m.moduleNumber} className="norow">
                    <td><span className="tag">{moduleLabel(m.moduleNumber)}</span></td>
                    <td>{m.title}</td>
                    <td className="fs12">{fmtHours(m.coreHours)}</td>
                    <td className="fs12">{deliveryText(m)}</td>
                    <td className="fs12">{oftText(m)}</td>
                    <td className="fs12 muted">{structureText(m.structure) || '—'}</td>
                    <td className="fs12">{m.formalAssessment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-b muted fs12">The server lists no prescribed module.</div>
        )
      ) : null}
    </div>
  );
}
