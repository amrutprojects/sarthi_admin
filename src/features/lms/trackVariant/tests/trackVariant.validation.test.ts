import { describe, expect, it } from 'vitest';
import {
  assessmentComponentSchema, nextOftCode, oftCardPayload, oftCardSchema, phaseSchema, readinessGatePayload, readinessGateSchema,
  trackModuleSchema, type OftCardForm, type ReadinessGateForm,
} from '../validation/items.validation';
import { RICH_TEXT_REFUSED, isAllowedRichText } from '../validation/richText';
import {
  createTrackVariantPayload, emptyTrackVariantForm, trackVariantFormSchema, trackVariantServerErrors, updateTrackVariantPayload,
} from '../validation/trackVariant.validation';
import { formOptions, oftCards } from './fixtures';

const shape = formOptions.shape;

/* The messages of a failed parse, by field. */
const messages = (r: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));

describe('rich text allow-list (same rule as the server)', () => {
  it('accepts paragraphs, emphasis, lists and https links, and a bare "<"', () => {
    expect(isAllowedRichText('<p>One <strong>two</strong> <em>three</em></p><ul><li>a</li></ul><br>')).toBe(true);
    expect(isAllowedRichText('<a href="https://example.org/a?b=1&amp;c=2" target="_blank" rel="noopener">link</a>')).toBe(true);
    expect(isAllowedRichText('a < b and 3<4')).toBe(true);
  });

  it('refuses any other markup', () => {
    expect(isAllowedRichText('<script>alert(1)</script>')).toBe(false);
    expect(isAllowedRichText('<p class="x">a</p>')).toBe(false);
    expect(isAllowedRichText('<a href="http://example.org">x</a>')).toBe(false);
    expect(isAllowedRichText('<a href="javascript:alert(1)">x</a>')).toBe(false);
    expect(isAllowedRichText('<img src="x" onerror="y">')).toBe(false);
    expect(isAllowedRichText('<!-- comment -->')).toBe(false);
  });
});

describe('track variant form', () => {
  it('requires the course, Module 3 and track on create, with the server messages', () => {
    const r = trackVariantFormSchema(shape, 'create').safeParse(emptyTrackVariantForm());
    expect(messages(r)).toEqual({
      courseId: 'Select a course.',
      courseModuleId: 'Select a Module 3 course module.',
      trackId: 'Select a technology track.',
    });
  });

  it('checks the per-track counts, the reference length and the rich text', () => {
    const r = trackVariantFormSchema(shape, 'edit').safeParse({
      ...emptyTrackVariantForm(),
      expectedTrackModules: '24',
      expectedOftCards: '11',
      syllabusReference: 'x'.repeat(121),
      description: '<p onclick="x">Hi</p>',
    });
    expect(messages(r)).toEqual({
      expectedTrackModules: 'Enter 22 or 23 from the track syllabus.',
      expectedOftCards: 'Enter 12 or 13 from the track syllabus.',
      syllabusReference: 'Must be at most 120 characters',
      description: RICH_TEXT_REFUSED,
    });
    expect(trackVariantFormSchema(shape, 'edit').safeParse({ ...emptyTrackVariantForm(), description: 'x'.repeat(3001) }).error?.issues[0].message).toBe(
      'Shorten the text.',
    );
  });

  it('builds the create and update payloads (numbers, null for blank)', () => {
    const v = { ...emptyTrackVariantForm('c1'), courseModuleId: 'm3', trackId: 't7', expectedTrackModules: '23', syllabusReference: '  Syllabus v2 ', description: '  ' };
    expect(createTrackVariantPayload(v)).toEqual({
      courseModuleId: 'm3', trackId: 't7', expectedTrackModules: 23, expectedOftCards: null, syllabusReference: 'Syllabus v2', description: null, isActive: true,
    });
    expect(updateTrackVariantPayload(v)).toEqual({ expectedTrackModules: 23, expectedOftCards: null, syllabusReference: 'Syllabus v2', description: null });
  });

  it('maps server field details onto the form fields', () => {
    expect(
      trackVariantServerErrors([
        { field: 'trackId', message: 'A variant for this track already exists.' },
        { field: 'body.courseModuleId', message: 'Select a Module 3 course module.' },
        { field: 'status', message: 'ignored' },
      ]),
    ).toEqual([
      { field: 'trackId', message: 'A variant for this track already exists.' },
      { field: 'courseModuleId', message: 'Select a Module 3 course module.' },
    ]);
  });
});

