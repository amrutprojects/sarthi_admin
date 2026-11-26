import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Callout } from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import { REASON_MAX, rejectSchema, type RejectForm } from '../schemas/ippApprovalsSchema';

interface Props {
  name: string;
  registrationId: string;
  /* Where the rejection sends the application ("With Divisional Officer"). */
  returnsTo: string | null;
  busy: boolean;
  /* The API's refusal, e.g. a 422 about the reason. */
  error?: string | null;
  onReject: (reason: string) => void;
  onClose: () => void;
}

/* Rejects one application: the reason is recorded, shown to the level it returns to and sent to IPP. */
export default function RejectModal({ name, registrationId, returnsTo, busy, error, onReject, onClose }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RejectForm>({ resolver: zodResolver(rejectSchema), defaultValues: { reason: '' }, mode: 'onChange' });
  const length = watch('reason').trim().length;
  const submit = handleSubmit((v) => onReject(v.reason));

  return (
    <Modal
      title={`Reject — ${name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn danger" disabled={!isValid || busy} onClick={() => void submit()}>
            {busy ? 'Rejecting…' : 'Reject application'}
          </button>
        </>
      }
    >
      <form noValidate aria-label="Reject application" onSubmit={(e) => void submit(e)}>
        <p className="fs13 tw-mt-0">
          Application <span className="mono">{registrationId}</span>.{' '}
          {returnsTo ? (
            <>
              After the rejection: <b>{returnsTo}</b>.{' '}
            </>
          ) : null}
          The other students of the batch go on.
        </p>
        {error ? (
          <div className="mb10" role="alert">
            <Callout tone="err">{error}</Callout>
          </div>
        ) : null}
        <div className="fld">
          <label htmlFor="reject-reason">
            Reason <span className="muted">(required)</span>
          </label>
          <textarea
            id="reject-reason"
            className="inp"
            rows={4}
            autoFocus
            aria-required="true"
            aria-invalid={!!errors.reason || undefined}
            aria-describedby="reject-reason-count reject-reason-error"
            {...register('reason')}
          />
          <div className="tw-flex tw-flex-wrap tw-justify-between tw-gap-2 fs12">
            <span id="reject-reason-error" className="tw-text-danger" role="alert">
              {errors.reason?.message}
            </span>
            <span id="reject-reason-count" className={length > REASON_MAX ? 'tw-text-danger' : 'muted'}>
              {length} / {REASON_MAX}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
