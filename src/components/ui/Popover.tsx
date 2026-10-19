import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  anchor: HTMLElement | null;
  width?: number;
  alignLeft?: boolean;
  onClose: () => void;
  children?: ReactNode;
}

/* Positioned dropdown panel (same .pop styling as the original portal). Closes on outside click / Esc. */
export default function Popover({ anchor, width = 340, alignLeft = false, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 60, left: 10 });

  useLayoutEffect(() => {
    const r = anchor ? anchor.getBoundingClientRect() : { bottom: 60, right: window.innerWidth - 20, left: 10 };
    const left = alignLeft ? r.left : Math.max(10, Math.min(window.innerWidth - width - 10, r.right - width));
    setPos({ top: r.bottom + 8, left });
  }, [anchor, width, alignLeft]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !(anchor && anchor.contains(t))) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      className="pop"
      ref={ref}
      style={{ width, top: pos.top, left: pos.left }}
      onClick={(e) => {
        if ((e.target as Element).closest('[data-close-pop]')) onClose();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
