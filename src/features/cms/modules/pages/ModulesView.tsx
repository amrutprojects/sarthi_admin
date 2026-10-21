import { Callout, Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { modulesService } from '../services/modulesService';
import type { Bilingual } from '../types/modules.types';

/*
 * Modules Page Management — the read-only view of what the public page is showing.
 *
 * This is the landing screen for the menu because cms-modules.view and cms-modules.update are
 * separate permissions: a view-only administrator gets the whole picture without an editable form,
 * and the Edit button simply is not rendered for them.
 */
export default function ModulesView() {
  usePageTitle('Modules Page');
  const go = useGo();
  const detail = useApiData(() => modulesService.get(), []);
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

  const t = page?.timeSplit;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Modules Page' }]}
        title="Modules Page Management"
        sub="The module cards, each elective module's own employment domains, and the hours shown on the public Modules page."
        actions={
          page ? (
            <div className="f ac gp8 wrap">
              <Can action="updateModulesPage">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => modulesService.setPublished(!page.isPublished),
                      page.isPublished ? 'Modules page unpublished' : 'Modules page published',
                      () => detail.reload(),
                    )
                  }
                >
                  {page.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateModulesPage">
                <button type="button" className="btn primary" onClick={() => go('/cms/modules/edit')}>
                  <Icon name="doc" />
                  Edit content
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page && t ? (
        <>
          {!page.isPublished ? (
            <div className="mb14">
              <Callout tone="warn" title="This content is not published">
                The public Modules page is showing the website&rsquo;s own built-in copy. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}

          <div className="card mb14">
            <div className="card-h">
              <h3>Modules</h3>
              <MasterStatusBadge isActive={page.isPublished} />
            </div>
            <div className="card-b">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Code</th>
                      <th scope="col">Certificate name</th>
                      <th scope="col">Type</th>
                      <th scope="col">Domains</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.modules.map((m) => (
                      <tr key={m.id}>
                        <td>{m.no}</td>
                        <td>
                          <code>{m.code}</code>
                        </td>
                        <td>{pair(m.name)}</td>
                        <td>{m.elective ? 'Elective' : 'Core'}</td>
                        <td>{m.electives.length > 0 ? m.electives.length : <Dash />}</td>
                        <td>
                          <MasterStatusBadge isActive={m.isActive} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/*
           * One card per module that offers domains, because each carries its own list. Showing
           * them in a single table would imply the modules offer the same domains, which is
           * exactly the assumption this stopped making.
           */}
          {page.modules
            .filter((m) => m.electives.length > 0)
            .map((m) => (
              <div className="card mb14" key={m.id}>
                <div className="card-h">
                  <h3>
                    Employment domains — <code>{m.code}</code>
                  </h3>
                  <span className="muted fs12">{m.electives.length} domains</span>
                </div>
                <div className="card-b">
                  {m.electives.length === 0 ? (
                    <p className="muted fs12">
                      This module is marked elective but offers no domains, so its card opens an empty table on the public site.
                    </p>
                  ) : (
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Domain</th>
                            <th scope="col">Certificate awarded</th>
                            <th scope="col">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {m.electives.map((d) => (
                            <tr key={d.id}>
                              <td>{d.no}</td>
                              <td>{pair(d.domain)}</td>
                              <td>{d.certificate}</td>
                              <td>
                                <MasterStatusBadge isActive={d.isActive} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}

          <div className="card mb14">
            <div className="card-h">
              <h3>Hours and learning path</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Total per module', `${t.moduleHours} hours`],
                  [
                    'Training',
                    `${t.trainingHours} hours — ${t.weeksPerModule} weeks, ${t.daysPerWeek} days/week, ${t.hoursPerDay} hrs/day`,
                  ],
                  ['Assessment', `${t.assessmentHours} hours — ${t.weeklyAssessmentHours} hrs/week`],
                  ['Learning path', `${page.learningPath.fixedPathPct}% fixed-path / ${page.learningPath.selfPathPct}% self-path`],
                  ['Session length', pair(page.learningPath.sessionLength)],
                  ['Last updated', fmtDateTime(page.updatedAt)],
                ]}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
