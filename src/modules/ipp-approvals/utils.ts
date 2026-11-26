import { useEffect } from 'react';
import { ApiError } from '../../services/api-client';

export const APPLICATIONS_PATH = '/ipp-approvals';
export const BATCHES_PATH = '/ipp-approvals/batches';
export const applicationPath = (id: string) => `/ipp-approvals/applications/${id}`;
export const batchPath = (id: string) => `${BATCHES_PATH}/${id}`;

/* Handed to the application's page by a list: the rows around it (Previous / Next) and the list to go back to. */
export interface ListState {
  ids: string[];
  back: string;
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} — SARTHI Admin`;
  }, [title]);
}

export const isStatus = (err: unknown, ...statuses: number[]): boolean => err instanceof ApiError && statuses.includes(err.status);
export const errorText = (err: unknown): string => (err instanceof ApiError ? err.fullMessage : 'Unexpected error');

/* What the last decision did; kept on the page next to the toast. */
export interface NoticeValue {
  tone: 'ok' | 'err';
  text: string;
}

const localDate = (day: string) => new Date(`${day}T00:00:00`);
/* A day without a time ("2026-12-01" → "1 Dec 2026"); anything else is shown as it came. */
export function fmtDay(day: string | null): string {
  if (!day) return '—';
  if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return day;
  return localDate(day.slice(0, 10)).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}
/* "2024-06" → "June 2024" */
export const fmtMonth = (month: string): string =>
  /^\d{4}-\d{2}$/.test(month) ? localDate(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : month;

/* What a form field says: IPP sends readable texts, except dates (type DATE) and months (type MONTH); '' = not answered. */
export function fieldText({ type, text }: { type: string; text: string }): string {
  if (!text) return '—';
  if (type === 'DATE') return fmtDay(text);
  return type === 'MONTH' ? fmtMonth(text) : text;
}

export const fileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
