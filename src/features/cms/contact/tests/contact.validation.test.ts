import { describe, expect, it } from 'vitest';
import {
  emptyCoordinatorForm,
  emptyOfficeForm,
  normalizeCoordinatorForm,
  normalizeOfficeForm,
  toFormValues,
  toOfficeFormValues,
  toSectionPayload,
  validateContactSection,
  validateCoordinatorForm,
  validateCoordinatorPhone,
  validateOfficeForm,
  validatePhone,
  validateWhatsappNumber,
  whatsappDigits,
} from '../validation/contact.validation';
import { AMRUT, OFFICES, PARTNER, contactPage, district } from './fixtures';

/*
 * Phone rules, mirroring backend contact.validator.ts: a coordinator's phone may keep digits masked
 * with X ("+91 98XXX 41201", as the public site has always shown them); every other phone may not.
 */
describe('validateCoordinatorPhone', () => {
  it('accepts the masked numbers the website shows, and plain numbers', () => {
    for (const phone of ['+91 98XXX 41201', '+91 98xxx 41205', '  +91 98XXX 41201  ', '+91 98000 41201', '(020) 2567-8901']) {
      expect({ phone, error: validateCoordinatorPhone(phone, 'Phone') }).toEqual({ phone, error: undefined });
    }
  });

  it('rejects letters other than X', () => {
    for (const phone of ['+91 98ABC 41201', '+91 98YYY 41201', '+91 98XXX 4120O', 'call 98XXX 41201']) {
      expect(validateCoordinatorPhone(phone, 'Phone')).toMatch(/may use digits \(or X for a masked digit\)/);
    }
  });

  it('counts X as a digit for the 6–20 digit rule', () => {
    expect(validateCoordinatorPhone('98XXX', 'Phone')).toBe('Phone must contain between 6 and 20 digits');
    expect(validateCoordinatorPhone('98XXXX', 'Phone')).toBeUndefined();
    expect(validateCoordinatorPhone(`+91 ${'X'.repeat(18)}`, 'Phone')).toBeUndefined();
    expect(validateCoordinatorPhone(`+91 ${'X'.repeat(19)}`, 'Phone')).toBe('Phone must contain between 6 and 20 digits');
  });

  it('requires a value and caps the length at 32 characters', () => {
    expect(validateCoordinatorPhone('   ', 'Phone')).toBe('Phone is required');
    expect(validateCoordinatorPhone(`+91 ${'9'.repeat(5)} ${' '.repeat(24)}1`, 'Phone')).toBe('Phone must be at most 32 characters');
  });
});

describe('organisation and district office phones', () => {
  it('validatePhone still rejects a masked X', () => {
    expect(validatePhone('+91 97XXX 51450', 'Phone')).toMatch(/may use digits, spaces, brackets and hyphens/);
    expect(validatePhone('+91 97301 51450', 'Phone')).toBeUndefined();
  });

  it('the coordinator form allows X in its phone but the district office form does not', () => {
    const coordinator = { ...emptyCoordinatorForm(), name: 'Rajesh Kulkarni', phone: '+91 98XXX 41201' };
    const office = { ...emptyOfficeForm(), districtId: 'd1', phone: '+91 20XXX 12345' };

    expect(validateCoordinatorForm(coordinator).phone).toBeUndefined();
    expect(validateOfficeForm(office).phone).toMatch(/Official contact number may use digits, spaces, brackets and hyphens/);
  });
});

describe('coordinator form', () => {
  it('requires a name and phone; email, districts and (on create) the order are optional', () => {
    expect(validateCoordinatorForm(emptyCoordinatorForm())).toEqual({
      name: 'Coordinator name is required',
      phone: 'Phone is required',
      email: undefined,
      displayOrder: undefined,
    });
    const editing = validateCoordinatorForm({ ...emptyCoordinatorForm(), name: 'A', phone: '020 2612 3456', email: 'nope' }, { orderRequired: true });
    expect(editing.email).toBe('Email must be a valid email address');
    expect(editing.displayOrder).toBe('Display order is required');
  });

  it('sends the districts in the order picked, a blank email as null, and no order when the box is empty', () => {
    const values = {
      ...emptyCoordinatorForm(),
      name: '  Anita Patil ',
      phone: ' +91 98XXX 11111 ',
      districts: [district('d3', 'Satara'), district('d1', 'Pune')],
    };
    expect(normalizeCoordinatorForm(values)).toEqual({
      name: 'Anita Patil',
      phone: '+91 98XXX 11111',
      email: null,
      districtIds: ['d3', 'd1'],
      isActive: true,
    });
    expect(normalizeCoordinatorForm({ ...values, displayOrder: '4' }).displayOrder).toBe(4);
  });
});