describe('curriculum item forms', () => {
  it('phase: number 1 to 7 and a 3–160 character title', () => {
    expect(messages(phaseSchema(shape).safeParse({ phaseNumber: '8', title: 'ab', description: '' }))).toEqual({
      phaseNumber: 'Choose a phase number from 1 to 7.',
      title: 'Enter a phase title of 3 to 160 characters.',
    });
  });

  it('track module: code shape (any case), position and hours with two decimals', () => {
    const ok = { phaseId: 'p1', code: 't07-m02', title: 'Firewalls', sortOrder: '2', lectureHours: '6.5', practicalHours: '', description: '' };
    expect(trackModuleSchema().safeParse(ok).success).toBe(true);
    expect(messages(trackModuleSchema().safeParse({ ...ok, phaseId: '', code: 'T 07', sortOrder: '0', lectureHours: '1.234', practicalHours: '-1' }))).toEqual({
      phaseId: 'Select a phase of this variant.',
      code: 'Use capital letters, digits and hyphens (up to 30).',
      sortOrder: 'Enter the position of the track module (1 or more).',
      lectureHours: 'Use at most two decimal places.',
      practicalHours: 'Enter the practical hours (0 or more).',
    });
  });

  it('OFT card: the code of this track, a valid hours range, instructions, deliverable and evidence', () => {
    const ok: OftCardForm = {
      oftCode: 'oft-m3-t07-03', title: 'Audit', stage: '', linkedTrackModuleId: '', instructions: '<p>Audit the host network carefully.</p>',
      hoursMin: '2', hoursMax: '4.5', deliverable: 'An audit report.', evidenceTypes: ['DOCUMENT'], evidenceNotes: '', hostVerificationRequired: false,
    };
    expect(oftCardSchema('T07').safeParse(ok).success).toBe(true);
    expect(messages(oftCardSchema('T07').safeParse({ ...ok, oftCode: 'OFT-M3-T08-01' })).oftCode).toBe(
      'Use the pattern OFT-M3-T07-{nn}, for example OFT-M3-T07-01.',
    );
    expect(messages(oftCardSchema('T07').safeParse({ ...ok, oftCode: 'OFT-3-07' })).oftCode).toBe(
      'Use the pattern OFT-M3-{track code}-{nn}, for example OFT-M3-T07-04.',
    );
    expect(
      messages(oftCardSchema('T07').safeParse({ ...ok, hoursMin: '5', hoursMax: '3', instructions: 'short', deliverable: 'tiny', evidenceTypes: [] })),
    ).toEqual({
      hoursMax: 'Enter a valid hours range.',
      instructions: 'Enter the task instructions.',
      deliverable: 'Describe the deliverable.',
      evidenceTypes: 'Select at least one type of evidence.',
    });
    expect(messages(oftCardSchema('T07').safeParse({ ...ok, hoursMin: '0' })).hoursMin).toBe('Enter a valid hours range.');
  });

  it('OFT card: the code is not sent for a published card, the next free number is offered for a new one', () => {
    const v = { ...(oftCards[0] as unknown as OftCardForm), hoursMin: '4', hoursMax: '6', stage: '', evidenceNotes: '', linkedTrackModuleId: 'tm1', evidenceTypes: ['DOCUMENT', 'PHOTOGRAPH'] };
    const published = oftCardPayload(v, oftCards[0]);
    expect(published).not.toHaveProperty('oftCode');
    /* Evidence types in the catalogue's order. */
    expect(published.evidenceTypes).toEqual(['PHOTOGRAPH', 'DOCUMENT']);
    expect(oftCardPayload(v, oftCards[1])).toHaveProperty('oftCode', 'OFT-M3-T07-01');
    expect(nextOftCode('T07', oftCards)).toBe('OFT-M3-T07-03');
    expect(nextOftCode('T03', [])).toBe('OFT-M3-T03-01');
  });

  it('assessment component: weight 0–100, and a changed weight needs its reference', () => {
    const ok = { componentCode: 'cap_01', label: 'Capstone', weight: '20', source: '', indicative: true, sortOrder: '1' };
    expect(assessmentComponentSchema(shape, null).safeParse(ok).success).toBe(true);
    expect(messages(assessmentComponentSchema(shape, null).safeParse({ ...ok, weight: '101', sortOrder: '11', label: 'x' }))).toEqual({
      weight: 'Enter a weight from 0 to 100.',
      sortOrder: 'Choose a position from 1 to 10.',
      label: 'Enter a label.',
    });
    const row = { id: 'a1', trackVariantId: 'v1', componentCode: 'CAP_01', label: 'Capstone', weight: 10, source: null, indicative: true, sortOrder: 1, createdAt: '', updatedAt: '' };
    expect(messages(assessmentComponentSchema(shape, row).safeParse(ok))).toEqual({ source: 'Enter the reference for this change.' });
    expect(assessmentComponentSchema(shape, row).safeParse({ ...ok, source: 'Decision 12/2026' }).success).toBe(true);
    expect(assessmentComponentSchema(shape, row).safeParse({ ...ok, weight: '10' }).success).toBe(true);
  });

  it('readiness gate: minimum band only with that clearance; the number is not sent on edit', () => {
    const ok: ReadinessGateForm = {
      gateNumber: '1', title: 'Gate one', heldAfterTrackModuleId: 'tm1', demonstration: '<p>Demonstrate a working network.</p>',
      evidenceTypes: ['LINK'], evidenceNotes: '', remediationPath: 'Repeat the lab.', clearanceMode: 'MINIMUM_BAND', clearanceMinBand: '',
    };
    const schema = readinessGateSchema(shape, formOptions.competencyBands, 'create');
    expect(messages(schema.safeParse(ok))).toEqual({ clearanceMinBand: 'Choose a minimum band from 1 to 5.' });
    expect(messages(schema.safeParse({ ...ok, gateNumber: '7', clearanceMode: 'ASSESSOR_DECIDES', remediationPath: 'short', heldAfterTrackModuleId: '' }))).toEqual({
      gateNumber: 'Choose a gate number from 1 to 6.',
      remediationPath: 'Describe the remediation path.',
      heldAfterTrackModuleId: 'Select a track module of this track.',
    });
    expect(readinessGatePayload({ ...ok, clearanceMode: 'ASSESSOR_DECIDES', clearanceMinBand: '3' }, 'create')).toMatchObject({ gateNumber: 1, clearanceMinBand: null });
    const edit = readinessGatePayload({ ...ok, clearanceMinBand: '3' }, 'edit');
    expect(edit).not.toHaveProperty('gateNumber');
    expect(edit).toMatchObject({ clearanceMode: 'MINIMUM_BAND', clearanceMinBand: 3, evidenceNotes: null });
  });
});
