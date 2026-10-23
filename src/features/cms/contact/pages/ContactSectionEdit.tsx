import { useLocation, useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import { CONTACT_SECTIONS, contactListPath, type ContactSection } from '../types/contact.types';
import ContactSectionForm from './ContactSectionForm';

/* The wording of each section's Edit page. */
const SECTION_COPY: Record<ContactSection, { title: string; crumb: string; sub: string; saved: string; confirmName: string }> = {
  page: {
    title: 'Edit Page Information',
    crumb: 'Edit page information',
    sub: 'The banner at the top of the public Contact page, in Marathi and English, and whether the page is published.',
    saved: 'Page information updated',
    confirmName: 'the page information',
  },
  amrut: {
    title: 'Edit AMRUT Contact Details',
    crumb: 'Edit AMRUT contact details',
    sub: 'The first card on the public Contact page. Every text field is stored in Marathi and English — the public site defaults to Marathi.',
    saved: 'AMRUT contact details updated',
    confirmName: 'the AMRUT contact details',
  },
  partner: {
    title: 'Edit Implementation Partner',
    crumb: 'Edit implementation partner',
    sub: 'The second card on the public Contact page. Every text field is stored in Marathi and English — the public site defaults to Marathi.',
    saved: 'Implementation partner updated',
    confirmName: 'the implementation partner card',
  },
};

/* Which section this page edits, from its path: /cms/contact/<section>/edit. */
const sectionOf = (pathname: string): ContactSection => CONTACT_SECTIONS.find((s) => pathname.startsWith(`/cms/contact/${s}/`)) ?? 'page';

/*
 * Edit one section of the Contact page — page information, the AMRUT card or the implementation
 * partner — on a dedicated page, never a modal. Opened from the Edit button on the section's tab; Back,
 * Cancel and Save return to that tab.
 */
export default function ContactSectionEdit() {
  const { pathname } = useLocation();
  const section = sectionOf(pathname);
  const copy = SECTION_COPY[section];
  usePageTitle(copy.title);
  const navigate = useNavigate();
  const can = useCan();
  const detail = useApiData(() => contactService.get(), []);

  const page = detail.data;
  /*
   * The route is open to anyone who can see the menu, so a view-only administrator who follows a link
   * here gets an explanation instead of a form whose Save the server would refuse with a 403.
   */
  const canEdit = can('updateContactPage');
  const listPath = contactListPath(section);

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Contact Page', link: listPath },
          { l: copy.crumb },
        ]}
        title={copy.title}
        sub={copy.sub}
        back={<BackButton to={listPath} />}
      />

      {canEdit ? (
        <>
          <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

          {page ? (
            <ContactSectionForm
              page={page}
              section={section}
              backTo={listPath}
              confirmName={copy.confirmName}
              onSave={async (payload) => {
                await contactService.update(payload);
                toastOk(copy.saved);
                navigate(listPath);
              }}
            />
          ) : null}
        </>
      ) : (
        <Callout tone="warn" title="You cannot change this page. ">
          Your role can view the Contact page but not edit it. Ask an administrator for the Update permission on Contact Page Management.
        </Callout>
      )}
    </div>
  );
}
