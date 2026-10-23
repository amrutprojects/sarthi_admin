import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal, fmtDateTime, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, KvList, PageHead } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
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

/*
 * Uploaded files in a modal, one at a time, with Previous / Next (buttons or the arrow keys) through every uploaded
 * document, and Verify for the one on screen.
 */
function FilePreview({
  registrationId,
  file,
  title,
  index,
  total,
  canVerify,
  verifying,
  onVerify,
  onPrev,
  onNext,
  onClose,
}: {
  registrationId: string;
  file: RegistrationFile;
  title: string;
  index: number;
  total: number;
  canVerify: boolean;
  verifying: boolean;
  onVerify: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const { url, error } = useFileUrl(registrationId, file);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && index > 0) onPrev();
      if (e.key === 'ArrowRight' && index < total - 1) onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, total, onPrev, onNext]);
  return (
    <Modal
      title={`${title} — ${index + 1} of ${total}`}
      size="xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" disabled={index === 0} onClick={onPrev} aria-label="Previous document">
            ‹ Previous
          </button>
          <button type="button" className="btn" disabled={index >= total - 1} onClick={onNext} aria-label="Next document">
            Next ›
          </button>
          <span style={{ flex: 1 }} />
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
function AadhaarHover({
  registrationId,
  value,
  card,
  canVerify,
  verifying,
  onVerify,
}: {
  registrationId: string;
  value: string;
  card?: RegistrationFile;
  canVerify: boolean;
  verifying: boolean;
  onVerify: () => void;
}) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const { url, error } = useFileUrl(registrationId, pos ? card : undefined);
  /* The card stays open while the pointer moves from the number onto it, so its Verify button can be clicked. */
  const closeTimer = useRef<number | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setPos(null), 200);
  };
  useEffect(() => cancelClose, []);
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
      onMouseEnter={(e) => {
        cancelClose();
        show(e.currentTarget);
      }}
      onMouseLeave={closeSoon}
      onFocus={(e) => show(e.currentTarget)}
      tabIndex={0}
      aria-label={card ? 'Aadhaar number; hover to see the Aadhaar card' : 'Aadhaar number'}
    >
      <span className="mono" style={{ borderBottom: card ? '1px dashed currentColor' : undefined }}>
        {value}
      </span>
      {pos
        ? createPortal(
            <div
              role="dialog"
              aria-label="Aadhaar card"
              className="card"
              style={{ position: 'fixed', left: pos.left, top: pos.top, width: WIDTH, zIndex: 300, padding: 8 }}
              onMouseEnter={cancelClose}
              onMouseLeave={closeSoon}
            >
              <div className="tw-mb-1 tw-flex tw-items-center tw-justify-between tw-gap-2">
                <span className="tw-text-xs tw-font-semibold tw-text-ink-2">Aadhaar card</span>
                {card ? (
                  card.verifiedAt ? (
                    <VerifiedTag file={card} />
                  ) : canVerify ? (
                    <button type="button" className="btn xs primary" disabled={!url || verifying} onClick={onVerify}>
                      {verifying ? 'Verifying…' : 'Verify'}
                    </button>
                  ) : null
                ) : null}
              </div>
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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { permissions } = useAuth();
  const canVerify = permissions.has('registrations.update');
  const q = useQuery({ queryKey: ['registrations', 'detail', id], queryFn: () => registrationApi.get(id), enabled: !!id });
  const r = q.data;
  /* Index into `slides` (uploaded documents in table order) of the file open in the preview. */
  const [slide, setSlide] = useState<number | null>(null);
  /* Verify becomes available once the reviewer has opened the file in this visit. */
  const [previewed, setPreviewed] = useState<Set<string>>(new Set());
  /* Every Verify asks for confirmation first: verification is recorded with the reviewer's name and cannot be undone here. */
  const [confirming, setConfirming] = useState<{ file: RegistrationFile; title: string } | null>(null);
  const askVerify = (file: RegistrationFile, title: string) => setConfirming({ file, title });
  const verify = useMutation({
    mutationFn: (fileId: string) => registrationApi.verifyDocument(id, fileId),
    onSuccess: () => {
      setConfirming(null);
      toastOk('Document verified');
      void qc.invalidateQueries({ queryKey: ['registrations', 'detail', id] });
    },
    onError: toastError,
  });
  const slides = (r?.documents ?? []).flatMap((d) => {
    const file = r?.files.find((x) => x.docType === d.key);
    return file ? [{ file, title: d.label }] : [];
  });
  const goTo = (i: number) => {
    const target = slides[i];
    if (!target) return;
    setPreviewed((p) => new Set(p).add(target.file.id));
    setSlide(i);
  };
  const open = (file: RegistrationFile) => goTo(slides.findIndex((x) => x.file.id === file.id));
  const current = slide !== null ? slides[slide] : undefined;
  const aadhaarCard = r?.files.find((f) => f.docType === AADHAAR_DOC);
  const uploaded = r?.files.length ?? 0;
  const verifiedCount = r?.files.filter((f) => f.verifiedAt).length ?? 0;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '#/dashboard' },
          { l: 'Student Registration', link: '#/student-registrations' },
          { l: r?.registrationNumber ?? 'Student' },
        ]}
        title={r ? `${r.name} — ${r.registrationNumber ?? '—'}` : 'Student'}
        actions={
          /* Back always returns to the list (one level up), never browser history. */
          <button type="button" className="btn" onClick={() => navigate('/student-registrations')}>
            <Icon name="chevL" />
            Back
          </button>
        }
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
                          card={aadhaarCard}
                          canVerify={canVerify}
                          verifying={verify.isPending}
                          onVerify={() => aadhaarCard && askVerify(aadhaarCard, 'Aadhaar Card')}
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
                    ['Registration no.', <span className="mono">{r.registrationNumber ?? '—'}</span>],
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
                                <button type="button" className="btn xs" onClick={() => open(f)}>
                                  Preview
                                </button>
                                {canVerify && !f.verifiedAt ? (
                                  <button
                                    type="button"
                                    className="btn xs primary"
                                    disabled={!previewed.has(f.id) || verify.isPending}
                                    title={previewed.has(f.id) ? 'Mark this document as verified' : 'Preview the document first'}
                                    onClick={() => askVerify(f, d.label)}
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
      {r && current && slide !== null ? (
        <FilePreview
          registrationId={r.id}
          file={current.file}
          title={current.title}
          index={slide}
          total={slides.length}
          canVerify={canVerify}
          verifying={verify.isPending}
          onVerify={() => askVerify(current.file, current.title)}
          onPrev={() => goTo(slide - 1)}
          onNext={() => goTo(slide + 1)}
          onClose={() => setSlide(null)}
        />
      ) : null}
      {confirming ? (
        <ConfirmModal
          title="Verify document"
          busy={verify.isPending}
          confirmLabel="Yes, verify"
          message={`Verify "${confirming.title}" (${confirming.file.originalName})? You confirm that you checked it against the student's details. Your name and the time are recorded.`}
          onClose={() => setConfirming(null)}
          onConfirm={() => verify.mutate(confirming.file.id)}
        />
      ) : null}
    </div>
  );
}
