import { Fragment, useMemo, useState } from 'react';
import { Badge, Callout } from '../../../components/ui';
import { Drawer } from '../../../components/ui/Overlay';
import { LoadState, useAction, useApiData } from '../../../components/feedback/apiFeedback';
import { lmsAccessApi, type ApiRole, type LmsCatalogueArea } from '../services/rbacApi';

/*
 * LMS menus of an LMS role: the LMS's own menus and actions, ticked per role. Holders of the role sign in to the LMS
 * with their Admin Panel email and password and see exactly these menus there. Nothing here is an Admin Panel
 * permission, and the Admin Panel's own menus never appear in the LMS.
 */
export default function LmsMenusDrawer({
  role,
  editable,
  onClose,
  onSaved,
}: {
  role: ApiRole;
  editable: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const catalogue = useApiData(() => lmsAccessApi.catalogue(), []);
  const current = useApiData(() => lmsAccessApi.forRole(role.id), [role.id]);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const { busy, run } = useAction();

  const granted = useMemo(() => selected ?? new Set(current.data?.codes ?? []), [selected, current.data]);
  const areas = useMemo(() => (catalogue.data ?? []).flatMap((g) => g.areas), [catalogue.data]);
  const shownMenus = areas.flatMap((a) => a.menus).filter((m) => m.view.some((c) => granted.has(c))).length;

  const set = (codes: string[], on: boolean) => {
    const next = new Set(granted);
    for (const c of codes) {
      if (on) next.add(c);
      else next.delete(c);
    }
    setSelected(next);
  };
  const codesOf = (a: LmsCatalogueArea) => a.permissions.map((p) => p.code);
  const allOn = (codes: string[]) => codes.length > 0 && codes.every((c) => granted.has(c));

  return (
    <Drawer
      title={'LMS menus — ' + role.name}
      size="wide"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {editable ? 'Cancel' : 'Close'}
          </button>
          {editable ? (
            <button
              type="button"
              className="btn primary"
              disabled={busy || !current.data || !catalogue.data}
              onClick={() =>
                run(
                  () => lmsAccessApi.save(role.id, [...granted]),
                  'LMS menus updated',
                  async () => {
                    onClose();
                    await onSaved();
                  },
                )
              }
            >
              Save LMS menus ({granted.size})
            </button>
          ) : null}
        </>
      }
    >
      <Callout tone="info" title="LMS role. ">
        Users holding this role sign in to the LMS with their Admin Panel email and password. The LMS sidebar shows only the LMS menus
        ticked here ({shownMenus} {shownMenus === 1 ? 'menu' : 'menus'} now); Admin Panel menus never appear in the LMS, and these ticks
        grant nothing in the Admin Panel. A menu appears once one of its View permissions is ticked.
      </Callout>
      <LoadState
        loading={catalogue.loading || current.loading}
        error={catalogue.error ?? current.error}
        onRetry={() => {
          void catalogue.reload();
          void current.reload();
        }}
      />
      {catalogue.data && current.data ? (
        <div className="perm-matrix mt14">
          <table>
            <thead>
              <tr>
                <th className="pm-menu">LMS area and its menus</th>
                <th>Permissions</th>
                <th>All</th>
              </tr>
            </thead>
            <tbody>
              {catalogue.data.map((g) => (
                <Fragment key={g.group}>
                  <tr className="pm-sec">
                    <td colSpan={3}>{g.group}</td>
                  </tr>
                  {g.areas.map((a) => {
                    const codes = codesOf(a);
                    return (
                      <tr key={a.area}>
                        <td className="pm-menu">
                          <b>{a.label}</b>
                          {a.menus.length ? (
                            <div className="f gp4 wrap mt4">
                              {a.menus.map((m) => (
                                <Badge key={m.label} tone={m.view.some((c) => granted.has(c)) ? 'green' : 'grey'} nodot>
                                  {m.label}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <div className="pm-extras" style={{ fontSize: 12, color: 'inherit' }}>
                            {a.permissions.map((p) => (
                              <label key={p.code} title={`${p.code} — ${p.description}`}>
                                <input
                                  type="checkbox"
                                  checked={granted.has(p.code)}
                                  disabled={!editable}
                                  onChange={() => set([p.code], !granted.has(p.code))}
                                />{' '}
                                {p.label}
                                {p.sensitive ? <span className="muted fs11"> (sensitive)</span> : null}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td>
                          {editable ? (
                            <input
                              type="checkbox"
                              aria-label={'All ' + a.label}
                              checked={allOn(codes)}
                              onChange={() => set(codes, !allOn(codes))}
                            />
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
      ) : null}
    </Drawer>
  );
}
