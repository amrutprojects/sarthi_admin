import { useMemo, useRef, type ReactNode } from 'react';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Modal } from '../../../components/ui/Overlay';
import { newIdempotencyKey } from '../../../services/api-client';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import type { User } from '../types/user.types';
import UserForm from './UserForm';
import { serverFieldErrors } from './userFormErrors';

/* Create-user dialog. With `fixedRoleIds` the account always gets exactly those roles and no role picker is shown. */
export function CreateUserDialog({
  roles,
  onClose,
  title = 'Add user',
  fixedRoleIds,
  intro,
  successMessage = 'User created',
}: {
  roles: Parameters<typeof UserForm>[0]['roles'];
  onClose: () => void;
  title?: string;
  fixedRoleIds?: string[];
  intro?: ReactNode;
  successMessage?: string;
}) {
  const create = useCreateUser();
  /* One key per dialog: a retry of the same submission is replayed, not duplicated. */
  const key = useRef(newIdempotencyKey());
  const serverErrors = useMemo(() => serverFieldErrors(create.error), [create.error]);
  return (
    <Modal title={title} onClose={onClose}>
      {intro}
      <UserForm
        mode="create"
        roles={fixedRoleIds ? [] : roles}
        submitting={create.isPending}
        serverErrors={serverErrors}
        onCancel={onClose}
        onSubmit={(v) => {
          const roleIds = fixedRoleIds ?? v.roleIds;
          create.mutate(
            {
              name: v.name,
              email: v.email,
              password: v.password,
              roleIds: roleIds.length ? roleIds : undefined,
              idempotencyKey: key.current,
            },
            {
              onSuccess: () => {
                toastOk(successMessage);
                onClose();
              },
              onError: (e) => {
                if (!Object.keys(serverFieldErrors(e)).length) toastError(e);
              },
            },
          );
        }}
      />
    </Modal>
  );
}

export function EditUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const update = useUpdateUser();
  const serverErrors = useMemo(() => serverFieldErrors(update.error), [update.error]);
  return (
    <Modal title={`Edit ${user.name}`} onClose={onClose}>
      <UserForm
        mode="edit"
        defaultValues={{ name: user.name, email: user.email }}
        submitting={update.isPending}
        serverErrors={serverErrors}
        onCancel={onClose}
        onSubmit={(v) =>
          update.mutate(
            { id: user.id, input: { name: v.name, email: v.email, ...(v.password ? { password: v.password } : {}) } },
            {
              onSuccess: () => {
                toastOk('User updated');
                onClose();
              },
              onError: (e) => {
                if (!Object.keys(serverFieldErrors(e)).length) toastError(e);
              },
            },
          )
        }
      />
    </Modal>
  );
}
