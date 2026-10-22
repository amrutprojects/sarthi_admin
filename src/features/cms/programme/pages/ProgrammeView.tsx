import type { ReactNode } from 'react';
import { Callout, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import FieldTable, { Bi, FieldValue } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote, SectionTabBar, SectionTabPanel } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { useSectionTab } from '../../useSectionTab';
import { programmeService } from '../services/programmeService';
import { PROGRAMME_TABS, type ApiProgrammePage, type Bilingual } from '../types/programme.types';

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

/* Fact sheet tab: the figures in the right-hand rail of /programme. */
function FactsTab({ page }: { page: ApiProgrammePage }) {
  return (
    <>
      {/* The fact sheet on /programme. Total hours, the module line and the elective count there are summed from the modules. */}
      <SectionNote>
        Total hours, the module line and the elective count on this fact sheet are summed from the modules on the Modules page, so they are
        not shown here. The home page&rsquo;s programme section shows the duration, validity and deposit from here too.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            Programme fact sheet &mdash; /programme <span className="sub">the right-hand rail of the public page</span>
          </h3>
        </div>
        <FieldTable
          rows={[
            ['Ideal duration', `${page.facts.idealMonths} months`],
            ['Validity', `${page.facts.validityMonths} months`],
            ['Security deposit', `₹${page.facts.securityDeposit.toLocaleString('en-IN')}`],
            ['Apply before', `${page.facts.applyLeadDays} days`],
            ['Partner', <FieldValue value={page.facts.partnerName} />],
          ]}
        />
      </div>
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
 * rail. View-only administrators get the whole picture; the Edit and Publish buttons render only for
 * cms-programme.update. The page is shown one part per tab, with the same tab strip as Modules Page Management,
 * and the tab kept in the URL (?tab=).
 */
export default function ProgrammeView() {
  usePageTitle('Programme Page');
  const go = useGo();
  const detail = useApiData(() => programmeService.get(), []);
  const { busy, run } = useAction();
  const [tab, selectTab] = useSectionTab(PROGRAMME_TABS);
  const page = detail.data;

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
            <FactsTab page={page} />
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
