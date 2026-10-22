import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setFormDirty } from '../formDirty';
import { ConfirmModal } from '../shared';

/*
 * Save / Cancel footer shared by every CMS create and edit page.
 *
 * - The submit button is disabled while a request is in flight, which is what stops a double submit
 *   (the form also guards it, so a keyboard Enter cannot get past either).
 * - Cancel asks for confirmation when there are unsaved changes, using the panel confirmation dialog
 *   rather than window.confirm.
 */
interface MasterFormActionsProps {
  /* Form id, so the buttons can live outside the <form> element in a card footer. */
  formId: string;
  submitLabel: string;
  busy: boolean;
  dirty: boolean;
  /* Where Cancel and Back go. */
  backTo: string;
}

export default function MasterFormActions({ formId, submitLabel, busy, dirty, backTo }: MasterFormActionsProps) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const leave = () => navigate(backTo);

  /* Lets the header's Back button warn about the same unsaved changes Cancel does. */
  useEffect(() => {
    setFormDirty(formId, dirty);
    return () => setFormDirty(formId, false);
  }, [formId, dirty]);

  return (
    <>
      <div className="f ac gp8 wrap">
        <button type="submit" form={formId} className="btn primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => (dirty ? setConfirming(true) : leave())}>
          Cancel
        </button>
      </div>
      {confirming ? (
        <ConfirmModal
          title="Discard changes?"
          message="This form has unsaved changes. Leaving now discards them."
          confirmLabel="Discard changes"
          danger
          onClose={() => setConfirming(false)}
          onConfirm={leave}
        />
      ) : null}
    </>
  );
}
