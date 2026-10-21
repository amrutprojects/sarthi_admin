import { Callout, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import { LoadState, fmtDateTime, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { homeService } from '../services/homeService';

/*
 * Home Page Figures — the read-only view of the "Programme at a glance" card.
 *
 * This is the landing screen for the menu because cms-home.view and cms-home.update are separate
 * permissions: a view-only administrator gets the whole picture without an editable form, and the
 * Edit button simply is not rendered for them.
 */
export default function HomeGlanceView() {
  usePageTitle('Home Page Figures');
  const go = useGo();
  const detail = useApiData(() => homeService.get(), []);

  const glance = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Home Page Figures' }]}
        title="Home Page Figures"
        sub="The four numbers on the home page's &ldquo;Programme at a glance&rdquo; card."
        actions={
          glance ? (
            <Can action="updateHomeGlance">
              <button type="button" className="btn primary" onClick={() => go('/cms/home/edit')}>
                <Icon name="doc" />
                Edit
              </button>
            </Can>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {glance ? (
        <>
          <Callout tone="info" title="Three of these four are worked out, not entered">
            Total hours, modules and employment domains are summed from the modules on the Modules
            Page screen, so they can never disagree with it. To change them, change the modules.
          </Callout>

          <div className="card mt14">
            <div className="card-h">
              <h3>Programme at a glance</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Total hours', `${glance.totalHours} (summed from the modules)`],
                  ['Modules', glance.modulesLabel],
                  ['Employment domains', String(glance.domains)],
                  ['Districts', `${glance.districtCount} (entered)`],
                  ['Last updated', fmtDateTime(glance.updatedAt)],
                ]}
              />

              {glance.hiddenModules > 0 ? (
                <p className="muted fs12 mt10">
                  {glance.hiddenModules} module{glance.hiddenModules === 1 ? ' is' : 's are'}{' '}
                  hidden, so {glance.hiddenModules === 1 ? 'it is' : 'they are'} left out of these
                  figures and out of the website.
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
