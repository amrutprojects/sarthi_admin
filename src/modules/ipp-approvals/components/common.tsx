import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Callout } from '../../../components/ui';
import { STAGE_LABEL, STAGE_TONE } from '../labels';
import { STAGES, type Stage } from '../types/ippApprovals.types';
import { APPLICATIONS_PATH, BATCHES_PATH, DASHBOARD_PATH, errorText, isStatus, type NoticeValue } from '../utils';

/* The screens of the menu: its dashboard and its two lists. */
export function ApprovalNav({ current }: { current: 'dashboard' | 'applications' | 'batches' }) {
  const item = (key: typeof current, label: string, to: string) => (
    <Link to={to} className={'chip' + (current === key ? ' on' : '')} aria-current={current === key ? 'page' : undefined}>
      {label}
    </Link>
  );
  return (
    <nav className="pills mb14" aria-label="IPP approvals">
      {item('dashboard', 'Dashboard', DASHBOARD_PATH)}
      {item('applications', 'Applications', APPLICATIONS_PATH)}
      {item('batches', 'Batches', BATCHES_PATH)}
    </nav>
  );
}

export const StageBadge = ({ stage, label }: { stage: Stage; label?: string }) => (
  <Badge tone={STAGE_TONE[stage]}>{label || STAGE_LABEL[stage] || stage}</Badge>
);

/* "With COEP 12" for every stage that has applications. */
export function StageCounts({ stages }: { stages: Record<Stage, number> }) {
  const present = STAGES.filter((s) => stages[s] > 0);
  if (!present.length) return <span className="muted">—</span>;
  return (
    <span className="tw-flex tw-flex-wrap tw-gap-1">
      {present.map((s) => (
        <Badge key={s} tone={STAGE_TONE[s]} nodot>
          {STAGE_LABEL[s]} {stages[s].toLocaleString('en-IN')}
        </Badge>
      ))}
    </span>
  );
}

/* A failed read: "not permitted" for 403, otherwise what went wrong with Retry. */
export function LoadProblem({ error, what, onRetry }: { error: unknown; what: string; onRetry: () => void }) {
  return (
    <div role="alert">
      {isStatus(error, 403) ? (
        <Callout tone="warn" title="Not permitted. ">
          You do not have permission to see {what}.
        </Callout>
      ) : (
        <Callout tone="err" title={`Could not load ${what}. `}>
          {errorText(error)}{' '}
          <button type="button" className="btn xs" onClick={onRetry}>
            Retry
          </button>
        </Callout>
      )}
    </div>
  );
}

export function Loading({ what, lines = 4 }: { what: string; lines?: number }) {
  return (
    <div aria-busy="true" aria-label={`Loading ${what}`} role="status">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skel tw-mb-3" style={{ height: 16 }} />
      ))}
    </div>
  );
}

/* What the last decision did. Stays on screen (the toast goes away) and is read out. */
export function Notice({ value }: { value: NoticeValue | null }) {
  return (
    <div aria-live="polite">
      {value ? (
        <div className="mb14" role={value.tone === 'err' ? 'alert' : undefined}>
          <Callout tone={value.tone}>{value.text}</Callout>
        </div>
      ) : null}
    </div>
  );
}

/* Table cells stay on one line (styles.css); this one wraps, at least `min` pixels wide. An empty value is a dash. */
export function Wrap({ min, children }: { min?: number; children?: ReactNode }) {
  if (children === null || children === undefined || children === '') return <span className="muted">—</span>;
  return (
    <div className="tw-whitespace-normal" style={{ minWidth: min }}>
      {children}
    </div>
  );
}

/*
 * The rest of a row button's name, for screen readers ("Approve" + "Asha Patil"). Not aria-label: the design system
 * draws a small table button with an aria-label as an icon. Its parent has to be positioned (tw-relative).
 */
export const ForWhom = ({ children }: { children: string }) => <span className="tw-sr-only"> {children}</span>;

/* Label / value rows keyed by the form field, as KvList (whose rows are keyed by their label, which two fields may share). */
export function FieldRows({ rows }: { rows: { key: string; label: string; value: ReactNode }[] }) {
  return (
    <>
      {rows.map((r) => (
        <div className="kv" key={r.key}>
          <span>{r.label}</span>
          <b className="tw-whitespace-pre-wrap">{r.value}</b>
        </div>
      ))}
    </>
  );
}
