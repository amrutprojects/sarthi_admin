import { useId, useState } from 'react';
import { Badge } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { ConfirmModal, useAction } from '../../shared';
import { contactService } from '../services/contactService';
import type { ApiContactPage } from '../types/contact.types';

const LABEL = 'Show on website';

/*
 * The "Show on website" switch of the Contact page's "District offices" section — the list of every district, each
 * linking to its District Office page — above the District offices tab's own list. Drawn like the switch above each
 * Home Page Management tab (.vis-bar). Hiding asks first; showing does not. Changing it needs cms-contact.update; a
 * view-only user gets a Shown / Hidden badge.
 *
 * Only the section on the Contact page goes: the offices' details below still show on each district's own page.
 * While the whole Contact page is unpublished the website shows its own built-in copy, this section included, so
 * the note says so.
 */
export default function DistrictOfficesSectionBar({ page, onSaved }: { page: ApiContactPage; onSaved: () => void }) {
  const can = useCan();
  const labelId = useId();
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const canUpdate = can('updateContactPage');
  const visible = page.showDistrictOffices;

  const change = (next: boolean) =>
    run(
      () => contactService.setDistrictOfficesSection(next),
      next ? 'District offices are now shown on the website' : 'District offices are now hidden on the website',
      () => onSaved(),
    );

  let note: string;
  if (!canUpdate) note = 'Changing this needs the Update Contact Page Management permission.';
  else if (visible) note = 'Visitors see the District offices list on the Contact page. Switch it off to hide it; nothing is deleted.';
  else note = 'Visitors do not see the District offices list on the Contact page. Each district’s own page still opens.';

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
          The Contact page is unpublished, so the website shows its own built-in copy, District offices included. This switch applies once
          it is published.
        </p>
      ) : null}
      {confirming ? (
        <ConfirmModal
          title="Hide District offices from the website?"
          message="The District offices list will no longer show on the public Contact page. Nothing is deleted, each district’s own page still opens, and the list can be shown again at any time."
          confirmLabel="Yes, hide"
          busy={busy}
          onClose={() => setConfirming(false)}
          onConfirm={() => void change(false).then(() => setConfirming(false))}
        />
      ) : null}
    </div>
  );
}
