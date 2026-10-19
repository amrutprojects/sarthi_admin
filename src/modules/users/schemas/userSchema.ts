import { z } from 'zod';

/*
 * Form validation for creating and editing users. Rules mirror the backend validators
 * (backend shared/validation/common.validation.ts) so users see the same messages before submitting;
 * the backend still validates every request.
 */
export const passwordRule = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

const base = {
  name: z.string().trim().min(1, 'Full name is required').max(150, 'Full name is too long'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address').max(255),
  roleIds: z.array(z.string().uuid()),
};

export const createUserSchema = z.object({ ...base, password: passwordRule });

/* Editing: an empty password means "keep the current one". */
export const editUserSchema = z.object({ ...base, password: z.union([z.literal(''), passwordRule]) });

export type CreateUserForm = z.infer<typeof createUserSchema>;
export type EditUserForm = z.infer<typeof editUserSchema>;
export type UserFormValues = CreateUserForm | EditUserForm;
