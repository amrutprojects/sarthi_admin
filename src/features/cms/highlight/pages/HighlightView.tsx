import { Callout, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { highlightService } from '../services/highlightService';
import type { Bilingual } from '../types/highlight.types';

/*
 * Home Programme Section — the read-only view of what the band on the home page is showing.
 *
 * The landing screen for the menu because cms-highlight.view and cms-highlight.update are separate
 * permissions: a view-only administrator gets the whole picture without an editable form.
 */
export default function HighlightView() {
  usePageTitle('Home Programme Section');
  const go = useGo();
  const detail = useApiData(() => highlightService.get(), []);
  const { busy, run } = useAction();

  const page = detail.data;

  /* Marathi first, as on the public site; English underneath so both are checkable at a glance. */
  const pair = (value: Bilingual) => (
    <div>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  );

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
                  {page.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateHighlight">
                <button type="button" className="btn primary" onClick={() => go('/cms/highlight/edit')}>
                  <Icon name="doc" />
                  Edit content
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

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

          <div className="card mb14">
            <div className="card-h">
              <h3>Section text</h3>
              <MasterStatusBadge isActive={page.isPublished} />
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Heading', pair(page.heading)],
                  ['Subheading', pair(page.subheading)],
                  ['Tagline', pair(page.tagline)],
                  ['Certification', pair(page.certification)],
                  ['Last updated', fmtDateTime(page.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Objectives</h3>
              <span className="muted fs12">{page.objectives.length} listed</span>
            </div>
            <div className="card-b">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Objective</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.objectives.map((o, i) => (
                      <tr key={o.id}>
                        <td>{i + 1}</td>
                        <td>{pair(o.text)}</td>
                        <td>
                          <MasterStatusBadge isActive={o.isActive} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
