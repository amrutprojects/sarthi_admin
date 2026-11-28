import { fmt } from '../../../components/ui';

/*
 * The small charts of the IPP dashboards, in the panel's own colours (styles/charts.css): horizontal bars with the value
 * at the tip, pairs of bars with a legend, a meter against a target, a line by month and a meter list. Every value is
 * written next to its mark and in its row's title (hover), so nothing is told by colour alone.
 */

export interface BarRow {
  label: string;
  value: number;
}

const widthOf = (value: number, max: number) => (max > 0 && value > 0 ? `${Math.max(1.5, (value / max) * 100)}%` : '0%');

/* One series, one bar per row. */
export function HBars({ rows, label }: { rows: BarRow[]; label: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <div className="dchart-bars" role="list" aria-label={label}>
      {rows.map((r) => (
        <div className="dchart-row" role="listitem" key={r.label} title={`${r.label}: ${fmt(r.value)}`}>
          <span className="dchart-label">{r.label}</span>
          <span className="dchart-track">
            <i className="dchart-bar s0 thick" style={{ width: widthOf(r.value, max) }} />
            <b className="dchart-value">{fmt(r.value)}</b>
          </span>
        </div>
      ))}
    </div>
  );
}

export interface PairRow {
  label: string;
  values: [number, number];
}

/*
 * A series and its colour, which follows the thing counted on every dashboard: Certified is always tone s1 (brand brown),
 * Enrolled and Placed s2 (saffron).
 */
export interface Series {
  name: string;
  tone: 's1' | 's2';
}

/* Two series per row (e.g. certified vs placed): a legend above, a thin bar for each, the value at each tip. */
export function PairBars({ rows, series, label }: { rows: PairRow[]; series: [Series, Series]; label: string }) {
  const max = Math.max(0, ...rows.flatMap((r) => r.values));
  return (
    <>
      <div className="dchart-legend" aria-hidden="true">
        {series.map((s) => (
          <span key={s.name}>
            <i className={'dchart-key ' + s.tone} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="dchart-bars" role="list" aria-label={label}>
        {rows.map((r) => {
          const text = `${r.label}: ${series[0].name} ${fmt(r.values[0])}, ${series[1].name} ${fmt(r.values[1])}`;
          return (
            <div className="dchart-row" role="listitem" key={r.label} title={text} aria-label={text}>
              <span className="dchart-label">{r.label}</span>
              <span className="dchart-pair">
                {series.map((s, i) => (
                  <span className="dchart-track" key={s.name}>
                    <i className={'dchart-bar ' + s.tone} style={{ width: widthOf(r.values[i], max) }} />
                    <b className="dchart-value">{fmt(r.values[i])}</b>
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* A share against a target: "0%", the bar with a mark at the target, what it is of, and whether the target is met. */
export function TargetMeter({
  part,
  whole,
  target,
  partLabel,
  wholeLabel,
}: {
  part: number;
  whole: number;
  target: number;
  partLabel: string;
  wholeLabel: string;
}) {
  const pct = whole > 0 ? Math.round((part / whole) * 100) : 0;
  const met = whole > 0 && pct >= target;
  return (
    <div className="dchart-meter">
      <div className="dchart-big">{pct}%</div>
      <div
        className="dchart-meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${pct}% ${partLabel}, target ${target}%`}
      >
        <i className="dchart-bar s0" style={{ width: `${Math.min(100, pct)}%` }} />
        <span className="dchart-target" style={{ left: `${target}%` }} title={`Target ${target}%`} />
      </div>
      <div className="dchart-scale">
        <span>0%</span>
        <span style={{ left: `${target}%` }}>Target {target}%</span>
        <span>100%</span>
      </div>
      <p className="dchart-caption">
        {fmt(part)} {partLabel} of {fmt(whole)} {wholeLabel}
      </p>
      <p className={'dchart-status ' + (met ? 'ok' : 'warn')}>
        <span aria-hidden="true">{met ? '✓' : '!'}</span> {met ? 'Target met' : 'Below target'}
      </p>
    </div>
  );
}

/* A percentage by month, 0–100: a 2px line, the points ringed, each value above its point (three or so points). */
export function MonthLine({ points, label }: { points: BarRow[]; label: string }) {
  const W = 300;
  const H = 118;
  const pad = { l: 34, r: 16, t: 18, b: 22 };
  const x = (i: number) => pad.l + (points.length > 1 ? (i * (W - pad.l - pad.r)) / (points.length - 1) : (W - pad.l - pad.r) / 2);
  const y = (v: number) => pad.t + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - pad.t - pad.b);
  return (
    <svg
      className="dchart-line"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label}: ${points.map((p) => `${p.label} ${p.value}%`).join(', ')}`}
    >
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid" />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="tick">
            {v}%
          </text>
        </g>
      ))}
      <polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} className="series" />
      {points.map((p, i) => (
        <g key={p.label}>
          <title>{`${p.label}: ${p.value}%`}</title>
          <circle cx={x(i)} cy={y(p.value)} r={5} className="dot" />
          <text x={x(i)} y={y(p.value) - 10} textAnchor="middle" className="val">
            {p.value}%
          </text>
          <text x={x(i)} y={H - 6} textAnchor="middle" className="tick">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* Parts of a whole, one row each: the name, a bar of its share and the figure. */
export function MeterList({ rows, label }: { rows: BarRow[]; label: string }) {
  const total = rows.reduce((a, r) => a + r.value, 0);
  return (
    <div className="dchart-bars" role="list" aria-label={label}>
      {rows.map((r) => (
        <div className="dchart-row stacked" role="listitem" key={r.label} title={`${r.label}: ${fmt(r.value)}`}>
          <span className="dchart-label">{r.label}</span>
          <b className="dchart-figure">{fmt(r.value)}</b>
          <span className="dchart-track wide">
            <i className="dchart-bar s0" style={{ width: widthOf(r.value, total) }} />
          </span>
        </div>
      ))}
    </div>
  );
}
