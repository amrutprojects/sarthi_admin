import { useState } from 'react';
import { Badge, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote, SectionTabHead } from '../../components/SectionTabs';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { highlightService } from '../services/highlightService';
import { HIGHLIGHT_FACT_ROWS, factRowName, type ApiProgrammeHighlight, type HighlightFactRow } from '../types/highlight.types';
import HighlightRowNameModal from './HighlightRowNameModal';

/* The heading, subheading, tagline and certification line of the band. */
function SectionTextCard({ page }: { page: ApiProgrammeHighlight }) {
  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>
          Section text <span className="sub">the band on the home page</span>
        </h3>
        <MasterStatusBadge isActive={page.isPublished} />
      </div>
      <FieldTable
        rows={[
          ['Heading', <Bi value={page.heading} />],
          ['Subheading', <Bi value={page.subheading} />],
          ['Tagline', <Bi value={page.tagline} />],
          ['Certification', <Bi value={page.certification} />],
        ]}
      />
    </div>
  );
}

/* The ticked list under the tagline, in website order, with each objective's status. */
function ObjectivesCard({ page }: { page: ApiProgrammeHighlight }) {
  const { objectives } = page;
  return (
    <div className="card">
      <div className="card-h">
        <h3>
          Objectives <span className="sub">in the order the home page lists them</span>
        </h3>
        <span className="tag">{objectives.length} listed</span>
      </div>
      {objectives.length === 0 ? (
        <div className="card-b">
          <div className="hint">No objectives are listed.</div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col" style={{ width: '76px' }}>
                  Sr. No.
                </th>
                <th scope="col">Objective</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map((o, i) => (
                <tr className="norow" key={o.id}>
                  <td>
                    <span className="t2">{i + 1}</span>
                  </td>
                  {/*
                   * Panel cells never wrap (styles.css: table.tbl td { white-space: nowrap }); an objective may. The inner
                   * block keeps a minimum width, so on a phone the table scrolls sideways instead of squeezing the text.
                   */}
                  <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    <div style={{ minWidth: '9rem' }}>
                      <Bi value={o.text} />
                    </div>
                  </td>
                  <td>
                    <MasterStatusBadge isActive={o.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/*
 * The fact table on the right of the band, row by row in website order, each row with a switch of its own. A hidden
 * row is left out of the table on the home page; its figure is kept where it is managed. Hiding asks first, showing
 * does not. Without cms-highlight.update the rows show a Shown / Hidden badge instead.
 *
 * Each row shows the name the home page uses now — its own name when one was set, else the default — and, with
 * cms-highlight.update, an "Edit name" action that opens HighlightRowNameModal.
 */
function FactRowsCard({
  page,
  canUpdate,
  busy,
  onSwitch,
  onRenamed,
}: {
  page: ApiProgrammeHighlight;
  canUpdate: boolean;
  busy: boolean;
  onSwitch: (row: HighlightFactRow, show: boolean) => Promise<void>;
  onRenamed: (page: ApiProgrammeHighlight) => void;
}) {
  const [confirming, setConfirming] = useState<HighlightFactRow | null>(null);
  const [editing, setEditing] = useState<HighlightFactRow | null>(null);
  const hidden = new Set(page.hiddenRows);
  const shownCount = HIGHLIGHT_FACT_ROWS.filter((r) => !hidden.has(r.key)).length;

  return (
    <>
      <div className="card mt14">
        <div className="card-h">
          <h3>
            Fact table rows <span className="sub">right-hand table on the home page</span>
          </h3>
          <span className="tag">
            {shownCount} of {HIGHLIGHT_FACT_ROWS.length} shown
          </span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col" style={{ width: '76px' }}>
                  Sr. No.
                </th>
                <th scope="col" style={{ width: '28%' }}>
                  Row
                </th>
                <th scope="col">Value from</th>
                <th scope="col" style={{ width: '180px' }}>
                  Status
                </th>
                {canUpdate ? (
                  <th scope="col" style={{ width: '130px' }}>
                    Action
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {HIGHLIGHT_FACT_ROWS.map((row, i) => {
                const shown = !hidden.has(row.key);
                const name = factRowName(row, page.rowLabels);
                const isCustom = name !== row.label;
                return (
                  <tr className="norow" key={row.key}>
                    <td>
                      <span className="t2">{i + 1}</span>
                    </td>
                    <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                      <b>{name.en}</b>
                      <div className="bi-alt" lang="mr">
                        {name.mr}
                      </div>
                      <div className="fs11" style={{ color: isCustom ? 'var(--info)' : 'var(--muted)', marginTop: 2 }}>
                        {isCustom ? 'Custom name' : 'Default name'}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                      {row.source}
                      {row.programmeFact ? (
                        <div className="fs12 muted">Also hidden when switched off in Programme Page Management → Fact sheet</div>
                      ) : null}
                    </td>
                    <td>
                      {canUpdate ? (
                        <span className="f ac gp8">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={shown}
                            aria-label={`Show ${name.en} in the home page fact table`}
                            aria-busy={busy || undefined}
                            className={'switch' + (shown ? ' on' : '')}
                            disabled={busy}
                            title={shown ? 'Shown — switch off to hide it' : 'Hidden — switch on to show it'}
                            onClick={() => (shown ? setConfirming(row) : void onSwitch(row, true))}
                          />
                          <span className="fs12" style={{ fontWeight: 600, color: shown ? 'var(--green)' : 'var(--muted)' }}>
                            {shown ? 'Shown' : 'Hidden'}
                          </span>
                        </span>
                      ) : (
                        <Badge tone={shown ? 'green' : 'grey'}>{shown ? 'Shown' : 'Hidden'}</Badge>
                      )}
                    </td>
                    {canUpdate ? (
                      <td>
                        <button
                          type="button"
                          className="btn xs"
                          aria-label={`Edit name of ${name.en}`}
                          title="Edit the name shown on the home page"
                          disabled={busy}
                          onClick={() => setEditing(row)}
                        >
                          <Icon name="edit" /> Edit name
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <HighlightRowNameModal
          row={editing}
          rowLabels={page.rowLabels}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setEditing(null);
            onRenamed(next);
          }}
        />
      ) : null}

      {confirming ? (
        <ConfirmModal
          title={`Hide "${factRowName(confirming, page.rowLabels).en}" from the home page fact table?`}
          message="Visitors will no longer see this row in the programme band's fact table on the home page. Its figure is not deleted, and the row can be shown again at any time."
          confirmLabel="Yes, hide"
          busy={busy}
          onClose={() => setConfirming(null)}
          onConfirm={() => void onSwitch(confirming, false).then(() => setConfirming(null))}
        />
      ) : null}
    </>
  );
}

/*
 * Skill Development Diploma — the Home Programme Section tab of Home Page Management: the read-only view of what
 * the programme band on the home page is showing, its text, its objectives and then its fact table rows.
 *
 * cms-highlight.view and cms-highlight.update are separate permissions: a view-only administrator gets the whole
 * picture, and the Edit content button and the fact table's row switches render only for cms-highlight.update.
 * Whether the website shows the band is the tab's "Show on website" switch above it (HomePageView).
 */
export default function HighlightTab() {
  const go = useGo();
  const can = useCan();
  const detail = useApiData(() => highlightService.get(), []);
  const { busy, run } = useAction();
  /*
   * A row switch's PATCH answers with the whole section, which is shown in place of the loaded copy without a second
   * GET. It is tied to the copy it replaced, so any reload (Retry, the reload after a failure) shows the server's again.
   */
  const [patched, setPatched] = useState<{ over: ApiProgrammeHighlight | null; page: ApiProgrammeHighlight } | null>(null);
  const page = patched && patched.over === detail.data ? patched.page : detail.data;

  const switchRow = async (row: HighlightFactRow, show: boolean) => {
    const loaded = detail.data;
    const ok = await run(
      async () => setPatched({ over: loaded, page: await highlightService.setRowVisibility(row.key, show) }),
      `${factRowName(row, page?.rowLabels).en} is now ${show ? 'shown in' : 'hidden from'} the home page fact table`,
    );
    /* After a failure, reloaded so the switches show what the website has now. */
    if (!ok) await detail.reload();
  };

  return (
    <>
      <SectionTabHead
        actions={
          page ? (
            <Can action="updateHighlight">
              <button type="button" className="btn primary" onClick={() => go('/cms/highlight/edit')}>
                <Icon name="edit" />
                Edit content
              </button>
            </Can>
          ) : undefined
        }
      >
        The programme band on the home page — its heading, tagline, objectives and certification line.
      </SectionTabHead>

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <>
          <SectionNote>
            Marathi is shown first, English underneath, as on the public site. An inactive objective is kept here but not shown on the home
            page. Switch a fact table row off to leave it out of the home page &mdash; its figure is kept. Edit name renames a row in both
            languages.
          </SectionNote>
          <SectionTextCard page={page} />
          <ObjectivesCard page={page} />
          {/*
           * Locked during any reload too (the one after a failed switch, or Retry): a switch used meanwhile would have
           * its PATCH answer replaced by the reload's older copy, and the row would show the wrong state.
           */}
          <FactRowsCard
            page={page}
            canUpdate={can('updateHighlight')}
            busy={busy || detail.loading}
            onSwitch={switchRow}
            /* A name's PATCH answers with the whole section too, shown the same way. */
            onRenamed={(next) => setPatched({ over: detail.data, page: next })}
          />
          {/* One save updates the whole section, objectives included. */}
          <div className="fs13 t2 mt10">Last updated {fmtDateTime(page.updatedAt)}.</div>
        </>
      ) : null}
    </>
  );
}
