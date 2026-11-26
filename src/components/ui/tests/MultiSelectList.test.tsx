import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import MultiSelectList, { type MultiSelectOption } from '../MultiSelectList';

const OPTIONS: MultiSelectOption[] = [
  { id: 'c1', label: 'Nashik Road Centre', sub: 'TC0001', group: 'Nashik' },
  { id: 'c2', label: 'Nashik City Centre', sub: 'TC0002', group: 'Nashik' },
  { id: 'c3', label: 'Pune Main Centre', sub: 'TC0003', group: 'Pune' },
];

/* A controlled host, so the list behaves as on a form. */
function Host({ initial = [], saved = [] }: { initial?: string[]; saved?: MultiSelectOption[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <>
      <MultiSelectList
        id="ms"
        label="Enabled Centres"
        noun="centres"
        options={OPTIONS}
        saved={saved}
        value={value}
        onChange={setValue}
        emptyMsg="Nothing here."
      />
      <output data-testid="value">{value.join(',')}</output>
    </>
  );
}

describe('<MultiSelectList>', () => {
  it('groups options, ticks and unticks them', async () => {
    render(<Host />);
    expect(screen.getByText('Nashik')).toBeInTheDocument();
    expect(screen.getByText('Pune')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Pune Main Centre/));
    expect(screen.getByTestId('value')).toHaveTextContent('c3');
    await userEvent.click(screen.getByLabelText(/Pune Main Centre/));
    expect(screen.getByTestId('value')).toHaveTextContent('');
  });

  it('searches, and Select all / Select none act on the rows on screen only', async () => {
    render(<Host initial={['c3']} />);
    await userEvent.type(screen.getByPlaceholderText('Search centres…'), 'nashik');
    expect(screen.queryByLabelText(/Pune Main Centre/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByTestId('value')).toHaveTextContent('c3,c1,c2');
    await userEvent.click(screen.getByRole('button', { name: 'Select none' }));
    expect(screen.getByTestId('value')).toHaveTextContent(/^c3$/);
    await userEvent.clear(screen.getByPlaceholderText('Search centres…'));
    await userEvent.type(screen.getByPlaceholderText('Search centres…'), 'zzz');
    expect(screen.getByText('No centres match “zzz”.')).toBeInTheDocument();
  });

  it('keeps a saved value that is no longer offered visible as inactive; it can be unticked but not ticked again', async () => {
    render(<Host initial={['c9']} saved={[{ id: 'c9', label: 'Closed Centre', sub: 'TC0009', group: 'Nashik' }]} />);
    const closed = screen.getByLabelText(/Closed Centre \(inactive\)/);
    expect(closed).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByTestId('value')).toHaveTextContent('c9,c1,c2,c3');
    await userEvent.click(closed);
    expect(closed).not.toBeChecked();
    expect(closed).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByTestId('value')).not.toHaveTextContent('c9');
  });

  it('shows loading, empty and error states, with Retry', async () => {
    const retry = vi.fn();
    const props = {
      id: 'ms',
      label: 'Enabled Tracks',
      noun: 'tracks',
      value: [],
      onChange: () => undefined,
      emptyMsg: 'No active track yet.',
    };
    const { rerender } = render(<MultiSelectList {...props} options={[]} loading />);
    expect(screen.getByText('Loading tracks…')).toBeInTheDocument();
    rerender(<MultiSelectList {...props} options={[]} />);
    expect(screen.getByText('No active track yet.')).toBeInTheDocument();
    rerender(<MultiSelectList {...props} options={[]} error="Service unavailable" onRetry={retry} />);
    expect(screen.getByText(/Service unavailable/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });
});
