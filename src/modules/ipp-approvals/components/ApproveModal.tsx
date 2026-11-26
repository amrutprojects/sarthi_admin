import { useEffect, useState, type ReactNode } from 'react';
import { Callout } from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import { approveSchema, REASON_MAX } from '../schemas/ippApprovalsSchema';

interface Props {
  title: string;
  /* What is approved and where it goes next ("Approve the application of …? After your approval: With COEP."). */
  message: ReactNode;
  confirmLabel: string;
  /*
   * A second approval (rejected before at my level, ApplicationRow.reasonRequired): the reason is asked. Also asked once the
   * API says so (422), e.g. for one of a whole batch.
   */
  askReason: boolean;
  /* Several applications at once: the one reason is kept for each. */
  several?: boolean;
  busy: boolean;
  /* The API's refusal, e.g. a 422 about the reason. */
  error?: string | null;
  onApprove: (reason: string | null) => void;
  onClose: () => void;
}

/*
 * Approves one or several applications. A second approval needs a reason (as a rejection always does): it is recorded in
 * each application's history, shown to the next levels and sent to IPP. A first approval asks for none.
 */
export default function ApproveModal({ title, message, confirmLabel, askReason, several, busy, error, onApprove, onClose }: Props) {
  const [asked, setAsked] = useState(askReason);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  /* The API asked for the reason: the box stays from now on. */
  useEffect(() => {
    if (error) setAsked(true);
  }, [error]);
  const typed = reason.trim();
  const check = approveSchema.safeParse({ reason });
  const problem = asked && !check.success ? check.error.issues[0]?.message : undefined;
  const submit = () => {
    if (problem) {
      setTouched(true);
      return;
    }
    onApprove(asked && typed ? typed : null);
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!!problem || busy} onClick={submit}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <form
        noValidate
        aria-label="Approve"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className="fs13 tw-mt-0">{message}</p>
        {error ? (
          <div className="mb10" role="alert">
            <Callout tone="err">{error}</Callout>
          </div>
        ) : null}
        {asked ? (
          <div className="fld">
            <label htmlFor="approve-reason">
              Approval reason{' '}
              <span className="muted">
                (required: rejected before, so this is a second approval{several ? '; kept for each application' : ''})
              </span>
            </label>
            <textarea
              id="approve-reason"
              className="inp"
              rows={4}
              autoFocus
              aria-required="true"
              aria-invalid={(touched && !!problem) || undefined}
              aria-describedby="approve-reason-count approve-reason-error"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setTouched(true);
              }}
            />
            <div className="tw-flex tw-flex-wrap tw-justify-between tw-gap-2 fs12">
              <span id="approve-reason-error" className="tw-text-danger" role="alert">
                {touched ? problem : null}
              </span>
              <span id="approve-reason-count" className={typed.length > REASON_MAX ? 'tw-text-danger' : 'muted'}>
                {typed.length} / {REASON_MAX}
              </span>
            </div>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
