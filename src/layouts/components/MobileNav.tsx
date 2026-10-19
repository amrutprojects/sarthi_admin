import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { MOBILE_NAV } from '../../constants/navigation';
import { useCanOpen } from '../../modules/auth/components/Can';

export default function MobileNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const canOpen = useCanOpen();
  return (
    <nav className="mnav">
      {MOBILE_NAV.filter((n) => canOpen(n.k)).map((n) => (
        <button key={n.k} type="button" className={active === n.k ? 'on' : ''} onClick={() => navigate(n.r)}>
          <Icon name={n.i} /><span>{n.l}</span>
        </button>
      ))}
    </nav>
  );
}
