import { z } from 'zod';
import type { ApiLearningConfigValue, LearningConfigUnit, LearningConfigValue, RangeValue } from '../types/learningConfig.types';

/*
 * The learning-configuration edit form: one key (and mode) at a time. The value rules are the backend's
 * parseValue (learning-config.service.ts) with its messages; the reason is mandatory (F-LMS-05-07). The form
 * keeps every input as text and builds the typed value only on save.
 */

export interface ConfigFormValues {
  /* Mode-specific key: 'mode' = only the row's mode, 'all' = both modes alike (OQ-042). */
  scope: 'mode' | 'all';
  /* PRESCRIBED key: empty the value again (back to To Be Confirmed). */
  clear: boolean;
  num: string;
  min: string;
  max: string;
  choice: string;
  list: string[];
  labels: string[];
  text: string;
  reason: string;
}

export const isRange = (v: unknown): v is RangeValue => typeof v === 'object' && v !== null && !Array.isArray(v) && 'min' in v && 'max' in v;

/* The form, pre-filled with the value shown now (the saved one, or the syllabus value). */
export function configFormFrom(row: ApiLearningConfigValue): ConfigFormValues {
  const v = row.value;
  const list = Array.isArray(v) ? v : [];
  const labelCount = row.length ?? list.length;
  return {
    scope: 'mode',
    clear: false,
    num: typeof v === 'number' ? String(v) : '',
    min: isRange(v) ? String(v.min) : '',
    max: isRange(v) ? String(v.max) : '',
    choice: row.type === 'enum' && typeof v === 'string' ? v : '',
    list: row.type === 'enum-list' ? list : [],
    labels: row.type === 'labels' ? Array.from({ length: labelCount }, (_, i) => list[i] ?? '') : [],
    text: row.type === 'text' && typeof v === 'string' ? v : '',
    reason: '',
  };
}

/* The typed value sent to the API (null = emptied). Call only once the form is valid. */
export function configValueOf(row: ApiLearningConfigValue, v: ConfigFormValues): LearningConfigValue | null {
  if (v.clear) return null;
  switch (row.type) {
    case 'integer':
    case 'duration':
    case 'percentage':
      return Number(v.num.trim());
    case 'range':
      return { min: Number(v.min.trim()), max: Number(v.max.trim()) };
    case 'enum':
      return v.choice;
    case 'enum-list':
      /* In the catalogue's order, as the server stores it. */
      return (row.options ?? []).filter((o) => v.list.includes(o));
    case 'labels':
      return v.labels.map((l) => l.trim());
    case 'text':
      return v.text.trim();
  }
}

const issue = (ctx: z.RefinementCtx, path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

const wholeAtLeast = (raw: string, min: number) => /^\d+$/.test(raw.trim()) && Number.isSafeInteger(Number(raw.trim())) && Number(raw.trim()) >= min;

export const configFormSchema = (row: ApiLearningConfigValue) =>
  z
    .object({
      scope: z.enum(['mode', 'all']),
      clear: z.boolean(),
      num: z.string(),
      min: z.string(),
      max: z.string(),
      choice: z.string(),
      list: z.array(z.string()),
      labels: z.array(z.string()),
      text: z.string(),
      reason: z.string(),
    })
    .superRefine((v, ctx) => {
      /* Every change needs a reason (audited with the change). */
      const reason = v.reason.trim();
      if (!reason) issue(ctx, ['reason'], 'Enter a reason.');
      else if (reason.length > 500) issue(ctx, ['reason'], 'Must be at most 500 characters');

      if (v.clear) {
        if (row.kind === 'SYLLABUS') issue(ctx, ['clear'], 'A syllabus value can be changed but not emptied.');
        return;
      }
      const min = row.min ?? 0;
      const unit = row.unit ? ` of ${row.unit}` : '';
      const options = row.options ?? [];
      switch (row.type) {
        case 'integer':
        case 'duration':
          if (!wholeAtLeast(v.num, min)) issue(ctx, ['num'], `Enter a whole number${unit}, at least ${min}.`);
          break;
        case 'percentage': {
          const t = v.num.trim();
          if (!/^\d+(\.\d+)?$/.test(t) || Number(t) > 100) issue(ctx, ['num'], 'Enter a percentage from 0 to 100.');
          break;
        }
        case 'range': {
          const okMin = wholeAtLeast(v.min, min);
          const okMax = wholeAtLeast(v.max, min);
          if (!okMin) issue(ctx, ['min'], `Enter whole numbers${unit}, at least ${min}.`);
          if (!okMax) issue(ctx, ['max'], `Enter whole numbers${unit}, at least ${min}.`);
          if (okMin && okMax && Number(v.min) > Number(v.max)) issue(ctx, ['max'], 'The minimum cannot be greater than the maximum.');
          break;
        }
        case 'enum':
          if (!options.includes(v.choice)) issue(ctx, ['choice'], `Choose one of: ${options.join(', ')}.`);
          break;
        case 'enum-list':
          if (!v.list.length || v.list.some((x) => !options.includes(x))) issue(ctx, ['list'], `Choose one or more of: ${options.join(', ')}, each once.`);
          break;
        case 'labels': {
          const n = row.length ?? v.labels.length;
          v.labels.forEach((l, i) => {
            const t = l.trim();
            if (!t || t.length > 60) issue(ctx, ['labels', i], `Enter ${n} labels of 1 to 60 characters.`);
          });
          break;
        }
        case 'text': {
          const t = v.text.trim();
          if (!t || t.length > 500) issue(ctx, ['text'], 'Enter a text of 1 to 500 characters.');
          break;
        }
      }
    });

/* ---- display ---- */

/* "trainer_marked" → "Trainer marked", "PRESENT" → "Present", "APP" → "App". */
export const optionText = (o: string): string => {
  const s = o.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* "1 hour", "60 hours", "75%". */
export const unitText = (unit: LearningConfigUnit | null, n: number): string => {
  if (!unit) return '';
  if (unit === 'percent') return '%';
  return ` ${n === 1 ? unit.replace(/s$/, '') : unit}`;
};

/* The value as the screen shows it; null is "To Be Confirmed". */
export function formatConfigValue(row: Pick<ApiLearningConfigValue, 'type' | 'unit'>, value: LearningConfigValue | null): string {
  if (value === null) return 'To Be Confirmed';
  switch (row.type) {
    case 'integer':
    case 'duration':
      return typeof value === 'number' ? `${value}${unitText(row.unit, value)}` : String(value);
    case 'percentage':
      return typeof value === 'number' ? `${value}%` : String(value);
    case 'range':
      return isRange(value) ? `${value.min}–${value.max}${unitText(row.unit, value.max)}` : String(value);
    case 'enum':
      return typeof value === 'string' ? optionText(value) : String(value);
    case 'enum-list':
      return Array.isArray(value) ? value.map(optionText).join(', ') : String(value);
    case 'labels':
      return Array.isArray(value) ? value.map((l, i) => `${i + 1} ${l}`).join(' · ') : String(value);
    case 'text':
      return String(value);
  }
}

/* Whether two values are the same (the server writes nothing for an unchanged value). */
export const sameConfigValue = (a: LearningConfigValue | null, b: LearningConfigValue | null): boolean => JSON.stringify(a) === JSON.stringify(b);
