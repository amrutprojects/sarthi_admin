import { describe, expect, it } from 'vitest';
import { createUserSchema, editUserSchema } from '../schemas/userSchema';

const valid = { name: 'Asha Patil', email: 'asha@example.org', password: 'Strong-Pass1', roleIds: [] };

describe('user form schema', () => {
  it('accepts a valid user', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['short', 'at least 10 characters'],
    ['alllowercase1x', 'uppercase'],
    ['ALLUPPERCASE1X', 'lowercase'],
    ['NoDigitsHereAtAll', 'digit'],
  ])('rejects password %s (%s)', (password, message) => {
    const r = createUserSchema.safeParse({ ...valid, password });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain(message);
  });

  it('requires a valid email and a name', () => {
    expect(createUserSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
  });

  it('lets an edit keep the current password (empty), but validates a new one', () => {
    expect(editUserSchema.safeParse({ ...valid, password: '' }).success).toBe(true);
    expect(editUserSchema.safeParse({ ...valid, password: 'weak' }).success).toBe(false);
  });
});
