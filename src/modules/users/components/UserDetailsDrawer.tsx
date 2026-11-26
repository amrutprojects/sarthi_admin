import type { ReactNode } from 'react';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, GenBadge, KvList } from '../../../components/ui';
import { Drawer } from '../../../components/ui/Overlay';
import { ApiError } from '../../../services/api-client';
import { useUser } from '../hooks/useUsers';
import type { User } from '../types/user.types';

/* What a list row already knows of the account: shown at once, before (or without) GET /users/:id. */
export type UserSummary = Pick<User, 'id' | 'name' | 'email' | 'isActive'>;

interface Props {
  user: UserSummary;
  title?: string;
  /* Read the account (GET /users/:id, needs users.view) for its roles, last sign-in and dates. */
  readAccount: boolean;
  /* The roles to show when the account is not read, e.g. "Divisional Officer" on the officers' page. */
  roles?: string[];
  /* Rows of the calling screen after the account's, e.g. an officer's districts. */
  extra?: [string, ReactNode][];
  onClose: () => void;
}

const roleBadges = (names: string[]) =>
  names.length ? (
    <span className="tw-flex tw-flex-wrap tw-gap-1">
      {names.map((n) => (
        <Badge key={n} tone="blue">
          {n}
        </Badge>
      ))}
    </span>
  ) : (
    'No role'
  );

/* Read-only details of a user account (users list and officers' page: View). Nothing here changes the account. */
export default function UserDetailsDrawer({ user, title, readAccount, roles, extra = [], onClose }: Props) {
  const account = useUser(readAccount ? user.id : null);
  const shown = account.data ?? user;
  const roleNames = account.data ? account.data.roles?.map((r) => r.name) : roles;
  const pairs: [string, ReactNode][] = [
    ['Name', shown.name],
    ['Email', shown.email],
    ...(roleNames ? [['Roles', roleBadges(roleNames)] as [string, ReactNode]] : []),
    ['Status', <GenBadge status={shown.isActive ? 'ACTIVE' : 'INACTIVE'} />],
    ...(account.data
      ? ([
          ['Last sign-in', fmtDateTime(account.data.lastLoginAt)],
          ['Created', fmtDateTime(account.data.createdAt)],
          ['Updated', fmtDateTime(account.data.updatedAt)],
        ] as [string, ReactNode][])
      : []),
    ...extra,
  ];

  return (
    <Drawer title={title ?? `User — ${user.name}`} onClose={onClose}>
      <KvList pairs={pairs} />
      {readAccount && account.isPending ? (
        <div className="tw-mt-3" aria-busy="true" aria-label="Loading account details" role="status">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel tw-mb-3" style={{ height: 14 }} />
          ))}
        </div>
      ) : null}
      {account.isError ? (
        <div className="tw-mt-3" role="alert">
          <Callout tone="err" title="Could not load the account. ">
            {account.error instanceof ApiError ? account.error.fullMessage : 'Unexpected error'}{' '}
            <button type="button" className="btn xs" onClick={() => void account.refetch()}>
              Retry
            </button>
          </Callout>
        </div>
      ) : null}
    </Drawer>
  );
}
