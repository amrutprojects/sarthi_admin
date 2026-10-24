import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import StudentImportPage from '../pages/StudentImportPage';
import { importApi, studentApi } from '../services/importApi';

vi.mock('../../auth', () => ({
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: { id: 'me' }, permissions: new Set(['imports.view']) }),
}));

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}
const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/student-import" element={<StudentImportPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: '/student-import' },
  );
const kpi = (label: string) => screen.getByText(label, { selector: '.kpi-t' }).closest('.kpi') as HTMLElement;
const emptyPage = { items: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } };

describe('Student Import — Student register tab', () => {
  it('shows total, eligible, enrolled and awaiting batch from the summary, each linking to the student list', async () => {
    vi.spyOn(importApi, 'reference').mockRejectedValue(new Error('not needed'));
    vi.spyOn(importApi, 'list').mockResolvedValue(emptyPage);
    vi.spyOn(studentApi, 'list').mockResolvedValue(emptyPage);
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Student register' }));
    await waitFor(() => expect(within(kpi('Students in register')).getByText('15,000')).toBeInTheDocument());
    expect(within(kpi('Eligible')).getByText('14,950')).toBeInTheDocument();
    expect(within(kpi('Enrolled')).getByText('0')).toBeInTheDocument();
    expect(within(kpi('Awaiting batch')).getByText('14,950')).toBeInTheDocument();
    expect(screen.getByText(/Live register counts as of/)).toBeInTheDocument();
    await userEvent.click(kpi('Awaiting batch'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=awaiting');
  });
});
