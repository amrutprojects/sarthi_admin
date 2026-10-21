import { normalizeName, optionalValue, requireSelection, validateText, type FieldErrors } from '../../validation';
import { DOCUMENT_MAX_FILE_MB, type DocumentCategory, type DocumentField } from '../types/document.types';

export interface DocumentFormValues {
  title: string;
  category: '' | DocumentCategory;
  description: string;
  /* Drives the District dropdown only; never submitted (the server stores the district). */
  stateId: string;
  districtId: string;
  centreId: string;
  /* Chosen file. Required on create; on edit, null keeps the current file. */
  file: File | null;
  isActive: boolean;
}

export const emptyDocumentForm = (centreId = ''): DocumentFormValues => ({
  title: '',
  category: '',
  description: '',
  stateId: '',
  districtId: '',
  centreId,
  file: null,
  isActive: true,
});

/* What is actually sent to the API: normalised title, null for empty optionals, the file only when one was chosen. */
export interface DocumentPayload {
  title: string;
  category: DocumentCategory;
  description: string | null;
  districtId: string | null;
  centreId: string | null;
  isActive: boolean;
  file: File | null;
}

export const normalizeDocumentForm = (v: DocumentFormValues): DocumentPayload => ({
  title: normalizeName(v.title),
  category: v.category as DocumentCategory,
  description: optionalValue(v.description),
  districtId: v.districtId || null,
  centreId: v.centreId || null,
  isActive: v.isActive,
  file: v.file,
});

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
export const FILE_RULE = `Choose a PDF, JPG or PNG file of at most ${DOCUMENT_MAX_FILE_MB} MB`;

/* Extension and size only: a convenience. The server decides the type from the file content. */
export function validateDocumentFile(file: File | null, required: boolean): string | undefined {
  if (!file) return required ? 'Choose the document file (PDF, JPG or PNG)' : undefined;
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `${FILE_RULE}. "${file.name}" is not one of these types.`;
  if (file.size === 0) return `${FILE_RULE}. The chosen file is empty.`;
  if (file.size > DOCUMENT_MAX_FILE_MB * 1024 * 1024) return `${FILE_RULE}. The chosen file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`;
  return undefined;
}

/* Same rules as the backend title: 3–150 characters after trimming, any printable text. */
function validateTitle(raw: string): string | undefined {
  const value = normalizeName(raw);
  if (!value) return 'Title is required';
  if (value.length < 3) return 'Title must be at least 3 characters';
  if (value.length > 150) return 'Title must be at most 150 characters';
  if (/\p{Cc}/u.test(value)) return 'Title may use printable characters only';
  return undefined;
}

export function validateDocumentForm(v: DocumentFormValues, { fileRequired }: { fileRequired: boolean }): FieldErrors<DocumentField> {
  return {
    title: validateTitle(v.title),
    category: requireSelection(v.category, 'Category'),
    description: validateText(v.description, 'Description', { max: 500 }),
    file: validateDocumentFile(v.file, fileRequired),
  };
}

/* Reason for a rejection, as the server checks it: 5 to 300 characters after trimming. */
export function validateRejectReason(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return 'Give the reason for rejecting';
  if (v.length < 5) return 'The reason must be at least 5 characters';
  if (v.length > 300) return 'The reason must be at most 300 characters';
  return undefined;
}
