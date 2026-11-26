import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import { FieldValue } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { contactService } from '../services/contactService';
import { contactListPath, type ApiDistrictOffice, type Bilingual } from '../types/contact.types';

/* The website's wording for a field that has not been filled in. */
const NOT_SUPPLIED = 'To be supplied from official records';

/* One language's District Coordinator, address and office hours, as the district's page shows them. */
function LanguageCard({ title, lang, office }: { title: string; lang: keyof Bilingual; office: ApiDistrictOffice }) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      <div className="card-b" lang={lang}>
        <div className="hint">District Coordinator</div>
        <p style={{ margin: '0 0 12px' }}>
          {office.collectorName ? office.collectorName[lang] : <span className="muted">{NOT_SUPPLIED}</span>}
        </p>
        <div className="hint">Office address</div>
        <p style={{ margin: '0 0 12px', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
          {office.address ? office.address[lang] : <span className="muted">{NOT_SUPPLIED}</span>}
        </p>
        <div className="hint">Office hours</div>
        <p style={{ margin: 0 }}>{office.officeHours ? office.officeHours[lang] : <span className="muted">{NOT_SUPPLIED}</span>}</p>
      </div>
    </div>
  );
}

/* View district office — read-only detail page, reached from the View action on the District offices tab. */
export default function DistrictOfficeView() {
  usePageTitle('District Office');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => contactService.getDistrictOffice(id), [id]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const office = detail.data;
  const listPath = contactListPath('offices');
  const title = office ? `${office.district.name} district office` : 'District office';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Contact Page', link: listPath }, { l: title }]}
        title={title}
        badge={office ? <span className="tag">{office.district.code}</span> : undefined}
        back={<BackButton to={listPath} />}
        actions={
          <div className="f ac gp8 wrap">
            {office ? (
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
                        () => contactService.setDistrictOfficeStatus(office.id, !office.isActive),
                        office.isActive ? 'District office deactivated' : 'District office activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {office.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateContactPage">
                  <button type="button" className="btn primary" onClick={() => go(`/cms/contact/offices/${office.id}/edit`)}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {office ? (
        <>
          <div className="grid g2">
            <LanguageCard title="Marathi" lang="mr" office={office} />
            <LanguageCard title="English" lang="en" office={office} />
          </div>

          <div className="card mt14">
            <div className="card-h">
              <h3>District office details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['District', office.district.name],
                  ['District code', office.district.code],
                  /* Marathi first, English underneath, as in the listing. */
                  ['District Coordinator', <FieldValue value={office.collectorName} />],
                  ['Official contact number', office.phone ?? <Dash />],
                  ['Official email', office.email ?? <Dash />],
                  ['Status', <MasterStatusBadge isActive={office.isActive} />],
                  ['On the website', office.isActive ? "Shown on the district's page" : "Hidden from the district's page"],
                  ['Created', fmtDateTime(office.createdAt)],
                  ['Last updated', fmtDateTime(office.updatedAt)],
                ]}
              />
            </div>
          </div>
        </>
      ) : null}

      {office && deleting ? (
        <ConfirmModal
          title="Delete district office"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'contact-district-office', id: office.id }}
          message={`Delete the ${office.district.name} district office? The district's page then shows no District Office Coordinator details. It is soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => contactService.removeDistrictOffice(office.id),
              'District office deleted',
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
