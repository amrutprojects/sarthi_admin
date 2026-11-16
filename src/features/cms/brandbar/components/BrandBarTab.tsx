import { useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, KvList, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { SectionTabHead } from '../../components/SectionTabs';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { BRANDBAR_EDIT_PATH } from '../constants';
import { brandBarService } from '../services/brandBarService';
import type { ApiBrandBar, Bilingual } from '../types/brandbar.types';
import { partnerSwitchPayload } from '../validation/brandbar.validation';
import BrandBarPreview from './BrandBarPreview';

/* A text that may be blank, with what the website does then. */
const Text = ({ value, lang, none }: { value: string; lang?: 'mr' | 'en'; none: string }) =>
  value ? <span lang={lang}>{value}</span> : <span className="muted">{none}</span>;

/* Marathi first, as on the public site; English underneath. */
const Pair = ({ value, none }: { value: Bilingual; none: string }) =>
  value.mr || value.en ? (
    <div>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">{none}</span>
  );

/*
 * Whether the website shows the implementation partner box. With the update permission it is a switch, which
 * needs a partner name (without one there is no box to show or hide); without it, a Shown / Hidden badge.
 */
function PartnerBoxSwitch({
  cfg,
  canUpdate,
  busy,
  onSwitch,
}: {
  cfg: ApiBrandBar;
  canUpdate: boolean;
  busy: boolean;
  onSwitch: () => void;
}) {
  const hasPartner = cfg.partnerName.trim() !== '';
  const shown = cfg.showPartner;
  let state = shown ? 'Shown' : 'Hidden';
  if (!hasPartner) state = 'Not shown';
  const on = shown && hasPartner;

  return (
    <span className="fc gp4" style={{ fontWeight: 400 }}>
      {canUpdate ? (
        <span className="f ac gp8">
          <button
            type="button"
            role="switch"
            aria-checked={shown}
            aria-label="Show the implementation partner box on the website"
            aria-busy={busy || undefined}
            className={'switch' + (shown ? ' on' : '')}
            disabled={!hasPartner || busy}
            style={hasPartner ? undefined : { opacity: 0.55, cursor: 'not-allowed' }}
            title={!hasPartner ? 'Add a partner name first' : shown ? 'Shown — switch off to hide it' : 'Hidden — switch on to show it'}
            onClick={onSwitch}
          />
          <span className="fs12" style={{ fontWeight: 600, color: on ? 'var(--green)' : 'var(--muted)' }}>
            {state}
          </span>
        </span>
      ) : (
        <span>
          <Badge tone={on ? 'green' : 'grey'}>{state}</Badge>
        </span>
      )}
      {hasPartner ? null : (
        <span className="muted fs12">
          No partner name is set, so there is no box to show.{canUpdate ? ' Add one with Edit first.' : ''}
        </span>
      )}
    </span>
  );
}

/*
 * Brand Bar — the Brand Bar tab of Home Page Management: the white bar directly under the top bar of the public
 * website, with the AMRUT Kalash title, the academy's full name in Marathi and in English, and the implementation
 * partner at the right. One record, shown here as it reads and as the website draws it; Edit opens its form.
 *
 * The partner box also has a switch of its own here, so it can be hidden or shown again without opening the form.
 * It saves through the same PUT as the form, sending the bar as loaded with only the switch changed, and the
 * version it was loaded at; hiding asks first, showing does not.
 */
export default function BrandBarTab() {
  const go = useGo();
  const can = useCan();
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const bar = useApiData(() => brandBarService.get(), []);
  const cfg = bar.data;

  const switchPartner = async (current: ApiBrandBar, next: boolean) => {
    /* Reloaded while still busy, so the switch is not used again with the version it has just replaced. */
    const ok = await run(
      () => brandBarService.update(partnerSwitchPayload(current, next)),
      `The implementation partner box is now ${next ? 'shown' : 'hidden'} on the website`,
      () => bar.reload(),
    );
    /* After a failure too: after a 409 (saved elsewhere since this tab loaded), the next switch sends that version. */
    if (!ok) await bar.reload();
  };

  return (
    <>
      <SectionTabHead
        actions={
          <Can action="updateBrandBar">
            <button type="button" className="btn primary" disabled={!cfg} onClick={() => go(BRANDBAR_EDIT_PATH)}>
              <Icon name="edit" />
              Edit
            </button>
          </Can>
        }
      >
        The white bar under the top bar on every page of the public website: the title and the academy&rsquo;s full name on the left, and
        the implementation partner on the right, which can be hidden on its own.
      </SectionTabHead>

      <LoadState loading={bar.loading && !cfg} error={bar.error} onRetry={() => void bar.reload()} />

      {cfg ? (
        <>
          <div className="card mb14">
            <div className="card-h">
              <h3>Brand bar preview</h3>
              <span className="muted fs12">As the website shows it, in Marathi and in English</span>
            </div>
            <div className="card-b">
              <BrandBarPreview
                title={cfg.title}
                fullName={cfg.fullName}
                partnerLabel={cfg.partnerLabel}
                partnerName={cfg.partnerName}
                showPartner={cfg.showPartner}
              />
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Brand bar</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Title', <b key="t">{cfg.title}</b>],
                  ['Full name (Marathi)', <Text key="fm" lang="mr" value={cfg.fullName.mr} none="None — the line is not shown" />],
                  ['Full name (English)', <Text key="fe" lang="en" value={cfg.fullName.en} none="None — the line is not shown" />],
                  [
                    'Implementation partner',
                    <PartnerBoxSwitch
                      key="sp"
                      cfg={cfg}
                      canUpdate={can('updateBrandBar')}
                      busy={busy}
                      onSwitch={() => (cfg.showPartner ? setConfirming(true) : void switchPartner(cfg, true))}
                    />,
                  ],
                  ['Partner label', <Pair key="pl" value={cfg.partnerLabel} none="None — no label is shown" />],
                  ['Partner name', <Text key="pn" value={cfg.partnerName} none="None — the partner is not shown" />],
                  ['Last updated', fmtDateTime(cfg.updatedAt)],
                ]}
              />
            </div>
          </div>

          {confirming ? (
            <ConfirmModal
              title="Hide the implementation partner box?"
              message="Visitors will no longer see the partner's label and name at the right of the brand bar; the website shows the logo only. Nothing is deleted, and the box can be shown again at any time."
              confirmLabel="Yes, hide"
              busy={busy}
              onClose={() => setConfirming(false)}
              onConfirm={() => void switchPartner(cfg, false).then(() => setConfirming(false))}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
