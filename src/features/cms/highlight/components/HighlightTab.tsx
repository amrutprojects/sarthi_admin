import { Callout, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote, SectionTabHead } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { highlightService } from '../services/highlightService';
import type { ApiProgrammeHighlight } from '../types/highlight.types';

/* The heading, subheading, tagline and certification line of the band. */
function SectionTextCard({ page }: { page: ApiProgrammeHighlight }) {
  return (
    <div className="card mb14">
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
  );
}

/* The ticked list under the tagline, in website order, with each objective's status. */
function ObjectivesCard({ page }: { page: ApiProgrammeHighlight }) {
  const { objectives } = page;
  return (
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
  );
}

/*
 * Skill Development Diploma — the Home Programme Section tab of Home Page Management: the read-only view of what
 * the programme band on the home page is showing, its text and then its objectives.
 *
 * cms-highlight.view and cms-highlight.update are separate permissions: a view-only administrator gets the whole
 * picture, and the Publish and Edit content buttons render only for cms-highlight.update.
 */
export default function HighlightTab() {
  const go = useGo();
  const detail = useApiData(() => highlightService.get(), []);
  const { busy, run } = useAction();

  const page = detail.data;

  return (
    <>
      <SectionTabHead
        actions={
          page ? (
            <>
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
            </>
          ) : undefined
        }
      >
        The programme band on the home page — its heading, tagline, objectives and certification line.
      </SectionTabHead>

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <>
          {!page.isPublished ? (
            <div className="mb14">
              <Callout tone="warn" title="This content is not published">
                The home page is showing the website&rsquo;s own built-in copy of this section. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}
          <SectionNote>
            Marathi is shown first, English underneath, as on the public site. An inactive objective is kept here but not shown on the home
            page.
          </SectionNote>
          <SectionTextCard page={page} />
          <ObjectivesCard page={page} />
          {/* One save updates the whole section, objectives included. */}
          <div className="fs13 t2 mt10">Last updated {fmtDateTime(page.updatedAt)}.</div>
        </>
      ) : null}
    </>
  );
}
