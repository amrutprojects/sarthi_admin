/*
 * React versions of the original UI helpers (src/legacy/ui.js).
 * Markup and class names match the originals exactly so styles.css applies unchanged.
 */
import { Fragment, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import AS from '../../legacy';
import Icon from './Icon';
import { goTo } from '../../hooks/useLegacyEvents';
import type { CandidateStatus, Tone } from '../../types/domain';
import type { Option } from '../../types/legacy';

export const fmt = (n: number | null | undefined): string => (n == null ? '-' : Number(n).toLocaleString('en-IN'));
export const dateFmt = (iso: string | null | undefined): string => AS.ui.dateFmt(iso);
export const money = (n: number): string => AS.ui.money(n);
export const titleCase = (s: string): string => AS.ui.titleCase(s);

/* Click handler that follows a "#/route" link (public-site paths open the public website). */
export function useGo(): (href: string) => void {
  const navigate = useNavigate();
  return (href) => goTo(navigate, href);
}

/* Static SVG/HTML produced by the existing chart and map generators. */
type HtmlProps = { html: string; as?: ElementType } & Omit<HTMLAttributes<HTMLElement>, 'dangerouslySetInnerHTML'>;
export function Html({ html, as: Tag = 'div', ...rest }: HtmlProps) {
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}

const TONE_CLASS: Record<Tone, string> = {
  green: 'b-green',
  amber: 'b-amber',
  red: 'b-red',
  grey: 'b-grey',
  blue: 'b-blue',
  info: 'b-info',
  violet: 'b-violet',
  saffron: 'b-saffron',
};
const GEN_TONE: Record<string, Tone> = {
  ACTIVE: 'green',
  COMPLETED: 'green',
  CERTIFIED: 'green',
  VERIFIED: 'green',
  APPROVED: 'green',
  SENT: 'green',
  PAID: 'green',
  RESOLVED: 'green',
  HEALTHY: 'green',
  ON_TRACK: 'green',
  PASSED: 'green',
  PENDING: 'amber',
  IN_PROGRESS: 'amber',
  UPCOMING: 'blue',
  SCHEDULED: 'blue',
  NEEDS_IMPROVEMENT: 'amber',
  AT_RISK: 'amber',
  PARTIALLY_PAID: 'amber',
  DRAFT: 'grey',
  OPEN: 'amber',
  PARTIAL: 'amber',
  CRITICAL: 'red',
  DELAYED: 'red',
  REJECTED: 'red',
  FAILED: 'red',
  SUSPENDED: 'red',
  INACTIVE: 'grey',
  CANCELLED: 'red',
  CLOSED: 'grey',
  ARCHIVED: 'grey',
  NOT_STARTED: 'grey',
  BACKUP: 'blue',
  SUCCESS: 'green',
  INFO: 'blue',
  LIVE: 'red',
};

export function Badge({ tone, nodot, children }: { tone?: Tone | string; nodot?: boolean; children?: ReactNode }) {
  return <span className={'badge ' + (TONE_CLASS[tone as Tone] || 'b-grey') + (nodot ? ' nodot' : '')}>{children}</span>;
}
export function GenBadge({ status }: { status: string }) {
  return <Badge tone={GEN_TONE[status] || 'grey'}>{titleCase(status)}</Badge>;
}
export function ModeTag({ mode }: { mode: string }) {
  return mode === 'ONLINE' ? <span className="mode-tag mode-on">ONLINE</span> : <span className="mode-tag mode-off">OFFLINE</span>;
}
export function LivePill({ children = 'LIVE' }: { children?: ReactNode }) {
  return (
    <span className="live">
      <i />
      {children}
    </span>
  );
}

export interface KpiProps {
  label: string;
  value: number | string;
  tone?: string;
  sub?: ReactNode;
  link?: string;
  pct?: number;
  progTone?: string;
  title?: string;
  /* Shown after the label, e.g. <DemoChip />. */
  badge?: ReactNode;
}
export function Kpi({ label, value, tone, sub, link, pct, progTone, title, badge }: KpiProps) {
  const go = useGo();
  return (
    <div className={'kpi ' + (tone || '')} title={title} onClick={link ? () => go(link) : undefined}>
      <div className="kpi-t">
        {label}
        {badge ? <> {badge}</> : null}
      </div>
      <div className="kpi-v">{typeof value === 'number' ? fmt(value) : value}</div>
      {sub ? <div className="kpi-d">{sub}</div> : null}
      {pct != null ? (
        <div className="prog sm mt8">
          <i className={progTone || ''} style={{ width: Math.min(100, pct) + '%' }} />
        </div>
      ) : null}
    </div>
  );
}

export interface Crumb {
  l: string;
  link?: string;
}
export function Crumbs({ items }: { items: Crumb[] }) {
  const go = useGo();
  return (
    <div className="crumb">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i ? <i>/</i> : null}
          {it.link ? <a onClick={() => go(it.link as string)}>{it.l}</a> : <span>{it.l}</span>}
        </Fragment>
      ))}
    </div>
  );
}