describe('district office form', () => {
  it('requires the district only, and an optional pair is both languages or neither', () => {
    expect(validateOfficeForm(emptyOfficeForm()).districtId).toBe('District is required');
    const errors = validateOfficeForm({ ...emptyOfficeForm(), districtId: 'd1', address: { mr: 'पुणे', en: '' }, officeHours: { mr: '', en: 'Mon' } });
    expect(errors['address.en']).toBe('Office address (English) is required when Marathi is given');
    expect(errors['address.mr']).toBeUndefined();
    expect(errors['officeHours.mr']).toBe('Office hours (Marathi) is required when English is given');
  });

  it('keeps the District Coordinator to both languages or neither', () => {
    const at = (collectorName: { mr: string; en: string }) => {
      const errors = validateOfficeForm({ ...emptyOfficeForm(), districtId: 'd1', collectorName });
      return { mr: errors['collectorName.mr'], en: errors['collectorName.en'] };
    };
    expect(at({ mr: '', en: '' })).toEqual({ mr: undefined, en: undefined });
    expect(at({ mr: '  ', en: ' ' })).toEqual({ mr: undefined, en: undefined });
    expect(at({ mr: 'डॉ. एस. देशमुख', en: 'Dr. S. Deshmukh' })).toEqual({ mr: undefined, en: undefined });
    expect(at({ mr: 'डॉ. एस. देशमुख', en: ' ' })).toEqual({
      mr: undefined,
      en: 'District Coordinator (English) is required when Marathi is given',
    });
    expect(at({ mr: '', en: 'Dr. S. Deshmukh' })).toEqual({
      mr: 'District Coordinator (Marathi) is required when English is given',
      en: undefined,
    });
  });

  it('names each District Coordinator language in its length message', () => {
    const at = (n: number) =>
      validateOfficeForm({ ...emptyOfficeForm(), districtId: 'd1', collectorName: { mr: 'अ'.repeat(n), en: 'A'.repeat(n) } });
    expect(at(150)['collectorName.mr']).toBeUndefined();
    expect(at(150)['collectorName.en']).toBeUndefined();
    expect(at(151)['collectorName.mr']).toBe('District Coordinator (Marathi) must be at most 150 characters');
    expect(at(151)['collectorName.en']).toBe('District Coordinator (English) must be at most 150 characters');
  });

  it('sends the District Coordinator as a trimmed pair', () => {
    const values = { ...emptyOfficeForm(), districtId: 'd1', collectorName: { mr: ' डॉ. एस. देशमुख ', en: ' Dr. S. Deshmukh ' } };
    expect(normalizeOfficeForm(values).collectorName).toEqual({ mr: 'डॉ. एस. देशमुख', en: 'Dr. S. Deshmukh' });
  });

  it('fills the District Coordinator pair from a saved office, and leaves it blank when there is none', () => {
    expect(toOfficeFormValues(OFFICES[0]!).collectorName).toEqual({ mr: 'डॉ. एस. देशमुख', en: 'Dr. S. Deshmukh' });
    expect(toOfficeFormValues(OFFICES[1]!).collectorName).toEqual({ mr: '', en: '' });
  });

  it('sends every blank field as null', () => {
    expect(normalizeOfficeForm({ ...emptyOfficeForm(), districtId: 'd1', collectorName: { mr: '  ', en: ' ' } })).toEqual({
      districtId: 'd1',
      collectorName: null,
      address: null,
      phone: null,
      email: null,
      officeHours: null,
      isActive: true,
    });
  });
});

/* Mirrors the backend: '' (the AMRUT phone) or 10–15 digits once spaces, "+" and "-" are taken out. */
describe('WhatsApp number', () => {
  it('keeps the digits only', () => {
    expect(whatsappDigits(' +91 97301-51450 ')).toBe('919730151450');
  });

  it('accepts blank and 10 to 15 digits, with or without the separators people type', () => {
    for (const n of ['', '   ', '9730151450', '919730151450', '+91 97301 51450', '+91-97301-51450', '1'.repeat(15)]) {
      expect({ n, error: validateWhatsappNumber(n) }).toEqual({ n, error: undefined });
    }
  });

  it('refuses too few or too many digits, and anything but digits', () => {
    expect(validateWhatsappNumber('973015145')).toBe('WhatsApp number must have 10 to 15 digits, including the country code');
    expect(validateWhatsappNumber('1'.repeat(16))).toBe('WhatsApp number must have 10 to 15 digits, including the country code');
    for (const n of ['(91) 9730151450', '91973015145O', 'wa.me/919730151450', '91.9730151450']) {
      expect(validateWhatsappNumber(n)).toBe('WhatsApp number may use digits only (spaces, + and - are ignored)');
    }
  });

  it('checks the helpline section only: the number, and a message in both languages or neither, at most 500 characters', () => {
    const values = toFormValues(contactPage());
    expect(Object.keys(validateContactSection('helpline', values))).toEqual(['whatsappNumber', 'whatsappMessage.mr', 'whatsappMessage.en']);
    expect(Object.values(validateContactSection('helpline', values)).filter(Boolean)).toEqual([]);

    values.whatsappMessage = { mr: 'नमस्कार', en: '  ' };
    expect(validateContactSection('helpline', values)['whatsappMessage.en']).toBe('Pre-filled message (English) is required when Marathi is given');
    values.whatsappMessage = { mr: 'नमस्कार', en: 'x'.repeat(501) };
    expect(validateContactSection('helpline', values)['whatsappMessage.en']).toBe('Pre-filled message (English) must be at most 500 characters');
    /* Counted as stored: collapsed to one paragraph. */
    values.whatsappMessage = { mr: 'नमस्कार', en: `${'x'.repeat(250)}\n\n\n${'x'.repeat(249)}` };
    expect(validateContactSection('helpline', values)['whatsappMessage.en']).toBeUndefined();
    /* The other sections never check the WhatsApp fields. */
    values.whatsappNumber = 'nope';
    expect(validateContactSection('page', values)).not.toHaveProperty('whatsappNumber');
  });
});

