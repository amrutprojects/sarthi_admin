import { useState } from 'react';
import { Callout } from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import { ApiError, newIdempotencyKey } from '../../../services/api-client';
import { apiKeyApi } from '../services/lmsSyncApi';
import {
  API_KEY_SCOPES,
  API_KEY_SCOPE_LABEL,
  ROTATE_OVERLAP_HOURS,
  type ApiKey,
  type ApiKeyScope,
  type IssuedApiKey,
} from '../types/lmsSync.types';

const errText = (e: unknown) =>
  e instanceof ApiError ? (e.status === 403 ? 'Not permitted: ' : '') + e.fullMessage : 'Something went wrong';
export const overlapLabel = (h: number) =>
  h === 0 ? 'None: the old key stops now' : h < 24 ? `${h} hour${h === 1 ? '' : 's'}` : `${h / 24} days`;

/*
 * Generate a key. The call is made here, not through the query cache, so the secret in the answer lives only in
 * this dialog's state and the one-time view; it is never written to storage.
 */
export function GenerateKeyModal({ onIssued, onClose }: { onIssued: (r: IssuedApiKey) => void; onClose: () => void }) {
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<Set<ApiKeyScope>>(() => new Set(API_KEY_SCOPES));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* One key per dialog: a retried submit after a lost answer does not mint a second key. */
  const [idem] = useState(newIdempotencyKey);
  const ok = label.trim().length >= 3 && scopes.size > 0;
  const toggle = (s: ApiKeyScope) =>
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onIssued(await apiKeyApi.create({ label: label.trim(), scopes: API_KEY_SCOPES.filter((s) => scopes.has(s)) }, idem));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Generate API key"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!ok || busy} onClick={() => void submit()}>
            Generate
          </button>
        </>
      }
    >
      <p className="fs13 mb10" style={{ marginTop: 0 }}>
        The LMS Super Admin enters this key in the Amrut tenant&apos;s provider settings. The secret is shown once.
      </p>
      {error ? (
        <div className="mb10">
          <Callout tone="err">{error}</Callout>
        </div>
      ) : null}
      <div className="fld">
        <label htmlFor="key-label">Label</label>
        <input
          id="key-label"
          className="inp"
          maxLength={80}
          placeholder="e.g. LMS production"
          value={label}
          autoFocus
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <fieldset className="fld" style={{ border: 0, padding: 0 }}>
        <legend className="fs13">Scopes</legend>
        {API_KEY_SCOPES.map((s) => (
          <label key={s} className="tw-flex tw-items-center tw-gap-2 fs13">
            <input type="checkbox" checked={scopes.has(s)} onChange={() => toggle(s)} />
            <span>
              {API_KEY_SCOPE_LABEL[s]} <span className="mono muted">{s}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}

/* Rotate: a new key with the same label and scopes; the old one keeps working for the chosen overlap. */
export function RotateKeyModal({
  apiKey,
  onIssued,
  onClose,
}: {
  apiKey: ApiKey;
  onIssued: (r: IssuedApiKey) => void;
  onClose: () => void;
}) {
  const [overlap, setOverlap] = useState<number>(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idem] = useState(newIdempotencyKey);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onIssued(await apiKeyApi.rotate(apiKey.id, overlap, idem));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Rotate key ${apiKey.prefix}…`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void submit()}>
            Rotate
          </button>
        </>
      }
    >
      <p className="fs13 mb10" style={{ marginTop: 0 }}>
        A new secret is issued for <b>{apiKey.label}</b>. Keep the old key working until the LMS has been updated with the new one.
      </p>
      {error ? (
        <div className="mb10">
          <Callout tone="err">{error}</Callout>
        </div>
      ) : null}
      <div className="fld">
        <label htmlFor="key-overlap">Old key keeps working for</label>
        <select id="key-overlap" className="inp" value={overlap} onChange={(e) => setOverlap(Number(e.target.value))}>
          {ROTATE_OVERLAP_HOURS.map((h) => (
            <option key={h} value={h}>
              {overlapLabel(h)}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}

/*
 * The one-time view of a new secret, with Copy. Closing it drops the secret: the page keeps no copy, and the API
 * stores only a hash, so a lost secret means rotating the key.
 */
export function SecretOnceModal({ issued, onClose }: { issued: IssuedApiKey; onClose: () => void }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued.secret);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };
  return (
    <Modal
      title="Copy the new API key now"
      onClose={onClose}
      footer={
        <button type="button" className="btn primary" onClick={onClose}>
          I have stored the key
        </button>
      }
    >
      <Callout tone="warn" title="Shown once. ">
        This secret will not be shown again. Paste it into the LMS (Amrut provider settings) or a password manager before closing.
      </Callout>
      <div className="fld mt14">
        <label htmlFor="key-secret">
          Key <span className="muted">({issued.key.label})</span>
        </label>
        <div className="tw-flex tw-items-center tw-gap-2">
          <input
            id="key-secret"
            className="inp mono"
            readOnly
            value={issued.secret}
            autoComplete="off"
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn" onClick={() => void copy()}>
            {copied === 'ok' ? 'Copied' : 'Copy'}
          </button>
        </div>
        {copied === 'fail' ? <div className="fs12 mt6">Copy was blocked by the browser; select the key and copy it manually.</div> : null}
      </div>
    </Modal>
  );
}
