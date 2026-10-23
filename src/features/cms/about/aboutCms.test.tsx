import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import AboutDashboard from './pages/AboutDashboard';
import CardEditorPage from './pages/CardEditorPage';
import FactEditorPage from './pages/FactEditorPage';
import { aboutService, toItem } from './services/aboutService';
import type * as AboutServiceModule from './services/aboutService';
import type { ApiAbout, ApiAboutCard, ApiAboutFact, Bilingual } from './types/about.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/aboutService', async (importOriginal) => {
  const real = await importOriginal<typeof AboutServiceModule>();
  return {
    toItem: real.toItem,
    aboutService: {
      get: vi.fn(),
      updateSection: vi.fn(),
      getItem: vi.fn(),
      createItem: vi.fn(),
      updateItem: vi.fn(),
      setItemStatus: vi.fn(),
      removeItem: vi.fn(),
      reorder: vi.fn(),
    },
  };
});
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const ALL = ['cms-about.view', 'cms-about.create', 'cms-about.update', 'cms-about.delete'];
const T = { createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-02T10:00:00.000Z' };

const fact = (n: number, label: Bilingual, value: Bilingual): ApiAboutFact => ({
  id: `f${n}`,
  label,
  value,
  displayOrder: n,
  isActive: true,
  ...T,
});
const card = (n: number, heading: Bilingual, required: boolean): ApiAboutCard => ({
  id: `c${n}`,
  heading,
  description: pair(`वर्णन ${n}`, `Description ${n}`),
  displayOrder: n,
  isActive: true,
  isRequired: required,
  ...T,
});

const about = (): ApiAbout => ({
  section: {
    id: 's1',
    heading: pair('अमृत विषयी माहिती', 'About AMRUT'),
    subtitle: pair('', ''),
    description: pair('मराठी वर्णन', 'AMRUT - the Academy of Maharashtra Research'),
    showSection: true,
    ...T,
  },
  facts: [
    fact(1, pair('स्थापना', 'Established'), pair('२०१९', 'By Government Resolution dated 22 August 2019')),
    fact(2, pair('मुख्यालय', 'Headquarters'), pair('मुख्यालय: पुणे', 'Headquarters: Pune')),
  ],
  cards: [
    card(1, pair('आमचे ध्येय', 'Our Mission'), true),
    card(2, pair('आमचा दृष्टिकोन', 'Our Vision'), true),
    card(3, pair('आमची मूल्ये', 'Our Values'), true),
    card(4, pair('आमची उद्दिष्टे', 'Our Objectives'), false),
  ],
});

const toasts = () => document.getElementById('toast-root')!;
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/cms/about-amrut" element={<AboutDashboard />} />
      <Route path="/cms/about-amrut/facts/create" element={<FactEditorPage />} />
      <Route path="/cms/about-amrut/facts/:id/edit" element={<FactEditorPage />} />
      <Route path="/cms/about-amrut/cards/create" element={<CardEditorPage />} />
      <Route path="/cms/about-amrut/cards/:id/edit" element={<CardEditorPage />} />
    </Routes>,
    { route },
  );
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(aboutService.get).mockResolvedValue(about());
});

