import { Callout, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote, SectionTabBar, SectionTabPanel } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { useSectionTab } from '../../useSectionTab';
import { highlightService } from '../services/highlightService';
import { HIGHLIGHT_TABS, type ApiProgrammeHighlight } from '../types/highlight.types';

/* Section text tab: the heading, subheading, tagline and certification line of the band. */
function SectionTextTab({ page }: { page: ApiProgrammeHighlight }) {
  return (
    <>
      <SectionNote>Marathi is shown first, English underneath, as on the public site.</SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            Section text <span className="sub">the band on the home page</span>
          </h3>
          <MasterStatusBadge isActive={page.isPublished} />
        </div>
        <FieldTable
          rows={[
            ['Heading', <Bi value={page.heading} />],
            ['Subheading', <Bi value={page.subheading} />],
            ['Tagline', <Bi value={page.tagline} />],
            ['Certification', <Bi value={page.certification} />],
          ]}
        />
      </div>
    </>
  );
}

/* Objectives tab: the ticked list under the tagline, in website order, with each objective's status. */
function ObjectivesTab({ page }: { page: ApiProgrammeHighlight }) {
  const { objectives } = page;
  return (
    <>
      <SectionNote>
        Marathi is shown first, English underneath. An inactive objective is kept here but not shown on the home page.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            Objectives <span className="sub">in the order the home page lists them</span>
          </h3>
          <span className="tag">{objectives.length} listed</span>
        </div>
        {objectives.length === 0 ? (
          <div className="card-b">
            <div className="hint">No objectives are listed.</div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '76px' }}>
                    Sr. No.
                  </th>
                  <th scope="col">Objective</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {objectives.map((o, i) => (
                  <tr className="norow" key={o.id}>
                    <td>
                      <span className="t2">{i + 1}</span>
                    </td>
                    {/*
                     * Panel cells never wrap (styles.css: table.tbl td { white-space: nowrap }); an objective may. The inner
                     * block keeps a minimum width, so on a phone the table scrolls sideways instead of squeezing the text.
                     */}
                    <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                      <div style={{ minWidth: '9rem' }}>
                        <Bi value={o.text} />
                      </div>
                    </td>
                    <td>
                      <MasterStatusBadge isActive={o.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/*
 * Home Programme Section — the read-only view of what the band on the home page is showing.
 *
 * The landing screen for the menu because cms-highlight.view and cms-highlight.update are separate
 * permissions: a view-only administrator gets the whole picture without an editable form. The section
 * is shown one part per tab, with the same tab strip as Modules Page Management, and the tab kept in
 * the URL (?tab=).
 */
export default function HighlightView() {
  usePageTitle('Home Programme Section');
  const go = useGo();
  const detail = useApiData(() => highlightService.get(), []);
  const { busy, run } = useAction();
  const [tab, selectTab] = useSectionTab(HIGHLIGHT_TABS);

  const page = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Home Programme Section' }]}
        title="Home Programme Section"
        sub="The programme band on the home page — its heading, tagline, objectives and certification line."
        actions={
          page ? (
            <div className="f ac gp8 wrap">
              <Can action="updateHighlight">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => highlightService.setPublished(!page.isPublished),
                      page.isPublished ? 'Section unpublished' : 'Section published',
                      () => detail.reload(),
                    )
                  }
                >
                  <Icon name="globe" />
                  {page.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateHighlight">
                <button type="button" className="btn primary" onClick={() => go('/cms/highlight/edit')}>
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
                The home page is showing the website&rsquo;s own built-in copy of this section. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}

          <SectionTabBar tabs={HIGHLIGHT_TABS} active={tab} onChange={selectTab} idPrefix="highlight" label="Home programme section" />

          <SectionTabPanel tab="text" active={tab} idPrefix="highlight">
            <SectionTextTab page={page} />
          </SectionTabPanel>
          <SectionTabPanel tab="objectives" active={tab} idPrefix="highlight">
            <ObjectivesTab page={page} />
          </SectionTabPanel>
          {/* One save updates the whole section, objectives included, so the time is shown on every tab. */}
          <div className="fs13 t2 mt10">Last updated {fmtDateTime(page.updatedAt)}.</div>
        </div>
      ) : null}
    </div>
  );
}
