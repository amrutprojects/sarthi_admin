import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { fmtDateTime, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, GenBadge, KvList, PageHead } from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import { ApiError } from '../../../services/api-client';
import { useAuth } from '../../auth';
import { registrationApi, type RegistrationFile } from '../services/registrationApi';

const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;
const AADHAAR_DOC = 'AADHAAR_CARD';

/* Object URL for one uploaded file, fetched with the session; revoked when no longer shown. */
function useFileUrl(registrationId: string, file: RegistrationFile | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setError(null);
    registrationApi
      .fileBlob(registrationId, file.id)
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([b], { type: file.mimeType }));
        setUrl(objectUrl);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load the file'));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [registrationId, file]);
  return { url, error };
}

function FileView({ url, file, height }: { url: string; file: RegistrationFile; height: string }) {
  return file.mimeType === 'application/pdf' ? (
    <iframe src={url} title={file.originalName} style={{ width: '100%', height, border: 0 }} />
  ) : (
    <img src={url} alt={file.originalName} style={{ maxWidth: '100%', maxHeight: height, display: 'block', margin: '0 auto' }} />
  );
}

function VerifiedTag({ file }: { file: RegistrationFile }) {
  return file.verifiedAt ? (
    <span title={`Verified by ${file.verifiedBy ?? '—'} on ${fmtDateTime(file.verifiedAt)}`}>
      <Badge tone="green">Verified</Badge>
    </span>
  ) : (
    <Badge tone="amber">Pending</Badge>
  );
}

/* One uploaded file in a modal, with Verify once the reviewer has looked at it. */
function FilePreview({
  registrationId,
  file,
  title,
  canVerify,
  verifying,
  onVerify,
  onClose,
}: {
  registrationId: string;
  file: RegistrationFile;
  title: string;
  canVerify: boolean;
  verifying: boolean;
  onVerify: () => void;
  onClose: () => void;
}) {
  const { url, error } = useFileUrl(registrationId, file);
  return (
    <Modal
      title={title}
      size="xl"
      onClose={onClose}
      footer={
        <>
          {url ? (
            <a className="btn" href={url} download={file.originalName}>
              Download
            </a>
          ) : null}
          {file.verifiedAt ? (
            <VerifiedTag file={file} />
          ) : canVerify ? (
            <button type="button" className="btn primary" disabled={!url || verifying} onClick={onVerify}>
              {verifying ? 'Verifying…' : 'Verify document'}
            </button>
          ) : null}
        </>
      }
    >
      {error ? (
        <Callout tone="err" title="Preview failed. ">
          {error}
        </Callout>
      ) : !url ? (
        <div className="skel" style={{ height: 300 }} aria-busy="true" aria-label="Loading file" />
      ) : (
        <FileView url={url} file={file} height="70vh" />
      )}
    </Modal>
  );
}

/*
 * Hovering the Aadhaar number shows the uploaded Aadhaar card beside it, for a quick cross-check. The card is drawn in a
 * portal with fixed positioning, so the scrolling details column cannot clip it.
 */
