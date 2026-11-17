import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import ContactSectionEdit from '../pages/ContactSectionEdit';
import { contactService } from '../services/contactService';
import { AMRUT, PARTNER, contactPage, resetToasts, toasts } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/contactService', () => ({ contactService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn() } }));

const svc = vi.mocked(contactService);

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

/* The three Edit pages share one component, which reads its section from the path. */
const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/contact/page/edit" element={<ContactSectionEdit />} />
        <Route path="/cms/contact/amrut/edit" element={<ContactSectionEdit />} />
        <Route path="/cms/contact/partner/edit" element={<ContactSectionEdit />} />
        <Route path="/cms/contact/helpline/edit" element={<ContactSectionEdit />} />
        <Route path="/cms/contact" element={<div>contact view</div>} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const location = () => screen.getByTestId('location');
const { id: _amrutId, ...amrutAsSent } = AMRUT;
const { id: _partnerId, ...partnerAsSent } = PARTNER;

async function saveAndConfirm() {
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));
}

describe('<ContactSectionEdit>', () => {
  beforeEach(() => {
    permissions.clear();
    permissions.add('updateContactPage');
    svc.get.mockReset().mockResolvedValue(contactPage());
    svc.update.mockReset().mockResolvedValue(contactPage());
    resetToasts();
  });

  it('shows only the AMRUT card on its Edit page and saves it with a PUT that leaves the rest of the page as loaded', async () => {
    renderAt('/cms/contact/amrut/edit');

    expect(await screen.findByRole('heading', { name: 'Edit AMRUT Contact Details' })).toBeInTheDocument();
    expect(await screen.findByLabelText(/^Organisation name \(Marathi\)/)).toHaveValue('अमृत');
    expect(screen.getByLabelText(/^Address \(English\)/)).toHaveValue('Pune office');
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('+91 97301 51450');
    expect(screen.getByLabelText(/^Show this card/)).toHaveValue('true');
    /* Nothing from the other sections: no banner, no partner card, no publish switch, no lists. */
    expect(screen.queryByLabelText(/^Page title/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Role/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Programme desk email/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^Status/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/coordinator/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/District offices/)).not.toBeInTheDocument();

    const email = screen.getByLabelText(/^Email/);
    await userEvent.clear(email);
    await userEvent.type(email, '  new@example.org ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    /* Saving asks first, and sends nothing until confirmed. */
    expect(screen.getByRole('dialog')).toHaveTextContent('Are you sure you want to save the changes to the AMRUT contact details?');
    expect(svc.update).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));

    await waitFor(() => expect(svc.update).toHaveBeenCalledTimes(1));
    expect(svc.update).toHaveBeenCalledWith({
      pageTitle: { mr: 'संपर्क', en: 'Contact us' },
      pageSubtitle: { mr: 'आमच्याशी बोला', en: 'Talk to us' },
      isPublished: true,
      organizations: [{ ...amrutAsSent, email: 'new@example.org' }, partnerAsSent],
    });
    /* The coordinators and district offices have their own endpoints: the PUT leaves them alone. */
    const sent = svc.update.mock.calls[0]![0];
    expect(sent).not.toHaveProperty('coordinators');
    expect(sent).not.toHaveProperty('districtOffices');
    /* So are the WhatsApp details, which only their own page sends. */
    expect(sent).not.toHaveProperty('whatsappNumber');
    expect(sent).not.toHaveProperty('whatsappMessage');

    await waitFor(() => expect(toasts()).toHaveTextContent('AMRUT contact details updated'));
    expect(location()).toHaveTextContent('/cms/contact?tab=amrut');
  });

  it('checks the page information before saving, and saves the banner and the publish state', async () => {
    renderAt('/cms/contact/page/edit');

    const titleEn = await screen.findByLabelText(/^Page title \(English\)/);
    expect(screen.queryByLabelText(/^Organisation name/)).not.toBeInTheDocument();
    await userEvent.clear(titleEn);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Page title (English) is required')).toBeInTheDocument();
    expect(titleEn).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(svc.update).not.toHaveBeenCalled();

    await userEvent.type(titleEn, 'Get in touch');
    expect(screen.queryByText('Page title (English) is required')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^Status/ }), 'false');
    expect(screen.getByText('The public Contact page will not show this content')).toBeInTheDocument();
    await saveAndConfirm();

    await waitFor(() =>
      expect(svc.update).toHaveBeenCalledWith({
        pageTitle: { mr: 'संपर्क', en: 'Get in touch' },
        pageSubtitle: { mr: 'आमच्याशी बोला', en: 'Talk to us' },
        isPublished: false,
        organizations: [amrutAsSent, partnerAsSent],
      }),
    );
    await waitFor(() => expect(toasts()).toHaveTextContent('Page information updated'));
    expect(location()).toHaveTextContent('/cms/contact?tab=page');
  });

  it("puts the server's field message on the partner input it names", async () => {
    svc.update.mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.organizations.1.email', message: 'Must be a valid email address' },
      ]),
    );
    renderAt('/cms/contact/partner/edit');

    expect(await screen.findByLabelText(/^Role \(English\)/)).toHaveValue('Programme delivery');
    expect(screen.queryByLabelText(/^Address/)).not.toBeInTheDocument();
    await saveAndConfirm();

    expect(await screen.findByText('Must be a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Programme desk email/)).toHaveAttribute('aria-invalid', 'true');
    /* Shown on the field, not as a toast; the form stays open with what was typed. */
    expect(toasts()).toBeEmptyDOMElement();
    expect(location()).toHaveTextContent('/cms/contact/partner/edit');
  });

  it('lets a card that is not configured yet be filled in, and sends it beside the other card', async () => {
    svc.get.mockResolvedValue(contactPage({ organizations: [AMRUT] }));
    renderAt('/cms/contact/partner/edit');

    await userEvent.type(await screen.findByLabelText(/^Organisation name \(Marathi\)/), 'भागीदार');
    await userEvent.type(screen.getByLabelText(/^Organisation name \(English\)/), 'Partner');
    await userEvent.type(screen.getByLabelText(/^Role \(Marathi\)/), 'भूमिका');
    await userEvent.type(screen.getByLabelText(/^Role \(English\)/), 'Role');
    await userEvent.type(screen.getByLabelText(/^Helpdesk hours \(Marathi\)/), 'सोम');
    await userEvent.type(screen.getByLabelText(/^Helpdesk hours \(English\)/), 'Mon');
    await userEvent.type(screen.getByLabelText(/^Programme desk email/), 'desk@example.org');
    await saveAndConfirm();

    await waitFor(() => expect(svc.update).toHaveBeenCalledTimes(1));
    expect(svc.update.mock.calls[0]![0].organizations).toEqual([
      amrutAsSent,
      {
        orgType: 'IMPLEMENTATION_PARTNER',
        name: { mr: 'भागीदार', en: 'Partner' },
        role: { mr: 'भूमिका', en: 'Role' },
        email: 'desk@example.org',
        helpdeskHours: { mr: 'सोम', en: 'Mon' },
        address: null,
        phone: null,
        websiteUrl: null,
        displayOrder: 1,
        isActive: true,
      },
    ]);
  });

  it('saves the WhatsApp number as digits and the message as one paragraph, leaving the rest of the page as loaded', async () => {
    renderAt('/cms/contact/helpline/edit');

    expect(await screen.findByRole('heading', { name: 'Edit Helpline & WhatsApp' })).toBeInTheDocument();
    const number = await screen.findByLabelText(/^WhatsApp number/);
    expect(number).toHaveValue('');
    expect(screen.getByText('Digits with country code, e.g. 919730151450. Leave blank to use the AMRUT phone number above.')).toBeInTheDocument();
    expect(screen.getByText('Typed into the chat for the visitor; leave both blank for the default message.')).toBeInTheDocument();
    /* Nothing from the other sections. */
    expect(screen.queryByLabelText(/^Page title/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Organisation name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Show this card/)).not.toBeInTheDocument();

    await userEvent.type(number, '+91 98765-43210');
    await userEvent.type(screen.getByLabelText(/^Pre-filled message \(Marathi\)/), 'नमस्कार,{Enter}माहिती हवी आहे.');
    await userEvent.type(screen.getByLabelText(/^Pre-filled message \(English\)/), '  Hello,   I would like to know more. ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Are you sure you want to save the changes to the Helpline & WhatsApp details? They appear on the public website straight away.',
    );
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));

    await waitFor(() =>
      expect(svc.update).toHaveBeenCalledWith({
        pageTitle: { mr: 'संपर्क', en: 'Contact us' },
        pageSubtitle: { mr: 'आमच्याशी बोला', en: 'Talk to us' },
        isPublished: true,
        organizations: [amrutAsSent, partnerAsSent],
        whatsappNumber: '919876543210',
        whatsappMessage: { mr: 'नमस्कार, माहिती हवी आहे.', en: 'Hello, I would like to know more.' },
      }),
    );
    await waitFor(() => expect(toasts()).toHaveTextContent('Helpline & WhatsApp updated'));
    expect(location()).toHaveTextContent('/cms/contact?tab=helpline');
  });

  it('saves blank WhatsApp details as "use the fallbacks"', async () => {
    svc.get.mockResolvedValue(contactPage({ whatsappNumber: '919876543210', whatsappMessage: { mr: 'नमस्कार', en: 'Hello' } }));
    renderAt('/cms/contact/helpline/edit');

    const number = await screen.findByLabelText(/^WhatsApp number/);
    expect(number).toHaveValue('919876543210');
    expect(screen.getByLabelText(/^Pre-filled message \(Marathi\)/)).toHaveValue('नमस्कार');
    await userEvent.clear(number);
    await userEvent.clear(screen.getByLabelText(/^Pre-filled message \(Marathi\)/));
    await userEvent.clear(screen.getByLabelText(/^Pre-filled message \(English\)/));
    await saveAndConfirm();

    await waitFor(() => expect(svc.update).toHaveBeenCalledTimes(1));
    expect(svc.update.mock.calls[0]![0]).toMatchObject({ whatsappNumber: '', whatsappMessage: { mr: '', en: '' } });
  });

  it('checks the WhatsApp number and that the message is in both languages or neither', async () => {
    renderAt('/cms/contact/helpline/edit');

    const number = await screen.findByLabelText(/^WhatsApp number/);
    await userEvent.type(number, '97301 5145');
    await userEvent.type(screen.getByLabelText(/^Pre-filled message \(English\)/), 'Hello');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('WhatsApp number must have 10 to 15 digits, including the country code')).toBeInTheDocument();
    expect(number).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Pre-filled message (Marathi) is required when English is given')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.clear(number);
    await userEvent.type(number, '91 97301 5145O');
    expect(screen.getByText('WhatsApp number may use digits only (spaces, + and - are ignored)')).toBeInTheDocument();
    expect(svc.update).not.toHaveBeenCalled();
  });

  it("puts the server's WhatsApp messages on the inputs they name", async () => {
    svc.update.mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.whatsappNumber', message: 'WhatsApp number must have 10 to 15 digits' },
        { field: 'body.whatsappMessage', message: 'Pre-filled message must be one paragraph' },
      ]),
    );
    renderAt('/cms/contact/helpline/edit');

    await userEvent.type(await screen.findByLabelText(/^WhatsApp number/), '919876543210');
    await saveAndConfirm();

    expect(await screen.findByText('WhatsApp number must have 10 to 15 digits')).toBeInTheDocument();
    expect(screen.getByLabelText(/^WhatsApp number/)).toHaveAttribute('aria-invalid', 'true');
    /* A message about the pair as a whole sits on its Marathi half. */
    expect(screen.getByText('Pre-filled message must be one paragraph')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Pre-filled message \(Marathi\)/)).toHaveAttribute('aria-invalid', 'true');
    expect(toasts()).toBeEmptyDOMElement();
    expect(location()).toHaveTextContent('/cms/contact/helpline/edit');
  });

  it('returns to its tab on Back and on Cancel', async () => {
    renderAt('/cms/contact/partner/edit');
    await screen.findByLabelText(/^Role \(English\)/);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(location()).toHaveTextContent('/cms/contact?tab=partner');
    expect(screen.getByText('contact view')).toBeInTheDocument();
  });

  it('asks before discarding unsaved changes on Back', async () => {
    renderAt('/cms/contact/amrut/edit');
    await userEvent.type(await screen.findByLabelText(/^Website/), 'https://amrut.example.org');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }));
    expect(location()).toHaveTextContent('/cms/contact?tab=amrut');
  });

  it('explains instead of showing a form to a view-only user', async () => {
    permissions.clear();
    renderAt('/cms/contact/page/edit');

    expect(screen.getByText(/You cannot change this page/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });
});
