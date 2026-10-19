/* The four reference-data masters (backend src/modules/masters/master.definitions.ts). */
export type MasterKey = 'region' | 'caste' | 'documentType' | 'education';

export interface MasterConfig {
  key: MasterKey;
  /* Backend path under /api/v1. */
  path: string;
  label: string;
  plural: string;
  /* Permission prefix: <permission>.view|create|update|status|delete. */
  permission: string;
  codeMax: number;
  nameMax: number;
  hasMandatory?: boolean;
}

export const MASTERS: MasterConfig[] = [
  { key: 'region', path: 'regions', label: 'Region', plural: 'Regions', permission: 'regions', codeMax: 10, nameMax: 150 },
  { key: 'caste', path: 'castes', label: 'Caste', plural: 'Castes', permission: 'castes', codeMax: 20, nameMax: 80 },
  {
    key: 'documentType',
    path: 'document-types',
    label: 'Document type',
    plural: 'Document types',
    permission: 'document-types',
    codeMax: 20,
    nameMax: 150,
    hasMandatory: true,
  },
  { key: 'education', path: 'education', label: 'Education', plural: 'Education', permission: 'education', codeMax: 20, nameMax: 150 },
];

export type MasterAction = 'view' | 'create' | 'update' | 'status' | 'delete';
export const masterPermission = (m: MasterConfig, a: MasterAction) => `${m.permission}.${a}`;
