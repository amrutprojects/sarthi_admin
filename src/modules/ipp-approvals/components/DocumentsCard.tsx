import { useEffect, useState } from 'react';
import { fmtDateTime, toastError } from '../../../components/feedback/apiFeedback';
import { Badge, Callout } from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import { useShowNames } from '../hooks/useShowNames';
import { auditorLabel } from '../labels';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import type { ApplicationDocument, DocumentFile } from '../types/ippApprovals.types';
import { errorText, fileSize } from '../utils';
import { ForWhom, Wrap } from './common';

type UploadedDocument = ApplicationDocument & { file: DocumentFile };
const isUploaded = (d: ApplicationDocument): d is UploadedDocument => !!d.file;

/* Object URL of one document, streamed from IPP through the API; revoked when it is no longer shown. */
function useDocumentUrl(applicationId: string, doc: UploadedDocument) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { code } = doc;
  const { mime, uploadedAt } = doc.file;
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    ippApprovalsApi
      .documentBlob(applicationId, code, abort.signal)
      .then((b) => {
        if (abort.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([b], { type: mime }));
        setUrl(objectUrl);
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted) setError(errorText(e));
      });
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    /* uploadedAt: a corrected document is another file under the same code. */
  }, [applicationId, code, mime, uploadedAt, attempt]);
  return { url, error, retry: () => setAttempt((n) => n + 1) };
}

/* PDF, image or video in place; anything else can only be downloaded. */
function DocumentView({ url, file }: { url: string; file: DocumentFile }) {
  const height = '68vh';
  if (file.mime === 'application/pdf') return <iframe src={url} title={file.name} style={{ width: '100%', height, border: 0 }} />;
  if (file.mime.startsWith('image/'))
    return <img src={url} alt={file.name} style={{ maxWidth: '100%', maxHeight: height, display: 'block', margin: '0 auto' }} />;
  if (file.mime.startsWith('video/'))
    return (
      <video src={url} controls aria-label={file.name} style={{ width: '100%', maxHeight: height, display: 'block', margin: '0 auto' }} />
    );
  return (
    <Callout tone="info" title="No preview for this kind of file. ">
      Download it to open it.
    </Callout>
  );
}

function VerifiedMark({ doc }: { doc: ApplicationDocument }) {
  const names = useShowNames();
  if (!doc.file) return <span className="muted">—</span>;
  if (!doc.verified) return <Badge tone="amber">Not verified</Badge>;
  return (
    <>
      <Badge tone="green">Verified</Badge>
      {doc.verifiedBy || doc.verifiedAt ? (
        <div className="muted fs12">
          {doc.verifiedBy ? `by ${auditorLabel(doc.verifiedBy, names)}` : ''} {doc.verifiedAt ? fmtDateTime(doc.verifiedAt) : ''}
        </div>
      ) : null}
    </>
  );
}

/* One document at a time, with Previous / Next (buttons or the arrow keys) through every uploaded one. */
function DocumentPreview({
  applicationId,
  docs,
  index,
  onIndex,
  onClose,
}: {
  applicationId: string;
  docs: UploadedDocument[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const doc = docs[index];
  const { url, error, retry } = useDocumentUrl(applicationId, doc);
  const last = docs.length - 1;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* The arrow keys belong to a playing video. */
      if (e.target instanceof HTMLVideoElement) return;
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < last) onIndex(index + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, last, onIndex]);

  return (
    <Modal
      title={`${doc.name} — ${index + 1} of ${docs.length}`}
      size="xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous document">
            ‹ Previous
          </button>
          <button type="button" className="btn" disabled={index >= last} onClick={() => onIndex(index + 1)} aria-label="Next document">
            Next ›
          </button>
          <span style={{ flex: 1 }} />
          <VerifiedMark doc={doc} />
          {url ? (
            <a className="btn" href={url} download={doc.file.name}>
              Download
            </a>
          ) : null}
        </>
      }
    >
      {error ? (
        <div role="alert">
          <Callout tone="err" title="The document could not be opened. ">
            {error}{' '}
            <button type="button" className="btn xs" onClick={retry}>
              Retry
            </button>
          </Callout>
        </div>
      ) : !url ? (
        <div className="skel" style={{ height: 300 }} aria-busy="true" aria-label="Loading document" role="status" />
      ) : (
        <DocumentView url={url} file={doc.file} />
      )}
    </Modal>
  );
}

/* The documents of the form: the IPP Auditor has checked them; the files stay in IPP and are fetched when opened. */
export default function DocumentsCard({ applicationId, documents }: { applicationId: string; documents: ApplicationDocument[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const uploaded = documents.filter(isUploaded);
  const verified = uploaded.filter((d) => d.verified).length;

  const download = async (doc: UploadedDocument) => {
    setDownloading(doc.code);
    try {
      await ippApprovalsApi.downloadDocument(applicationId, doc.code, doc.file.name);
    } catch (err) {
      toastError(err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="card" aria-label="Documents">
      <div className="card-h">
        <h3>Documents</h3>
        <span className="muted fs12">
          {verified} of {uploaded.length} uploaded verified
        </span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">File</th>
              <th scope="col">Verified</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr className="norow">
                <td colSpan={4} className="muted">
                  No documents in this form.
                </td>
              </tr>
            ) : (
              documents.map((d) => (
                <tr key={d.code} className="norow">
                  <td>
                    <Wrap min={96}>
                      {d.name}
                      {d.required ? <span className="muted fs12"> (required)</span> : null}
                      {d.kind === 'VIDEO' ? <span className="muted fs12"> · video</span> : null}
                    </Wrap>
                  </td>
                  <td>
                    {d.file ? (
                      <Wrap min={96}>
                        <span className="tw-break-all">{d.file.name}</span>
                        <div className="muted fs12">{fileSize(d.file.size)}</div>
                      </Wrap>
                    ) : (
                      <span className="muted">Not uploaded</span>
                    )}
                  </td>
                  <td>
                    <Wrap min={104}>
                      <VerifiedMark doc={d} />
                    </Wrap>
                  </td>
                  <td>
                    {isUploaded(d) ? (
                      <div className="tw-relative tw-flex tw-flex-col tw-items-stretch tw-gap-1">
                        <button type="button" className="btn xs" onClick={() => setOpen(uploaded.findIndex((x) => x.code === d.code))}>
                          Preview
                          <ForWhom>{d.name}</ForWhom>
                        </button>
                        <button type="button" className="btn xs" disabled={downloading === d.code} onClick={() => void download(d)}>
                          {downloading === d.code ? 'Downloading…' : 'Download'}
                          <ForWhom>{d.name}</ForWhom>
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {open !== null && uploaded[open] ? (
        <DocumentPreview applicationId={applicationId} docs={uploaded} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      ) : null}
    </section>
  );
}
