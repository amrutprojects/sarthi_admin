import { Callout, Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import type { ApiContactOrganization, Bilingual, OrgType } from '../types/contact.types';

/*
 * Contact Page Settings — the read-only view of what the public page is showing.
 *
 * This is the landing screen for the menu because cms-contact.view and cms-contact.update are
 * separate permissions: a view-only administrator gets the whole picture without an editable form,
 * and the Edit button simply is not rendered for them.
 */
export default function ContactView() {
  usePageTitle('Contact Page');
  const go = useGo();
  const detail = useApiData(() => contactService.get(), []);
  const { busy, run } = useAction();

  const page = detail.data;
  const card = (type: OrgType) => page?.organizations.find((o) => o.orgType === type);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Contact Page' }]}
        title="Contact Page Management"
        sub="The banner and the two cards shown on the public Contact page."
        actions={
          page ? (
            <div className="f ac gp8 wrap">
              <Can action="updateContactPage">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => contactService.setPublished(!page.isPublished),
                      page.isPublished ? 'Contact page unpublished' : 'Contact page published',
                      () => detail.reload(),
                    )
                  }
                >
                  {page.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateContactPage">
                <button type="button" className="btn primary" onClick={() => go('/cms/contact/edit')}>
                  <Icon name="doc" />Edit content
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
                The public Contact page is showing the website&rsquo;s own built-in copy. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}

          <div className="card mb14">
            <div className="card-h">
              <h3>Page information</h3>
              <MasterStatusBadge isActive={page.isPublished} />
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Page title (Marathi)', <span lang="mr">{page.pageTitle.mr}</span>],
                  ['Page title (English)', page.pageTitle.en],
                  ['Page subtitle (Marathi)', <span lang="mr">{page.pageSubtitle.mr}</span>],
                  ['Page subtitle (English)', page.pageSubtitle.en],
                  ['Last updated', fmtDateTime(page.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="grid g2">
            <OrganizationCard title="AMRUT contact details" org={card('AMRUT')} />
            <OrganizationCard title="Implementation partner" org={card('IMPLEMENTATION_PARTNER')} />
          </div>
        </>
      ) : null}
    </div>
  );
}

const bi = (value: Bilingual | null) =>
  value ? (
    <span>
      <span lang="mr">{value.mr}</span>
      <span className="muted"> · </span>
      {value.en}
    </span>
  ) : (
    <Dash />
  );

/* One card, rendered with only the rows that apply to its type. */
function OrganizationCard({ title, org }: { title: string; org?: ApiContactOrganization }) {
  if (!org) {
    return (
      <div className="card">
        <div className="card-h"><h3>{title}</h3></div>
        <div className="card-b"><div className="hint">This card is not configured.</div></div>
      </div>
    );
  }

  const rows: [string, React.ReactNode][] = [['Organisation name', bi(org.name)]];
  if (org.orgType === 'AMRUT') {
    rows.push(['Address', bi(org.address)]);
    rows.push(['Email', org.email ?? <Dash />]);
    rows.push(['Phone', org.phone ?? <Dash />]);
    rows.push(['Website', org.websiteUrl ?? <Dash />]);
  } else {
    rows.push(['Role', bi(org.role)]);
    rows.push(['Programme desk', org.email ?? <Dash />]);
    rows.push(['Helpdesk hours', bi(org.helpdeskHours)]);
  }

  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
        <MasterStatusBadge isActive={org.isActive} />
      </div>
      <div className="card-b">
        <KvList pairs={rows} />
        {!org.isActive ? <div className="hint mt10">Hidden: this card is not sent to the website.</div> : null}
      </div>
    </div>
  );
}
