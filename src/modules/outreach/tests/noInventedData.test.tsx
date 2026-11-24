import { screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import CampaignDetailPage from '../pages/CampaignDetailPage';
import CommunicationsPage from '../pages/CommunicationsPage';
import MarketingPage from '../pages/MarketingPage';
import MobilizationPage from '../pages/MobilizationPage';

const SCREENS: [title: string, Page: ComponentType][] = [
  ['Marketing Dashboard', MarketingPage],
  ['Mobilization Dashboard', MobilizationPage],
  ['Communication Centre', CommunicationsPage],
];

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

describe('campaigns', () => {
  it('campaign detail keeps only the id from the address', () => {
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/marketing/:id" element={<CampaignDetailPage />} />
      </Routes>,
      { route: '/marketing/CMP-3' },
    );
    expect(screen.getByRole('heading', { name: 'Campaign' })).toBeInTheDocument();
    expect(screen.getByText('CMP-3')).toBeInTheDocument();
    expect(container.querySelector('table, .kpi, svg')).toBeNull();
  });
});
