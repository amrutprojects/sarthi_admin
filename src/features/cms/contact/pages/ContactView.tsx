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
import {
  CARD_FIELDS, CONTACT_TABS, type ApiContactOrganization, type ApiContactPage, type ApiCoordinator, type ApiDistrictOffice, type OrgType,
} from '../types/contact.types';

/* The wording of the two card tabs. */
const CARD_COPY: Record<OrgType, { title: string; sub: string; note: string }> = {
  AMRUT: {
    title: 'AMRUT contact details',
    sub: 'the first card on the public Contact page',
    note: 'Marathi is shown first, English underneath. Email, phone and website are the same in both languages, so they show once.',
  },
  IMPLEMENTATION_PARTNER: {
    title: 'Implementation partner',
    sub: 'the second card on the public Contact page',
    note: 'Marathi is shown first, English underneath. The programme desk email is the same in both languages, so it shows once.',
  },
};

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
          <MasterStatusBadge isActive={page.isPublished} />
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
          {org ? <MasterStatusBadge isActive={org.isActive} /> : null}
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

/* District / cluster coordinators tab: one row per card, in the order the website shows them. */
function CoordinatorsTab({ coordinators }: { coordinators: ApiCoordinator[] }) {
  return (
    <>
      <SectionNote>The coordinator cards on the public Contact page. Each district links to its own District Office page.</SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            District / cluster coordinators <span className="sub">{coordinators.length} on the page</span>
          </h3>
        </div>
        {coordinators.length === 0 ? (
          <div className="card-b">
            <div className="hint">None added. The website shows its built-in coordinator list.</div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '76px' }}>Sr. No.</th>
                  <th scope="col">Name</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th scope="col">Districts covered</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {coordinators.map((c, i) => (
                  <tr className="norow" key={c.id}>
                    <td><span className="t2">{i + 1}</span></td>
                    <td><b>{c.name}</b></td>
                    <td>{c.phone}</td>
                    <td><FieldValue value={c.email} /></td>
                    <td style={{ whiteSpace: 'normal' }}>
                      <FieldValue value={c.districts.map((d) => d.name).join(', ')} />
                    </td>
                    <td><MasterStatusBadge isActive={c.isActive} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* District offices tab: the Collectorate details shown on each district's page. */
function OfficesTab({ offices }: { offices: ApiDistrictOffice[] }) {
  return (
    <>
      <SectionNote>
        Shown on each district&rsquo;s page. A blank field reads &ldquo;to be supplied from official records&rdquo; on the website.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            District offices <span className="sub">{offices.length} districts</span>
          </h3>
        </div>
        {offices.length === 0 ? (
          <div className="card-b">
            <div className="hint">None added. Each district page shows &ldquo;to be supplied from official records&rdquo;.</div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '76px' }}>Sr. No.</th>
                  <th scope="col">District</th>
                  <th scope="col">District Collector</th>
                  <th scope="col">Address</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th scope="col">Office hours</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {offices.map((o, i) => (
                  <tr className="norow" key={o.id}>
                    <td><span className="t2">{i + 1}</span></td>
                    <td><b>{o.district.name}</b></td>
                    <td><FieldValue value={o.collectorName} /></td>
                    <td style={{ whiteSpace: 'normal' }}><FieldValue value={o.address} /></td>
                    <td><FieldValue value={o.phone} /></td>
                    <td><FieldValue value={o.email} /></td>
                    <td style={{ whiteSpace: 'normal' }}><FieldValue value={o.officeHours} /></td>
                    <td><MasterStatusBadge isActive={o.isActive} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/*
 * Contact Page Settings — the read-only view of what the public page is showing.
 *
 * This is the landing screen for the menu because cms-contact.view and cms-contact.update are
 * separate permissions: a view-only administrator gets the whole picture without an editable form,
 * and the Edit button simply is not rendered for them. The page is shown one section per tab, with the
 * same tab strip as Modules Page Management, and the tab kept in the URL (?tab=).
 */
export default function ContactView() {
  usePageTitle('Contact Page');
  const go = useGo();
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
              <Can action="updateContactPage">
                <button type="button" className="btn primary" onClick={() => go('/cms/contact/edit')}>
                  <Icon name="edit" />
                  Edit content
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
            <CoordinatorsTab coordinators={page.coordinators} />
          </SectionTabPanel>
          <SectionTabPanel tab="offices" active={tab} idPrefix="contact">
            <OfficesTab offices={page.districtOffices} />
          </SectionTabPanel>
          {/* One save updates the whole page, so the time is shown on every tab. */}
          <div className="fs13 t2 mt10">Last updated {fmtDateTime(page.updatedAt)}.</div>
        </div>
      ) : null}
    </div>
  );
}
