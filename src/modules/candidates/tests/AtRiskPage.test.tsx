import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import AtRiskPage from '../pages/AtRiskPage';

describe('AtRiskPage — no live source', () => {
  it('shows its title and an empty state, with no sample students, counts or pretend messaging', () => {
    renderWithProviders(<AtRiskPage />);
    expect(screen.getByText('At-Risk Engine', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toBeInTheDocument();
    expect(screen.queryByText(/students flagged|Bulk communication|Contact|Attendance risk/)).not.toBeInTheDocument();
  });
});
