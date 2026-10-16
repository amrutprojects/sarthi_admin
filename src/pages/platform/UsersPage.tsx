import { useEffect, useState } from 'react';
import { Badge, Callout, PageHead } from '../../components/ui';
import { useCan } from '../../auth/Can';
import { useAuth } from '../../context/AuthContext';
import MenuVisibilityTab from './access/MenuVisibilityTab';
import PermissionsTab from './access/PermissionsTab';
import RolesTab from './access/RolesTab';
import UsersTab from './access/UsersTab';

type Tab = 'users' | 'roles' | 'permissions' | 'menus';

/* Identity & access management, backed by the live backend (/users, /roles, /permissions). */
export default function UsersPage() {
  const can = useCan();
  const { user, permissions } = useAuth();
  const tabs = ([
    ['users', 'Users', can('viewUsers')],
    ['roles', 'Roles', can('viewRoles')],
    ['permissions', 'Permissions', can('viewPermissions')],
    ['menus', 'Menu visibility', can('viewRoles')],
  ] as [Tab, string, boolean][]).filter(([, , ok]) => ok);
  const [tab, setTab] = useState<Tab>(tabs[0]?.[0] ?? 'users');
  useEffect(() => { document.title = 'Users & roles — AMRUT × SUMAGO Admin'; }, []);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Users & roles' }]}
        title="User & Role Management"
        badge={<Badge tone="green">Live</Badge>}
        sub="Accounts, roles and permissions are stored in PostgreSQL and enforced by the backend on every request."
      />
      {user ? (
        <div className="mb14">
          <Callout tone="info" title={'Signed in as ' + user.name}>
            {(user.roles.map((r) => r.name).join(', ') || 'no role') + '. '}
            {permissions.size} effective permissions.
          </Callout>
        </div>
      ) : null}
      <div className="tabs">
        {tabs.map(([k, l]) => <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'users' && can('viewUsers') ? <UsersTab /> : null}
      {tab === 'roles' && can('viewRoles') ? <RolesTab /> : null}
      {tab === 'permissions' && can('viewPermissions') ? <PermissionsTab /> : null}
      {tab === 'menus' && can('viewRoles') ? <MenuVisibilityTab /> : null}
    </div>
  );
}
