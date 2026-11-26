import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import CardPreview from '../components/CardPreview';
import { ECOSYSTEM_CRUMBS, ECOSYSTEM_TAB_PATH, ecosystemEditPath, iconLabel, programmeLabel } from '../constants';
import { ecosystemService } from '../services/ecosystemService';
import type { Bilingual } from '../types/ecosystem.types';

/* Printed on a card without a label of its own until the section's default has loaded, as the form does. */
const FALLBACK_LABEL: Bilingual = { mr: 'अधिक जाणून घ्या →', en: 'Learn more →' };

/* One language of a pair, or a dash when it is blank. Text is shown as text, never as HTML. */
const Text = ({ value, lang }: { value: string; lang: keyof Bilingual }) =>
  value ? (
    <span lang={lang} style={{ whiteSpace: 'pre-line' }}>
      {value}
    </span>
  ) : (
    <span className="muted">—</span>
  );

/* Where the card's link leads: a page of the public site, another site, or nowhere. */
const Destination = ({ link }: { link: string | null }) =>
  !link ? (
    <span className="muted">No link — the card shows &ldquo;not available&rdquo;</span>
  ) : link.startsWith('/') ? (
    <span>
      <span className="mono">{link}</span> <span className="muted fs12">(a page of the public website)</span>
    </span>
  ) : (
    <span style={{ wordBreak: 'break-all' }}>
      <span className="mono">{link}</span> <span className="muted fs12">(another website ↗)</span>
    </span>
  );

/*
 * View Programme — read-only detail page of one SARTHI Ecosystem card, reached from the View action (or a click
 * on the row) in The SARTHI Ecosystem tab of Home Page Management. Loads the saved record by its id.
 */
export default function ProgrammeView() {
  usePageTitle('Programme — The SARTHI Ecosystem');
  const { id = '' } = useParams();
  const go = useGo();
  const navigate = useNavigate();
  const detail = useApiData(() => ecosystemService.get(id), [id]);
  /* Only for the default link label a card without its own label prints. */
  const section = useApiData(() => ecosystemService.getSection(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState(false);

  const p = detail.data;
  const ownLabel = !!p && !!(p.linkLabel.mr.trim() || p.linkLabel.en.trim());
  const defaultLabel = section.data?.linkLabel ?? FALLBACK_LABEL;
  const shownLabel = p && ownLabel ? p.linkLabel : defaultLabel;
  const labelText = (lang: keyof Bilingual) =>
    p && ownLabel ? (
      <Text value={p.linkLabel[lang]} lang={lang} />
    ) : (
      <span>
        <span className="muted">Section default</span>
        {section.data ? (
          <>
            {' — '}
            <span lang={lang}>{section.data.linkLabel[lang]}</span>
          </>
        ) : null}
      </span>
    );

  return (
    <div className="page">
      <PageHead
        crumbs={[...ECOSYSTEM_CRUMBS, { l: 'View' }]}
        title={p ? p.name.en : 'Programme'}
        badge={p ? <span className="tag">Order {p.displayOrder}</span> : undefined}
        back={<BackButton to={ECOSYSTEM_TAB_PATH} />}
        actions={
          <div className="f ac gp8 wrap">
            {p ? (
              <>
                <Can action="deleteEcosystemProgramme">
                  <button type="button" className="btn" style={{ color: 'var(--red)' }} disabled={busy} onClick={() => setDeleting(true)}>
                    Delete
                  </button>
                </Can>
                <Can action="updateEcosystemProgramme">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => ecosystemService.setStatus(p.id, !p.isActive),
                        p.isActive ? 'Programme deactivated' : 'Programme activated',
                        () => detail.reload(),
                      )
                    }
                  >
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </Can>
                <Can action="updateEcosystemProgramme">
                  <button type="button" className="btn primary" onClick={() => go(ecosystemEditPath(p.id))}>
                    Edit
                  </button>
                </Can>
              </>
            ) : null}
          </div>
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {p ? (
        <div className="grid g2">
          <div className="card">
            <div className="card-h">
              <h3>Programme details</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Programme name (Marathi)', <Text value={p.name.mr} lang="mr" />],
                  ['Programme name (English)', <Text value={p.name.en} lang="en" />],
                  ['Description (Marathi)', <Text value={p.description.mr} lang="mr" />],
                  ['Description (English)', <Text value={p.description.en} lang="en" />],
                  [
                    'Icon',
                    <span className="f ac gp8">
                      <Icon name={p.icon} />
                      {iconLabel(p.icon)}
                    </span>,
                  ],
                  ['Destination', <Destination link={p.link} />],
                  ['Link label (Marathi)', labelText('mr')],
                  ['Link label (English)', labelText('en')],
                  ['Display order', String(p.displayOrder)],
                  ['Status', <MasterStatusBadge isActive={p.isActive} />],
                  [
                    'On the website',
                    p.isActive ? 'Shown in the सारथी प्रणाली section of the home and About pages' : 'Hidden from the website',
                  ],
                  ['Created', fmtDateTime(p.createdAt)],
                  ['Last updated', fmtDateTime(p.updatedAt)],
                ]}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>
                Preview <span className="sub">the card as the website draws it</span>
              </h3>
            </div>
            <div className="card-b">
              <CardPreview name={p.name} description={p.description} icon={p.icon} linked={!!p.link} linkLabel={shownLabel} />
            </div>
          </div>
        </div>
      ) : null}

      {p && deleting ? (
        <ConfirmModal
          title="Delete programme"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'ecosystem-programme', id: p.id }}
          message={`Delete ${programmeLabel(p)}? The card is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(
              () => ecosystemService.remove(p.id),
              'Programme deleted',
              () => {
                setDeleting(false);
                navigate(ECOSYSTEM_TAB_PATH);
              },
            )
          }
        />
      ) : null}
    </div>
  );
}
