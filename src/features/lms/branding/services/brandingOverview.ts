import { ApiError } from '../../../../services/api-client';
import type { ApiBranding, BrandingColours, BrandingEntityChoice, BrandingLogo } from '../types/branding.types';
import { settingOf } from '../validation/branding.validation';
import { brandingService } from './brandingService';

/*
 * The Branding listing: every entity with the state of its settings.
 *
 * The API has no summary endpoint (branding is read per entity), so the listing reads the entity list and then
 * GET /lms/branding/:entityId for each entity, a few at a time. LMS entities are few (one learning environment
 * per programme), so this stays a handful of requests. A failed read marks that row only.
 */
export interface BrandingOverviewRow extends BrandingEntityChoice {
  branding: ApiBranding | null;
  error: ApiError | null;
}

export type BrandingConfigState = 'complete' | 'missing' | 'error';

const PARALLEL = 4;

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

export async function loadBrandingOverview(includeInactive: boolean): Promise<BrandingOverviewRow[]> {
  const entities = await brandingService.entities(includeInactive);
  const rows = await mapPool(entities, PARALLEL, async (e): Promise<BrandingOverviewRow> => {
    try {
      return { ...e, branding: await brandingService.get(e.id), error: null };
    } catch (err) {
      return { ...e, branding: null, error: err instanceof ApiError ? err : new ApiError('Failed to load', 0, 'ERROR') };
    }
  });
  /* Every read failed the same way (no access, server down): show that once, with Retry, instead of a column of errors. */
  if (rows.length && rows.every((r) => r.error)) throw rows[0].error;
  return rows;
}

export const configState = (r: BrandingOverviewRow): BrandingConfigState =>
  !r.branding ? 'error' : r.branding.missingRequired.length ? 'missing' : 'complete';

/* Most recent change of any setting; null when nothing was ever set. */
export const lastUpdated = (b: ApiBranding | null): string | null =>
  b?.settings.reduce<string | null>((max, s) => (s.updatedAt && (!max || s.updatedAt > max) ? s.updatedAt : max), null) ?? null;

export const valuesSet = (b: ApiBranding) => b.settings.filter((s) => s.hasValue).length;

export const logoOf = (b: ApiBranding | null): BrandingLogo | null => ((b && settingOf(b, 'logo_storage_key')?.value) ?? null) as BrandingLogo | null;

export const coloursOf = (b: ApiBranding | null): BrandingColours | null => ((b && settingOf(b, 'colours')?.value) ?? null) as BrandingColours | null;

/* Labels of the required settings that are missing ("Support email"). */
export const missingLabels = (b: ApiBranding): string[] =>
  b.missingRequired.map((k) => b.settings.find((s) => s.key === k)?.label ?? k);
