import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer, Modal } from '../Overlay';

/*
 * A dialog or a drawer stays open until it is closed on purpose: a text selected with the mouse that ends outside it, or a
 * click outside it, keeps it open with what was typed.
 */
function Editing({ as: Overlay, onClose }: { as: typeof Modal; onClose: () => void }) {
  const [name, setName] = useState('');
  return (
    <Overlay
      title="Edit Divisional Officer"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      }
    >
      <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
    </Overlay>
  );
}

describe.each([
  ['Modal', Modal, '.ov'],
  ['Drawer', Drawer, '.drawer-ov'],
] as const)('%s', (_name, Overlay, outside) => {
  it('stays open when a selection ends outside it, and when the page behind is clicked', async () => {
    const onClose = vi.fn();
    render(<Editing as={Overlay} onClose={onClose} />);
    const box = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.type(box, 'Anil Rao');
    const behind = document.querySelector(outside)!;
    /* Pressed in the box, let go outside: the browser clicks what is outside. */
    fireEvent.mouseDown(box);
    fireEvent.mouseUp(behind);
    fireEvent.click(behind);
    await userEvent.click(behind);
    expect(onClose).not.toHaveBeenCalled();
    expect(box).toHaveValue('Anil Rao');
    /* Closed on purpose: Cancel, ✕ and Escape. */
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
