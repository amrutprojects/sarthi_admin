import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { MOBILE_NAV, sidebarKey } from '../../constants/navigation';
import { useCanOpen } from '../../modules/auth/components/Can';

export default function MobileNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const canOpen = useCanOpen();
  const items = MOBILE_NAV.filter((n) => canOpen(n.k));
  /* The page's menu, or the entry whose page holds it as a tab (Home Page Management). */
  const current = sidebarKey(active);
  /* Nothing to show (e.g. a Website Admin, whose CMS pages are all in the sidebar): no empty bar. */
  if (!items.length) return null;
  return (
    <nav className="mnav">
      {items.map((n) => (
        <button key={n.k} type="button" className={current === n.k ? 'on' : ''} onClick={() => navigate(n.r)}>
          <Icon name={n.i} />
          <span>{n.l}</span>
        </button>
      ))}
    </nav>
  );
}
