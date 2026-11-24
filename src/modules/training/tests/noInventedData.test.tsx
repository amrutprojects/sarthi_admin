import { screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import ProgressPage from '../pages/ProgressPage';

const SCREENS: [title: string, Page: ComponentType][] = [['Student Progress', ProgressPage]];

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
