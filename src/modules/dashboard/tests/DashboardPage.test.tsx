import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import { ApiError } from '../../../services/api-client';
import { useUiStore } from '../../../store/ui.store';
import { monthLabel, studentApi, studentListLink, topCentres, trackItems } from '../../students';
import DashboardPage from '../pages/DashboardPage';

function Probe() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}
const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { route: '/dashboard' },
  );
/* The KPI tile whose label is `label`. */
const tile = (label: string) => screen.getByText(label, { selector: '.kpi-t' }).closest('.kpi') as HTMLElement;
const goLinks = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-go]')).map((e) => e.getAttribute('data-go'));

beforeEach(() => {
  useUiStore.setState({ pageState: {} });
});

describe('DashboardPage — live student figures', () => {
  it('fills Applications / Eligible / Enrolled from the summary, with "as of" and no target on Enrolled', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
    expect(within(tile('Eligible')).getByText('14,950')).toBeInTheDocument();
    expect(within(tile('Eligible')).getByText('100% of applications')).toBeInTheDocument();
    expect(within(tile('Enrolled')).getByText('14,950 awaiting batch')).toBeInTheDocument();
    expect(within(tile('Enrolled')).queryByText(/% of target/)).not.toBeInTheDocument();
    expect(screen.getByText(/Applications, Eligible and Enrolled are live student figures as of/)).toBeInTheDocument();
    expect(studentApi.summary).toHaveBeenCalledWith(undefined);
  });

  it('carries no demo labelling: no page-wide badge and no per-figure chip', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
    for (const l of ['Total Target', 'Training Active', 'Completed', 'Assessed', 'Certified']) {
      expect(tile(l)).toBeInTheDocument();
    }
    expect(document.body).not.toHaveTextContent(/demo data|\(demo\)|demo environment/i);
  });

  it('shows the empty state for every figure with no live source and no invented values', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
    for (const l of ['Total Target', 'Training Active', 'Completed', 'Assessed', 'Certified']) {
      expect(within(tile(l)).getByText('—')).toBeInTheDocument();
      expect(within(tile(l)).getByTestId('no-data')).toHaveTextContent('No data yet');
    }
    for (const title of [
      'Programme progress against target',
      'Critical attention',
      'Training mode split',
      'Attendance trend (28 days)',
      'Live training right now',
    ]) {
      const card = screen.getByText(title).closest('.card') as HTMLElement;
      expect(within(card).getByTestId('no-data')).toHaveTextContent('This figure has no live source yet');
    }
    /* The map names every (real) district, so the invented "Nanded, Beed critical" alert is checked on its own card. */
    const critical = screen.getByText('Critical attention').closest('.card') as HTMLElement;
    expect(critical).not.toHaveTextContent(/Nanded|Beed|district/i);
    const body = document.body;
    expect(body).not.toHaveTextContent(/Maharashtra — all|both modes|critical district/i);
    expect(body).not.toHaveTextContent(/sessions in progress|pass rate|completion rate|of enrolled|offline ·|Programme Health/i);
    expect(screen.queryByLabelText('Training mode')).not.toBeInTheDocument();
    expect(screen.getByText('All districts', { selector: 'b' })).toBeInTheDocument();
  });

  it('offers only the live map metrics and draws only the live funnel stages', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const { container } = renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
    const metric = screen.getByLabelText('Map metric') as HTMLSelectElement;
    expect(Array.from(metric.options).map((o) => o.value)).toEqual(['enrolled', 'applications', 'eligible']);
    const links = goLinks(container);
    for (const l of ['#/lifecycle', '#/assessments', '#/certification', '#/districts?filter=critical']) {
      expect(links).not.toContain(l);
    }
  });

  it('falls back to a live metric when a stored filter names an old one', async () => {
    useUiStore.setState({ pageState: { dash: { district: 'ALL', mode: 'ONLINE', metric: 'certified' } } });
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
    expect((screen.getByLabelText('Map metric') as HTMLSelectElement).value).toBe('enrolled');
  });

  it('links the tiles to the real student list with the right bucket', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(within(tile('Eligible')).getByText('14,950')).toBeInTheDocument());
    await userEvent.click(tile('Eligible'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=eligible');
  });

  it('opens the awaiting-batch list from the Enrolled subtitle', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await userEvent.click(await screen.findByText('14,950 awaiting batch'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=awaiting');
  });

  it('draws the funnel, districts, tracks and sources with links to the filtered list', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const { container } = renderPage();
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
    const links = goLinks(container);
    expect(links).toEqual(
      expect.arrayContaining([
        '#/candidates?bucket=applications',
        '#/candidates?bucket=eligible',
        '#/candidates?bucket=enrolled',
        /* Nobody is enrolled yet, so the district bar ranks eligible students. */
        '#/candidates?bucket=eligible&centre=NAG',
        '#/candidates?track=T07',
        '#/candidates?source=IMPORT',
      ]),
    );
    expect(screen.getByText(/No students enrolled yet: eligible students per district/)).toBeInTheDocument();
    expect(screen.getByText('Students by track')).toBeInTheDocument();
  });

  it('passes the district filter to the summary as ?centre= and to the links', async () => {
    const spy = vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    await userEvent.selectOptions(screen.getByLabelText('District'), 'PUN');
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith('PUN'));
    expect(screen.getByText('Pune', { selector: 'b' })).toBeInTheDocument();
    await userEvent.click(tile('Applications'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=applications&centre=PUN');
  });

  it('explains the zero state and links to Student Import', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture(true));
    renderPage();
    expect(await screen.findByText(/No students in the register yet/)).toBeInTheDocument();
    expect(screen.getByText(/finalised in Student Import/)).toBeInTheDocument();
    expect(within(tile('Applications')).getByText('0')).toBeInTheDocument();
    expect(within(tile('Eligible')).getByText('0% of applications')).toBeInTheDocument();
    expect(screen.getByText('No applications in the last 12 months')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open Student Import' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/student-import');
  });

  it('shows a loading placeholder and then an error with Retry', async () => {
    const spy = vi.spyOn(studentApi, 'summary').mockRejectedValue(new ApiError('boom', 500, 'ERROR'));
    renderPage();
    expect(within(tile('Applications')).getByText('…')).toBeInTheDocument();
    expect(await screen.findByText('Could not load the live student figures.', { selector: 'b' })).toBeInTheDocument();
    expect(within(tile('Applications')).getByText('—')).toBeInTheDocument();
    spy.mockResolvedValue(summaryFixture());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(within(tile('Applications')).getByText('15,000')).toBeInTheDocument());
  });
});

describe('studentFigures', () => {
  it('builds list links, skipping empty values', () => {
    expect(studentListLink()).toBe('#/candidates');
    expect(studentListLink({ bucket: 'enrolled', centre: undefined, track: '' })).toBe('#/candidates?bucket=enrolled');
  });

  it('ranks districts by enrolled once anyone is enrolled', () => {
    const s = summaryFixture();
    s.byCentre[2].enrolled = 5;
    const top = topCentres(s);
    expect(top.metric).toBe('enrolled');
    expect(top.items).toEqual([{ l: 'Thane', v: 5, link: '#/candidates?bucket=enrolled&centre=THA' }]);
  });

  it('lists tracks with students, TBC as track=none', () => {
    const s = summaryFixture();
    s.byTrack[2].applications = 3;
    expect(trackItems(s, 'PUN').map((x) => x.link)).toEqual([
      '#/candidates?track=T07&centre=PUN',
      '#/candidates?track=T12&centre=PUN',
      '#/candidates?track=none&centre=PUN',
    ]);
    expect(monthLabel('2026-10')).toBe('Oct 26');
  });
});
