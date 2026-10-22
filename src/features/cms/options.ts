/*
 * Dropdown feeds of the CMS masters, in one place so no master depends on another master's service.
 *
 * Every feed returns only active, non-deleted rows, A to Z. The /options endpoints are readable by the
 * users of the dependent masters too (a Batch editor can list centres without the Training Centre
 * Master's view permission). The State -> District -> Taluka cascade uses the public geography feed,
 * which serves the same active rows to the public website.
 */
import { request } from '../../services/api-client';
import type { GeoOption } from './types';

const enc = encodeURIComponent;
const get = async (path: string): Promise<GeoOption[]> => (await request<GeoOption[]>(path)).data;

export const masterOptions = {
  states: () => get('/public/geography/states'),
  districtsOfState: (stateId: string) => get(`/public/geography/states/${enc(stateId)}/districts`),
  talukasOfDistrict: (districtId: string) => get(`/public/geography/districts/${enc(districtId)}/talukas`),

  departments: () => get('/cms/departments/options'),
  colleges: () => get('/cms/colleges/options'),
  centreTypes: () => get('/cms/centre-types/options'),
  trainingCentres: () => get('/cms/training-centres/options'),
  batches: () => get('/cms/batches/options'),
};

/*
 * Option shown for a saved parent that is no longer offered (deactivated after the record was created),
 * so an edit form keeps displaying it instead of silently dropping the value.
 */
export const savedOption = (id: string | null, name: string | null, code: string | null, isActive: boolean): GeoOption | null =>
  id && name ? { id, name: name + (isActive ? '' : ' (inactive)'), code } : null;