function AadhaarHover({ registrationId, value, card }: { registrationId: string; value: string; card?: RegistrationFile }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const { url, error } = useFileUrl(registrationId, pos ? card : undefined);
  const WIDTH = 420;
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const fitsRight = r.right + 12 + WIDTH <= window.innerWidth - 8;
    const left = fitsRight ? r.right + 12 : Math.max(8, r.left - WIDTH - 12);
    const top = Math.min(Math.max(8, r.top + r.height / 2 - 170), window.innerHeight - 348);
    setPos({ left, top });
  };
  return (
    <span
      style={{ display: 'inline-block', cursor: card ? 'zoom-in' : 'default' }}
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={() => setPos(null)}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={() => setPos(null)}
      tabIndex={0}
      aria-label={card ? 'Aadhaar number; hover to see the Aadhaar card' : 'Aadhaar number'}
    >
      <span className="mono" style={{ borderBottom: card ? '1px dashed currentColor' : undefined }}>
        {value}
      </span>
      {pos
        ? createPortal(
            <div
              role="tooltip"
              className="card"
              style={{ position: 'fixed', left: pos.left, top: pos.top, width: WIDTH, zIndex: 300, padding: 8, pointerEvents: 'none' }}
            >
              <div className="tw-mb-1 tw-text-xs tw-font-semibold tw-text-ink-2">Aadhaar card</div>
              {!card ? (
                <div className="tw-text-xs tw-text-ink-muted">No Aadhaar card uploaded.</div>
              ) : error ? (
                <div className="tw-text-xs tw-text-danger">{error}</div>
              ) : !url ? (
                <div className="skel" style={{ height: 200 }} aria-busy="true" />
              ) : (
                <FileView url={url} file={card} height="300px" />
              )}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

/* One registration (masked): details on the left (scrolls on its own), documents with preview and verification on the right. */
export default function RegistrationDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { permissions } = useAuth();
  const canVerify = permissions.has('registrations.update');
  const q = useQuery({ queryKey: ['registrations', 'detail', id], queryFn: () => registrationApi.get(id), enabled: !!id });
  const r = q.data;
  const [preview, setPreview] = useState<{ fileId: string; title: string } | null>(null);
  /* Verify becomes available once the reviewer has opened the file in this visit. */
  const [previewed, setPreviewed] = useState<Set<string>>(new Set());
  const verify = useMutation({
    mutationFn: (fileId: string) => registrationApi.verifyDocument(id, fileId),
    onSuccess: () => {
      toastOk('Document verified');
      void qc.invalidateQueries({ queryKey: ['registrations', 'detail', id] });
    },
    onError: toastError,
  });
  const open = (file: RegistrationFile, title: string) => {
    setPreviewed((s) => new Set(s).add(file.id));
    setPreview({ fileId: file.id, title });
  };
  const previewFile = r?.files.find((f) => f.id === preview?.fileId);
  const uploaded = r?.files.length ?? 0;
  const verifiedCount = r?.files.filter((f) => f.verifiedAt).length ?? 0;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '#/dashboard' },
          { l: 'Student Registration', link: '#/student-registrations' },
          { l: r?.code ?? 'Registration' },
        ]}
        title={r ? `${r.name} — ${r.code}` : 'Registration'}
        badge={r ? <GenBadge status={r.status} /> : undefined}
      />
      {q.isError ? (
        <Callout tone="err" title="Could not load the registration. ">
          {q.error instanceof ApiError ? q.error.fullMessage : 'Unexpected error'}
        </Callout>
      ) : !r ? (
        <div className="skel" style={{ height: 200 }} aria-busy="true" aria-label="Loading registration" />
      ) : (
        <div className="tw-grid tw-grid-cols-1 tw-items-start tw-gap-4 lg:tw-grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div
            className="tw-flex tw-flex-col tw-gap-4 lg:tw-sticky lg:tw-top-4 lg:tw-max-h-[calc(100vh-150px)] lg:tw-overflow-y-auto"
            aria-label="Registration details"
          >
            <div className="card">
              <div className="card-h">
                <h3>Basic details</h3>
              </div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['First name', r.firstName],
                    ['Last name', r.lastName],
                    ['Father name', r.fatherName],
                    ['Mother name', r.motherName],
                    ['Email', r.unmasked?.email ?? r.email ?? '—'],
                    ['Date of birth', r.dateOfBirth ?? '—'],
                    [
                      'Aadhaar',
                      r.aadhaar ? (
                        <AadhaarHover
                          registrationId={r.id}
                          value={r.unmasked?.aadhaar ?? r.aadhaar}
                          card={r.files.find((f) => f.docType === AADHAAR_DOC)}
                        />
                      ) : (
                        '—'
                      ),
                    ],
                    ['Mobile', r.unmasked?.mobile ?? r.mobile ?? '—'],
                    ['Religion', r.religion],
                    ['Caste', r.caste],
                  ]}
                />
              </div>
            </div>
            <div className="card">
              <div className="card-h">
                <h3>Course</h3>
              </div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Course centre', r.centreName ?? r.centreCode ?? '—'],
                    ['Technology', r.trackName ?? r.trackSourceValue],
                    ['Education qualification', r.educationQualification],
                    ['Declaration accepted', r.declarationAccepted ? 'Yes' : 'No'],
                    ['Submitted', fmtDateTime(r.createdAt)],
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Scrolls on its own, like the details: the header stays visible while the table scrolls. */}
          <div className="card tw-flex tw-flex-col lg:tw-sticky lg:tw-top-4 lg:tw-max-h-[calc(100vh-150px)]" aria-label="Documents">
            <div className="card-h">
              <h3>Documents</h3>
              <span className="tw-text-xs tw-text-ink-muted">
                {verifiedCount} of {uploaded} uploaded verified
              </span>
            </div>
            <div className="dt tw-min-h-0 tw-flex-1 tw-overflow-auto">
              <div className="tbl-wrap" style={{ overflow: 'visible' }}>
                <table className="tbl">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface-2, #fff8f0)' }}>
                    <tr>
                      <th scope="col">Document</th>
                      <th scope="col">File</th>
                      <th scope="col">Barcode</th>
                      <th scope="col">Status</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.documents.map((d) => {
                      const f = r.files.find((x) => x.docType === d.key);
                      return (
                        <tr key={d.key}>
                          <td>
                            {d.label}
                            {d.required ? <span className="tw-text-danger"> *</span> : null}
                          </td>
                          <td className="tw-break-all">
                            {f ? (
                              <>
                                {f.originalName}
                                <div className="tw-text-xs tw-text-ink-muted">{kb(f.sizeBytes)}</div>
                              </>
                            ) : d.supplied ? (
                              'Supplied'
                            ) : (
                              <span className="tw-text-ink-muted">Not uploaded</span>
                            )}
                          </td>
                          <td className="mono">{d.barcode ?? '—'}</td>
                          <td>{f ? <VerifiedTag file={f} /> : '—'}</td>
                          <td>
                            {f ? (
                              <div className="tw-flex tw-flex-wrap tw-gap-1">
                                <button type="button" className="btn xs" onClick={() => open(f, d.label)}>
                                  Preview
                                </button>
                                {canVerify && !f.verifiedAt ? (
                                  <button
                                    type="button"
                                    className="btn xs primary"
                                    disabled={!previewed.has(f.id) || verify.isPending}
                                    title={previewed.has(f.id) ? 'Mark this document as verified' : 'Preview the document first'}
                                    onClick={() => verify.mutate(f.id)}
                                  >
                                    Verify
                                  </button>
                                ) : null}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {preview && r && previewFile ? (
        <FilePreview
          registrationId={r.id}
          file={previewFile}
          title={preview.title}
          canVerify={canVerify}
          verifying={verify.isPending}
          onVerify={() => verify.mutate(previewFile.id)}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
