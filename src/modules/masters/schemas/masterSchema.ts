import { z } from 'zod';
import type { MasterConfig } from '../config';

/* Form rules mirroring the backend (masters/master.validation.ts); the backend still validates every request. */
export function masterFormSchema(m: MasterConfig) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, 'Code is required')
      .max(m.codeMax, `Code must be at most ${m.codeMax} characters`)
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Code may contain only letters, digits, _ and -')
      .transform((v) => v.toUpperCase()),
    name: z.string().trim().min(1, 'Name is required').max(m.nameMax, `Name must be at most ${m.nameMax} characters`),
    description: z.string().trim().max(500, 'Description must be at most 500 characters'),
    isMandatory: z.boolean(),
    /* Castes only (the form shows these fields when the master has them; others leave them blank). */
    nameEn: z
      .string()
      .trim()
      .max(150, 'English name must be at most 150 characters')
      .optional()
      .transform((v) => v ?? ''),
    /* Blank: a new record goes to the end of the list; an edited one keeps its place. */
    displayOrder: z
      .string()
      .trim()
      .regex(/^\d{0,4}$/, 'Enter a whole number from 0 to 9999')
      .optional()
      .transform((v) => (v ? Number(v) : null)),
  });
}

export type MasterFormInput = z.input<ReturnType<typeof masterFormSchema>>;
export type MasterFormValues = z.output<ReturnType<typeof masterFormSchema>>;
