/* FAQ Management, as /api/v1/cms/faqs returns and accepts it. */

export interface Bilingual {
  mr: string;
  en: string;
}

export interface ApiFaq {
  id: string;
  question: Bilingual;
  answer: Bilingual;
  /* Position on the public FAQ page, lowest first. */
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFaqInput {
  question: Bilingual;
  answer: Bilingual;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateFaqInput {
  question?: Bilingual;
  answer?: Bilingual;
  displayOrder?: number;
}

/* Field names of the FAQ form, as the API reports them in 422 details ("body.question.mr"). */
export const FAQ_FIELDS = ['question.mr', 'question.en', 'answer.mr', 'answer.en', 'displayOrder'] as const;
export type FaqField = (typeof FAQ_FIELDS)[number];
