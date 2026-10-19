import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AS from '../../legacy';
import Icon from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import Popover from '../../components/ui/Popover';
import { useCanOpen } from '../../modules/auth/components/Can';
import type { SearchResult } from '../../types/domain';
import { api } from '../../services/mock/api';
import { useAuth } from '../../modules/auth/AuthContext';
import { goTo } from '../../hooks/useLegacyEvents';

const TONE = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)', blue: 'var(--brand-500)' };

const JOURNEYS = [
  ['PMO drill-down', 'Dashboard → District map → Pune → Centre → Batch → Student', '#/dashboard'],
  ['District coordinator', 'District dashboard → assigned centres → attendance → issues', '#/districts'],
  ['Centre manager', 'Centre detail → batch → students → attendance', '#/centres'],
  ['Trainer', "My batches → today's session → mark attendance", '#/live'],
  ['Online training team', 'Online control → online batch → LMS → student progress', '#/online'],
  ['Candidate journey', 'Public site → apply → track application status', '#/track'],
];

type PopKind = 'notif' | 'profile' | 'search';

export default function Topbar({ onBurger }: { onBurger: () => void }) {
  const navigate = useNavigate();
  const { user, primaryRole, logout } = useAuth();
  const [pop, setPop] = useState<PopKind | null>(null);
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setPop(null), []);
  const canOpen = useCanOpen();
  const U = AS.ui;

  /* Ctrl/Cmd + K focuses global search (original shortcut). */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => { close(); goTo(navigate, href); };

  function openHelp() {
    U.modal({
      title: 'Help & Guided Tours', size: 'wide',
      body:
        U.callout('info', 'Prototype help centre',
          'This is a clickable prototype of the AMRUT × SUMAGO Programme Management Portal. All records are demo data. Every KPI on every screen is calculated from the same candidate dataset, so numbers stay consistent as you drill down.') +
        '<h4 class="mt18 mb10">Try these guided journeys</h4><div class="grid g2">' +
        JOURNEYS.map((j) => '<button class="demo-user" data-go="' + j[2] + '" data-modal-close><div class="icon-sq" style="background:var(--brand-100);color:var(--brand-600)">' + U.icon('chevR') + '</div>' +
          '<div class="du-m"><b>' + U.esc(j[0]) + '</b><span>' + U.esc(j[1]) + '</span></div></button>').join('') + '</div>' +
        '<h4 class="mt18 mb10">Keyboard shortcuts</h4>' +
        U.kvList([['Ctrl / Cmd + K', 'Focus global search'], ['Esc', 'Close modal, drawer or popover'], ['Click any KPI', 'Opens the filtered record list behind it']]),
      footer: '<button class="btn" data-modal-close>Close</button><button class="btn primary" data-go="#/dashboard" data-modal-close>Go to Dashboard</button>',
    });
  }

  const results = q.length >= 2 ? api.search(q) : [];
  const groups = results.reduce<Record<string, SearchResult[]>>((acc, r) => { (acc[r.type] = acc[r.type] || []).push(r); return acc; }, {});
  const notifications = api.notifications();

  return (
    <header className="topbar">
      <button type="button" className="tb-burger" onClick={onBurger}><Icon name="menu" /></button>
      <div className="tb-search">
        <span className="si"><Icon name="search" /></span>
        <input
          id="globalSearch" ref={searchRef} autoComplete="off" value={q}
          placeholder="Search candidates, centres, batches, districts, certificates…"
          onChange={(e) => { setQ(e.target.value); setPop(e.target.value.length >= 2 ? 'search' : null); }}
          onFocus={() => { if (q.length >= 2) setPop('search'); }}
        />
        <kbd>Ctrl K</kbd>
      </div>
      <div className="tb-spacer" />
      <span className="demo-pill">DEMO ENVIRONMENT — SAMPLE DATA</span>
      <div className="tb-actions">
        <button type="button" ref={notifRef} className="tb-btn" title="Notifications" onClick={() => setPop(pop === 'notif' ? null : 'notif')}>
          <Icon name="bell" /><span className="dot">{notifications.length}</span>
        </button>
        <button type="button" className="tb-btn" title="Help" onClick={openHelp}><Icon name="help" /></button>
        <button type="button" ref={profileRef} className="tb-user" onClick={() => setPop(pop === 'profile' ? null : 'profile')}>
          <Avatar name={user ? user.name : 'Guest'} />
          <span className="tb-user-meta"><b>{user ? user.name : 'Guest'}</b><span>{primaryRole ? primaryRole.name : ''}</span></span>
        </button>
      </div>

      {pop === 'search' && (
        <Popover anchor={searchRef.current} width={Math.min(460, window.innerWidth - 24)} alignLeft onClose={close}>
          <div className="pop-h"><b>Results for “{q}”</b><span className="tag">{results.length}</span></div>
          <div className="pop-b">
            {!results.length && (
              <div dangerouslySetInnerHTML={{ __html: U.empty('No matches', 'Try a candidate ID (AMRUT-PUN-0001), a name, a batch ID or a district.') }} />
            )}
            {Object.keys(groups).map((g) => (
              <div key={g}>
                <div className="sr-group">{g}</div>
                {groups[g].map((r, i) => (
                  <button type="button" key={g + i + r.link} className="menu-item" onClick={() => { setQ(''); go(r.link); }}>
                    <div className="flex1"><b style={{ fontSize: 12.5 }}>{r.title}</b><div className="fs11 muted">{r.sub}</div></div>
                    <Icon name="chevR" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Popover>
      )}

      {pop === 'notif' && (
        <Popover anchor={notifRef.current} width={380} onClose={close}>
          <div className="pop-h"><b>Notifications</b><span className="tag">{notifications.length} new</span></div>
          <div className="pop-b">
            {notifications.map((n, i) => (
              <div key={i} className="alert-card" onClick={() => go(n.link)}>
                <span className="pdot" style={{ background: TONE[n.tone] }} />
                <div className="ac-b"><b>{n.t}</b><span>{n.s} · {n.when}</span></div>
              </div>
            ))}
          </div>
          <div className="pop-f"><button type="button" className="btn sm ghost" onClick={() => go('/tasks')}>View all tasks & alerts</button></div>
        </Popover>
      )}

      {pop === 'profile' && user && (
        <Popover anchor={profileRef.current} width={290} onClose={close}>
          <div className="pop-h"><Avatar name={user.name} /><b>{user.name}<br /><span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>{user.email}</span></b></div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div className="f gp6 wrap">
              {user.roles.length
                ? user.roles.map((r) => <span key={r.id} dangerouslySetInnerHTML={{ __html: U.badge(r.name, 'blue') }} />)
                : <span className="fs11 muted">No role assigned</span>}
            </div>
            <div className="fs11 muted mt4">{user.permissions.length} permissions</div>
          </div>
          <div className="pop-b" style={{ padding: '6px 0' }}>
            {canOpen('users') ? <button type="button" className="menu-item" onClick={() => go('/users')}><Icon name="shield" />My role & permissions</button> : null}
            {canOpen('settings') ? <button type="button" className="menu-item" onClick={() => go('/settings')}><Icon name="settings" />System settings</button> : null}
            {canOpen('audit') ? <button type="button" className="menu-item" onClick={() => go('/audit')}><Icon name="doc" />My activity log</button> : null}
            <div className="menu-sep" />
            <button type="button" className="menu-item" style={{ color: 'var(--red)' }} onClick={() => { close(); void logout().then(() => navigate('/login')); }}>
              <Icon name="logout" />Sign out
            </button>
          </div>
        </Popover>
      )}
    </header>
  );
}