describe('About AMRUT dashboard', () => {
  it('shows the saved values in editable fields, and every row and card', async () => {
    renderAt('/cms/about-amrut');
    expect(await screen.findByLabelText('Section heading (English) *')).toHaveValue('About AMRUT');
    expect(screen.getByLabelText('Section heading (Marathi) *')).toHaveValue('अमृत विषयी माहिती');
    expect(screen.getByLabelText('Description (English) *')).toHaveValue('AMRUT - the Academy of Maharashtra Research');
    expect(screen.getByRole('checkbox', { name: 'Show this section on the public website' })).toBeChecked();
    expect(within(row('Headquarters')).getByText('Headquarters: Pune')).toBeInTheDocument();
    /* Required cards: editable, but no hide or delete. */
    expect(within(row('Our Mission')).getByText('Required')).toBeInTheDocument();
    expect(within(row('Our Mission')).getByRole('button', { name: 'Edit Our Mission' })).toBeInTheDocument();
    expect(within(row('Our Mission')).queryByRole('button', { name: /Delete|Hide/ })).toBeNull();
    expect(within(row('Our Objectives')).getByRole('button', { name: 'Delete Our Objectives' })).toBeInTheDocument();
  });

  it('saves the heading on its own, with the loaded version, and Cancel puts the saved values back', async () => {
    vi.mocked(aboutService.updateSection).mockImplementation(
      async (input) => ({ ...about().section, ...input, updatedAt: '2026-10-03T10:00:00.000Z' }) as never,
    );
    renderAt('/cms/about-amrut');
    const heading = await screen.findByLabelText('Section heading (English) *');
    await userEvent.clear(heading);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Section heading (English) is required')).toBeInTheDocument();
    expect(aboutService.updateSection).not.toHaveBeenCalled();

    await userEvent.type(heading, 'Test heading');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(aboutService.updateSection).toHaveBeenCalledWith({
        heading: pair('अमृत विषयी माहिती', 'Test heading'),
        subtitle: pair('', ''),
        showSection: true,
        expectedUpdatedAt: T.updatedAt,
      }),
    );
    await waitFor(() => expect(toasts()).toHaveTextContent('Section settings saved'));

    /* The description saves only itself, against the version the settings save produced. */
    const desc = screen.getByLabelText('Description (English) *');
    await userEvent.type(desc, ' — edited');
    expect(within(screen.getByRole('region', { name: 'Description preview' })).getByText(/— edited/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save description' }));
    await waitFor(() =>
      expect(aboutService.updateSection).toHaveBeenLastCalledWith({
        description: pair('मराठी वर्णन', 'AMRUT - the Academy of Maharashtra Research — edited'),
        expectedUpdatedAt: '2026-10-03T10:00:00.000Z',
      }),
    );

    /* Cancel asks first, then puts back the saved text; nothing is sent. */
    const calls = vi.mocked(aboutService.updateSection).mock.calls.length;
    await userEvent.type(desc, ' again');
    const descriptionForm = desc.closest('form') as HTMLElement;
    await userEvent.click(within(descriptionForm).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard changes' }));
    expect(desc).toHaveValue('AMRUT - the Academy of Maharashtra Research — edited');
    expect(aboutService.updateSection).toHaveBeenCalledTimes(calls);
  });

  it('deletes an additional card after confirmation, by id — and Cancel deletes nothing', async () => {
    vi.mocked(aboutService.removeItem).mockResolvedValue();
    renderAt('/cms/about-amrut');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Our Objectives' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete आमची उद्दिष्टे / Our Objectives?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(aboutService.removeItem).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Our Objectives' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(aboutService.removeItem).toHaveBeenCalledWith('cards', 'c4'));
  });

  it('reorders rows by sending the whole list of ids', async () => {
    vi.mocked(aboutService.reorder).mockResolvedValue();
    renderAt('/cms/about-amrut');
    await userEvent.click(await screen.findByRole('button', { name: 'Move Headquarters up' }));
    await waitFor(() => expect(aboutService.reorder).toHaveBeenCalledWith('facts', ['f2', 'f1']));
  });

  it('is read-only for a view-only administrator', async () => {
    auth.permissions = new Set(['cms-about.view']);
    renderAt('/cms/about-amrut');
    expect(await screen.findByLabelText('Section heading (English) *')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save|Add New|Edit |Delete / })).toBeNull();
  });
});

describe('Row and card editors', () => {
  it('adds an information row with an Idempotency-Key, after naming missing fields', async () => {
    vi.mocked(aboutService.createItem).mockResolvedValue(toItem('facts', fact(9, pair('a', 'a'), pair('b', 'b'))));
    renderAt('/cms/about-amrut/facts/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save information row' }));
    expect(await screen.findByText('Label (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Value (English) is required')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Label (Marathi) *'), 'सीएमएस चाचणी क्षेत्र');
    await userEvent.type(screen.getByLabelText('Label (English) *'), 'CMS Test Field');
    await userEvent.type(screen.getByLabelText('Value (Marathi) *'), 'चाचणी मूल्य');
    await userEvent.type(screen.getByLabelText('Value (English) *'), 'Test value');
    expect(screen.getByRole('figure', { name: 'Marathi preview' })).toHaveTextContent('सीएमएस चाचणी क्षेत्रचाचणी मूल्य');
    await userEvent.click(screen.getByRole('button', { name: 'Save information row' }));
    await waitFor(() => expect(aboutService.createItem).toHaveBeenCalledTimes(1));
    const [kind, input, key] = vi.mocked(aboutService.createItem).mock.calls[0]!;
    expect(kind).toBe('facts');
    expect(input).toEqual({
      first: pair('सीएमएस चाचणी क्षेत्र', 'CMS Test Field'),
      second: pair('चाचणी मूल्य', 'Test value'),
      isActive: true,
    });
    expect(key).toBeTruthy();
  });

  it('edits a required card: only the changed description is sent, and it cannot be switched off', async () => {
    const mission = toItem('cards', card(1, pair('आमचे ध्येय', 'Our Mission'), true));
    vi.mocked(aboutService.getItem).mockResolvedValue(mission);
    vi.mocked(aboutService.updateItem).mockResolvedValue(mission);
    renderAt('/cms/about-amrut/cards/c1/edit');
    const desc = await screen.findByLabelText('Card description (English) *');
    expect(screen.getByRole('checkbox', { name: /Active/ })).toBeDisabled();
    await userEvent.clear(desc);
    await userEvent.type(desc, 'Temporary mission');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(aboutService.updateItem).toHaveBeenCalledWith('cards', 'c1', {
        second: pair('वर्णन 1', 'Temporary mission'),
        expectedUpdatedAt: T.updatedAt,
      }),
    );
  });

  it('shows the server message when a save is refused', async () => {
    vi.mocked(aboutService.createItem).mockRejectedValue(
      new ApiError('About card "आमचे ध्येय" / "Our Mission" already exists.', 409, 'CONFLICT'),
    );
    renderAt('/cms/about-amrut/cards/create');
    for (const [label, text] of [
      ['Card heading (Marathi) *', 'आमचे ध्येय'],
      ['Card heading (English) *', 'Our Mission'],
      ['Card description (Marathi) *', 'क'],
      ['Card description (English) *', 'x'],
    ]) {
      await userEvent.type(screen.getByLabelText(label!), text!);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Save about card' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
  });
});
