import { validateText, validateWholeNumber, type FieldErrors } from '../../validation';
import type { ApiFaq, CreateFaqInput, FaqField } from '../types/faq.types';

/*
 * FAQ form rules, deliberately identical to the server rules in backend/src/cms/faq/faq.validator.ts
 * and to the CHECK constraints on the faqs table: both halves of the question and the answer are
 * required, within the column lengths, and the display order is a whole number from 0 to 9999.
 */

export interface FaqFormValues {
  question: { mr: string; en: string };
  answer: { mr: string; en: string };
  /* Typed as text so the box can be left empty: an empty order puts a new question at the end. */
  displayOrder: string;
  isActive: boolean;
}

export const QUESTION_MAX = 500;
export const ANSWER_MAX = 2000;

export const emptyFaqForm = (): FaqFormValues => ({
  question: { mr: '', en: '' },
  answer: { mr: '', en: '' },
  displayOrder: '',
  isActive: true,
});

export const toFaqFormValues = (faq: ApiFaq): FaqFormValues => ({
  question: { ...faq.question },
  answer: { ...faq.answer },
  displayOrder: String(faq.displayOrder),
  isActive: faq.isActive,
});

/* The values actually sent to the API: every text trimmed, and no order at all when the box is empty. */
export const normalizeFaqForm = (v: FaqFormValues): CreateFaqInput => ({
  question: { mr: v.question.mr.trim(), en: v.question.en.trim() },
  answer: { mr: v.answer.mr.trim(), en: v.answer.en.trim() },
  ...(v.displayOrder.trim() ? { displayOrder: Number(v.displayOrder.trim()) } : {}),
  isActive: v.isActive,
});

export function validateFaqForm(v: FaqFormValues, { orderRequired = false } = {}): FieldErrors<FaqField> {
  return {
    'question.mr': validateText(v.question.mr, 'Question (Marathi)', { max: QUESTION_MAX, required: true }),
    'question.en': validateText(v.question.en, 'Question (English)', { max: QUESTION_MAX, required: true }),
    'answer.mr': validateText(v.answer.mr, 'Answer (Marathi)', { max: ANSWER_MAX, required: true }),
    'answer.en': validateText(v.answer.en, 'Answer (English)', { max: ANSWER_MAX, required: true }),
    displayOrder: validateWholeNumber(v.displayOrder, 'Display order', { min: 0, max: 9999, required: orderRequired }),
  };
}
