import { screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import BatchDetailPage from '../pages/BatchDetailPage';
import TotPage from '../pages/TotPage';
import TrainerDetailPage from '../pages/TrainerDetailPage';

const SCREENS: [title: string, Page: ComponentType][] = [['Trainer ToT Management', TotPage]];

/*
 * No invented figures (user decision 24 Nov 2026): these screens have no live source, so each shows its title and one
 * honest empty state in English and Marathi; no sample table, KPI tile or chart.
 */
function expectEmptyScreen(container: HTMLElement, title: string) {
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.getByTestId('no-data')).toHaveTextContent('No data yet');
  expect(screen.getByText(/या स्क्रीनसाठी अद्याप थेट डेटा स्रोत नाही/)).toBeInTheDocument();
  expect(container.querySelector('table, .kpi, svg')).toBeNull();
  expect(container.textContent).not.toMatch(/\d{2,}/);
}

describe('screens without a live source show an empty state, nothing invented', () => {
  it.each(SCREENS)('%s', (title, Page) => {
    const { container } = renderWithProviders(<Page />);
    expectEmptyScreen(container, title);
  });
});

describe('detail screens keep the id from the address only', () => {
  it.each([
    ['Batch', BatchDetailPage, '/batches/:id', '/batches/AMRUT-X-Y-B001', 'AMRUT-X-Y-B001'],
    ['Trainer', TrainerDetailPage, '/trainers/:id', '/trainers/TR-7', 'TR-7'],
  ] as const)('%s', (title, Page, path, route, id) => {
    const { container } = renderWithProviders(
      <Routes>
        <Route path={path} element={<Page />} />
      </Routes>,
      { route },
    );
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(id)).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toHaveTextContent('No data yet');
    expect(container.querySelector('table, .kpi, svg')).toBeNull();
  });
});
