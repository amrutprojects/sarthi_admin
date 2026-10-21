import { useState } from 'react';
import { Modal } from '../../../../components/ui/Overlay';
import MasterField, { fieldAria } from '../../components/MasterField';
import { validateRejectReason } from '../validation/document.validation';

interface RejectDocumentModalProps {
  title: string;
  busy: boolean;
  onReject: (reason: string) => void;
  onClose: () => void;
}

/* Reject with a reason: the reason is required (5 to 300 characters) and is shown on the document afterwards. */
export default function RejectDocumentModal({ title, busy, onReject, onClose }: RejectDocumentModalProps) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const error = submitted ? validateRejectReason(reason) : undefined;

  const submit = () => {
    setSubmitted(true);
    if (validateRejectReason(reason) || busy) return;
    onReject(reason.trim());
  };

  return (
    <Modal
      title="Reject document"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn danger" disabled={busy} onClick={submit}>{busy ? 'Rejecting…' : 'Reject document'}</button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>
        Reject <b>{title}</b>? The uploader sees the reason and can replace the file, which puts the document back to Pending.
      </p>
      <MasterField id="doc-reject-reason" label="Reason" required error={error} hint={`5 to 300 characters. ${reason.trim().length} / 300`}>
        <textarea
          className="inp"
          {...fieldAria('doc-reject-reason', error)}
          rows={4}
          maxLength={300}
          value={reason}
          autoFocus
          onChange={(e) => setReason(e.target.value)}
        />
      </MasterField>
    </Modal>
  );
}
