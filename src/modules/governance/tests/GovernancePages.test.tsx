import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import FinancePage from '../pages/FinancePage';
import PmoPage from '../pages/PmoPage';
import QaPage from '../pages/QaPage';
import TasksPage from '../pages/TasksPage';
import DocumentsPage from '../pages/DocumentsPage';
import ReportsPage from '../pages/ReportsPage';
import { REPORT_CATALOGUE } from '../reportCatalogue';
import ReportDetailPage from '../pages/ReportDetailPage';

let openable = new Set<string>();
vi.mock('../../auth', () => ({ useCanOpen: () => (k: string) => openable.has(k) }));

beforeEach(() => {
  openable = new Set();
});

/* Values the old sample dataset showed on these screens; none may appear any more. */
const INVENTED = [/760/, /Nanded/, /Beed/, /₹/, /\/100/, /Indicative/i, /\d+ open/];
function expectNothingInvented(container: HTMLElement) {
  const text = container.textContent ?? '';
  INVENTED.forEach((re) => expect(text).not.toMatch(re));
  expect(container.querySelector('table')).toBeNull();
}

describe('governance screens without a live source', () => {
  it.each([
    ['Finance', FinancePage, 'Finance Dashboard'],
    ['PMO', PmoPage, 'PMO Dashboard'],
    ['QA', QaPage, 'Quality Assurance'],
    ['Tasks', TasksPage, 'Tasks & Alerts'],
    ['Documents', DocumentsPage, 'Document Management'],
  ])('%s shows its title, an empty state in English and Marathi, and no actions', (_n, Page, title) => {
    const { container } = renderWithProviders(<Page />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toHaveTextContent('No data yet');
    expect(screen.getByTestId('no-data')).toHaveTextContent('अद्याप माहिती नाही');
    /* No "Create task", "Upload document" or "Schedule inspection" buttons pretending to work. */
    expect(screen.queryByRole('button')).toBeNull();
    expectNothingInvented(container);
  });
});

describe('Reports & MIS', () => {
  it('lists the report catalogue and says each has no data yet', () => {
    const { container } = renderWithProviders(<ReportsPage />);
    expect(screen.getByRole('heading', { name: 'Reports & MIS' })).toBeInTheDocument();
    REPORT_CATALOGUE.forEach(([, title]) => expect(screen.getByText(title)).toBeInTheDocument());
    expect(screen.getAllByTestId('no-data')).toHaveLength(REPORT_CATALOGUE.length);
    expect(screen.queryByRole('button', { name: /MIS pack/i })).toBeNull();
    expectNothingInvented(container);
  });

  const renderDetail = (id: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/reports/:id" element={<ReportDetailPage />} />
      </Routes>,
      { route: '/reports/' + id },
    );

  it('a report shows its title and an empty state, never sample rows', () => {
    const { container } = renderDetail('district');
    expect(screen.getByRole('heading', { name: 'District Report' })).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toHaveTextContent('No data yet');
    expect(screen.getByRole('button', { name: /All reports/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /attendance reports/i })).toBeNull();
    expectNothingInvented(container);
  });

  it('the attendance report points to the live attendance reports when the user may open them', () => {
    openable = new Set(['attendance-reports']);
    renderDetail('attendance');
    const link = within(screen.getByTestId('no-data')).getByRole('button', { name: /live attendance reports/i });
    expect(link).toHaveTextContent('थेट उपस्थिती अहवाल उघडा');
  });

  it('the attendance report has no live link without access', () => {
    renderDetail('attendance');
    expect(screen.queryByRole('button', { name: /live attendance reports/i })).toBeNull();
  });

  it('an unknown report says it was not found', () => {
    renderDetail('nope');
    expect(screen.getByText('Report not found')).toBeInTheDocument();
  });
});
