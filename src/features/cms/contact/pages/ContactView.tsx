import type { ReactNode } from 'react';
import { Callout, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import FieldTable, { Bi, FieldValue } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote, SectionTabBar, SectionTabPanel } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { useSectionTab } from '../../useSectionTab';
import { contactService } from '../services/contactService';
import { CARD_FIELDS, CONTACT_TABS, type ApiContactOrganization, type ApiContactPage, type OrgType } from '../types/contact.types';
import CoordinatorList from './CoordinatorList';
import DistrictOfficeList from './DistrictOfficeList';

/* The wording of the two card tabs, and the page each one's Edit button opens. */
const CARD_COPY: Record<OrgType, { title: string; sub: string; note: string; edit: string }> = {
  AMRUT: {
    title: 'AMRUT contact details',
    sub: 'the first card on the public Contact page',
    note: 'Marathi is shown first, English underneath. Email, phone and website are the same in both languages, so they show once.',
    edit: '/cms/contact/amrut/edit',
  },
  IMPLEMENTATION_PARTNER: {
    title: 'Implementation partner',
    sub: 'the second card on the public Contact page',
    note: 'Marathi is shown first, English underneath. The programme desk email is the same in both languages, so it shows once.',
    edit: '/cms/contact/partner/edit',
  },
};

/* The Edit button in a section's card header; it opens that section's own Edit page. */
function EditButton({ to }: { to: string }) {
  const go = useGo();
  return (
    <Can action="updateContactPage">
      <button type="button" className="btn sm" onClick={() => go(to)}>
        <Icon name="edit" />
        Edit
      </button>
    </Can>
  );
}

/* Page Information tab: the banner at the top of the public page, in both languages. */
function PageInfoTab({ page }: { page: ApiContactPage }) {
  return (
    <>
      <SectionNote>Marathi is shown first, English underneath. Publishing applies to the whole page: the cards, coordinators and district offices included.</SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            Page information <span className="sub">the banner at the top of the public Contact page</span>
          </h3>
          <div className="f ac gp8">
            <MasterStatusBadge isActive={page.isPublished} />
            <EditButton to="/cms/contact/page/edit" />
          </div>
        </div>
        <FieldTable
          rows={[
            ['Page title', <Bi value={page.pageTitle} />],
            ['Page subtitle', <Bi value={page.pageSubtitle} />],
          ]}
        />
      </div>
    </>
  );
}

/* AMRUT Contact Details / Implementation Partner tab: one card, with only the rows that apply to its type. */
function CardTab({ type, org }: { type: OrgType; org?: ApiContactOrganization }) {
  const copy = CARD_COPY[type];
  return (
    <>
      <SectionNote>{copy.note}</SectionNote>
      {org && !org.isActive ? (
        <div className="mb14">
          <Callout tone="warn">Hidden: this card is not sent to the website.</Callout>
        </div>
      ) : null}
      <div className="card">
        <div className="card-h">
          <h3>
            {copy.title} <span className="sub">{copy.sub}</span>
          </h3>
          <div className="f ac gp8">
            {org ? <MasterStatusBadge isActive={org.isActive} /> : null}
            <EditButton to={copy.edit} />
          </div>
        </div>
        {org ? (
          <FieldTable rows={CARD_FIELDS[org.orgType].map((f): [string, ReactNode] => [f.label, <FieldValue value={org[f.key]} />])} />
        ) : (
          <div className="card-b">
            <div className="hint">This card is not configured.</div>
          </div>
        )}
      </div>
    </>
  );
}

/*
 * Contact Page Management — the read-only view of what the public page is showing.
 *
 * This is the landing screen for the menu because cms-contact.view and cms-contact.update are
 * separate permissions: a view-only administrator gets the whole picture without an editable form,
 * and the Edit and Add buttons simply are not rendered for them. The page is shown one section per
 * tab, with the same tab strip as Modules Page Management, and the tab kept in the URL (?tab=). Page
 * information and the two cards each have an Edit page of their own; the coordinators and district
 * offices are listings whose rows are viewed, added, edited and deleted one at a time, as on FAQ
 * Management.
 */
export default function ContactView() {
  usePageTitle('Contact Page');
  const detail = useApiData(() => contactService.get(), []);
  const { busy, run } = useAction();

  const page = detail.data;
  const card = (type: OrgType) => page?.organizations.find((o) => o.orgType === type);

  const [tab, selectTab] = useSectionTab(CONTACT_TABS);

  const amrut = card('AMRUT');
  const partner = card('IMPLEMENTATION_PARTNER');

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Contact Page' }]}
        title="Contact Page Management"
        sub="The banner, contact cards, district coordinators and district offices shown on the public Contact page."
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
                  <Icon name="globe" />
                  {page.isPublished ? 'Unpublish' : 'Publish'}
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
                The public Contact page is showing the website&rsquo;s own built-in copy. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}

          <SectionTabBar tabs={CONTACT_TABS} active={tab} onChange={selectTab} idPrefix="contact" label="Contact page sections" />

          <SectionTabPanel tab="page" active={tab} idPrefix="contact">
            <PageInfoTab page={page} />
          </SectionTabPanel>
          <SectionTabPanel tab="amrut" active={tab} idPrefix="contact">
            <CardTab type="AMRUT" org={amrut} />
          </SectionTabPanel>
          <SectionTabPanel tab="partner" active={tab} idPrefix="contact">
            <CardTab type="IMPLEMENTATION_PARTNER" org={partner} />
          </SectionTabPanel>
          <SectionTabPanel tab="coordinators" active={tab} idPrefix="contact">
            <CoordinatorList />
          </SectionTabPanel>
          <SectionTabPanel tab="offices" active={tab} idPrefix="contact">
            <DistrictOfficeList />
          </SectionTabPanel>
          {/* The banner and both cards are saved together, so their tabs share one time; each listed row shows its own. */}
          {tab === 'page' || tab === 'amrut' || tab === 'partner' ? (
            <div className="fs13 t2 mt10">Last updated {fmtDateTime(page.updatedAt)}.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
