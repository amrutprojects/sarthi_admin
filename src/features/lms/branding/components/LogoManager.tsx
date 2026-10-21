import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import { ConfirmModal, toastError, toastOk } from '../../../cms/shared';
import { brandingService } from '../services/brandingService';
import { logoOf } from '../services/brandingOverview';
import { DEFAULT_LOGO_RULES, LOGO_ACCEPT, type ApiBranding, type BrandingLogo, type BrandingSetting, type LogoRules } from '../types/branding.types';
import { logoDimensionError, logoDimensionRule, logoFileError, logoRulesText } from '../validation/branding.validation';
import { fileSize } from './format';
import { readImageSize } from './imageSize';
import LogoPreview from './LogoPreview';

interface LogoManagerProps {
  entityId: string;
  entityName: string;
  setting: BrandingSetting;
  logo: BrandingLogo | null;
  /* The server's logo limits (GET logoRules); shown in the hint and checked before the upload. */
  rules?: LogoRules;
  /* After an upload or removal: the API's updated view. */
  onChanged?: (view: ApiBranding) => void;
  /* True while a file is picked but not uploaded yet (counts as an unsaved change). */
  onPendingChange?: (pending: boolean) => void;
}

/*
 * Logo upload / preview / removal. The logo has its own endpoints (multipart PUT, DELETE), so it is saved by
 * its own buttons at once, not by the form's Save. Removal asks for confirmation; the replaced or removed file
 * stays on the server for the audit history.
 */
export default function LogoManager({ entityId, entityName, setting, logo: initialLogo, rules = DEFAULT_LOGO_RULES, onChanged, onPendingChange }: LogoManagerProps) {
  const [logo, setLogo] = useState<BrandingLogo | null>(initialLogo);
  const [picked, setPicked] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  /* True while the picked file's pixel size is being read. */
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  /* Remounts the file input to clear it. */
  const [inputKey, setInputKey] = useState(0);
  /* Bumped on every pick / clear, so a size read for an earlier file is ignored. */
  const pickSeq = useRef(0);

  useEffect(() => {
    onPendingChange?.(!!picked);
  }, [picked, onPendingChange]);

  const id = 'lb-logo';

  /*
   * Type and size at once; then, when a dimension limit is configured, the pixel size read from the image
   * (the server's own message on a larger one). The server checks every rule again.
   */
  const pick = (file: File | null) => {
    const seq = ++pickSeq.current;
    const local = file ? logoFileError(file, rules) : undefined;
    setPicked(file);
    setError(local);
    setChecking(false);
    if (!file || local || !logoDimensionRule(rules)) return;
    setChecking(true);
    void readImageSize(file).then((size) => {
      if (seq !== pickSeq.current) return;
      setChecking(false);
      setError(size ? logoDimensionError(size, rules) : undefined);
    });
  };

  const clearPick = () => {
    pickSeq.current += 1;
    setPicked(null);
    setError(undefined);
    setChecking(false);
    setInputKey((n) => n + 1);
  };

  const applied = (view: ApiBranding) => {
    setLogo(logoOf(view));
    onChanged?.(view);
  };

  async function upload() {
    if (!picked || busy || checking) return;
    const local = logoFileError(picked, rules);
    if (local) {
      setError(local);
      return;
    }
    setBusy(true);
    try {
      const view = await brandingService.uploadLogo(entityId, picked);
      toastOk('Logo uploaded');
      clearPick();
      applied(view);
    } catch (err) {
      const fileDetail = err instanceof ApiError ? err.details.find((d) => d.field === 'file' || d.field?.endsWith('.file')) : undefined;
      if (fileDetail) setError(fileDetail.message);
      else toastError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const view = await brandingService.removeLogo(entityId);
      toastOk('Logo removed; the platform default applies');
      setRemoving(false);
      applied(view);
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <div className="grid g2">
        <MasterField id={id} label={setting.label} required={setting.required} error={error} hint={`${setting.description} ${logoRulesText(rules)} Uploaded or removed at once, separately from Save changes.`}>
          <input
            key={inputKey}
            type="file"
            className="inp"
            accept={LOGO_ACCEPT}
            {...fieldAria(id, error)}
            disabled={busy}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          {picked ? (
            <div className="f ac gp8 wrap fs12" style={{ marginTop: 6 }}>
              <span>Selected: <b>{picked.name}</b> · {fileSize(picked.size)}</span>
              <button type="button" className="btn xs primary" disabled={busy || checking || !!error} onClick={() => void upload()}>
                {busy ? 'Uploading…' : checking ? 'Checking…' : logo ? 'Replace logo' : 'Upload logo'}
              </button>
              <button type="button" className="btn xs" disabled={busy} onClick={clearPick}>Clear</button>
            </div>
          ) : null}
        </MasterField>
        <div className="fld">
          <label>Current logo</label>
          <LogoPreview entityId={entityId} logo={logo} alt={`Logo of ${entityName}`} />
          {logo ? (
            <div style={{ marginTop: 6 }}>
              <button type="button" className="btn xs" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setRemoving(true)}>
                Remove logo
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {removing ? (
        <ConfirmModal
          title="Remove logo"
          danger
          busy={busy}
          confirmLabel="Remove logo"
          message={`Remove the logo of ${entityName}? The platform default logo is shown until a new one is uploaded. The old file is kept on the server for the audit history.`}
          onClose={() => setRemoving(false)}
          onConfirm={() => void remove()}
        />
      ) : null}
    </div>
  );
}
