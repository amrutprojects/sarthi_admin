import { Badge, Callout, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { heroService } from '../services/heroService';
import type { Bilingual } from '../types/hero.types';
import { linkLabel } from '../validation/hero.validation';

/*
 * Home Hero Section — the read-only view of the rotating banner at the top of the home page and the
 * "Programme at a glance" card beside it.
 *
 * The landing screen for the menu because cms-hero.view and cms-hero.update are separate
 * permissions: a view-only administrator gets the whole picture without an editable form.
 */
export default function HeroView() {
  usePageTitle('Home Hero Section');
  const go = useGo();
  const detail = useApiData(() => heroService.get(), []);
  const { busy, run } = useAction();

  const hero = detail.data;

  /* Marathi first, as on the public site; English underneath so both are checkable at a glance. */
  const pair = (value: Bilingual) => (
    <div>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  );

  /* The page name an administrator recognises, with the stored path underneath. */
  const link = (path: string) => (
    <div>
      <div>{linkLabel(path)}</div>
      <div className="muted fs12">{path}</div>
    </div>
  );

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Home Hero Section' }]}
        title="Home Hero Section"
        sub="The banner at the top of the home page — the rotating slides with their buttons, and the &ldquo;Programme at a glance&rdquo; card beside them."
        actions={
          hero ? (
            <div className="f ac gp8 wrap">
              <Can action="updateHero">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => heroService.setPublished(!hero.isPublished),
                      hero.isPublished ? 'Section unpublished' : 'Section published',
                      () => detail.reload(),
                    )
                  }
                >
                  {hero.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateHero">
                <button type="button" className="btn primary" onClick={() => go('/cms/hero/edit')}>
                  <Icon name="doc" />
                  Edit content
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {hero ? (
        <>
          {!hero.isPublished ? (
            <div className="mb14">
              <Callout tone="warn" title="This content is not published">
                The home page is showing the website&rsquo;s own built-in copy of this section. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}

          <div className="card mb14">
            <div className="card-h">
              <h3>Buttons on every slide</h3>
              <MasterStatusBadge isActive={hero.isPublished} />
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Learn more button', pair(hero.readMoreLabel)],
                  ['Check status button', pair(hero.checkStatusLabel)],
                  ['Last updated', fmtDateTime(hero.updatedAt)],
                ]}
              />
            </div>
          </div>

          {hero.slides.map((s, i) => (
            <div className="card mb14" key={s.id}>
              <div className="card-h">
                <h3>Slide {i + 1}</h3>
                <Badge tone={s.isActive ? 'green' : 'grey'}>{s.isActive ? 'Visible' : 'Hidden'}</Badge>
              </div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Tag', pair(s.tag)],
                    ['Heading', pair(s.title)],
                    ['Description', pair(s.description)],
                    ['Button label', pair(s.ctaLabel)],
                    ['Button link', link(s.ctaLink)],
                  ]}
                />
              </div>
            </div>
          ))}

          <div className="card mb14">
            <div className="card-h">
              <h3>Programme at a glance</h3>
            </div>
            <div className="card-b">
              {hero.glance ? (
                <>
                  <Callout tone="info" title="Three of these four are worked out, not entered">
                    Total hours, modules and employment domains are summed from the modules on the Modules Page screen, so they can never
                    disagree with it. To change them, change the modules.
                  </Callout>

                  <div className="mt14">
                    <KvList
                      pairs={[
                        ['Total hours', `${hero.glance.totalHours} (summed from the modules)`],
                        ['Modules', hero.glance.modulesLabel],
                        ['Employment domains', String(hero.glance.domains)],
                        ['Districts', `${hero.glance.districtCount} (entered)`],
                      ]}
                    />
                  </div>

                  {hero.glance.hiddenModules > 0 ? (
                    <p className="muted fs12 mt10">
                      {hero.glance.hiddenModules} module{hero.glance.hiddenModules === 1 ? ' is' : 's are'} hidden, so{' '}
                      {hero.glance.hiddenModules === 1 ? 'it is' : 'they are'} left out of these figures and out of the website.
                    </p>
                  ) : null}
                </>
              ) : (
                <Callout tone="warn">The programme content has not been configured yet. Run the database seed to create it.</Callout>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
