import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import TodayPage from '../pages/TodayPage';

describe('TodayPage — no live source yet', () => {
  it('shows the screen title and an honest empty state, with no invented date, session or name', () => {
    renderWithProviders(<TodayPage />);
    expect(screen.getByRole('heading', { name: /Today's Control Room/ })).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toHaveTextContent('No data yet');
    expect(document.body).toHaveTextContent('अद्याप माहिती नाही');
    expect(document.body).not.toHaveTextContent(
      /Operational snapshot|2026|Sessions today|Students present|Session schedule|Open items for today|LIVE/,
    );
    expect(document.title).toBe("Today's Operations — AMRUT × SUMAGO Admin");
  });

  it('keeps the real navigation links', () => {
    renderWithProviders(<TodayPage />);
    expect(screen.getByText('Live training monitor')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
  });
});
