import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Dash, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import SchemeCardPreview from '../components/SchemeCardPreview';
import { FALLBACK_BUTTON_LABEL, SCHEMES_CRUMBS, SCHEMES_TAB_PATH, fmtDeadline, isExpired, schemeEditPath, schemeLabel } from '../constants';
import { schemesService } from '../services/schemesService';
import type { ApiScheme, Bilingual } from '../types/schemes.types';

/* A Marathi / English pair, or a dash when both are blank (optional texts come back as { mr: '', en: '' }). */
const Text = ({ value }: { value: Bilingual }) => (value.mr || value.en ? <Bi value={value} /> : <Dash />);

const hasText = (value: Bilingual) => !!(value.mr.trim() || value.en.trim());

/* Where the card's button leads, said in words: a page of this website, another site, or nowhere yet. */
function Destination({ link }: { link: string | null }) {
  if (!link) return <span className="muted">No link — the button says the page is not available yet</span>;
  return (
    <div>
      <span className="mono">{link}</span>
      <div className="muted fs12">{link.startsWith('/') ? 'A page of the public website' : 'Another site, opened in a new tab'}</div>
    </div>
  );
}

function LastDate({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="muted">No last date</span>;
  return (
    <span className="f ac gp8 wrap">
      <span>{fmtDeadline(deadline)}</span>
      {isExpired(deadline) ? (
        <span className="tag" title="The date has passed. The scheme stays on the website until it is deactivated or deleted.">
          Date passed
        </span>
      ) : null}
    </span>
  );
}

/* The scheme's own button label, or the section's default one that the card prints instead. */
function ButtonLabel({ scheme, fallback }: { scheme: ApiScheme; fallback: Bilingual | null }) {
  if (hasText(scheme.buttonLabel)) return <Bi value={scheme.buttonLabel} />;
  return (
    <div>
      {fallback ? <Bi value={fallback} /> : null}
      <div className="muted fs12">The section&rsquo;s default label</div>
    </div>
  );
}

/*
 * View Scheme — read-only detail page of one SARTHI scheme, reached from the View action (or a click on the row)
 * on the SARTHI Schemes tab of Home Page Management. Loads the saved record by its id.
 */
export default function SchemeView() {
  usePageTitle('Scheme — SARTHI Schemes Management');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => schemesService.get(id), [id]);
  /* Only for the default button label the card shows when the scheme has none of its own. */
  const section = useApiData(() => schemesService.getSection(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const scheme = detail.data;
  const defaultLabel = section.data?.buttonLabel ?? null;

  return (
    <div className="page">
      <PageHead
        crumbs={[...SCHEMES_CRUMBS, { l: 'View' }]}
        title={scheme ? scheme.title.en : 'Scheme'}
        badge={scheme ? <span className="tag">Order {scheme.displayOrder}</span> : undefined}
        back={<BackButton to={SCHEMES_TAB_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {scheme ? (
              <>
                <Can action="deleteScheme">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateScheme">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => schemesService.setStatus(scheme.id, !scheme.isActive),
                        scheme.isActive ? 'Scheme deactivated' : 'Scheme activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {scheme.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateScheme">
                  <button type="button" className="btn primary" onClick={() => go(schemeEditPath(scheme.id))}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {/* Larger, higher-contrast table text than the panel defaults: see .cms-sections in cms-tables.css. */}
      {scheme ? (
        <div className="cms-sections">
          <div className="card mb14">
            <div className="card-h">
              <h3>
                Card preview <span className="sub">as the SARTHI Schemes section shows it</span>
              </h3>
            </div>
            <div className="card-b">
              <SchemeCardPreview
                title={scheme.title}
                description={scheme.description}
                badge={scheme.badge}
                deadline={scheme.deadline ?? ''}
                buttonLabel={hasText(scheme.buttonLabel) ? scheme.buttonLabel : (defaultLabel ?? FALLBACK_BUTTON_LABEL)}
                featured={scheme.featured}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Scheme details</h3>
            </div>
            <FieldTable
              rows={[
                ['Scheme title', <Text value={scheme.title} />],
                ['Description', <Text value={scheme.description} />],
                ['Badge', <Text value={scheme.badge} />],
                ['Last date', <LastDate deadline={scheme.deadline} />],
                ['Button label', <ButtonLabel scheme={scheme} fallback={defaultLabel} />],
                ['Destination (link)', <Destination link={scheme.link} />],
                [
                  'Card style',
                  scheme.featured ? (
                    <Badge tone="amber" nodot>
                      Highlighted
                    </Badge>
                  ) : (
                    'Standard'
                  ),
                ],
                ['Display order', String(scheme.displayOrder)],
                ['Status', <MasterStatusBadge isActive={scheme.isActive} />],
                ['On the website', scheme.isActive ? 'Shown in the SARTHI Schemes section' : 'Hidden from the website'],
                ['Created', fmtDateTime(scheme.createdAt)],
                ['Last updated', fmtDateTime(scheme.updatedAt)],
              ]}
            />
          </div>
        </div>
      ) : null}

      {scheme && deleting ? (
        <ConfirmModal
          title="Delete scheme"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${schemeLabel(scheme)}? The scheme is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => schemesService.remove(scheme.id),
              'Scheme deleted',
              () => {
                setDeleting(false);
                navigate(SCHEMES_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}
