import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/ui/Icon';
import { hasUnsavedForm } from '../formDirty';
import { ConfirmModal } from '../shared';

interface BackButtonProps {
  /*
   * Where Back goes: one level up, never browser history. List → Dashboard (or the parent record it
   * was opened from), Add → the list, Edit → the record, View → the list. History would return to a
   * form the user has already saved.
   */
  to: string;
  label?: string;
}

/*
 * The Back button at the start of every CMS page header. On an Add / Edit page with unsaved changes it
 * asks for the same "Discard changes?" confirmation as the form's Cancel button.
 */
export default function BackButton({ to, label = 'Back' }: BackButtonProps) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const leave = () => navigate(to);

  return (
    <>
      <button type="button" className="btn" onClick={() => (hasUnsavedForm() ? setConfirming(true) : leave())}>
        <Icon name="chevL" />
        {label}
      </button>
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
