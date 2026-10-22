/* Form Field Configuration API (backend /api/v1/lms/form-fields). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../../cms/components/MasterTable';
import type {
  ApiFormField, CreateFormFieldInput, EffectiveFormConfiguration, FormFieldFormOptions, FormSectionSummary, UpdateFormFieldInput,
} from '../types/formField.types';

const enc = encodeURIComponent;
const BASE = '/lms/form-fields';

type Flag = '' | 'true' | 'false';

/* Sortable columns (?sortBy=): position = form, section, order within the section. */
export type FormFieldSortField = 'position' | 'label' | 'fieldCode' | 'createdAt' | 'updatedAt';

export interface FormFieldQuery extends MasterQuery {
  formCode: string;
  /* '' = no filter. */
  sectionCode: string;
  isRequired: Flag;
  isVisible: Flag;
  /* 'true' = custom fields, 'false' = standard fields. */
  isCustom: Flag;
  /* true = only the soft-deleted fields ("Show deleted"), with the same search, filters, sort and paging. */
  deleted: boolean;
}

export interface FormFieldFilters {
  formCode?: string;
  sectionCode?: string;
  isActive?: Flag;
  isRequired?: Flag;
  isVisible?: Flag;
  isCustom?: Flag;
}

/* An empty filter means "any", so it is left off entirely. */
const filterParams = (f: FormFieldFilters) => ({
  formCode: f.formCode || undefined,
  sectionCode: f.sectionCode || undefined,
  isActive: f.isActive || undefined,
  isRequired: f.isRequired || undefined,
  isVisible: f.isVisible || undefined,
  isCustom: f.isCustom || undefined,
});

const listParams = (q: FormFieldQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  ...filterParams({
    formCode: q.formCode,
    sectionCode: q.sectionCode,
    isActive: q.status,
    isRequired: q.isRequired,
    isVisible: q.isVisible,
    isCustom: q.isCustom,
  }),
  deleted: q.deleted ? 'true' : undefined,
});

export interface FormFieldPage {
  items: ApiFormField[];
  meta?: PageMeta;
  /* True when the rows came from the deleted=true listing: every one of them is soft-deleted. */
  deleted?: boolean;
}

export const formFieldService = {
  list: async (q: FormFieldQuery): Promise<FormFieldPage> => {
    const { data, meta } = await request<ApiFormField[]>(BASE, { query: listParams(q) });
    return { items: data, meta, deleted: q.deleted };
  },

  /* The field with storedValues / typeLocked. */
  get: async (id: string): Promise<ApiFormField> => (await request<ApiFormField>(`${BASE}/${enc(id)}`)).data,

  /* 'Add custom field'. */
  create: async (input: CreateFormFieldInput): Promise<ApiFormField> =>
    (await request<ApiFormField>(BASE, { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateFormFieldInput): Promise<ApiFormField> =>
    (await request<ApiFormField>(`${BASE}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  /* Custom field ACTIVE ↔ ARCHIVED. */
  setStatus: async (id: string, isActive: boolean): Promise<ApiFormField> =>
    (await request<ApiFormField>(`${BASE}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  /* Soft delete of a custom field no record holds a value for (otherwise 409 FIELD_HAS_VALUES). */
  remove: async (id: string): Promise<void> => {
    await request<null>(`${BASE}/${enc(id)}`, { method: 'DELETE' });
  },

  /* Brings a deleted custom field back, archived. */
  restore: async (id: string): Promise<ApiFormField> => (await request<ApiFormField>(`${BASE}/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many fields match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: FormFieldFilters = {}): Promise<number> => {
    const { meta } = await request<ApiFormField[]>(BASE, { query: { page: 1, limit: 1, ...filterParams(filters) } });
    return meta?.total ?? 0;
  },

  /* Forms and their sections, custom data types with their rules, stages, sensitivities, languages. */
  formOptions: async (): Promise<FormFieldFormOptions> => (await request<FormFieldFormOptions>(`${BASE}/form-options`)).data,

  /* Every section of a form: standard ones, then each custom section in use (hidden and archived fields included). */
  sections: async (formCode: string): Promise<FormSectionSummary[]> =>
    (await request<FormSectionSummary[]>(`${BASE}/forms/${enc(formCode)}/sections`)).data,

  /* What the form renders and the server enforces: visible, active fields by section, in display order. */
  effective: async (formCode: string): Promise<EffectiveFormConfiguration> =>
    (await request<EffectiveFormConfiguration>(`${BASE}/forms/${enc(formCode)}/effective`)).data,
};
