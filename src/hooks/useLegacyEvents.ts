import { useEffect } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import AS from '../legacy';
import { isPublicPath, publicUrl } from '../utils/publicSite';

/* Navigate to a "#/path" link; public-site paths open the existing public website. */
export function goTo(navigate: NavigateFunction, href: string): void {
  const path = href.replace(/^#/, '') || '/';
  if (isPublicPath(path)) {
    window.location.href = publicUrl(path);
    return;
  }
  navigate(path);
}

/*
 * The chart/map SVG generators and the help modal emit plain markup with
 * data-go (navigate), data-act (AS.actions) and data-modal-close attributes.
 * This hook handles those clicks, as the original app.js did.
 */
export default function useLegacyEvents() {
  const navigate = useNavigate();

  useEffect(() => {
    const U = AS.ui;
    AS.nav = (h) => goTo(navigate, h);

    function onClick(e: MouseEvent) {
      const t = e.target as Element | null;
      if (!t || !t.closest) return;
      if (t.closest('[data-modal-close]')) U.closeModal();
      if (t.closest('[data-drawer-close]')) U.closeDrawer();
      const ov = t.closest('[data-modal-ov]');
      if (ov && t === ov) {
        U.closeModal();
        return;
      }

      const act = t.closest('[data-act]');
      if (act) {
        const fn = AS.actions[act.getAttribute('data-act') || ''];
        if (fn) {
          e.preventDefault();
          fn(act.getAttribute('data-arg'), act, e);
          return;
        }
      }
      /* Plain links written in the original "#/route" form are routed without a page reload. */
      const a = t.closest('a[href^="#/"]');
      if (a && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0)) {
        e.preventDefault();
        goTo(navigate, a.getAttribute('href') || '/');
        return;
      }
      const go = t.closest('[data-go]');
      if (go) {
        const href = go.getAttribute('data-go');
        if (href) {
          e.preventDefault();
          goTo(navigate, href);
        }
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        U.closeModal();
        U.closeDrawer();
      }
    }

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [navigate]);
}
