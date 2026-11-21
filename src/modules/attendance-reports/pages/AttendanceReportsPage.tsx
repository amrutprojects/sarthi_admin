import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Callout, Card, EmptyState, Kpi, LinkButton, PageHead, fmt } from '../../../components/ui';
import usePersistentState from '../../../hooks/usePersistentState';
import { ApiError } from '../../../services/api-client';
import { useCan, useCanOpen } from '../../auth';
import { LABELS, placeName, type Lang } from '../labels';
import {
  csvFileName,
  downloadText,
  levelFor,
  pctText,
  rangeInvalid,
  reportCsv,
  unavailableFrom,
  type DrillPath,
  type Unavailable,
} from '../report.utils';
import { attendanceReportsApi } from '../services/attendanceReportsApi';
import type { ReportCounts, ReportRow } from '../types/attendanceReports.types';

/*
 * M3 "Attendance reports": attendance read live from the LMS (amrut-kalash-api GET /attendance-reports), drilled
 * division → district → centre → batch, with totals, percentages and evidence counts, CSV of what is on screen, and
 * English / Marathi labels. When the LMS cannot be used the screen says why and shows no figures (never dummy ones).
 */
interface Prefs {
  lang: Lang;
  dateFrom: string;
  dateTo: string;
}
const DEFAULT_PREFS: Prefs = { lang: 'en', dateFrom: '', dateTo: '' };

const UNAVAILABLE_TEXT: Record<Unavailable, (t: (typeof LABELS)['en']) => [string, string]> = {
  off: (t) => [t.offTitle, t.offMsg],
  serverOff: (t) => [t.offTitle, t.serverOffMsg],
  notConfigured: (t) => [t.notConfiguredTitle, t.notConfiguredMsg],
  down: (t) => [t.downTitle, t.downMsg],
  noAccess: (t) => [t.noAccessTitle, t.noAccessMsg],
  badRange: (t) => [t.errorTitle, t.badRange],
  error: (t) => [t.errorTitle, t.downMsg],
};

function PctCell({ v }: { v: number | null }) {
  return <td className="tw-text-right">{pctText(v)}</td>;
}

function CountCells({ c }: { c: ReportCounts }) {
  return (
    <>
      <td className="tw-text-right">{fmt(c.batches)}</td>
      <td className="tw-text-right">{fmt(c.sessionsHeld)}</td>
      <td className="tw-text-right">{fmt(c.present)}</td>
      <td className="tw-text-right">{fmt(c.late)}</td>
      <td className="tw-text-right">{fmt(c.absent)}</td>
      <td className="tw-text-right">{fmt(c.excused)}</td>
      <PctCell v={c.presentPercent} />
      <PctCell v={c.latePercent} />
      <PctCell v={c.absentPercent} />
      <PctCell v={c.attendancePercent} />
      <td className="tw-text-right">{fmt(c.selfCheckIns)}</td>
      <td className="tw-text-right">{fmt(c.geoCheckIns)}</td>
      <td className="tw-text-right">{fmt(c.selfies)}</td>
      <td className="tw-text-right">{fmt(c.groupPhotos)}</td>
    </>
  );
}

