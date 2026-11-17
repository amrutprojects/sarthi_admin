import { useState } from 'react';
import { Badge, Dash } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { SectionTabHead } from '../../components/SectionTabs';
import { ConfirmModal, LoadState, useAction, useApiData } from '../../shared';
import { navMenuEntry } from '../constants';
import { navMenuService } from '../services/navMenuService';
import type { NavMenuItem } from '../types/navmenu.types';

/* Where the item leads: a page of the website, or the login portal for the Login / Register button. */
const Page = ({ itemKey, path }: { itemKey: string; path: string | null }) => {
  if (path) return <span className="mono fs12">{path}</span>;
  return itemKey === 'login' ? <>Login portal</> : <Dash />;
};

/*
 * Navigation Menu — the Navigation Menu tab of Home Page Management: the saffron menu bar under the brand bar on
 * every page of the public website (Home, About AMRUT, … Contact, and the Login / Register button), one row per item
 * in menu order. Each item has a switch of its own: hidden takes it out of the menu bar and the mobile menu, while
 * its page still opens from other links. Hiding asks first, showing does not; the list is reloaded after each change.
 * Without cms-navmenu.update the rows show a Shown / Hidden badge instead.
 *
 * Not a home page section, so it has no "Show on website" bar of its own above it (see HomePageView).
 */
export default function NavMenuTab() {
  const can = useCan();
  const canUpdate = can('updateNavMenu');
  const { busy, run } = useAction();
  const [confirming, setConfirming] = useState<NavMenuItem | null>(null);
  const list = useApiData(() => navMenuService.list(), []);
  const items = list.data;

  const change = async (item: NavMenuItem, next: boolean) => {
    const { en } = navMenuEntry(item.key).label;
    /* Reloaded while still busy, so no switch is used again on the list it has just changed. */
    const ok = await run(
      () => navMenuService.set(item.key, next),
      `${en} is now ${next ? 'shown in' : 'hidden from'} the menu`,
      () => list.reload(),
    );
    /* After a failure too, so the switches show what the website has now. */
    if (!ok) await list.reload();
  };

  const confirmingEntry = confirming ? navMenuEntry(confirming.key) : null;

  return (
    <>
      <SectionTabHead>
        The menu bar under the brand bar on every page of the website. Hide an item to take it out of the menu bar and the mobile menu
        &mdash; its page still opens from other links.
      </SectionTabHead>

      <LoadState loading={list.loading && !items} error={list.error} onRetry={() => void list.reload()} />

      {items ? (
        <div className="card mb14">
          <div className="card-h">
            <h3>Menu items</h3>
            <span className="tag">
              {items.filter((i) => i.show).length} of {items.length} shown in the menu
            </span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '64px' }}>
                    #
                  </th>
                  <th scope="col">Menu item</th>
                  <th scope="col">Page</th>
                  <th scope="col" style={{ width: '180px' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const { label, path } = navMenuEntry(item.key);
                  return (
                    <tr className="norow" key={item.key}>
                      <td>
                        <span className="muted fs12">{i + 1}</span>
                      </td>
                      <td style={{ whiteSpace: 'normal' }}>
                        <b>{label.en}</b>
                        {label.mr ? (
                          <div className="muted fs12" lang="mr">
                            {label.mr}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <Page itemKey={item.key} path={path} />
                      </td>
                      <td>
                        {canUpdate ? (
                          <span className="f ac gp8">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={item.show}
                              aria-label={`Show ${label.en} in the menu`}
                              aria-busy={busy || undefined}
                              className={'switch' + (item.show ? ' on' : '')}
                              disabled={busy}
                              title={item.show ? 'Shown — switch off to hide it' : 'Hidden — switch on to show it'}
                              onClick={() => (item.show ? setConfirming(item) : void change(item, true))}
                            />
                            <span className="fs12" style={{ fontWeight: 600, color: item.show ? 'var(--green)' : 'var(--muted)' }}>
                              {item.show ? 'Shown' : 'Hidden'}
                            </span>
                          </span>
                        ) : (
                          <Badge tone={item.show ? 'green' : 'grey'}>{item.show ? 'Shown' : 'Hidden'}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {confirming && confirmingEntry ? (
        <ConfirmModal
          title={`Hide "${confirmingEntry.label.en}" from the menu?`}
          message={
            confirming.key === 'login'
              ? 'Visitors will no longer see the Login / Register button in the menu bar or the mobile menu. Nothing is deleted, and it can be shown again at any time.'
              : 'Visitors will no longer see it in the menu bar or the mobile menu. Its page is not deleted and still opens from other links, and the item can be shown again at any time.'
          }
          confirmLabel="Yes, hide"
          busy={busy}
          onClose={() => setConfirming(null)}
          onConfirm={() => void change(confirming, false).then(() => setConfirming(null))}
        />
      ) : null}
    </>
  );
}
