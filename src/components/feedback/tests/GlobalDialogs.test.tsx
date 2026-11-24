import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AS from '../../../legacy';
import GlobalDialogs from '../GlobalDialogs';

/* Task and LMS-sync dialogs had no live source: each now says so, in English and Marathi, with no sample record. */
describe('<GlobalDialogs>', () => {
  it.each([
    ['openTask', () => AS.actions.openTask('TSK-001'), 'Tasks and alerts are not available yet', 'कार्ये व सूचना अद्याप उपलब्ध नाहीत'],
    ['newTask', () => AS.actions.newTask('PUN'), 'Creating tasks is not available yet', 'कार्य तयार करणे अद्याप उपलब्ध नाही'],
    ['syncLms', () => AS.actions.syncLms(), 'A programme-wide LMS sync is not available here yet', 'संपूर्ण कार्यक्रमाचे LMS समक्रमण'],
  ])('%s opens a bilingual not-available notice', (_name, open, en, mr) => {
    render(<GlobalDialogs />);
    act(() => open());
    const box = screen.getByTestId('not-available');
    expect(box).toHaveTextContent(en);
    expect(box).toHaveTextContent(mr);
    /* No sample owner, due date, form field or fake sync result. */
    expect(document.body.querySelector('select, input, textarea')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Sync complete|Records processed|learners|Owner|Due date|\d/);
    act(() => screen.getByRole('button', { name: /Close/ }).click());
    expect(screen.queryByTestId('not-available')).toBeNull();
  });
});
