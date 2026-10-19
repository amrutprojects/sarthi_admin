import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import DocumentList from '../components/DocumentList';
import DocumentsReportCard from '../components/DocumentsReportCard';
import FileDrop from '../components/FileDrop';
import type { StudentDocument } from '../services/importApi';

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

describe('<FileDrop>', () => {
  it('accepts a matching file and rejects the wrong type or size', async () => {
    const onPick = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <FileDrop file={null} accept=".zip" prompt="Drop" hint="" maxMb={1} onPick={onPick} onReject={onReject} ariaLabel="Choose ZIP" />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(input, file('docs.zip'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'docs.zip' }));
    await userEvent.upload(input, file('docs.zip', 2 * 1024 * 1024));
    expect(onReject).toHaveBeenCalledWith('The file is larger than 1 MB');
  });

  it('shows the chosen file and can remove it', async () => {
    const onPick = vi.fn();
    render(
      <FileDrop
        file={file('docs.zip')}
        accept=".zip"
        prompt="Drop"
        hint=""
        maxMb={1}
        onPick={onPick}
        onReject={() => {}}
        ariaLabel="Choose ZIP"
      />,
    );
    expect(screen.getByText('docs.zip')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onPick).toHaveBeenCalledWith(null);
  });
});

describe('<DocumentsReportCard>', () => {
  it('shows totals, rejected files with reasons and unmatched folders', () => {
    render(
      <DocumentsReportCard
        report={{
          zipName: 'docs.zip',
          uploadedAt: '2026-10-19T08:00:00Z',
          stored: 12,
          replaced: 0,
          studentsWithFiles: 4,
          unmatchedFolders: ['MA-9999'],
          rejected: [{ path: 'MA-1/PHOTO.pdf', reason: 'not a PDF, JPG or PNG file' }],
          matchedByPath: 10,
          missingReferenced: [{ rowNumber: 4, sourceRecordId: 'MA-4', docType: 'CASTE_CERT', path: 'MA-4/caste.pdf' }],
        }}
      />,
    );
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Students with files')).toBeInTheDocument();
    expect(screen.getByText(/not a PDF, JPG or PNG file/)).toBeInTheDocument();
    expect(screen.getByText(/MA-9999/)).toBeInTheDocument();
    expect(screen.getByText(/10 files were matched by the paths written in the Excel/)).toBeInTheDocument();
    expect(screen.getByText('MA-4/caste.pdf')).toBeInTheDocument();
  });
});

describe('<DocumentList>', () => {
  const doc: StudentDocument = {
    id: 'd1',
    docType: 'PHOTO',
    label: 'Photo',
    originalName: 'PHOTO.jpg',
    sourcePath: 'MA-0001/photo.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2048,
    uploadedAt: '',
  };

  it('lists files and downloads one', async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<DocumentList queryKey={['t', 1]} load={async () => [doc]} download={download} emptyText="none" />);
    expect(await screen.findByText('Photo')).toBeInTheDocument();
    expect(screen.getByText(/MA-0001\/photo.jpg · 2 KB/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Download Photo' }));
    expect(download).toHaveBeenCalledWith(doc);
  });

  it('shows the empty text', async () => {
    renderWithProviders(<DocumentList queryKey={['t', 2]} load={async () => []} download={vi.fn()} emptyText="No files yet" />);
    expect(await screen.findByText('No files yet')).toBeInTheDocument();
  });
});