export default function AttendanceReportsPage() {
  const [prefs, setPrefs] = usePersistentState<Prefs>('attendance-reports', DEFAULT_PREFS);
  const [path, setPath] = useState<DrillPath>({});
  const can = useCan();
  const canOpen = useCanOpen();
  const t = LABELS[prefs.lang];
  const level = levelFor(path);
  const badRange = rangeInvalid(prefs.dateFrom, prefs.dateTo);

  useEffect(() => {
    document.title = 'Attendance reports — AMRUT × SUMAGO Admin';
  }, []);

  const status = useQuery({ queryKey: ['attendance-reports', 'status'], queryFn: () => attendanceReportsApi.status() });
  const query = {
    level,
    dateFrom: prefs.dateFrom || undefined,
    dateTo: prefs.dateTo || undefined,
    division: path.division?.code,
    district: path.district?.code,
    centre: path.centre?.code,
  };
  /*
   * The status probe decides first: the server master switch, the G-2 setting "Show live LMS data" or a missing LMS
   * link means no report call at all (and no figures: this screen has no local data to fall back to).
   */
  const statusBlocks = status.data && (!status.data.enabled || !status.data.liveData || !status.data.configured);
  const report = useQuery({
    queryKey: ['attendance-reports', 'report', query],
    queryFn: ({ signal }) => attendanceReportsApi.report(query, signal),
    enabled: !badRange && !!status.data && !statusBlocks,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const unavailable: Unavailable | null = status.data
    ? !status.data.enabled
      ? 'serverOff'
      : !status.data.liveData
        ? 'off'
        : !status.data.configured
          ? 'notConfigured'
          : report.isError
            ? unavailableFrom(report.error)
            : null
    : status.isError
      ? unavailableFrom(status.error)
      : null;

  const data = report.data;
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const drill = (r: ReportRow) => {
    const place = { code: r.code, name: r.name, nameMr: r.nameMr };
    if (level === 'division') setPath({ division: place });
    else if (level === 'district') setPath({ division: path.division ?? r.division ?? undefined, district: place });
    else if (level === 'centre') setPath({ ...path, district: path.district ?? r.district ?? undefined, centre: place });
  };

  const crumbs: { label: string; to: DrillPath }[] = [{ label: t.allDivisions, to: {} }];
  if (path.division) crumbs.push({ label: placeName(path.division, prefs.lang), to: { division: path.division } });
  if (path.district) crumbs.push({ label: placeName(path.district, prefs.lang), to: { division: path.division, district: path.district } });
  if (path.centre) crumbs.push({ label: placeName(path.centre, prefs.lang), to: path });

  const exportCsv = () => {
    if (data) downloadText(csvFileName(data, path), reportCsv(data, path, prefs.lang));
  };

  let body: ReactNode;
  if (badRange) {
    body = <Callout tone="warn">{t.badRange}</Callout>;
  } else if (unavailable) {
    const [title, msg] = UNAVAILABLE_TEXT[unavailable](t);
    const err = report.error ?? status.error;
    body = (
      <Card>
        <EmptyState title={title} msg={msg}>
          {unavailable === 'off' && canOpen('settings') ? (
            <LinkButton to="#/settings" className="btn primary">
              {t.openSettings}
            </LinkButton>
          ) : null}
          {err instanceof ApiError && unavailable !== 'off' && unavailable !== 'serverOff' && unavailable !== 'notConfigured' ? (
            <p className="muted mono">
              {t.errorCode}: {err.code}
            </p>
          ) : null}
          {unavailable === 'down' || unavailable === 'error' ? (
            <button type="button" className="btn" onClick={() => void (status.isError ? status.refetch() : report.refetch())}>
              {t.retry}
            </button>
          ) : null}
        </EmptyState>
      </Card>
    );
  } else if (!data) {
    body = <div className="skel" style={{ height: 220 }} aria-busy="true" aria-label={t.loading} />;
  } else {
    body = (
      <>
        <div className="grid g4 mb14">
          <Kpi label={t.sessionsHeld} value={totals?.sessionsHeld ?? 0} sub={`${t.marked}: ${fmt(totals?.marked ?? 0)}`} />
          <Kpi
            label={t.presentPct}
            value={pctText(totals?.presentPercent ?? null)}
            tone="ok"
            sub={`${t.present}: ${fmt(totals?.present ?? 0)}`}
          />
          <Kpi label={t.latePct} value={pctText(totals?.latePercent ?? null)} tone="warn" sub={`${t.late}: ${fmt(totals?.late ?? 0)}`} />
          <Kpi
            label={t.absentPct}
            value={pctText(totals?.absentPercent ?? null)}
            tone="err"
            sub={`${t.absent}: ${fmt(totals?.absent ?? 0)}`}
          />
        </div>
        <div className="grid g4 mb14" aria-label={t.evidence}>
          <Kpi label={t.selfCheckIns} value={totals?.selfCheckIns ?? 0} />
          <Kpi label={t.geoCheckIns} value={totals?.geoCheckIns ?? 0} />
          <Kpi label={t.selfies} value={totals?.selfies ?? 0} />
          <Kpi label={t.groupPhotos} value={totals?.groupPhotos ?? 0} />
        </div>
        {data.unplaced > 0 ? <Callout tone="info">{t.unplaced(data.unplaced)}</Callout> : null}
        <Card
          flush
          title={t.levelTitle[level]}
          sub={data.dateFrom && data.dateTo ? t.range(data.dateFrom, data.dateTo) : undefined}
          action={
            can('exportAttendanceReports') && rows.length ? (
              <button type="button" className="btn sm" onClick={exportCsv}>
                {t.exportCsv}
              </button>
            ) : undefined
          }
          footer={
            <span className="muted">
              {t.percentBase} {t.asOf}: {new Date(data.fetchedAt).toLocaleString('en-IN')}
            </span>
          }
        >
          {!rows.length ? (
            <EmptyState title={t.emptyTitle} msg={t.emptyMsg} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t[level]}</th>
                    <th className="tw-text-right">{t.batches}</th>
                    <th className="tw-text-right">{t.sessionsHeld}</th>
                    <th className="tw-text-right">{t.present}</th>
                    <th className="tw-text-right">{t.late}</th>
                    <th className="tw-text-right">{t.absent}</th>
                    <th className="tw-text-right">{t.excused}</th>
                    <th className="tw-text-right">{t.presentPct}</th>
                    <th className="tw-text-right">{t.latePct}</th>
                    <th className="tw-text-right">{t.absentPct}</th>
                    <th className="tw-text-right">{t.attendancePct}</th>
                    <th className="tw-text-right">{t.selfCheckIns}</th>
                    <th className="tw-text-right">{t.geoCheckIns}</th>
                    <th className="tw-text-right">{t.selfies}</th>
                    <th className="tw-text-right">{t.groupPhotos}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.code}>
                      <td>
                        {level !== 'batch' ? (
                          <button
                            type="button"
                            className="lnk tw-cursor-pointer tw-border-0 tw-bg-transparent tw-p-0 tw-text-left tw-font-semibold"
                            onClick={() => drill(r)}
                            title={t.open}
                          >
                            {placeName(r, prefs.lang)}
                          </button>
                        ) : (
                          <span className="mono">{r.name}</span>
                        )}{' '}
                        {!r.mapped ? <Badge tone="grey">{t.notInMasters}</Badge> : null}
                      </td>
                      <CountCells c={r} />
                    </tr>
                  ))}
                </tbody>
                {totals ? (
                  <tfoot>
                    <tr>
                      <th>{t.total}</th>
                      <CountCells c={totals} />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          )}
        </Card>
      </>
    );
  }

  return (
    <div className="page" lang={prefs.lang}>
      <PageHead
        title={t.title}
        sub={t.sub}
        actions={
          <div className="tw-flex tw-gap-1" role="group" aria-label={t.language}>
            {(['en', 'mr'] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={'btn sm' + (prefs.lang === l ? ' primary' : '')}
                aria-pressed={prefs.lang === l}
                onClick={() => setPrefs((p) => ({ ...p, lang: l }))}
              >
                {l === 'en' ? 'English' : 'मराठी'}
              </button>
            ))}
          </div>
        }
      />
      <div className="filters mb14 tw-flex tw-flex-wrap tw-items-end tw-gap-3">
        <nav aria-label={t.division} className="crumb tw-grow">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i ? <i> / </i> : null}
              {i < crumbs.length - 1 ? (
                <a href="#" onClick={(e) => (e.preventDefault(), setPath(c.to))}>
                  {c.label}
                </a>
              ) : (
                <b>{c.label}</b>
              )}
            </span>
          ))}
        </nav>
        <label className="tw-flex tw-flex-col">
          <span className="muted">{t.from}</span>
          <input
            type="date"
            className="inp sm"
            value={prefs.dateFrom}
            max={prefs.dateTo || undefined}
            onChange={(e) => setPrefs((p) => ({ ...p, dateFrom: e.target.value }))}
          />
        </label>
        <label className="tw-flex tw-flex-col">
          <span className="muted">{t.to}</span>
          <input
            type="date"
            className="inp sm"
            value={prefs.dateTo}
            min={prefs.dateFrom || undefined}
            onChange={(e) => setPrefs((p) => ({ ...p, dateTo: e.target.value }))}
          />
        </label>
        <button type="button" className="btn sm" onClick={() => setPrefs((p) => ({ ...p, dateFrom: '', dateTo: '' }))}>
          {t.last30}
        </button>
      </div>
      {body}
    </div>
  );
}
