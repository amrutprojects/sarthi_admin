import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import { studentApi } from '../../students';
import LifecyclePage from '../pages/LifecyclePage';

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}
const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lifecycle" element={<LifecyclePage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: '/lifecycle' },
  );
/* A live register tile (the demo status engine below has tiles with the same names). */
const tile = (label: string) =>
  within(screen.getByText('Student register — current distribution').closest('.card') as HTMLElement)
    .getByText(label, { selector: '.kpi-t' })
    .closest('.kpi') as HTMLElement;

describe('LifecyclePage — live register stages', () => {
  it('fills Registration, Verification, Eligible and Enrollment from the summary', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const { container } = renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
    expect(within(tile('Pending verification')).getByText('12')).toBeInTheDocument();
    expect(within(tile('Eligible')).getByText('14,950')).toBeInTheDocument();
    expect(within(tile('Awaiting batch')).getByText('14,950')).toBeInTheDocument();
    const links = Array.from(container.querySelectorAll('[data-go]')).map((e) => e.getAttribute('data-go'));
    expect(links).toEqual(
      expect.arrayContaining([
        '#/candidates?bucket=applications',
        '#/candidates?bucket=pending',
        '#/candidates?bucket=eligible',
        '#/candidates?bucket=enrolled',
      ]),
    );
    /* Live-to-live conversions carry no chip; the later stages stay demo. */
    expect(screen.getByText(/Eligible → Enrollment/)).not.toHaveTextContent('Demo data');
    expect(screen.getByText(/Training → Assessment/)).toHaveTextContent('Demo data');
    expect(screen.getByText(/Candidate status engine/).closest('h3')).toHaveTextContent('Demo data');
  });

  it('shows "—" for a conversion from an empty stage instead of NaN', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture(true));
    renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('0')).toBeInTheDocument());
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it('opens the pending list from its tile', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(tile('Pending verification')).getByText('12')).toBeInTheDocument());
    await userEvent.click(tile('Pending verification'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=pending');
  });
});
