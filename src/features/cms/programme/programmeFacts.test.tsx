import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import ProgrammeEdit from './pages/ProgrammeEdit';
import ProgrammeForm from './pages/ProgrammeForm';
import ProgrammeView from './pages/ProgrammeView';
import { programmeService } from './services/programmeService';
import type { ApiProgrammePage, Bilingual } from './types/programme.types';

vi.mock('./services/programmeService', () => ({ programmeService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn() } }));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: new Set(['cms-programme.view', 'cms-programme.update']), hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });

/* The seeded fact sheet, on an otherwise minimal but valid Programme page. */
const page = (): ApiProgrammePage => ({
  id: 'p1',
  intro: pair('परिचय', 'Introduction'),
  objectives: [pair('उद्दिष्ट', 'Objective')],
  methodology: [{ label: pair('पद्धत', 'Delivery mode'), value: pair('वर्ग', 'Classroom') }],
  assessment: [{ component: pair('परीक्षा', 'Exam'), min: 40, max: 100 }],
  assessmentNote: pair('टीप', 'Note'),
  certification: [pair('प्रमाणपत्र', 'Certificate')],
  trainingModes: {
    title: pair('प्रशिक्षण पद्धती', 'Training modes'),
    modes: [{ name: pair('ऑफलाइन', 'OFFLINE'), description: pair('वर्गात', 'In class') }],
    note: pair('टीप', 'Note'),
  },
  facts: { idealMonths: 6, validityMonths: 12, securityDeposit: 2000, applyLeadDays: 30, partnerName: 'SUMAGO INFOTECH PVT LTD' },
  isPublished: true,
  updatedAt: '2026-10-01T10:00:00.000Z',
});

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save Programme page' }));

describe('Programme fact sheet', () => {
  beforeEach(() => {
    /* jsdom has no scrolling; the form scrolls to the first error. */
    Element.prototype.scrollIntoView = vi.fn();
    /* The panel shell's toast container, which the save and error toasts are appended to. */
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  });

  it('shows the five fact sheet fields prefilled in the form', () => {
    renderWithProviders(<ProgrammeForm initial={page()} backTo="/cms/programme" onSave={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Programme fact sheet/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Ideal duration \(months\)/)).toHaveValue('6');
    expect(screen.getByLabelText(/Validity \(months\)/)).toHaveValue('12');
    expect(screen.getByLabelText(/Security deposit/)).toHaveValue('2000');
    expect(screen.getByLabelText(/Apply before \(days\)/)).toHaveValue('30');
    expect(screen.getByLabelText(/Partner name/)).toHaveValue('SUMAGO INFOTECH PVT LTD');
  });

  it('blocks the save when the partner name is empty', async () => {
    const onSave = vi.fn();
    renderWithProviders(<ProgrammeForm initial={page()} backTo="/cms/programme" onSave={onSave} />);
    await userEvent.clear(screen.getByLabelText(/Partner name/));
    /* Spaces alone are blank too: the server trims before its min(1). */
    await userEvent.type(screen.getByLabelText(/Partner name/), '   ');
    await save();
    expect(await screen.findByText('Partner name is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/Partner name/)).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reports a cleared figure as required instead of saving it as 0, and checks the bounds', async () => {
    const onSave = vi.fn();
    renderWithProviders(<ProgrammeForm initial={page()} backTo="/cms/programme" onSave={onSave} />);
    await userEvent.clear(screen.getByLabelText(/Ideal duration/));
    await userEvent.clear(screen.getByLabelText(/Validity/));
    await userEvent.type(screen.getByLabelText(/Validity/), '241');
    await userEvent.clear(screen.getByLabelText(/Security deposit/));
    await userEvent.type(screen.getByLabelText(/Security deposit/), '2000.5');
    await save();
    expect(await screen.findByText('Ideal duration is required')).toBeInTheDocument();
    expect(screen.getByText('Validity must be at most 240')).toBeInTheDocument();
    expect(screen.getByText('Security deposit must be a whole number')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('scrolls to the invalid figure on the first failed save, though the card sits far above the Save button', async () => {
    renderWithProviders(<ProgrammeForm initial={page()} backTo="/cms/programme" onSave={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText(/Security deposit/));
    await save();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(screen.getByLabelText(/Security deposit/));
  });

  it('sends the figures as numbers and the partner name trimmed', async () => {
    vi.mocked(programmeService.get).mockResolvedValue(page());
    vi.mocked(programmeService.update).mockResolvedValue(page());
    renderWithProviders(<ProgrammeEdit />);
    const deposit = await screen.findByLabelText(/Security deposit/);
    await userEvent.clear(deposit);
    await userEvent.type(deposit, ' 2500 ');
    await userEvent.type(screen.getByLabelText(/Partner name/), '  ');
    await save();
    await waitFor(() => expect(programmeService.update).toHaveBeenCalledTimes(1));
    const body = vi.mocked(programmeService.update).mock.calls[0]![0];
    /* The PUT body is .strict() on the server: the page's own fields plus facts, nothing read-only such as id. */
    expect(Object.keys(body).sort()).toEqual([
      'assessment',
      'assessmentNote',
      'certification',
      'facts',
      'intro',
      'isPublished',
      'methodology',
      'objectives',
      'trainingModes',
    ]);
    expect(body.facts).toEqual({
      idealMonths: 6,
      validityMonths: 12,
      securityDeposit: 2500,
      applyLeadDays: 30,
      partnerName: 'SUMAGO INFOTECH PVT LTD',
    });
  });

  it("puts the server's facts.* messages on the matching field", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(
        new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
          { field: 'body.facts.securityDeposit', message: 'Security deposit must be at most 10000000' },
        ]),
      );
    renderWithProviders(<ProgrammeForm initial={page()} backTo="/cms/programme" onSave={onSave} />);
    await save();
    await waitFor(() => expect(screen.getByLabelText(/Security deposit/)).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByLabelText(/Security deposit/)).toHaveAccessibleDescription('Security deposit must be at most 10000000');
  });

  it('shows the fact sheet on the view page, with the deposit in Indian grouping', async () => {
    vi.mocked(programmeService.get).mockResolvedValue({ ...page(), facts: { ...page().facts, securityDeposit: 125000 } });
    /* The fact sheet has its own tab on the view. */
    renderWithProviders(<ProgrammeView />, { route: '/cms/programme?tab=facts' });
    expect(await screen.findByRole('heading', { name: /Programme fact sheet/ })).toBeInTheDocument();
    expect(screen.getByText('6 months')).toBeInTheDocument();
    expect(screen.getByText('12 months')).toBeInTheDocument();
    expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('SUMAGO INFOTECH PVT LTD')).toBeInTheDocument();
  });
});
