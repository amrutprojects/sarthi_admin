import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
}

const root = (id: string): HTMLElement => document.getElementById(id) ?? document.body;

export interface OverlayProps {
  title: ReactNode;
  size?: string;
  headExtra?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
}

/* Modal dialog with the original .ov/.modal markup. */
export function Modal({ title, size, headExtra, footer, onClose, children }: OverlayProps) {
  useEsc(onClose);
  return createPortal(
    <div
      className="ov"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={'modal ' + (size || '')} role="dialog" aria-modal="true">
        <div className="modal-h">
          <h3>{title}</h3>
          {headExtra}
          <button type="button" className="x-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-b">{children}</div>
        {footer ? <div className="modal-f">{footer}</div> : null}
      </div>
    </div>,
    root('react-modal-root'),
  );
}

/* Side drawer with the original .drawer markup. */
export function Drawer({ title, size, headExtra, footer, onClose, children }: OverlayProps) {
  useEsc(onClose);
  return createPortal(
    <>
      <div className="drawer-ov" onClick={onClose} />
      <aside className={'drawer ' + (size || '')}>
        <div className="drawer-h">
          <h3>{title}</h3>
          {headExtra}
          <button type="button" className="x-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-b">{children}</div>
        {footer ? <div className="drawer-f">{footer}</div> : null}
      </aside>
    </>,
    root('react-drawer-root'),
  );
}
