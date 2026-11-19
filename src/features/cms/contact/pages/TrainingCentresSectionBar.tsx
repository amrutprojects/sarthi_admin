import { useId, useState } from 'react';
import { Badge } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { ConfirmModal, useAction } from '../../shared';
import { trainingCentreService } from '../services/trainingCentreService';
import type { ApiContactPage } from '../types/contact.types';

const LABEL = 'Show on website';

/*
 * The "Show on website" switch of the "Approved training centres" card on every District Office page, above the
 * Training centres tab's list. Drawn like the switch above the District offices tab (.vis-bar). Hiding asks first;
 * showing does not. Changing it needs cms-contact.update; a view-only user gets a Shown / Hidden badge.
 *
 * Hiding removes the whole card from every district's page; the centres themselves are kept. While the whole
 * Contact page is unpublished the website shows its own built-in copy, so the note says so.
 */
export default function TrainingCentresSectionBar({ page, onSaved }: { page: ApiContactPage; onSaved: () => void }) {
  const can = useCan();
  const labelId = useId();
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const canUpdate = can('updateContactPage');
  /* An older backend does not send the flag: the card is shown. */
  const visible = page.showTrainingCentres !== false;

  const change = (next: boolean) =>
    run(
      () => trainingCentreService.setSection(next),
      next ? 'Training centres are now shown on the website' : 'Training centres are now hidden on the website',
      () => onSaved(),
    );

  let note: string;
  if (!canUpdate) note = 'Changing this needs the Update Contact Page Management permission.';
  else if (visible) note = 'Visitors see the Approved training centres card on each district’s page. Switch it off to hide it; nothing is deleted.';
  else note = 'Visitors do not see the Approved training centres card on any district’s page. The centres below are kept.';

  return (
    <div className={'vis-bar mb14' + (visible ? '' : ' off')}>
      <div className="vis-bar-row">
        <span className="vis-bar-label" id={labelId}>
          {LABEL}
        </span>
        {canUpdate ? (
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            aria-labelledby={labelId}
            aria-busy={busy || undefined}
            className={'switch' + (visible ? ' on' : '')}
            disabled={busy}
            title={visible ? 'Shown — switch off to hide it' : 'Hidden — switch on to show it'}
            onClick={() => (visible ? setConfirming(true) : void change(true))}
          />
        ) : (
          <Badge tone={visible ? 'green' : 'grey'}>{visible ? 'Shown' : 'Hidden'}</Badge>
        )}
        {canUpdate ? <span className="vis-bar-state">{visible ? 'Shown on the website' : 'Hidden from the website'}</span> : null}
      </div>
      <p className="vis-bar-note">{note}</p>
      {!page.isPublished ? (
        <p className="vis-bar-note">
          The Contact page is unpublished, so the website shows its own built-in copy, training centres included. This switch applies once
          it is published.
        </p>
      ) : null}
      {confirming ? (
        <ConfirmModal
          title="Hide training centres from the website?"
          message="The Approved training centres card will no longer show on any district’s page. Nothing is deleted, and the card can be shown again at any time."
          confirmLabel="Yes, hide"
          busy={busy}
          onClose={() => setConfirming(false)}
          onConfirm={() => void change(false).then(() => setConfirming(false))}
        />
      ) : null}
    </div>
  );
}
