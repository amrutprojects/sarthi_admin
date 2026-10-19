import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Overlay';
import { useParams } from 'react-router-dom';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
import { Callout, GenBadge, KvList, PageHead } from '../../../components/ui';
import { ApiError } from '../../../services/api-client';
import { registrationApi } from '../services/registrationApi';

const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;

type FileRow = { id: string; docType: string; originalName: string; mimeType: string };

/* Shows one uploaded image or PDF in a modal; the file is fetched with the session and shown from a local object URL. */
function FilePreview({
  registrationId,
  file,
  title,
  onClose,
}: {
  registrationId: string;
  file: FileRow;
  title: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    registrationApi
      .fileBlob(registrationId, file.id)
      .then((b) => {
        objectUrl = URL.createObjectURL(new Blob([b], { type: file.mimeType }));
        setUrl(objectUrl);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the file'));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [registrationId, file.id, file.mimeType]);
  return (
    <Modal
      title={title}
      size="xl"
      onClose={onClose}
      footer={
        url ? (
          <a className="btn" href={url} download={file.originalName}>
            Download
          </a>
        ) : undefined
      }
    >
      {error ? (
        <Callout tone="err" title="Preview failed. ">
          {error}
        </Callout>
      ) : !url ? (
        <div className="skel" style={{ height: 300 }} aria-busy="true" aria-label="Loading file" />
      ) : file.mimeType === 'application/pdf' ? (
        <iframe src={url} title={file.originalName} style={{ width: '100%', height: '70vh', border: 0 }} />
      ) : (
        <img src={url} alt={file.originalName} style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />
      )}
    </Modal>
  );
}

/* One registration (masked), with its declared and uploaded documents. */
export default function RegistrationDetailPage() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['registrations', 'detail', id], queryFn: () => registrationApi.get(id), enabled: !!id });
  const r = q.data;
  const [preview, setPreview] = useState<{ file: FileRow; title: string } | null>(null);

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
        <div className="grid g2">
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
                  ['Email', r.email ?? '—'],
                  ['Date of birth', r.dateOfBirth ?? '—'],
                  ['Aadhaar', r.aadhaar ?? '—'],
                  ['Mobile', r.mobile ?? '—'],
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
          <div className="card tw-col-span-full">
            <div className="card-h">
              <h3>Documents</h3>
            </div>
            <div className="dt">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col">Document</th>
                      <th scope="col">Required</th>
                      <th scope="col">File</th>
                      <th scope="col">Barcode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.documents.map((d) => {
                      const f = r.files.find((x) => x.docType === d.key);
                      return (
                        <tr key={d.key}>
                          <td>{d.label}</td>
                          <td>{d.required ? 'Yes' : '—'}</td>
                          <td>
                            {f ? (
                              <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                                <span>
                                  {f.originalName} ({kb(f.sizeBytes)})
                                </span>
                                <button type="button" className="btn xs" onClick={() => setPreview({ file: f, title: d.label })}>
                                  Preview
                                </button>
                              </div>
                            ) : d.supplied ? (
                              'Supplied'
                            ) : (
                              'Not uploaded'
                            )}
                          </td>
                          <td className="mono">{d.barcode ?? '—'}</td>
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
      {preview && r ? (
        <FilePreview registrationId={r.id} file={preview.file} title={preview.title} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}
