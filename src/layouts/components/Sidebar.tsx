import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { NAV, isNavGroup, type NavEntry } from '../../constants/navigation';
import { useAuth } from '../../modules/auth/auth-context';
import { useCanOpen } from '../../modules/auth/components/Can';
import { goTo } from '../../hooks/useLegacyEvents';
import { useLegacyTick } from '../../utils/legacyBus';

interface SidebarProps {
  active: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ active, collapsed, open, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  useLegacyTick(); // task counts change when legacy pages update data
  const canOpen = useCanOpen();
  const { portal } = useAuth();

  /* Only screens the role may open; a group heading is dropped when nothing under it is visible. */
  const visible = NAV.filter((n) => isNavGroup(n) || canOpen(n.k)).filter((n, i, arr): n is NavEntry => {
    if (!isNavGroup(n)) return true;
    const next = arr[i + 1];
    return !!next && !isNavGroup(next);
  });

  return (
    <aside className={'sidebar' + (open ? ' open' : '')} id="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">A×S</div>
        <div className="sb-brand-txt">
          <b>AMRUT × SUMAGO</b>
          <span>{portal === 'website' ? 'Website Admin' : 'Programme Management Portal'}</span>
        </div>
      </div>
      <div className="sb-scroll">
        {visible.map((n) => {
          if (isNavGroup(n))
            return (
              <div className="sb-group" key={'g-' + n.g}>
                {n.g}
              </div>
            );
          const c = n.count ? n.count() : null;
          return (
            <button
              key={n.k}
              type="button"
              className={'sb-item' + (active === n.k ? ' active' : '') + (n.warn ? ' warn' : '')}
              onClick={() => goTo(navigate, n.r)}
            >
              <span className="sb-ico">
                <Icon name={n.i} />
              </span>
              <span className="sb-label">{n.l}</span>
              {c ? <span className="sb-count">{c}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="sb-foot">
        <div className="sb-demo">
          <b>DEMO ENVIRONMENT</b>
          <br />
          Sample data only. Not actual programme performance.
        </div>
        <button type="button" className="sb-toggle" onClick={onToggle}>
          <Icon name={collapsed ? 'chevR' : 'chevL'} />
          <span className="sb-label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}