interface PageHeadProps {
  crumbs?: Crumb[];
  title: ReactNode;
  badge?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  /* Shown at the left of the header, before the title (e.g. a Back button). */
  back?: ReactNode;
}
export function PageHead({ crumbs, title, badge, sub, actions, back }: PageHeadProps) {
  return (
    <>
      {crumbs ? <Crumbs items={crumbs} /> : null}
      <div className="page-head">
        {back ? <div className="ph-back">{back}</div> : null}
        <div className="ph-l">
          <h1>
            {title}
            {badge}
          </h1>
          {sub ? <div className="page-sub">{sub}</div> : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
    </>
  );
}

interface CardProps {
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  cls?: string;
  children?: ReactNode;
}
export function Card({ title, sub, action, footer, flush, cls, children }: CardProps) {
  return (
    <div className={'card' + (cls ? ' ' + cls : '')}>
      {title ? (
        <div className="card-h">
          <h3>
            {title}
            {sub ? (
              <>
                {' '}
                <span className="sub">{sub}</span>
              </>
            ) : null}
          </h3>
          {action}
        </div>
      ) : null}
      <div className={'card-b' + (flush ? ' flush' : '')}>{children}</div>
      {footer ? <div className="card-f">{footer}</div> : null}
    </div>
  );
}

/* Button that navigates to a "#/route" link. */
export function LinkButton({
  to,
  className = 'btn',
  icon,
  children,
}: {
  to: string;
  className?: string;
  icon?: string;
  children?: ReactNode;
}) {
  const go = useGo();
  return (
    <button type="button" className={className} onClick={() => go(to)}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

export function EmptyState({ title, msg, children }: { title: string; msg: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="e-ico">
        <Icon name="search" />
      </div>
      <b>{title}</b>
      <p>{msg}</p>
      {children}
    </div>
  );
}

export function Callout({ tone, title, children }: { tone: 'info' | 'warn' | 'err' | 'ok'; title?: string; children?: ReactNode }) {
  return (
    <div className={'callout c-' + tone}>
      <div>
        {title ? <b>{title}</b> : null}
        {children}
      </div>
    </div>
  );
}

export function DemoNote({
  children = 'Illustrative / demo data. Indicative values - subject to AMRUT / COEP approval.',
}: {
  children?: ReactNode;
}) {
  return <div className="disclaim mt10">{children}</div>;
}

/* Marks one figure or card as illustrative while the rest of the screen shows live data. */
export function DemoChip() {
  return (
    <span className="demo-pill" title="Illustrative figure: no live data source exists for it yet">
      Demo data
    </span>
  );
}

export function KvList({ pairs }: { pairs: [string, ReactNode][] }) {
  return (
    <>
      {pairs.map(([k, v]) => (
        <div className="kv" key={k}>
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </>
  );
}

interface AlertCardProps {
  color: string;
  title: ReactNode;
  sub: ReactNode;
  onClick?: () => void;
  right?: ReactNode;
  chevron?: boolean;
}
export function AlertCard({ color, title, sub, onClick, right, chevron }: AlertCardProps) {
  return (
    <div className="alert-card" onClick={onClick}>
      <span className="pdot" style={{ background: color }} />
      <div className="ac-b">
        <b>{title}</b>
        <span>{sub}</span>
      </div>
      {right}
      {chevron ? <Icon name="chevR" /> : null}
    </div>
  );
}

export type FilterField<K extends string> =
  | { k: K; l: string; type?: 'select'; options: Option[] }
  | { k: K; l: string; type: 'date' | 'text'; ph?: string };

interface FilterBarProps<V extends Record<string, string>> {
  id?: string;
  fields: FilterField<Extract<keyof V, string>>[];
  value: V;
  onChange: (key: Extract<keyof V, string>, value: string) => void;
  onReset: () => void;
  extra?: ReactNode;
}
/* Filter bar of selects / date / text inputs bound to one state object. */
export function FilterBar<V extends Record<string, string>>({ id, fields, value, onChange, onReset, extra }: FilterBarProps<V>) {
  return (
    <div className="filterbar" id={id}>
      {fields.map((f) => (
        <div className="fld" key={f.k}>
          <label htmlFor={(id || 'fb') + '-' + f.k}>{f.l}</label>
          {'options' in f ? (
            <select className="inp" id={(id || 'fb') + '-' + f.k} value={value[f.k]} onChange={(e) => onChange(f.k, e.target.value)}>
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={f.type}
              className="inp"
              id={(id || 'fb') + '-' + f.k}
              placeholder={f.ph}
              value={value[f.k] || ''}
              onChange={(e) => onChange(f.k, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className="fb-actions">
        <button type="button" className="btn" onClick={onReset}>
          Reset
        </button>
        {extra}
      </div>
    </div>
  );
}

export const districtOptions = (all?: string): Option[] => AS.ui.districtOptions(all);
export const modeOptions = (): Option[] => AS.ui.modeOptions();

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const s = AS.db.STATUS_MAP[status];
  return <Badge tone={s ? s.tone : 'grey'}>{s ? s.l : titleCase(status)}</Badge>;
}

export function ProgRow({ pct, tone, label }: { pct: number; tone?: string; label?: string }) {
  return (
    <div className="prog-row">
      <div className="prog">
        <i className={tone || ''} style={{ width: Math.min(100, pct || 0) + '%' }} />
      </div>
      <b>{label || (pct || 0) + '%'}</b>
    </div>
  );
}

export function AttendanceCell({ value: v }: { value: number }) {
  if (!v) return <span className="muted">-</span>;
  const tone = v >= 85 ? 'g' : v >= 75 ? '' : v >= 60 ? 'a' : 'r';
  return (
    <div className="prog-row" style={{ minWidth: 96 }}>
      <div className="prog sm">
        <i className={tone} style={{ width: v + '%' }} />
      </div>
      <b>{v}%</b>
    </div>
  );
}

export const Dash = () => <span className="muted">—</span>;

export interface TimelineItem {
  title: string;
  sub: ReactNode;
  state?: 'done' | 'cur' | 'fail' | '';
}
/* Vertical status timeline (original U.tl). */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="tl">
      {items.map((i, n) => (
        <div key={n} className={'tl-i ' + (i.state || '')}>
          <b>{i.title}</b>
          <span>{i.sub}</span>
        </div>
      ))}
    </div>
  );
}

export interface ListItem {
  title: ReactNode;
  sub?: ReactNode;
  link?: string;
  icon?: string;
  iconText?: string;
  iconBg?: string;
  iconFg?: string;
  right?: ReactNode;
}
/* List of rows (original U.listRows). */
export function ListRows({ items }: { items: ListItem[] }) {
  const go = useGo();
  return (
    <div className="list">
      {items.map((i, n) => {
        const iconStyle: CSSProperties = { background: i.iconBg || 'var(--brand-100)', color: i.iconFg || 'var(--brand-600)' };
        return (
          <div key={n} className="list-row" onClick={i.link ? () => go(i.link as string) : undefined}>
            {i.icon || i.iconText ? (
              <div className="icon-sq" style={iconStyle}>
                {i.iconText || <Icon name={i.icon as string} />}
              </div>
            ) : null}
            <div className="lr-main">
              <b>{i.title}</b>
              <span>{i.sub || ''}</span>
            </div>
            {i.right}
          </div>
        );
      })}
    </div>
  );
}
