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
/* A live register tile. */
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
    /* Conversions are only between live stages. */
    expect(screen.getByText(/Eligible → Enrollment/)).toBeInTheDocument();
    expect(screen.queryByText(/Training → Assessment|Lead → Registration/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/demo data|\(demo\)|demo environment|Indicative values/i);
  });

  it('names the stages with no live source without figures, and empties the status engine', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
    const other = screen.getByTestId('no-source-stages');
    for (const l of ['Awareness (reach)', 'Lead', 'Training', 'Assessment', 'Certification']) {
      const row = within(other).getByText(l).closest('.list-row') as HTMLElement;
      expect(within(row).getByText('—')).toBeInTheDocument();
      expect(within(row).getByTestId('no-data')).toBeInTheDocument();
    }
    const engine = screen.getByText('Candidate status engine — current distribution').closest('.card') as HTMLElement;
    expect(within(engine).getByTestId('no-data')).toBeInTheDocument();
    expect(within(engine).queryByText(/\d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/defined statuses/)).not.toBeInTheDocument();
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
