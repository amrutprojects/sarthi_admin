import { useState, type ReactNode } from 'react';
import { Badge, Callout, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import FieldTable, { Bi, FieldValue } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote, SectionTabBar, SectionTabPanel } from '../../components/SectionTabs';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { useSectionTab } from '../../useSectionTab';
import { programmeService } from '../services/programmeService';
import {
  PROGRAMME_FACT_ROWS,
  PROGRAMME_TABS,
  type ApiProgrammePage,
  type Bilingual,
  type ProgrammeFactKey,
  type ProgrammeFactRow,
} from '../types/programme.types';
import { formatMonths } from '../validation/months';

/*
 * A text cell of a list table. Panel cells never wrap (styles.css: table.tbl td { white-space: nowrap }); these may.
 * The inner block keeps a minimum width (min-width on a td is unreliable), so on a phone the table scrolls sideways,
 * as the Modules tables do, instead of squeezing the text to a few characters.
 */
function TextCell({ value }: { value: Bilingual }) {
  return (
    <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
      <div style={{ minWidth: '9rem' }}>
        <Bi value={value} />
      </div>
    </td>
  );
}

/* One of the page's lists as a table, in website order, or a short line when the list is empty. */
function ListTable<T>({ items, headers, empty, cells }: { items: T[]; headers: string[]; empty: string; cells: (item: T) => ReactNode }) {
  if (items.length === 0) {
    return (
      <div className="card-b">
        <div className="hint">{empty}</div>
      </div>
    );
  }
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th scope="col" style={{ width: '76px' }}>
              Sr. No.
            </th>
            {headers.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* The rows have no ids of their own: a list is saved whole, and its order is the order on the website. */}
          {items.map((item, i) => (
            <tr className="norow" key={i}>
              <td>
                <span className="t2">{i + 1}</span>
              </td>
              {cells(item)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* About the programme tab: the introduction and the objectives under it. */
function AboutTab({ page }: { page: ApiProgrammePage }) {
  return (
    <>
      <SectionNote>Marathi is shown first, English underneath. Publishing applies to the whole page, every tab included.</SectionNote>
      <div className="card mb14">
        <div className="card-h">
          <h3>
            About the programme <span className="sub">the introduction on the public Programme page</span>
          </h3>
          <MasterStatusBadge isActive={page.isPublished} />
        </div>
        <FieldTable rows={[['Introduction', <Bi value={page.intro} />]]} />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>
            Objectives <span className="sub">the bullet list under &lsquo;About the programme&rsquo;</span>
          </h3>
        </div>
        <ListTable
          items={page.objectives}
          headers={['Objective']}
          empty="No objectives are listed."
          cells={(o) => <TextCell value={o} />}
        />
      </div>
    </>
  );
}

/* Learning methodology tab: each label and its description. */
function MethodologyTab({ page }: { page: ApiProgrammePage }) {
  return (
    <>
      <SectionNote>
        Each row is a label (e.g. Delivery mode) and its description, in the order the public page shows them. Marathi first, English
        underneath.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            Learning methodology <span className="sub">the table on the public Programme page</span>
          </h3>
        </div>
        <ListTable
          items={page.methodology}
          headers={['Label', 'Description']}
          empty="No methodology rows are listed."
          cells={(m) => (
            <>
              <TextCell value={m.label} />
              <TextCell value={m.value} />
            </>
          )}
        />
      </div>
    </>
  );
}

/* Assessment tab: the passing criteria table and the note under it. */
function AssessmentTab({ page }: { page: ApiProgrammePage }) {
  return (
    <>
      <SectionNote>
        Each component with its minimum marks and the marks it is out of, in the order the public table shows them. The note appears under
        the table.
      </SectionNote>
      <div className="card mb14">
        <div className="card-h">
          <h3>
            Assessment &amp; passing criteria <span className="sub">the table on the public Programme page</span>
          </h3>
        </div>
        <ListTable
          items={page.assessment}
          headers={['Component', 'Minimum', 'Out of']}
          empty="No assessment rows are listed."
          cells={(a) => (
            <>
              <TextCell value={a.component} />
              <td className="mono">{a.min}</td>
              <td className="mono">{a.max}</td>
            </>
          )}
        />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>
            Assessment note <span className="sub">shown under the table</span>
          </h3>
        </div>
        <FieldTable rows={[['Assessment note', <Bi value={page.assessmentNote} />]]} />
      </div>
    </>
  );
}

/* Certification tab: the certification points. */
function CertificationTab({ page }: { page: ApiProgrammePage }) {
  return (
    <>
      <SectionNote>The certification points, in the order the public page lists them. Marathi first, English underneath.</SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            Certification <span className="sub">the points on the public Programme page</span>
          </h3>
        </div>
        <ListTable
          items={page.certification}
          headers={['Certification point']}
          empty="No certification points are listed."
          cells={(c) => <TextCell value={c} />}
        />
      </div>
    </>
  );
}

/*
 * Fact sheet tab: the box in the right-hand rail of /programme, row by row in website order, each row with a switch of
 * its own. A hidden row is left out of the box on the website; its figure is kept. Hiding asks first, showing does not.
 * Without cms-programme.update the rows show a Shown / Hidden badge instead.
 */
function FactsTab({
  page,
  canUpdate,
  busy,
  onSwitch,
}: {
  page: ApiProgrammePage;
  canUpdate: boolean;
  busy: boolean;
  onSwitch: (row: ProgrammeFactRow, show: boolean) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState<ProgrammeFactRow | null>(null);
  const hidden = new Set(page.hiddenFacts);
  const shownCount = PROGRAMME_FACT_ROWS.filter((r) => !hidden.has(r.key)).length;
  const { facts } = page;
  /* This page does not load the modules, so the three figures summed from them are not repeated here. */
  const calculated = <span className="muted">Calculated from the Modules page</span>;
  const values: Record<ProgrammeFactKey, ReactNode> = {
    totalHours: calculated,
    modules: calculated,
    electives: calculated,
    idealDuration: formatMonths(facts.idealMonths),
    validity: formatMonths(facts.validityMonths),
    securityDeposit: `₹${facts.securityDeposit.toLocaleString('en-IN')}`,
    applyBefore: `${facts.applyLeadDays} days`,
    partner: <FieldValue value={facts.partnerName} />,
  };

  return (
    <>
      <SectionNote>
        Total hours, Modules and Electives are summed from the modules on the Modules page; the other figures are entered with Edit content.
        Switch a row off to leave it out of the fact sheet on the website &mdash; its figure is kept. The same row is also left out of the
        home page&rsquo;s programme section (Total hours, Ideal duration, Validity and Security deposit appear there too).
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            Programme fact sheet &mdash; /programme <span className="sub">the right-hand box on the website</span>
          </h3>
          <span className="tag">
            {shownCount} of {PROGRAMME_FACT_ROWS.length} shown
          </span>
        </div>
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
                <th scope="col" style={{ width: '180px' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {PROGRAMME_FACT_ROWS.map((row, i) => {
                const shown = !hidden.has(row.key);
                return (
                  <tr className="norow" key={row.key}>
                    <td>
                      <span className="t2">{i + 1}</span>
                    </td>
                    <td style={{ whiteSpace: 'normal' }}>
                      <b>{row.label.en}</b>
                      <div className="bi-alt" lang="mr">
                        {row.label.mr}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{values[row.key]}</td>
                    <td>
                      {canUpdate ? (
                        <span className="f ac gp8">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={shown}
                            aria-label={`Show ${row.label.en} in the fact sheet`}
                            aria-busy={busy || undefined}
                            className={'switch' + (shown ? ' on' : '')}
                            disabled={busy}
                            title={shown ? 'Shown — switch off to hide it' : 'Hidden — switch on to show it'}
                            onClick={() => (shown ? setConfirming(row) : void onSwitch(row, true))}
                          />
                          <span className="fs12" style={{ fontWeight: 600, color: shown ? 'var(--green)' : 'var(--muted)' }}>
                            {shown ? 'Shown' : 'Hidden'}
                          </span>
                        </span>
                      ) : (
                        <Badge tone={shown ? 'green' : 'grey'}>{shown ? 'Shown' : 'Hidden'}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirming ? (
        <ConfirmModal
          title={`Hide "${confirming.label.en}" from the website's fact sheet?`}
          message="Visitors will no longer see this row in the fact sheet on the Programme page. Its figure is not deleted, and the row can be shown again at any time."
          confirmLabel="Yes, hide"
          busy={busy}
          onClose={() => setConfirming(null)}
          onConfirm={() => void onSwitch(confirming, false).then(() => setConfirming(null))}
        />
      ) : null}
    </>
  );
}

/* Training modes tab: the box under the fact sheet, its title and note, and each mode. */
function ModesTab({ page }: { page: ApiProgrammePage }) {
  const { title, modes, note } = page.trainingModes;
  return (
    <>
      <SectionNote>
        The box shows its title, then each mode as a tag (e.g. OFFLINE / ONLINE) with its description underneath, then the note. Marathi
        first, English underneath.
      </SectionNote>
      <div className="card mb14">
        <div className="card-h">
          <h3>
            Training modes box <span className="sub">under the fact sheet in the right-hand rail</span>
          </h3>
        </div>
        <FieldTable
          rows={[
            ['Box title', <Bi value={title} />],
            ['Note under the modes', <Bi value={note} />],
          ]}
        />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>
            Training modes <span className="sub">each shown as a tag with its description</span>
          </h3>
        </div>
        <ListTable
          items={modes}
          headers={['Mode name', 'Description']}
          empty="No training modes are listed."
          cells={(m) => (
            <>
              <TextCell value={m.name} />
              <TextCell value={m.description} />
            </>
          )}
        />
      </div>
    </>
  );
}

/*
 * Programme Page Management — the read-only view of what the public /programme page shows: introduction, objectives,
 * learning methodology, assessment criteria, certification, and the fact sheet and training modes in the right-hand
 * rail. View-only administrators get the whole picture; the Edit and Publish buttons and the fact sheet's row switches
 * render only for cms-programme.update. The page is shown one part per tab, with the same tab strip as Modules Page
 * Management, and the tab kept in the URL (?tab=).
 */
export default function ProgrammeView() {
  usePageTitle('Programme Page');
  const go = useGo();
  const can = useCan();
  const detail = useApiData(() => programmeService.get(), []);
  const { busy, run } = useAction();
  const [tab, selectTab] = useSectionTab(PROGRAMME_TABS);
  /*
   * A fact sheet switch's PATCH answers with the whole page, which is shown in place of the loaded copy without a
   * second GET. It is tied to the copy it replaced, so any reload (Publish, Retry) shows the server's page again.
   */
  const [patched, setPatched] = useState<{ over: ApiProgrammePage | null; page: ApiProgrammePage } | null>(null);
  const page = patched && patched.over === detail.data ? patched.page : detail.data;

  /* The same busy flag as Publish, so no switch is used while another change to the page is on its way. */
  const switchFact = async (row: ProgrammeFactRow, show: boolean) => {
    const loaded = detail.data;
    const ok = await run(
      async () => setPatched({ over: loaded, page: await programmeService.setFactVisibility(row.key, show) }),
      `${row.label.en} is now ${show ? 'shown in' : 'hidden from'} the fact sheet`,
    );
    /* After a failure, reloaded so the switches show what the website has now. */
    if (!ok) await detail.reload();
  };

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Programme Page' }]}
        title="Programme Page Management"
        sub="The content of the public Programme page, in Marathi and English, plus its fact sheet."
        actions={
          page ? (
            <div className="f ac gp8 wrap">
              <Can action="updateProgrammePage">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => programmeService.setPublished(!page.isPublished),
                      page.isPublished ? 'Programme page unpublished' : 'Programme page published',
                      () => detail.reload(),
                    )
                  }
                >
                  <Icon name="globe" />
                  {page.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateProgrammePage">
                <button type="button" className="btn primary" onClick={() => go('/cms/programme/edit')}>
                  <Icon name="edit" />
                  Edit content
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {/* Larger, higher-contrast table text than the panel defaults: see .cms-sections in cms-tables.css. */}
      {page ? (
        <div className="cms-sections">
          {!page.isPublished ? (
            <div className="mb14">
              <Callout tone="warn" title="This content is not published">
                The public Programme page is showing the website&rsquo;s own built-in copy. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}

          <SectionTabBar tabs={PROGRAMME_TABS} active={tab} onChange={selectTab} idPrefix="programme" label="Programme page sections" />

          <SectionTabPanel tab="about" active={tab} idPrefix="programme">
            <AboutTab page={page} />
          </SectionTabPanel>
          <SectionTabPanel tab="methodology" active={tab} idPrefix="programme">
            <MethodologyTab page={page} />
          </SectionTabPanel>
          <SectionTabPanel tab="assessment" active={tab} idPrefix="programme">
            <AssessmentTab page={page} />
          </SectionTabPanel>
          <SectionTabPanel tab="certification" active={tab} idPrefix="programme">
            <CertificationTab page={page} />
          </SectionTabPanel>
          <SectionTabPanel tab="facts" active={tab} idPrefix="programme">
            {/*
             * Locked during any reload too (the one after a failed switch, or Retry): a switch used meanwhile would
             * have its PATCH answer replaced by the reload's older page, and the row would show the wrong state.
             */}
            <FactsTab page={page} canUpdate={can('updateProgrammePage')} busy={busy || detail.loading} onSwitch={switchFact} />
          </SectionTabPanel>
          <SectionTabPanel tab="modes" active={tab} idPrefix="programme">
            <ModesTab page={page} />
          </SectionTabPanel>
          {/* One save updates the whole page, so the time is shown on every tab. */}
          <div className="fs13 t2 mt10">Last updated {fmtDateTime(page.updatedAt)}.</div>
        </div>
      ) : null}
    </div>
  );
}
