import { useId, useState } from 'react';
import { Badge } from '../../../components/ui';
import { useCan } from '../../../modules/auth/components/Can';
import { ConfirmModal, useAction } from '../shared';
import { HIDE_CONSEQUENCE, VISIBILITY_UPDATE_ACTION } from './constants';
import type { SectionVisibilityState } from './useSectionVisibility';
import type { SectionVisibilityKey } from './visibility.types';
import { visibilityService } from './visibilityService';

const LABEL = 'Show on website';
const BANNER_HIDDEN_NOTE = 'The card is switched on, but visitors do not see it while the banner is hidden.';

/*
 * The one "Show on website" switch of a Home Page Management section, above its tab's own content. Hiding asks
 * first, saying what else goes with the section; showing does not. The switch needs the section menu's update
 * permission: a view-only user gets a Shown / Hidden badge instead, and a section with no saved row yet cannot
 * be switched at all. The result replaces the section's row in the page's list (see useSectionVisibility).
 */
export default function SectionVisibilityBar({
  section,
  label,
  visibility,
}: {
  section: SectionVisibilityKey;
  /* The tab's label, as the confirmation and the toast name the section. */
  label: string;
  visibility: SectionVisibilityState;
}) {
  const can = useCan();
  const labelId = useId();
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  if (!visibility.items) {
    return (
      <div className="vis-bar">
        <div className="vis-bar-row">
          <span className="vis-bar-label">{LABEL}</span>
          {visibility.error ? (
            <>
              <span className="vis-bar-err">Could not load whether this section is shown: {visibility.error.fullMessage}</span>
              <button type="button" className="btn xs" onClick={() => void visibility.reload()}>
                Retry
              </button>
            </>
          ) : (
            <span className="skel" style={{ display: 'inline-block', width: 160, height: 14 }} aria-hidden="true" />
          )}
        </div>
      </div>
    );
  }

  const item = visibility.find(section);
  /* The list has every section the user may view, so every tab they can open; a section it lacks gets no bar. */
  if (!item) return null;

  const canUpdate = can(VISIBILITY_UPDATE_ACTION[section]);
  const { visible, configured } = item;
  const hidden = configured && !visible;
  const consequence = HIDE_CONSEQUENCE[section];
  /* The switch keeps showing the card's own flag; the state text and the note say the website does not show it. */
  const bannerHidden = visibility.hiddenWithBanner(section);

  const change = (next: boolean) =>
    run(
      async () => visibility.saved(await visibilityService.set(section, next)),
      `${label} is now ${next ? 'shown' : 'hidden'} on the website`,
    );

  let control = null;
  if (canUpdate) {
    control = (
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-labelledby={labelId}
        aria-busy={busy || undefined}
        className={'switch' + (visible ? ' on' : '')}
        disabled={!configured || busy}
        title={!configured ? 'Set this section up first' : visible ? 'Shown — switch off to hide it' : 'Hidden — switch on to show it'}
        onClick={() => (visible ? setConfirming(true) : void change(true))}
      />
    );
  } else if (configured) {
    control = bannerHidden ? (
      <Badge tone="grey">Not shown</Badge>
    ) : (
      <Badge tone={visible ? 'green' : 'grey'}>{visible ? 'Shown' : 'Hidden'}</Badge>
    );
  }

  let state = visible ? 'Shown on the website' : 'Hidden from the website';
  if (bannerHidden) state = 'Not shown: the banner is hidden';

  let note: string;
  if (!configured) note = 'Set this section up first: it has no saved content yet, so there is nothing to show or hide.';
  else if (!canUpdate) note = 'Changing this needs the update permission of this section.';
  else if (bannerHidden) note = BANNER_HIDDEN_NOTE;
  else if (visible) note = 'Visitors see this section. Switch it off to hide it from the public website; nothing is deleted.';
  else note = 'Visitors do not see this section. Its content is kept: switch it on to show it again.';

  return (
    <div className={'vis-bar' + (hidden || bannerHidden ? ' off' : '')}>
      <div className="vis-bar-row">
        <span className="vis-bar-label" id={labelId}>
          {LABEL}
        </span>
        {control}
        {configured && canUpdate ? <span className="vis-bar-state">{state}</span> : null}
      </div>
      <p className="vis-bar-note">{note}</p>
      {hidden && consequence ? <p className="vis-bar-note">{consequence}</p> : null}
      {/* A view-only user's note is the permission one, so the reason the card is off follows it. */}
      {bannerHidden && !canUpdate ? <p className="vis-bar-note">{BANNER_HIDDEN_NOTE}</p> : null}

      {confirming ? (
        <ConfirmModal
          title={`Hide ${label} from the website?`}
          message="Visitors will no longer see it on the public website. Nothing is deleted, and it can be shown again at any time."
          confirmLabel="Yes, hide"
          busy={busy}
          onClose={() => setConfirming(false)}
          onConfirm={() => void change(false).then(() => setConfirming(false))}
        >
          {consequence ? <p style={{ margin: '10px 0 0' }}>{consequence}</p> : null}
        </ConfirmModal>
      ) : null}
    </div>
  );
}

/*
 * After a tab's label in the strip while its section is hidden: a "Hidden" pill to the eye, and to a screen
 * reader the tab is named "<label> (hidden from the website)".
 */
export function HiddenTabMark() {
  return (
    <>
      <span className="tab-pill" aria-hidden="true">
        Hidden
      </span>
      <span className="tw-sr-only"> (hidden from the website)</span>
    </>
  );
}
