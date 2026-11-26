import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { trainingCentreService } from '../services/trainingCentreService';
import { contactListPath, type Bilingual } from '../types/contact.types';
import { centrePath, type ApiTrainingCentre } from '../types/trainingCentre.types';

/* One language's name, address and centre manager, as the district's page shows them. */
function LanguageCard({ title, lang, centre }: { title: string; lang: keyof Bilingual; centre: ApiTrainingCentre }) {
  const notGiven = <span className="muted">Not shown on the website</span>;
  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      <div className="card-b" lang={lang}>
        <div className="hint">Centre name</div>
        <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{centre.name[lang]}</p>
        <div className="hint">Address</div>
        <p style={{ margin: '0 0 12px', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{centre.address ? centre.address[lang] : notGiven}</p>
        <div className="hint">Centre manager</div>
        <p style={{ margin: 0 }}>{centre.managerName ? centre.managerName[lang] : notGiven}</p>
      </div>
    </div>
  );
}

/* View training centre — read-only detail page, reached from the View action on the Training centres tab. */
export default function TrainingCentreView() {
  usePageTitle('Training Centre');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => trainingCentreService.get(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const centre = detail.data;
  const listPath = contactListPath('centres');
  const title = centre ? centre.name.en : 'Training centre';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Contact Page', link: listPath }, { l: title }]}
        title={title}
        badge={centre ? <span className="tag">{centre.district.name}</span> : undefined}
        back={<BackButton to={listPath} />}
        actions={
          <div className="f ac gp8 wrap">
            {centre ? (
              <>
                <Can action="updateContactPage">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateContactPage">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => trainingCentreService.setStatus(centre.id, !centre.isActive),
                        centre.isActive ? 'Training centre deactivated' : 'Training centre activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {centre.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateContactPage">
                  <button type="button" className="btn primary" onClick={() => go(centrePath(centre.id, true))}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {centre ? (
        <>
          <div className="grid g2">
            <LanguageCard title="Marathi" lang="mr" centre={centre} />
            <LanguageCard title="English" lang="en" centre={centre} />
          </div>

          <div className="card mt14">
            <div className="card-h">
              <h3>Training centre details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['District', centre.district.name],
                  ['District code', centre.district.code],
                  ['Phone', centre.phone ?? <Dash />],
                  ['Email', centre.email ?? <Dash />],
                  ['Display order', String(centre.displayOrder)],
                  ['Status', <MasterStatusBadge isActive={centre.isActive} />],
                  ['On the website', centre.isActive ? "Shown on the district's page" : "Hidden from the district's page"],
                  ['Created', fmtDateTime(centre.createdAt)],
                  ['Last updated', fmtDateTime(centre.updatedAt)],
                ]}
              />
            </div>
          </div>
        </>
      ) : null}

      {centre && deleting ? (
        <ConfirmModal
          title="Delete training centre"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'contact-training-centre', id: centre.id }}
          message={`Delete ${centre.name.en}? It is no longer listed on the ${centre.district.name} page. It is soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => trainingCentreService.remove(centre.id),
              'Training centre deleted',
              () => {
                setDeleting(false);
                navigate(listPath);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}
