/* Form option lists that the backend keeps as constants (students/student.constants.ts), not as masters. */
export const RELIGIONS = ['हिंदू'];

/* The 12 approved Module 3 tracks; the backend accepts the code. */
export const TRACKS: { code: string; name: string }[] = [
  { code: 'T01', name: 'Data Analytics & Business Intelligence' },
  { code: 'T02', name: 'Graphic Design & Digital Branding' },
  { code: 'T03', name: 'Web Design & Development' },
  { code: 'T04', name: 'Application Development' },
  { code: 'T05', name: 'IT Infrastructure & Smart Technologies' },
  { code: 'T06', name: 'Retail & E-Commerce Management' },
  { code: 'T07', name: 'Cyber Security' },
  { code: 'T08', name: 'AI/ML Engineer' },
  { code: 'T09', name: 'Data Scientist' },
  { code: 'T10', name: 'Social Media Marketing / Digital Marketing' },
  { code: 'T11', name: 'Blockchain' },
  { code: 'T12', name: 'Office Process Automation (OPA)' },
];

/* Document types that carry a barcode (backend DOCUMENTS[].barcode). */
export const BARCODES: Record<string, 'required' | 'optional'> = { INCOME_EWS: 'required', DOMICILE: 'required' };

export const DECLARATION =
  'I hereby declare that all the above information is true to my personal knowledge and belief. Also, these are true copies of the original documents. I am aware that if the said information and documents are found to be false, a case will be registered against me under the Indian Penal Code and/or the relevant law, and I will be liable for punishment accordingly.';
