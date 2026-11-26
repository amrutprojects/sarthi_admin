import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Badge, Callout, Card, EmptyState, PageHead } from '../../../components/ui';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import Icon from '../../../components/ui/Icon';
import { ApiError } from '../../../services/api-client';
import { useCan } from '../../auth';
import { ReasonModal, fmtDate } from '../../students';
import { GenerateKeyModal, RotateKeyModal, SecretOnceModal } from '../components/ApiKeyDialogs';
import { lmsSyncKeys, useApiKeys } from '../hooks/useLmsSync';
import { apiKeyApi } from '../services/lmsSyncApi';
import type { ApiKey, ApiKeyState, IssuedApiKey } from '../types/lmsSync.types';

const STATE: Record<ApiKeyState, [string, string]> = {
  ACTIVE: ['Active', 'green'],
  EXPIRING: ['Expiring (rotated)', 'amber'],
  REVOKED: ['Revoked', 'red'],
  EXPIRED: ['Expired', 'grey'],
};
/* An EXPIRING key still works until expiresAt, so it can still be revoked; only ACTIVE keys can be rotated (409 otherwise). */
const isLive = (k: ApiKey) => k.state === 'ACTIVE' || k.state === 'EXPIRING';

/*
 * API keys Sarthi issues to the LMS (the LMS calls Sarthi's /lms-integration endpoints with X-Api-Key). The list shows
 * only each key's prefix; a new secret is shown once, in a dialog, and never kept by the page or the browser.
 */
export default function ApiKeysPage() {
  const can = useCan();
  const qc = useQueryClient();
  const keys = useApiKeys();
  const [dialog, setDialog] = useState<{ kind: 'generate' } | { kind: 'rotate' | 'revoke'; key: ApiKey } | null>(null);
  /* The one-time secret: component state only, dropped when its dialog closes. */
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    document.title = 'LMS API Keys — SARTHI Admin';
  }, []);

  const refresh = () => void qc.invalidateQueries({ queryKey: lmsSyncKeys.apiKeys });
  const onIssued = (r: IssuedApiKey) => {
    setDialog(null);
    setIssued(r);
    refresh();
  };
  const revoke = async (k: ApiKey, reason: string) => {
    setBusy(true);
    try {
      await apiKeyApi.revoke(k.id, reason);
      setDialog(null);
      refresh();
      toastOk(`Key ${k.displayPrefix} revoked. The LMS can no longer use it.`);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const canRotate = can('rotateLmsApiKey');
  const canRevoke = can('revokeLmsApiKey');
  const rows = keys.data ?? [];
  const forbidden = keys.error instanceof ApiError && keys.error.status === 403;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'LMS API Keys' }]}
        title="LMS API Keys"
        sub="Keys the LMS uses to match, create and correct Sarthi students. Secrets are stored hashed and shown only once."
        actions={
          can('createLmsApiKey') ? (
            <button type="button" className="btn primary" onClick={() => setDialog({ kind: 'generate' })}>
              <Icon name="plus" />
              Generate key
            </button>
          ) : null
        }
      />

      {keys.isError ? (
        <div className="mb14">
          <Callout tone="err" title={forbidden ? 'Not permitted. ' : 'Could not load the API keys. '}>
            {forbidden ? (
              'Your role cannot view LMS API keys.'
            ) : (
              <button type="button" className="btn xs" onClick={() => void keys.refetch()}>
                <Icon name="refresh" />
                Retry
              </button>
            )}
          </Callout>
        </div>
      ) : null}

      <Card flush>
        {keys.isPending ? (
          <div className="skel" style={{ height: 160, margin: 14 }} aria-label="Loading API keys" />
        ) : !rows.length && !keys.isError ? (
          <EmptyState title="No API keys yet" msg="Generate a key and give it to the LMS Super Admin for the Sarthi tenant." />
        ) : rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Label</th>
                  <th>Scopes</th>
                  <th>State</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Expires</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => {
                  const [label, tone] = STATE[k.state] ?? [k.state, 'grey'];
                  return (
                    <tr key={k.id}>
                      <td className="mono">{k.displayPrefix}</td>
                      <td>
                        <b>{k.label}</b>
                      </td>
                      <td>
                        <div className="tw-flex tw-flex-wrap tw-gap-1">
                          {k.scopes.map((s) => (
                            <span key={s} className="tag mono">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge tone={tone}>{label}</Badge>
                      </td>
                      <td>{fmtDate(k.createdAt)}</td>
                      <td>{k.lastUsedAt ? fmtDate(k.lastUsedAt) : <span className="muted">Never</span>}</td>
                      <td>{k.state === 'REVOKED' ? fmtDate(k.revokedAt) : fmtDate(k.expiresAt)}</td>
                      <td>
                        <div className="tw-flex tw-justify-end tw-gap-2">
                          {canRotate && k.state === 'ACTIVE' ? (
                            <button type="button" className="btn xs" onClick={() => setDialog({ kind: 'rotate', key: k })}>
                              Rotate
                            </button>
                          ) : null}
                          {canRevoke && isLive(k) ? (
                            <button type="button" className="btn xs danger" onClick={() => setDialog({ kind: 'revoke', key: k })}>
                              Revoke
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {dialog?.kind === 'generate' ? <GenerateKeyModal onIssued={onIssued} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'rotate' ? <RotateKeyModal apiKey={dialog.key} onIssued={onIssued} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'revoke' ? (
        <ReasonModal
          title={`Revoke key ${dialog.key.displayPrefix}`}
          intro={
            <>
              <b>{dialog.key.label}</b> stops working immediately. LMS calls made with it are refused until a new key is entered in the LMS.
              This cannot be undone.
            </>
          }
          confirmLabel="Revoke key"
          danger
          busy={busy}
          onConfirm={(reason) => void revoke(dialog.key, reason)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {issued ? <SecretOnceModal issued={issued} onClose={() => setIssued(null)} /> : null}
    </div>
  );
}
