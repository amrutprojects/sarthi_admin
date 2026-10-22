import type { ReactNode } from 'react';
import { Dash } from '../../../components/ui';

export interface BilingualText {
  mr: string;
  en: string;
}

/*
 * Marathi first, as on the public site; English underneath. Inside .cms-sections (cms-tables.css) both
 * lines use strong text colours, so each language is easy to check (as on Apply Page Management).
 */
export function Bi({ value }: { value: BilingualText }) {
  return (
    <div>
      <div className="bi-main" lang="mr" style={{ whiteSpace: 'pre-line' }}>
        {value.mr}
      </div>
      <div className="bi-alt" lang="en" style={{ whiteSpace: 'pre-line' }}>
        {value.en}
      </div>
    </div>
  );
}

/* A read-only value: a dash when empty, a single-language value (email, phone, link) once, a bilingual one as a pair. */
export function FieldValue({ value }: { value: BilingualText | string | null | undefined }) {
  if (value == null || value === '') return <Dash />;
  return typeof value === 'string' ? <>{value}</> : <Bi value={value} />;
}

/*
 * Read-only label / value rows of a sectioned CMS view page, in the panel's table style. The rows are not
 * links (norow). The Content cell may wrap, because panel cells never do (styles.css: table.tbl td { white-space: nowrap }).
 */
export default function FieldTable({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th scope="col" style={{ width: '76px' }}>
              Sr. No.
            </th>
            <th scope="col" style={{ width: '28%' }}>
              Field
            </th>
            <th scope="col">Content</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr className="norow" key={label}>
              <td>
                <span className="t2">{i + 1}</span>
              </td>
              <td>
                <b>{label}</b>
              </td>
              <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
