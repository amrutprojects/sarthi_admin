import { GenBadge } from '../../../../components/ui';
import { LOCK_MESSAGES } from '../types/formField.types';

/* L-38 "custom field: ACTIVE ↔ ARCHIVED"; standard fields are always active. */
export function FieldStatusBadge({ isActive }: { isActive: boolean }) {
  return <GenBadge status={isActive ? 'ACTIVE' : 'ARCHIVED'} />;
}

/* Standard field of the catalogue, or custom field added here. */
export function OriginTag({ isCustom }: { isCustom: boolean }) {
  return (
    <span className="tag" title={isCustom ? 'Added in Form Field Configuration' : LOCK_MESSAGES.FIELD_STANDARD}>
      {isCustom ? 'Custom' : 'Standard'}
    </span>
  );
}

/* System-locked fields (Trainer Name) stay visible and compulsory. */
export function LockTag({ locked }: { locked: boolean }) {
  return locked ? (
    <span className="tag" title={LOCK_MESSAGES.FIELD_SYSTEM_LOCKED}>System locked</span>
  ) : (
    <span className="muted fs12">—</span>
  );
}
