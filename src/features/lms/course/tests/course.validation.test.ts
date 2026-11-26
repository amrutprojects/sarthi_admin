import { describe, expect, it } from 'vitest';
import {
  RICH_TEXT_REFUSED, courseCodeError, courseDescriptionError, courseFormSchema, courseServerErrors, courseTitleError, emptyCourseForm,
  isAllowedRichText, normalizeCourseForm, toCreateInput, toUpdateInput,
} from '../validation/course.validation';

describe('isAllowedRichText (the server allow-list)', () => {
  it.each([
    'Plain text only',
    'a < b and 3<4',
    '<p>Para</p><p>Two<br>lines<br/>here</p>',
    '<strong>b</strong> <em>i</em> <b>b</b> <i>i</i> <u>u</u>',
    '<ul><li>One</li></ul><ol><li>Two</li></ol>',
    '<a href="https://example.org/a?x=1&amp;y=2">link</a>',
    '<a href="https://example.org" target="_blank" rel="noopener noreferrer">link</a>',
  ])('accepts %s', (text) => expect(isAllowedRichText(text)).toBe(true));

  it.each([
    '<script>alert(1)</script>',
    '<p onclick="x()">x</p>',
    '<p class="lead">x</p>',
    '<img src="https://example.org/a.png">',
    '<a href="http://example.org">insecure</a>',
    '<a href="javascript:alert(1)">x</a>',
    '<a href=https://example.org>unquoted</a>',
    '<a href="https://example.org/&#106;">entity</a>',
    '<a href="https://example.org" target="_self">x</a>',
    '<a href="https://example.org" href="https://other.org">x</a>',
    '<a>no link</a>',
    '<!-- comment -->',
    '<p/>',
    '</br>',
    '<P>upper</P>',
  ])('refuses %s', (text) => expect(isAllowedRichText(text)).toBe(false));
});

describe('course field rules', () => {
  it('code: required, 2–20, A–Z 0–9 hyphen, upper-cased', () => {
    expect(courseCodeError('  ')).toBe('Enter a course code.');
    expect(courseCodeError('A')).toBe('Must be at least 2 characters');
    expect(courseCodeError('A'.repeat(21))).toBe('Must be at most 20 characters');
    expect(courseCodeError('AK_PROG')).toBe('Use capital letters, digits and hyphens.');
    expect(courseCodeError(' ak-prog ')).toBeUndefined();
  });

  it('title: required, 3–120 after collapsing spaces, the catalogue character set', () => {
    expect(courseTitleError('')).toBe('Enter a course title.');
    expect(courseTitleError('  Ab   ')).toBe('Must be at least 3 characters');
    expect(courseTitleError(' A   b ')).toBeUndefined();
    expect(courseTitleError('x'.repeat(121))).toBe('Must be at most 120 characters');
    expect(courseTitleError('-Leading hyphen')).toBe('Use letters, digits, spaces and . , ( ) - / & only');
    expect(courseTitleError('Digital Skills (Module 3) & Practice')).toBeUndefined();
  });

  it('description: optional, at most 2,000 characters, allow-listed markup', () => {
    expect(courseDescriptionError('   ')).toBeUndefined();
    expect(courseDescriptionError('x'.repeat(2001))).toBe('Shorten the description.');
    expect(courseDescriptionError(`  ${'x'.repeat(2000)}  `)).toBeUndefined();
    expect(courseDescriptionError('<div>x</div>')).toBe(RICH_TEXT_REFUSED);
  });

  it('languages: at least one when the form can offer them, each once', () => {
    const base = { ...emptyCourseForm('e1'), code: 'AK', title: 'Course' };
    expect(courseFormSchema({ requireLanguages: true }).safeParse(base).success).toBe(false);
    expect(courseFormSchema({ requireLanguages: false }).safeParse(base).success).toBe(true);
    const twice = courseFormSchema({ requireLanguages: true }).safeParse({ ...base, languages: ['en', 'en'] });
    expect(twice.success ? null : twice.error.issues[0].message).toBe('Each language can be selected only once');
  });
});

describe('payloads and server errors', () => {
  it('normalises the form and leaves out an empty language list on create', () => {
    const p = normalizeCourseForm({ entityId: 'e1', code: ' ak-1 ', title: '  Sarthi ', description: '  ', languages: [], isActive: false });
    expect(toCreateInput(p)).toEqual({ entityId: 'e1', code: 'AK-1', title: 'Sarthi', description: null, isActive: false });
    expect(toUpdateInput({ ...p, languages: ['mr'] }, true)).toEqual({ title: 'Sarthi', description: null, languages: ['mr'] });
    expect(toUpdateInput({ ...p, languages: ['mr'] }, false)).toHaveProperty('code', 'AK-1');
  });

  it('maps validator and service fields onto the form', () => {
    expect(
      courseServerErrors([
        { field: 'body.languages.1', message: 'Select a language.' },
        { field: 'code', message: 'This course code is already used.' },
        { field: 'entityId', message: 'Choose an active entity' },
        { field: 'body', message: 'Provide at least one field to update' },
      ]),
    ).toEqual([
      { field: 'languages', message: 'Select a language.' },
      { field: 'code', message: 'This course code is already used.' },
      { field: 'entityId', message: 'Choose an active entity' },
    ]);
  });
});
