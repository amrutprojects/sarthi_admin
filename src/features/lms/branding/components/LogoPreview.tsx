import { useEffect, useState } from 'react';
import { ApiError } from '../../../../services/api-client';
import { brandingService } from '../services/brandingService';
import type { BrandingLogo } from '../types/branding.types';
import { logoMeta } from './format';

interface LogoPreviewProps {
  entityId: string;
  /* null: no logo uploaded, the platform default applies. */
  logo: BrandingLogo | null;
  alt: string;
  /* Largest height the image is drawn at. */
  maxHeight?: number;
}

interface PreviewState {
  src: string | null;
  error: ApiError | null;
  loading: boolean;
}

const frame = {
  border: '1px dashed var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  background: 'var(--surface-2)',
  padding: 12,
  minHeight: 72,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

/*
 * The entity's logo, read through the authenticated GET /lms/branding/:entityId/logo (F-LMS-04-02: streamed to
 * signed-in viewers only). The file is fetched with the session cookie as a Blob and shown through an object URL,
 * revoked when the logo changes or the preview goes away. A new upload has a new SHA-256, which refetches it.
 */
export default function LogoPreview({ entityId, logo, alt, maxHeight = 96 }: LogoPreviewProps) {
  const [state, setState] = useState<PreviewState>({ src: null, error: null, loading: !!logo });
  const [attempt, setAttempt] = useState(0);
  const version = logo?.sha256 ?? null;

  useEffect(() => {
    if (!version) {
      setState({ src: null, error: null, loading: false });
      return;
    }
    const ctrl = new AbortController();
    let objectUrl: string | null = null;
    setState({ src: null, error: null, loading: true });
    brandingService.logoBlob(entityId, ctrl.signal).then(
      (blob) => {
        if (ctrl.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ src: objectUrl, error: null, loading: false });
      },
      (err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ src: null, error: err instanceof ApiError ? err : new ApiError('Could not load the logo', 0, 'ERROR'), loading: false });
      },
    );
    return () => {
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [entityId, version, attempt]);

  if (!logo) {
    return (
      <div style={frame}>
        <span className="muted fs12">No logo uploaded: the platform default logo is used.</span>
      </div>
    );
  }

  return (
    <div>
      <div style={frame} aria-busy={state.loading || undefined}>
        {state.error ? (
          <div className="callout c-err" role="alert" style={{ margin: 0 }}>
            <div>
              <b>Could not load the logo. </b>
              {state.error.fullMessage}{' '}
              <button type="button" className="btn xs" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
            </div>
          </div>
        ) : state.src ? (
          <img src={state.src} alt={alt} style={{ maxHeight, maxWidth: '100%', objectFit: 'contain' }} />
        ) : (
          <div className="skel" style={{ height: Math.min(48, maxHeight), width: 160 }} aria-label="Loading the logo" />
        )}
      </div>
      <div className="muted fs12" style={{ marginTop: 6, wordBreak: 'break-all' }}>{logoMeta(logo)}</div>
    </div>
  );
}
