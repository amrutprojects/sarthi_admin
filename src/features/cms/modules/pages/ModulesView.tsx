import { Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { modulesService } from '../services/modulesService';
import { MODULE_KIND_LABEL, type Bilingual } from '../types/modules.types';
import ModulesTabBar, { ModulesTabPanel } from './ModulesTabBar';
import { useModulesTab } from './modulesTabs';

/*
 * Modules Page Management — the read-only view of what the public page is showing.
 *
 * This is the landing screen for the menu because cms-modules.view and cms-modules.update are
 * separate permissions: a view-only administrator gets the whole picture without an editable form,
 * and the Edit button simply is not rendered for them.
 *
 * There is no Publish button: the website always shows this content, so what is here is what is live.
 *
 * The content is split into the same three tabs as the editor (Modules, Employment domains, Page
 * heading & learning path). The open tab is in the URL, and "Edit content" opens the editor on it.
 */
export default function ModulesView() {
  usePageTitle('Modules Page');
  const go = useGo();
  const [tab, setTab] = useModulesTab();
  const detail = useApiData(() => modulesService.get(), []);

  const page = detail.data;

  /*
   * Marathi first, as on the public site; English underneath so both are checkable at a glance.
   * A pair an older server does not send at all shows as a dash rather than breaking the page.
   */
  const pair = (value: Bilingual | null | undefined) =>
    value ? (
      <div>
        <div lang="mr">{value.mr}</div>
        <div className="muted fs12" lang="en">
          {value.en}
        </div>
      </div>
    ) : (
      <Dash />
    );

  /*
   * Every module that offers domains, plus every elective even when it offers none: an elective
   * with an empty list is worth seeing, because its card opens an empty table on the public site.
   */
  const domainModules = page ? page.modules.filter((m) => m.electives.length > 0 || m.kind === 'ELECTIVE') : [];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Modules Page' }]}
        title="Modules Page Management"
        sub="Each module's type, hours and employment domains, plus the page heading and the learning path."
        actions={
          page ? (
            <Can action="updateModulesPage">
              <button type="button" className="btn primary" onClick={() => go(`/cms/modules/edit?tab=${tab}`)}>
                <Icon name="doc" />
                Edit content
              </button>
            </Can>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <>
          <ModulesTabBar active={tab} onChange={setTab} />

          <ModulesTabPanel tab="modules" active={tab} focusable>
            <div className="card mb14">
              <div className="card-h">
                <h3>Modules</h3>
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
                        <th scope="col">Hours</th>
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
                          <td>
                            {MODULE_KIND_LABEL[m.kind]}
                            {/* Whether the website badges this elective's card; a Main module has no badge. */}
                            {m.kind === 'ELECTIVE' ? (
                              <div className="muted fs12">{m.showElectiveLabel === false ? 'Label hidden' : 'Label shown'}</div>
                            ) : null}
                          </td>
                          <td>
                            {m.timeSplit.moduleHours}h
                            <div className="muted fs12">
                              {m.timeSplit.trainingHours} + {m.timeSplit.assessmentHours}
                            </div>
                          </td>
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
          </ModulesTabPanel>

          <ModulesTabPanel tab="domains" active={tab} focusable>
            {/*
             * One card per module in `domainModules` (every module that offers domains, and every
             * elective), because each carries its own list. Showing them in a single table would
             * imply the modules offer the same domains, which is exactly the assumption this
             * stopped making.
             */}
            {domainModules.length === 0 ? (
              <div className="card mb14">
                <div className="card-b">
                  <p className="muted fs12">No module offers employment domains, and none is marked elective.</p>
                </div>
              </div>
            ) : null}
            {domainModules.map((m) => (
              <div className="card mb14" key={m.id}>
                <div className="card-h">
                  <h3>
                    Employment domains — <code>{m.code}</code>
                  </h3>
                  <span className="muted fs12">
                    {m.electives.length} domain{m.electives.length === 1 ? '' : 's'}
                  </span>
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
          </ModulesTabPanel>

          <ModulesTabPanel tab="heading" active={tab} focusable>
            <div className="card mb14">
              <div className="card-h">
                <h3>Page heading and learning path</h3>
              </div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Page title', pair(page.pageTitle)],
                    ['Page subtitle', pair(page.pageSubtitle)],
                    ['Learning path', `${page.learningPath.fixedPathPct}% fixed-path / ${page.learningPath.selfPathPct}% self-path`],
                    ['Session length', pair(page.learningPath.sessionLength)],
                    ['Session label', pair(page.learningPath.sessionLabel)],
                    ['Last updated', fmtDateTime(page.updatedAt)],
                  ]}
                />
              </div>
            </div>
          </ModulesTabPanel>
        </>
      ) : null}
    </div>
  );
}
