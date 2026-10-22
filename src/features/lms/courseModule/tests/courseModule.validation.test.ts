import { describe, expect, it } from 'vitest';
import {
  DOES_NOT_ADD_UP, PAIR_LECTURE, PAIR_SESSIONS, courseModuleFormFrom, courseModuleServerErrors, emptyCourseModuleForm, parseCourseModuleForm,
  prescribedSyllabusRefRule, toCreateInput, toUpdateInput, type CourseModuleFormValues,
} from '../validation/courseModule.validation';
import { isAllowedRichText } from '../validation/richText';
import { COURSE_ID, courseModule } from './fixtures';

const create = (over: Partial<CourseModuleFormValues> = {}) =>
  parseCourseModuleForm({ ...emptyCourseModuleForm({ courseId: COURSE_ID, moduleNumber: '1' }), title: 'Module one', ...over }, { mode: 'create' }).errors;

describe('Module form rules (mirror of the backend validator and service)', () => {
  it('needs a course, a module number 1–4 and a 3–160 character plain-text title', () => {
    const e = parseCourseModuleForm(emptyCourseModuleForm(), { mode: 'create' }).errors;
    expect(e.courseId).toBe('Select a course.');
    expect(e.moduleNumber).toBe('Select module 1, 2, 3 or 4.');
    expect(e.title).toBe('Enter a module title.');
    expect(create({ moduleNumber: '5' }).moduleNumber).toBe('Select module 1, 2, 3 or 4.');
    expect(create({ title: '  ab  ' }).title).toBe('Enter a module title.');
    expect(create({ title: 'x'.repeat(161) }).title).toBe('Must be at most 160 characters');
    expect(create({ title: 'Intro <b>bold</b>' }).title).toBe('Enter the title as plain text.');
    /* The em dash of Table 7's Module 3 title is fine; a "<" that opens no tag is plain text. */
    expect(create({ title: 'Domain-Specific — track 1 < 2' }).title).toBeUndefined();
  });

  it('checks hours like the server: > 0, at most 2 decimals, at most 9999.99; sessions are whole numbers', () => {
    expect(create({ coreHours: 'abc' }).coreHours).toBe('Enter the core hours of the module.');
    expect(create({ coreHours: '0' }).coreHours).toBe('Enter the core hours of the module.');
    expect(create({ coreHours: '-4' }).coreHours).toBe('Enter the core hours of the module.');
    expect(create({ coreHours: '60.125', syllabusRef: 'Doc' }).coreHours).toBe('Use at most 2 decimals');
    expect(create({ coreHours: '10000', syllabusRef: 'Doc' }).coreHours).toBe('Must be at most 9999.99');
    const e = create({ deliveryPattern: 'SESSIONS', coreHours: '60', syllabusRef: 'Doc', sessions: '2.5', sessionHours: '0' });
    expect(e.sessions).toBe('Enter a whole number of sessions.');
    expect(e.sessionHours).toBe('Enter whole session hours.');
    expect(create({ syllabusRef: 'x'.repeat(121) }).syllabusRef).toBe('Must be at most 120 characters');
  });

  it('sessions × session hours must equal the core hours (message on sessions)', () => {
    expect(create({ deliveryPattern: 'SESSIONS', coreHours: '60', syllabusRef: 'Doc', sessions: '30', sessionHours: '3' }).sessions).toBe(DOES_NOT_ADD_UP);
    expect(create({ deliveryPattern: 'SESSIONS', coreHours: '60', syllabusRef: 'Doc', sessions: '30', sessionHours: '2' })).toEqual({});
  });

  it('lecture + practical hours must equal the core hours (message on lecture hours), compared in hundredths', () => {
    expect(create({ deliveryPattern: 'LECTURE_PRACTICAL', coreHours: '60', syllabusRef: 'Doc', lectureHours: '22', practicalHours: '30' }).lectureHours).toBe(DOES_NOT_ADD_UP);
    expect(create({ deliveryPattern: 'LECTURE_PRACTICAL', coreHours: '0.3', syllabusRef: 'Doc', lectureHours: '0.1', practicalHours: '0.2' })).toEqual({});
  });

  it('a chosen pair is entered whole, and a pair needs the core hours', () => {
    expect(create({ deliveryPattern: 'SESSIONS', sessions: '30' }).sessionHours).toBe(PAIR_SESSIONS);
    const both = create({ deliveryPattern: 'BOTH', coreHours: '60', syllabusRef: 'Doc', sessions: '30', sessionHours: '2' });
    expect(both.lectureHours).toBe(PAIR_LECTURE);
    expect(both.practicalHours).toBe(PAIR_LECTURE);
    expect(create({ deliveryPattern: 'SESSIONS', sessions: '30', sessionHours: '2' }).coreHours).toBe('Enter the core hours of the module.');
  });

  it('OFT: both ends or neither, and 0 < minimum ≤ maximum', () => {
    expect(create({ oftHoursMin: '42' }).oftHoursMax).toBe('Enter a valid OFT hours range.');
    expect(create({ oftHoursMax: '48' }).oftHoursMin).toBe('Enter a valid OFT hours range.');
    expect(create({ oftHoursMin: '50', oftHoursMax: '48' }).oftHoursMin).toBe('Enter a valid OFT hours range.');
    expect(create({ oftHoursMin: '0', oftHoursMax: '48' }).oftHoursMin).toBe('Enter a valid OFT hours range.');
    expect(create({ oftHoursMin: '48', oftHoursMax: '48' })).toEqual({});
  });

  it('the syllabus reference is required with core hours', () => {
    expect(create({ coreHours: '60' }).syllabusRef).toBe('Enter the syllabus reference.');
    expect(create({ coreHours: '60', syllabusRef: '  ' }).syllabusRef).toBe('Enter the syllabus reference.');
  });

  it('the description follows the rich-text allow-list and the 3,000 character limit', () => {
    expect(create({ description: '<p>Outcomes: <b>speak</b> and <a href="https://example.org/x" target="_blank">read</a></p>' }).description).toBeUndefined();
    expect(create({ description: '<script>alert(1)</script>' }).description).toMatch(/remove other markup and scripts/);
    expect(create({ description: '<a href="http://x.org">x</a>' }).description).toMatch(/https links/);
    expect(create({ description: 'x'.repeat(3001) }).description).toBe('Shorten the text.');
    expect(isAllowedRichText('a < b and <br>')).toBe(true);
    expect(isAllowedRichText('<p onclick="x">a</p>')).toBe(false);
  });

  it('edit: a change of the core hours needs a reason; an unchanged value does not', () => {
    const saved = courseModuleFormFrom(courseModule());
    expect(parseCourseModuleForm(saved, { mode: 'edit', savedCoreHours: 60 }).errors).toEqual({});
    const changed = { ...saved, coreHours: '64', sessionHours: '2', sessions: '32', lectureHours: '24', practicalHours: '40' };
    expect(parseCourseModuleForm(changed, { mode: 'edit', savedCoreHours: 60 }).errors.reason).toBe('Enter a reason.');
    expect(parseCourseModuleForm({ ...changed, reason: 'Approved syllabus v2' }, { mode: 'edit', savedCoreHours: 60 }).errors).toEqual({});
    /* Clearing the core hours is a change too (and then the pairs need them). */
    const cleared = { ...saved, coreHours: '', deliveryPattern: 'NONE' as const };
    expect(parseCourseModuleForm(cleared, { mode: 'edit', savedCoreHours: 60 }).errors.reason).toBe('Enter a reason.');
  });

  it('builds the POST body: collapsed title, null for empty values, the unchosen pair empty', () => {
    const body = toCreateInput({
      ...emptyCourseModuleForm({ courseId: COURSE_ID, moduleNumber: '2' }),
      title: '  Basic   IT  Skills ',
      coreHours: '60',
      syllabusRef: ' Syllabus v1 ',
      deliveryPattern: 'SESSIONS',
      sessions: '30',
      sessionHours: '2',
      lectureHours: '10',
      practicalHours: '50',
    });
    expect(body).toEqual({
      courseId: COURSE_ID, moduleNumber: 2, title: 'Basic IT Skills', description: null, coreHours: 60, syllabusRef: 'Syllabus v1', sessions: 30,
      sessionHours: 2, lectureHours: null, practicalHours: null, oftHoursMin: null, oftHoursMax: null, isActive: true,
    });
  });

  it('builds the PATCH body without course / number / status, with the reason only for a core-hours change', () => {
    const saved = courseModuleFormFrom(courseModule());
    const unchanged = toUpdateInput(saved, 60);
    expect(unchanged).not.toHaveProperty('courseId');
    expect(unchanged).not.toHaveProperty('moduleNumber');
    expect(unchanged).not.toHaveProperty('isActive');
    expect(unchanged).not.toHaveProperty('reason');
    const changed = toUpdateInput({ ...saved, coreHours: '64', deliveryPattern: 'NONE', reason: ' Approved v2 ' }, 60);
    expect(changed).toMatchObject({ coreHours: 64, sessions: null, lectureHours: null, reason: 'Approved v2' });
  });

  it('the prescribed-modules syllabus reference is required, 1–120 characters', () => {
    expect(prescribedSyllabusRefRule.safeParse('   ').error?.issues[0].message).toBe('Enter the syllabus reference.');
    expect(prescribedSyllabusRefRule.safeParse('x'.repeat(121)).error?.issues[0].message).toBe('Must be at most 120 characters');
    expect(prescribedSyllabusRefRule.safeParse(' Final syllabus v1 ').data).toBe('Final syllabus v1');
  });

  it('maps server field details (validator "body.x" and service "x") onto form fields', () => {
    expect(
      courseModuleServerErrors([
        { field: 'body.title', message: 'Enter the title as plain text.' },
        { field: 'moduleNumber', message: 'This module already exists for the course.' },
        { field: 'body', message: 'Provide at least one field to update' },
      ]),
    ).toEqual([
      { field: 'title', message: 'Enter the title as plain text.' },
      { field: 'moduleNumber', message: 'This module already exists for the course.' },
    ]);
  });
});
