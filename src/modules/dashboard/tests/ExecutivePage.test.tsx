import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import { ApiError } from '../../../services/api-client';
import { studentApi } from '../../students';
import ExecutivePage from '../pages/ExecutivePage';

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}
const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/executive" element={<ExecutivePage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: '/executive' },
  );
const kpi = (label: string) => screen.getByText(label, { selector: '.kpi-t' }).closest('.kpi') as HTMLElement;

describe('ExecutivePage — live student figures', () => {
  it('shows Applications / Eligible / Enrolled / Awaiting batch from the summary, with no demo labelling', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(kpi('Applications')).getByText('15,000')).toBeInTheDocument());
    expect(within(kpi('Eligible')).getByText('14,950')).toBeInTheDocument();
    expect(within(kpi('Enrolled')).getByText('0')).toBeInTheDocument();
    expect(within(kpi('Awaiting batch')).getByText('14,950')).toBeInTheDocument();
    expect(screen.getByText('Financial snapshot').closest('h3')).toHaveTextContent(/^Financial snapshot/);
    expect(document.body).not.toHaveTextContent(/demo data|\(demo\)|demo environment/i);
    expect(screen.getAllByText(/Student figures are live as of/).length).toBeGreaterThan(0);
  });

  it('draws the district heatmap from summary.byCentre with links to the filtered list', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const { container } = renderPage();
    await screen.findByText(/no students enrolled yet: eligible students/);
    const links = Array.from(container.querySelectorAll('.heat-c[data-go]')).map((e) => e.getAttribute('data-go'));
    expect(links).toContain('#/candidates?bucket=eligible&centre=NAG');
    expect(links).toHaveLength(36);
  });

  it('shows empty states, not invented figures, for everything without a live source', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(kpi('Applications')).getByText('15,000')).toBeInTheDocument());
    const emptyTiles = ['Target', 'In training', 'Completed', 'Certified'].concat(
      ['GREEN', 'AMBER', 'RED', 'GREY'].map((r) => 'Districts ' + r),
    );
    for (const label of emptyTiles) {
      expect(within(kpi(label)).getByText('—')).toBeInTheDocument();
      expect(within(kpi(label)).getByTestId('no-data')).toHaveTextContent('No data yet');
    }
    const emptyCards = ['Overall programme health', 'Centre health', 'Trainer availability', 'Batch status', 'Critical alerts'];
    for (const title of emptyCards.concat('Financial snapshot')) {
      const card = screen.getByText(title).closest('.card') as HTMLElement;
      expect(within(card).getByTestId('no-data')).toHaveTextContent('No data yet');
    }
    expect(document.body).not.toHaveTextContent(
      /760|Programme Health Indicator|Indicative|Rate per student|Committed to centres|Released to date|due \d/,
    );
    expect(document.body).toHaveTextContent('अद्याप माहिती नाही');
  });

  it('opens the enrolled list from the Enrolled tile', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(kpi('Enrolled')).getByText('0')).toBeInTheDocument());
    await userEvent.click(kpi('Enrolled'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=enrolled');
  });

  it('shows "—" and Retry when the summary fails', async () => {
    vi.spyOn(studentApi, 'summary').mockRejectedValue(new ApiError('boom', 500, 'ERROR'));
    renderPage();
    expect(await screen.findByText('Could not load the live student figures.', { selector: 'b' })).toBeInTheDocument();
    expect(within(kpi('Applications')).getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
