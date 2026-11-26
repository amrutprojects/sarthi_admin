import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AS from '../../legacy';
import Icon from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import Popover from '../../components/ui/Popover';
import { useCanOpen } from '../../modules/auth/components/Can';
import { useAuth } from '../../modules/auth/auth-context';
import { goTo } from '../../hooks/useLegacyEvents';

/* No live notification source exists yet, so the bell opens an honest empty list (no invented alerts, no count). */
const NO_NOTIFICATIONS = {
  title: { en: 'No notifications yet', mr: 'अद्याप कोणत्याही सूचना नाहीत' },
  msg: {
    en: 'Notifications appear here once the programme modules send them from the server.',
    mr: 'कार्यक्रमाची मॉड्यूल्स सर्व्हरवरून सूचना पाठवू लागल्यावर त्या येथे दिसतील.',
  },
};

const JOURNEYS = [
  ['PMO drill-down', 'Dashboard → District map → District → Centre → Batch → Student', '#/dashboard'],
  ['District coordinator', 'District dashboard → assigned centres → attendance → issues', '#/districts'],
  ['Centre manager', 'Centre detail → batch → students → attendance', '#/centres'],
  ['Trainer', "My batches → today's session → mark attendance", '#/live'],
  ['Online training team', 'Online control → online batch → LMS → student progress', '#/online'],
  ['Candidate journey', 'Public site → apply → track application status', '#/track'],
];

type PopKind = 'notif' | 'profile';

/*
 * The top bar. There is no global search: the old box searched only the sample dataset and no live search
 * exists yet, so it was removed rather than left pretending to work.
 */
export default function Topbar({ onBurger }: { onBurger: () => void }) {
  const navigate = useNavigate();
  const { user, primaryRole, portal, logout } = useAuth();
  /* Alerts and the guided tours cover programme data, which a Website Admin does not work with. */
  const programme = portal !== 'website';
  const [pop, setPop] = useState<PopKind | null>(null);
  const notifRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setPop(null), []);
  const canOpen = useCanOpen();
  const U = AS.ui;

  const go = (href: string) => {
    close();
    goTo(navigate, href);
  };

  function openHelp() {
    U.modal({
      title: 'Help & Guided Tours · मदत व मार्गदर्शित फेरफटका',
      size: 'wide',
      body:
        U.callout(
          'info',
          'Help centre · मदत केंद्र',
          'Welcome to the Sarthi Programme Management Portal. Screens show only figures recorded in the system; where a module is not connected yet, the screen says so. · ' +
            'सारथी कार्यक्रम व्यवस्थापन पोर्टलमध्ये आपले स्वागत. स्क्रीनवर फक्त प्रणालीत नोंदवलेले आकडे दिसतात; एखादे मॉड्यूल अद्याप जोडलेले नसल्यास स्क्रीनवर तसे सांगितले जाते.',
        ) +
        '<h4 class="mt18 mb10">Try these guided journeys</h4><div class="grid g2">' +
        JOURNEYS.map(
          (j) =>
            '<button class="demo-user" data-go="' +
            j[2] +
            '" data-modal-close><div class="icon-sq" style="background:var(--brand-100);color:var(--brand-600)">' +
            U.icon('chevR') +
            '</div>' +
            '<div class="du-m"><b>' +
            U.esc(j[0]) +
            '</b><span>' +
            U.esc(j[1]) +
            '</span></div></button>',
        ).join('') +
        '</div>' +
        '<h4 class="mt18 mb10">Keyboard shortcuts</h4>' +
        U.kvList([['Esc', 'Close modal, drawer or popover · मॉडल, ड्रॉवर किंवा पॉपओव्हर बंद करा']]),
      footer:
        '<button class="btn" data-modal-close>Close</button><button class="btn primary" data-go="#/dashboard" data-modal-close>Go to Dashboard</button>',
    });
  }

  return (
    <header className="topbar">
      <button type="button" className="tb-burger" onClick={onBurger}>
        <Icon name="menu" />
      </button>
      {/* With no search box the spacer takes all the free room, so the actions stay right. */}
      <div className="tb-spacer" style={{ flexGrow: 1 }} />
      <div className="tb-actions">
        {programme ? (
          <>
            <button
              type="button"
              ref={notifRef}
              className="tb-btn"
              title="Notifications"
              onClick={() => setPop(pop === 'notif' ? null : 'notif')}
            >
              <Icon name="bell" />
            </button>
            <button type="button" className="tb-btn" title="Help" onClick={openHelp}>
              <Icon name="help" />
            </button>
          </>
        ) : null}
        <button type="button" ref={profileRef} className="tb-user" onClick={() => setPop(pop === 'profile' ? null : 'profile')}>
          <Avatar name={user ? user.name : 'Guest'} />
          <span className="tb-user-meta">
            <b>{user ? user.name : 'Guest'}</b>
            <span>{primaryRole ? primaryRole.name : ''}</span>
          </span>
        </button>
      </div>

      {pop === 'notif' && (
        <Popover anchor={notifRef.current} width={Math.min(380, window.innerWidth - 24)} onClose={close}>
          <div className="pop-h">
            <b>
              Notifications · <span lang="mr">सूचना</span>
            </b>
          </div>
          <div className="pop-b">
            <div className="empty" data-testid="no-notifications">
              <b>
                {NO_NOTIFICATIONS.title.en} · <span lang="mr">{NO_NOTIFICATIONS.title.mr}</span>
              </b>
              <p>{NO_NOTIFICATIONS.msg.en}</p>
              <p lang="mr">{NO_NOTIFICATIONS.msg.mr}</p>
            </div>
          </div>
        </Popover>
      )}

      {pop === 'profile' && user && (
        <Popover anchor={profileRef.current} width={290} onClose={close}>
          <div className="pop-h">
            <Avatar name={user.name} />
            <b>
              {user.name}
              <br />
              <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>
                {user.email}
              </span>
            </b>
          </div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div className="f gp6 wrap">
              {user.roles.length ? (
                user.roles.map((r) => <span key={r.id} dangerouslySetInnerHTML={{ __html: U.badge(r.name, 'blue') }} />)
              ) : (
                <span className="fs11 muted">No role assigned</span>
              )}
            </div>
            <div className="fs11 muted mt4">{user.permissions.length} permissions</div>
          </div>
          <div className="pop-b" style={{ padding: '6px 0' }}>
            {canOpen('users') ? (
              <button type="button" className="menu-item" onClick={() => go('/users')}>
                <Icon name="shield" />
                My role & permissions
              </button>
            ) : null}
            {canOpen('settings') ? (
              <button type="button" className="menu-item" onClick={() => go('/settings')}>
                <Icon name="settings" />
                System settings
              </button>
            ) : null}
            {canOpen('audit') ? (
              <button type="button" className="menu-item" onClick={() => go('/audit')}>
                <Icon name="doc" />
                My activity log
              </button>
            ) : null}
            <div className="menu-sep" />
            <button
              type="button"
              className="menu-item"
              style={{ color: 'var(--red)' }}
              onClick={() => {
                close();
                void logout().then(() => navigate('/login'));
              }}
            >
              <Icon name="logout" />
              Sign out
            </button>
          </div>
        </Popover>
      )}
    </header>
  );
}
