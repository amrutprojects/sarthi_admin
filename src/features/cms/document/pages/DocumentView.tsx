import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../../../../services/api-client';
import Icon from '../../../../components/ui/Icon';
import { GenBadge, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useAuth } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, toastError, useAction, useApiData } from '../../shared';
import RejectDocumentModal from '../components/RejectDocumentModal';
import { documentService } from '../services/documentService';
import { CATEGORY_LABEL, fileSizeLabel, fileTypeLabel, type VerifyDocumentInput } from '../types/document.types';
import { usePageTitle } from '../../useMasterQuery';

const inactive = (isActive: boolean | null) => (isActive === false ? ' (inactive)' : '');

/* View Document — read-only detail page with the file and its verification. */
export default function DocumentView() {
  usePageTitle('Document');
  const { id = '' } = useParams();
  const go = useGo();
  const { user } = useAuth();
  const detail = useApiData(() => documentService.get(id), [id]);
  const { busy, run } = useAction();
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const doc = detail.data;
  const ownUpload = !!doc && !!user && doc.uploadedById === user.id;

  const download = async () => {
    if (!doc) return;
    setDownloading(true);
    try {
      await documentService.download(doc.id, doc.fileName);
    } catch (err) {
      toastError(err);
    } finally {
      setDownloading(false);
    }
  };

  /*
   * Verify or reject the file this page shows: its SHA-256 goes with the decision, and the server refuses
   * (409) when the current file is another one. Either way the dialog closes and the toast explains a
   * refusal; on a 409 the page also reloads, so the approver sees the new file, uploader and hash before
   * deciding again.
   */
  const decide = (input: Omit<VerifyDocumentInput, 'sha256'>, success: string, close: () => void) => {
    if (!doc) return;
    void run(
      async () => {
        try {
          await documentService.verify(doc.id, { ...input, sha256: doc.sha256 });
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) void detail.reload();
          throw err;
        }
      },
      success,
      () => detail.reload(),
    ).finally(close);
  };

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Document Master', link: '/cms/documents' }, { l: doc ? doc.title : 'Document' }]}
        title={doc ? doc.title : 'Document'}
        badge={doc ? <span className="tag">{CATEGORY_LABEL[doc.category] ?? doc.category}</span> : undefined}
        back={<BackButton to="/cms/documents" />}
        actions={
          <div className="f ac gp8 wrap">
            {doc ? (
              <>
                <button type="button" className="btn" disabled={downloading} onClick={() => void download()}>
                  <Icon name="download" />{downloading ? 'Downloading…' : 'Download'}
                </button>
                <Can action="updateCmsDocument">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => documentService.setStatus(doc.id, !doc.isActive),
                        doc.isActive ? 'Document deactivated' : 'Document activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {doc.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateCmsDocument">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/documents/${doc.id}/edit`)}>Edit</button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {doc ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>Document details</h3></div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Title', doc.title],
                  ['Category', CATEGORY_LABEL[doc.category] ?? doc.category],
                  ['Description', doc.description ?? '—'],
                  [
                    'Training centre',
                    doc.centreName ? (
                      <span>
                        {doc.centreName} {doc.centreCode ? <span className="mono muted">{doc.centreCode}</span> : null}
                        {inactive(doc.centreIsActive)}
                      </span>
                    ) : '—',
                  ],
                  [
                    'District',
                    doc.districtName
                      ? `${doc.districtName}${inactive(doc.districtIsActive)}${doc.stateName ? `, ${doc.stateName}${inactive(doc.stateIsActive)}` : ''}`
                      : '—',
                  ],
                  ['Status', <MasterStatusBadge isActive={doc.isActive} />],
                  ['Created', fmtDateTime(doc.createdAt)],
                  ['Last updated', fmtDateTime(doc.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div>
            <div className="card mb14">
              <div className="card-h"><h3>File</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['File name', <span style={{ wordBreak: 'break-all' }}>{doc.fileName}</span>],
                    ['Type', fileTypeLabel(doc.mimeType)],
                    ['Size', fileSizeLabel(doc.fileSize)],
                    ['SHA-256', <span className="mono" title={doc.sha256}>{doc.sha256.slice(0, 16)}…</span>],
                    ['Uploaded by', doc.uploadedByName ?? '—'],
                    ['First uploaded', fmtDateTime(doc.createdAt)],
                  ]}
                />
              </div>
              <div className="card-f">
                <button type="button" className="btn" disabled={downloading} onClick={() => void download()}>
                  <Icon name="download" />{downloading ? 'Downloading…' : 'Download file'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Verification</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Status', <GenBadge status={doc.verificationStatus} />],
                    [doc.verificationStatus === 'REJECTED' ? 'Reason' : 'Note', doc.verificationReason ?? '—'],
                    ['Verified by', doc.verifiedByName ?? '—'],
                    ['Verified at', fmtDateTime(doc.verifiedAt)],
                  ]}
                />
                <div className="hint mt10">
                  {ownUpload
                    ? 'You uploaded the current file, so another approver must verify or reject it.'
                    : 'The person who uploaded the current file cannot verify it; another approver must.'}
                  {doc.isActive ? '' : ' Activate the document before verifying it.'}
                </div>
              </div>
              <Can action="verifyCmsDocument">
                <div className="card-f">
                  <div className="f ac gp8 wrap">
                    {doc.verificationStatus !== 'VERIFIED' ? (
                      <button type="button" className="btn primary" disabled={busy || !doc.isActive} onClick={() => setVerifying(true)}>
                        Verify
                      </button>
                    ) : null}
                    {doc.verificationStatus !== 'REJECTED' ? (
                      <button type="button" className="btn danger" disabled={busy || !doc.isActive} onClick={() => setRejecting(true)}>
                        Reject
                      </button>
                    ) : null}
                  </div>
                </div>
              </Can>
            </div>
          </div>
        </div>
      ) : null}

      {doc && verifying ? (
        <ConfirmModal
          title="Verify document"
          busy={busy}
          confirmLabel="Yes, verify"
          message={`Mark ${doc.title} as verified? Your name and the time are recorded against it.`}
          onClose={() => setVerifying(false)}
          /* Closed either way: a refusal (e.g. 403 for the uploader, 409 for a replaced file) is explained by the toast. */
          onConfirm={() => decide({ status: 'VERIFIED' }, 'Document verified', () => setVerifying(false))}
        />
      ) : null}
      {doc && rejecting ? (
        <RejectDocumentModal
          title={doc.title}
          busy={busy}
          onClose={() => setRejecting(false)}
          onReject={(reason) => decide({ status: 'REJECTED', reason }, 'Document rejected', () => setRejecting(false))}
        />
      ) : null}
    </div>
  );
}
