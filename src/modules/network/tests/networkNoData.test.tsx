import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { lmsLiveApi, type LiveDataState } from '../../lms-live';
import CentresPage from '../pages/CentresPage';
import CentreDetailPage from '../pages/CentreDetailPage';
import CentreOnboardingPage from '../pages/CentreOnboardingPage';
import TalukaDetailPage from '../pages/TalukaDetailPage';

/* Screens with no live source: their title, an honest empty state, and none of the old sample records. */
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/centres" element={<CentresPage />} />
      <Route path="/centres/:id" element={<CentreDetailPage />} />
      <Route path="/centre-onboarding" element={<CentreOnboardingPage />} />
      <Route path="/districts/:id/talukas/:t" element={<TalukaDetailPage />} />
    </Routes>,
    { route },
  );

const SAMPLE = /\/100|Approved & live|In pipeline|Indicative|Centre manager|Average centre score|students · attendance/;

describe('network screens without a live source', () => {
  it('Training centres with the LMS switch off: says how to see live data, no sample centres', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue({ setting: false } as LiveDataState);
    renderAt('/centres');
    expect(await screen.findByText('Training Centre Master')).toBeInTheDocument();
    expect(screen.getByText(/Turn on “Show live LMS data” in System Settings/)).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toBeInTheDocument();
    expect(screen.queryByText('Add centre')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(SAMPLE);
  });

  it('Centre detail shows an empty state for any id', () => {
    renderAt('/centres/CTR-PUN-01');
    expect(screen.getByText('Training centre', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Inspection/ })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(SAMPLE);
  });

  it('Centre onboarding shows an empty state and no pretend "Start new onboarding"', () => {
    renderAt('/centre-onboarding');
    expect(screen.getByText('Centre Onboarding Workflow')).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toBeInTheDocument();
    expect(screen.queryByText('Start new onboarding')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(SAMPLE);
  });

  it('Taluka detail keeps the real district and taluka names, with no figures', () => {
    renderAt('/districts/NAG/talukas/Katol');
    expect(screen.getByText('Katol Taluka')).toBeInTheDocument();
    expect(screen.getByText('Nagpur')).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toBeInTheDocument();
    expect(screen.queryByText(/Indicative target|Training active|Mode split/)).not.toBeInTheDocument();
  });
});
