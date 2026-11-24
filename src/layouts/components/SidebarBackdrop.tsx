import { useEffect } from 'react';

/*
 * Phones and tablets (≤ 1024 px): the open sidebar covers the menu button, so it needs its own way out.
 * A tap beside it or the Escape key closes it. On wider screens the sidebar is never off-canvas and the
 * backdrop is hidden by CSS (.sb-backdrop).
 */
export default function SidebarBackdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return <button type="button" className="sb-backdrop" aria-label="Close menu · मेनू बंद करा" onClick={onClose} />;
}
