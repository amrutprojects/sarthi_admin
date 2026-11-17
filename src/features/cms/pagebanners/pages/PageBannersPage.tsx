import { useState } from 'react';
import { PageHead } from '../../../../components/ui';
import Icon from '../../../../components/ui/Icon';
import { useCan } from '../../../../modules/auth/components/Can';
import { SectionNote } from '../../components/SectionTabs';
import { LoadState, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { ABOUT_DEFAULT_SUBTITLE, pageBannerEntry } from '../constants';
import PageBannerModal from '../components/PageBannerModal';
import { pageBannersService } from '../services/pageBannersService';
import type { Bilingual, PageBanner } from '../types/pagebanners.types';

/* One half of a banner as the website shows it now: English, Marathi underneath, and whether it is the page's own or the default. */
function BannerText({ own, fallback, what }: { own: Bilingual | null; fallback: Bilingual | null; what: string }) {
  const value = own ?? fallback;
  return (
    <div style={{ minWidth: '12rem' }}>
      {value ? (
        <>
          <b>{value.en}</b>
          <div className="muted fs12" lang="mr">
            {value.mr}
          </div>
        </>
      ) : (
        <span className="muted">{ABOUT_DEFAULT_SUBTITLE}</span>
      )}
      <div className="fs11" style={{ color: own ? 'var(--info)' : 'var(--muted)', marginTop: 2 }}>
        {own ? `Custom ${what}` : `Default ${what}`}
      </div>
    </div>
  );
}

/*
 * Page Banners — the title and subtitle in the banner at the top of five pages of the public website (About AMRUT,
 * FAQs, the AMRUT Kalash programme, Check Application Status and Verify Certificate), one row per page. Each half is
 * the page's own text when one was set, else the website's default. With cms-pagebanners.update each row has an Edit
 * button that opens PageBannerModal; without it the screen is read-only.
 *
 * The other pages' banners are managed with their own pages (Modules, Eligibility, Apply, Contact) or are part of
 * their content, so they are not listed here.
 */
export default function PageBannersPage() {
  usePageTitle('Page Banners');
  const can = useCan();
  const canUpdate = can('updatePageBanners');
  const [editing, setEditing] = useState<PageBanner | null>(null);
  const list = useApiData(() => pageBannersService.list(), []);
  const items = list.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Page Banners' }]}
        title="Page Banners"
        sub="The title and subtitle in the banner at the top of five pages of the public website."
      />

      <LoadState loading={list.loading && !items} error={list.error} onRetry={() => void list.reload()} />

      {items ? (
        <div className="cms-sections">
          <SectionNote>
            English is shown first, Marathi underneath. A page without a title or subtitle of its own shows the website&rsquo;s default.
          </SectionNote>
          <div className="card">
            <div className="card-h">
              <h3>Pages</h3>
              <span className="tag">
                {items.filter((i) => i.title || i.subtitle).length} of {items.length} customised
              </span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '64px' }}>
                      #
                    </th>
                    <th scope="col">Page</th>
                    <th scope="col">Title</th>
                    <th scope="col">Subtitle</th>
                    {canUpdate ? (
                      <th scope="col" style={{ width: '110px' }}>
                        Action
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const entry = pageBannerEntry(item.key);
                    return (
                      <tr className="norow" key={item.key}>
                        <td>
                          <span className="muted fs12">{i + 1}</span>
                        </td>
                        <td>
                          <b>{entry.page}</b>
                          {entry.path ? <div className="mono fs12 muted">{entry.path}</div> : null}
                        </td>
                        {/* Panel cells never wrap (styles.css); a banner's text may. */}
                        <td style={{ whiteSpace: 'normal' }}>
                          <BannerText own={item.title} fallback={entry.title} what="title" />
                        </td>
                        <td style={{ whiteSpace: 'normal' }}>
                          <BannerText own={item.subtitle} fallback={entry.subtitle} what="subtitle" />
                        </td>
                        {canUpdate ? (
                          <td>
                            <button
                              type="button"
                              className="btn xs"
                              aria-label={`Edit banner of ${entry.page}`}
                              title="Edit the banner title and subtitle"
                              onClick={() => setEditing(item)}
                            >
                              <Icon name="edit" /> Edit
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <PageBannerModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await list.reload();
          }}
        />
      ) : null}
    </div>
  );
}
