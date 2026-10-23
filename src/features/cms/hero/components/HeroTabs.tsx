import type { ReactNode } from 'react';
import { Badge, Callout, KvList, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote, SectionTabHead } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { heroEditPath, type HeroTab } from '../constants';
import { heroService } from '../services/heroService';
import type { ApiHomeHero, Bilingual } from '../types/hero.types';
import { linkLabel } from '../validation/hero.validation';

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

/*
 * One of Home Hero Section's two tabs of Home Page Management — the read-only view of the rotating banner at the
 * top of the home page, or of the "Programme at a glance" card beside it. Both read the same record, which is
 * saved and published as one: each tab has the Publish and Edit buttons, and the Edit page returns to the tab it
 * was opened from. A view-only administrator (cms-hero.view without cms-hero.update) gets the whole picture
 * without either button.
 */
function HeroTabBody({ tab, sub, children }: { tab: HeroTab; sub: ReactNode; children: (hero: ApiHomeHero) => ReactNode }) {
  const go = useGo();
  const detail = useApiData(() => heroService.get(), []);
  const { busy, run } = useAction();

  const hero = detail.data;

  return (
    <>
      <SectionTabHead
        actions={
          hero ? (
            <>
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
                  <Icon name="globe" />
                  {hero.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateHero">
                <button type="button" className="btn primary" onClick={() => go(heroEditPath(tab))}>
                  <Icon name="edit" />
                  Edit content
                </button>
              </Can>
            </>
          ) : undefined
        }
      >
        {sub}
      </SectionTabHead>

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
          {children(hero)}
          {/* One save updates the slides and the glance card together, so both tabs show the same time. */}
          <div className="fs13 t2 mt10">Last updated {fmtDateTime(hero.updatedAt)}.</div>
        </>
      ) : null}
    </>
  );
}

/* AMRUT Kalash – apply online: the rotating slides, each with its own button, and the two buttons under every slide. */
export function HeroSlidesTab() {
  return (
    <HeroTabBody
      tab="hero"
      sub="The rotating banner at the top of the home page: each slide's tag, heading, description and button, and the two buttons under every slide."
    >
      {(hero) => (
        <>
          <SectionNote>
            Marathi is shown first, English underneath. Publishing applies to the whole banner, the &ldquo;Programme at a glance&rdquo; card
            included.
          </SectionNote>

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
        </>
      )}
    </HeroTabBody>
  );
}

/* Programme at a glance: the four figures in the card beside the banner, three of them summed from the modules. */
export function HeroGlanceTab() {
  return (
    <HeroTabBody
      tab="glance"
      sub="The &ldquo;Programme at a glance&rdquo; card beside the banner on the home page: total hours, modules, employment domains and districts."
    >
      {(hero) => (
        <div className="card mb14">
          <div className="card-h">
            <h3>Programme at a glance</h3>
            <MasterStatusBadge isActive={hero.isPublished} />
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
      )}
    </HeroTabBody>
  );
}
