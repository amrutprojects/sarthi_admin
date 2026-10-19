import { Fragment, useMemo } from 'react';
import { NAV, isNavGroup } from '../../../constants/navigation';
import { MENU_ACTIONS, MENU_ACTION_LABEL, type MenuAction } from '../../auth';

export interface MatrixPermission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string | null;
}

/* Identity & access modules, shown under "Users & Roles" with their own codes mapped onto the columns. */
const IDENTITY_ROWS: { module: string; label: string }[] = [
  { module: 'users', label: 'Users' },
  { module: 'roles', label: 'Roles' },
  { module: 'permissions', label: 'Permissions' },
];

interface Row {
  module: string;
  label: string;
  cells: Partial<Record<MenuAction, MatrixPermission>>;
  extras: MatrixPermission[];
}
interface Section {
  title: string;
  rows: Row[];
}

function buildRow(module: string, label: string, perms: MatrixPermission[]): Row | null {
  const mine = perms.filter((p) => p.module === module);
  if (!mine.length) return null;
  const cells: Row['cells'] = {};
  const extras: MatrixPermission[] = [];
  for (const p of mine) {
    const action = p.code.slice(module.length + 1) as MenuAction;
    if ((MENU_ACTIONS as readonly string[]).includes(action)) cells[action] = p;
    else extras.push(p);
  }
  return { module, label, cells, extras };
}

/* Rows follow the sidebar: one row per menu, grouped by its section; unknown modules go last. */
function buildSections(perms: MatrixPermission[]): Section[] {
  const sections: Section[] = [];
  const used = new Set<string>();
  let current: Section | null = null;
  for (const n of NAV) {
    if (isNavGroup(n)) {
      current = { title: n.g, rows: [] };
      sections.push(current);
      continue;
    }
    if (n.k === 'users') {
      for (const r of IDENTITY_ROWS) {
        const row = buildRow(r.module, 'Users & Roles — ' + r.label, perms);
        if (row) {
          current?.rows.push(row);
          used.add(r.module);
        }
      }
      continue;
    }
    const row = buildRow(n.k, n.l, perms);
    if (row) {
      current?.rows.push(row);
      used.add(n.k);
    }
  }
  const rest = [...new Set(perms.map((p) => p.module))].filter((m) => !used.has(m)).sort();
  if (rest.length) sections.push({ title: 'Other', rows: rest.map((m) => buildRow(m, m, perms)!).filter(Boolean) });
  return sections.filter((s) => s.rows.length);
}

/* Menus × View / Add / Update / Delete / Approve checkbox grid. */
export default function PermissionMatrix({
  permissions,
  granted,
  editable,
  held,
  onChange,
}: {
  permissions: MatrixPermission[];
  granted: Set<string>;
  editable: boolean;
  /* Codes the signed-in user holds (only those can be granted or removed). */
  held: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const sections = useMemo(() => buildSections(permissions), [permissions]);
  const allRows = sections.flatMap((s) => s.rows);

  const set = (ids: string[], on: boolean) => {
    const next = new Set(granted);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onChange(next);
  };
  const rowIds = (r: Row) => [
    ...Object.values(r.cells)
      .filter(Boolean)
      .map((p) => p!.id),
    ...r.extras.map((p) => p.id),
  ];
  const colIds = (a: MenuAction) => allRows.map((r) => r.cells[a]?.id).filter((x): x is string => !!x);
  const allOn = (ids: string[]) => ids.length > 0 && ids.every((id) => granted.has(id));

  const box = (p: MatrixPermission | undefined) => {
    if (!p) return <span className="muted">—</span>;
    return (
      <input
        type="checkbox"
        aria-label={p.name}
        title={p.code + (editable && !held.has(p.code) ? ' · not held by you' : '')}
        checked={granted.has(p.id)}
        disabled={!editable}
        onChange={() => set([p.id], !granted.has(p.id))}
      />
    );
  };

  return (
    <div className="perm-matrix">
      <table>
        <thead>
          <tr>
            <th className="pm-menu">Menu</th>
            {MENU_ACTIONS.map((a) => (
              <th key={a}>
                <label className="pm-col">
                  {editable ? (
                    <input
                      type="checkbox"
                      checked={allOn(colIds(a))}
                      onChange={() => set(colIds(a), !allOn(colIds(a)))}
                      aria-label={'All ' + MENU_ACTION_LABEL[a]}
                    />
                  ) : null}
                  {MENU_ACTION_LABEL[a]}
                </label>
              </th>
            ))}
            <th>All</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => (
            <Fragment key={s.title}>
              <tr className="pm-sec">
                <td colSpan={MENU_ACTIONS.length + 2}>{s.title}</td>
              </tr>
              {s.rows.map((r) => {
                const ids = rowIds(r);
                return (
                  <tr key={r.module}>
                    <td className="pm-menu">
                      <b>{r.label}</b>
                      {r.extras.length ? (
                        <div className="pm-extras">
                          {r.extras.map((p) => (
                            <label key={p.id} title={p.code}>
                              <input
                                type="checkbox"
                                checked={granted.has(p.id)}
                                disabled={!editable}
                                onChange={() => set([p.id], !granted.has(p.id))}
                              />{' '}
                              {p.name}
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    {MENU_ACTIONS.map((a) => (
                      <td key={a}>{box(r.cells[a])}</td>
                    ))}
                    <td>
                      {editable ? (
                        <input type="checkbox" aria-label={'All ' + r.label} checked={allOn(ids)} onChange={() => set(ids, !allOn(ids))} />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