describe('section edit payload', () => {
  it('validates only the fields of the section being edited', () => {
    /* No partner card yet: its blank fields must not block a save of the AMRUT card. */
    const values = toFormValues(contactPage({ organizations: [AMRUT] }));
    expect(Object.values(validateContactSection('amrut', values)).filter(Boolean)).toEqual([]);
    expect(Object.keys(validateContactSection('page', values))).toEqual(['pageTitle.mr', 'pageTitle.en', 'pageSubtitle.mr', 'pageSubtitle.en']);
    expect(validateContactSection('partner', values)['IMPLEMENTATION_PARTNER.email']).toBe('Programme desk email is required');
  });

  it('changes only the section edited, sends the other card back as loaded, and never sends the coordinators or offices', () => {
    const page = contactPage();
    const values = toFormValues(page);
    values.amrut.email = '  new@example.org ';
    values.pageTitle = { mr: 'बदललेले', en: 'Changed' };

    const payload = toSectionPayload(page, 'amrut', values);
    expect(payload).not.toHaveProperty('coordinators');
    expect(payload).not.toHaveProperty('districtOffices');
    /* The banner is not this section's, so the edit to it is ignored. */
    expect(payload.pageTitle).toEqual({ mr: 'संपर्क', en: 'Contact us' });
    expect(payload.isPublished).toBe(true);
    expect(payload.organizations.map((o) => o.orgType)).toEqual(['AMRUT', 'IMPLEMENTATION_PARTNER']);
    expect(payload.organizations[0]).toMatchObject({ orgType: 'AMRUT', email: 'new@example.org', role: null, helpdeskHours: null });
    const { id: _id, ...partner } = PARTNER;
    expect(payload.organizations[1]).toEqual(partner);
  });

  it('sends the WhatsApp details from their own page only, as digits and one paragraph per language', () => {
    const page = contactPage({ whatsappNumber: '919730151450', whatsappMessage: { mr: 'नमस्कार', en: 'Hello' } });
    const values = toFormValues(page);
    expect(values.whatsappNumber).toBe('919730151450');
    expect(values.whatsappMessage).toEqual({ mr: 'नमस्कार', en: 'Hello' });
    values.whatsappNumber = ' +91 98765-43210 ';
    values.whatsappMessage = { mr: ' नमस्कार,\n\nमाहिती ', en: 'Hello,\r\n  more   please ' };

    expect(toSectionPayload(page, 'helpline', values)).toMatchObject({
      whatsappNumber: '919876543210',
      whatsappMessage: { mr: 'नमस्कार, माहिती', en: 'Hello, more please' },
    });
    /* Every other section leaves them out, so the backend keeps what is saved. */
    for (const section of ['page', 'amrut', 'partner'] as const) {
      const payload = toSectionPayload(page, section, values);
      expect(payload).not.toHaveProperty('whatsappNumber');
      expect(payload).not.toHaveProperty('whatsappMessage');
    }
    /* And the helpline page sends the banner and both cards back exactly as loaded. */
    const { id: _a, ...amrut } = AMRUT;
    const { id: _p, ...partner } = PARTNER;
    expect(toSectionPayload(page, 'helpline', values).organizations).toEqual([amrut, partner]);
  });

  it('reads a page from a backend without the WhatsApp columns as blank', () => {
    const { whatsappNumber: _n, whatsappMessage: _m, ...older } = contactPage();
    const values = toFormValues(older as ReturnType<typeof contactPage>);
    expect(values.whatsappNumber).toBe('');
    expect(values.whatsappMessage).toEqual({ mr: '', en: '' });
  });

  it('leaves a card that is not configured out, rather than creating it empty', () => {
    const page = contactPage({ organizations: [PARTNER] });
    const values = toFormValues(page);
    values.isPublished = false;

    const payload = toSectionPayload(page, 'page', values);
    expect(payload.isPublished).toBe(false);
    expect(payload.organizations.map((o) => o.orgType)).toEqual(['IMPLEMENTATION_PARTNER']);
  });
});
