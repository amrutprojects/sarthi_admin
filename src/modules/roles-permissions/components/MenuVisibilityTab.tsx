import { Fragment, useMemo, useState } from 'react';
import { Callout } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { useCan } from '../../auth';
import { useAuth } from '../../auth';
import { NAV, isNavGroup, type NavItem } from '../../../constants/navigation';
import { menuVisibilityApi, type MenuVisibilityChange } from '../services/rbacApi';
import { LoadState, useAction, useApiData } from '../../../components/feedback/apiFeedback';

const keyOf = (roleId: string, menu: string) => roleId + '|' + menu;

/* Short column header from a role code: SUPER_ADMIN → SA, PMO → PMO, DISTRICT_COORD → DC. */
const shortCode = (code: string) => {
  const parts = code.split('_');
  return parts.length === 1
    ? code.slice(0, 5)
    : parts
        .map((p) => p[0])
        .join('')
        .slice(0, 5);
};

/*
 * Per-role sidebar menu visibility. Hiding a menu revokes no permission; it removes the menu (and blocks
 * its page) for that role. A user sees a menu when any of their roles shows it and grants its view permission.
 */
export default function MenuVisibilityTab() {
  const can = useCan();
  const editable = can('updateRole');
  const { refresh } = useAuth();
  const data = useApiData(() => menuVisibilityApi.get());
  const [pending, setPending] = useState<Map<string, boolean>>(new Map());
  const { busy, run } = useAction();

  const roles = useMemo(() => (data.data?.roles ?? []).filter((r) => r.isActive), [data.data]);
  const menus = new Set(data.data?.menus ?? []);
  const locked = new Set(data.data?.lockedForSuperAdmin ?? []);
  const sections = useMemo(() => {
    const out: { title: string; items: NavItem[] }[] = [];
    for (const n of NAV) {
      if (isNavGroup(n)) out.push({ title: n.g, items: [] });
      else if (menus.has(n.k)) out[out.length - 1]?.items.push(n);
    }
    return out.filter((s) => s.items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.data]);

  const savedVisible = (roleId: string, menu: string) => !data.data?.roles.find((r) => r.id === roleId)?.hidden.includes(menu);
  const visible = (roleId: string, menu: string) => pending.get(keyOf(roleId, menu)) ?? savedVisible(roleId, menu);
  const isLocked = (code: string, menu: string) => code === 'SUPER_ADMIN' && locked.has(menu);

  const toggle = (roleId: string, menu: string) => {
    const next = new Map(pending);
    const v = !visible(roleId, menu);
    if (v === savedVisible(roleId, menu)) next.delete(keyOf(roleId, menu));
    else next.set(keyOf(roleId, menu), v);
    setPending(next);
  };

  /* Reset to defaults: every menu visible for every role (permissions still decide access). */
  const resetDefaults = () => {
    const next = new Map<string, boolean>();
    for (const r of roles) for (const m of menus) if (!savedVisible(r.id, m)) next.set(keyOf(r.id, m), true);
    setPending(next);
  };

  const save = () => {
    const changes: MenuVisibilityChange[] = [...pending].map(([k, v]) => {
      const [roleId, menuKey] = k.split('|');
      return { roleId, menuKey, visible: v };
    });
    return run(
      () => menuVisibilityApi.save(changes),
      'Menu visibility saved',
      async () => {
        setPending(new Map());
        await data.reload();
        await refresh();
      },
    );
  };

  return (
    <>
      <div className="card mb14">
        <div className="card-h" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3>
              Menu visibility <span className="sub">per role</span>
            </h3>
            <div className="fs12 muted mt4">
              Controls what appears in each role's sidebar, and blocks the page when opened by URL. Hiding a menu revokes no permission.
            </div>
          </div>
          {editable ? (
            <div className="f gp8 wrap">
              <button type="button" className="btn sm" disabled={!pending.size || busy} onClick={() => setPending(new Map())}>
                Cancel
              </button>
              <button type="button" className="btn sm" disabled={busy} onClick={resetDefaults}>
                <Icon name="refresh" />
                Reset to defaults
              </button>
              <button type="button" className="btn sm primary" disabled={!pending.size || busy} onClick={() => void save()}>
                Save changes{pending.size ? ` (${pending.size})` : ''}
              </button>
            </div>
          ) : null}
        </div>
        {!editable ? (
          <div className="card-b">
            <Callout tone="info" title="Read only">
              You need the roles.update permission to change menu visibility.
            </Callout>
          </div>
        ) : null}
      </div>

      <LoadState loading={data.loading && !data.data} error={data.error} onRetry={() => void data.reload()} />
      {data.data ? (
        <div className="perm-matrix" style={{ marginTop: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="pm-menu">Menu</th>
                {roles.map((r) => (
                  <th key={r.id} title={r.name}>
                    {shortCode(r.code)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <Fragment key={s.title}>
                  <tr className="pm-sec">
                    <td colSpan={roles.length + 1}>{s.title}</td>
                  </tr>
                  {s.items.map((m) => (
                    <tr key={m.k}>
                      <td className="pm-menu">
                        <b>{m.l}</b> <span className="mono fs11 muted">{m.r}</span>
                      </td>
                      {roles.map((r) => {
                        const on = visible(r.id, m.k);
                        const lock = isLocked(r.code, m.k);
                        const changed = pending.has(keyOf(r.id, m.k));
                        return (
                          <td key={r.id}>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={on}
                              aria-label={`${m.l} for ${r.name}`}
                              title={lock ? 'Always visible for Super Admin' : `${r.name}: ${on ? 'visible' : 'hidden'}`}
                              className={'switch' + (on ? ' on' : '')}
                              style={changed ? { boxShadow: '0 0 0 2px var(--saffron)' } : undefined}
                              disabled={!editable || lock || busy}
                              onClick={() => toggle(r.id, m.k)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
