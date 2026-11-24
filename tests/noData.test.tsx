import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { NO_DATA_TEXT, NoData, NoDataLabel, NotAvailablePage } from '../src/components/ui';
import { renderWithProviders } from './test-utils';

/* The shared empty states that replace the retired sample figures: English and Marathi, never a number. */
describe('no-data empty states', () => {
  it('every text has English and Marathi', () => {
    for (const t of Object.values(NO_DATA_TEXT)) {
      expect(t.en.length).toBeGreaterThan(0);
      expect(t.mr).toMatch(/[ऀ-ॿ]/);
    }
  });

  it('NoDataLabel shows the short bilingual marker', () => {
    renderWithProviders(<NoDataLabel />);
    expect(screen.getByTestId('no-data')).toHaveTextContent('No data yet · अद्याप माहिती नाही');
  });

  it('NoData shows the figure message in both languages', () => {
    renderWithProviders(<NoData />);
    expect(screen.getByText(NO_DATA_TEXT.figure.en)).toBeInTheDocument();
    expect(screen.getByText(NO_DATA_TEXT.figure.mr)).toHaveAttribute('lang', 'mr');
  });

  it('NotAvailablePage keeps the title and shows the screen message, with no figures', () => {
    const { container } = renderWithProviders(<NotAvailablePage title="Audit Log" msg={NO_DATA_TEXT.lmsOff} />);
    expect(screen.getByRole('heading', { name: 'Audit Log' })).toBeInTheDocument();
    expect(screen.getByText(NO_DATA_TEXT.lmsOff.en)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d/);
  });
});
