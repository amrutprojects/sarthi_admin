import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import ModulesEdit from './pages/ModulesEdit';
import ModulesForm from './pages/ModulesForm';
import ModulesView from './pages/ModulesView';
import { modulesService } from './services/modulesService';
import type { ApiModule, ApiModulesPage, Bilingual } from './types/modules.types';
import { toFormValues } from './validation/modules.validation';

vi.mock('./services/modulesService', () => ({ modulesService: { get: vi.fn(), update: vi.fn() } }));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: new Set(['cms-modules.view', 'cms-modules.update']), hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const LABEL_BOX = "Show 'Elective' label on website";

const mod = (no: number, code: string, kind: ApiModule['kind'], showElectiveLabel: boolean): ApiModule => ({
  id: `mod${no}`,
  no,
  code,
  kind,
  name: pair('नाव', `Module ${code}`),
  description: pair('वर्णन', 'Description'),
  timeSplit: {
    moduleHours: 120,
    trainingHours: 99,
    assessmentHours: 21,
    weeksPerModule: 6,
    daysPerWeek: 6,
    hoursPerDay: 3,
    weeklyAssessmentHours: 3.5,
  },
  displayOrder: no - 1,
  isActive: true,
  showElectiveLabel,
  electives: [],
});

/* One Main module, an elective whose badge is hidden and an elective whose badge shows. */
const page = (): ApiModulesPage => ({
  id: 'm1',
  pageTitle: pair('मॉड्यूल्स', 'Modules'),
  pageSubtitle: pair('उपशीर्षक', 'Subtitle'),
  modules: [mod(1, 'ECS', 'MAIN', true), mod(2, 'DS', 'ELECTIVE', false), mod(3, 'AI', 'ELECTIVE', true)],
  learningPath: { sessionLength: pair('१ तास', '1 hr'), sessionLabel: pair('सत्र', 'Session'), fixedPathPct: 60, selfPathPct: 40 },
  stats: { districtCount: 36 },
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
});

/* Module cards start collapsed; the tick box is only reachable once a card is open. */
const openModule = (n: number, code: string) => userEvent.click(screen.getByRole('button', { name: new RegExp(`^Module ${n} — ${code}`) }));
const body = (index: number) => within(document.getElementById(`module-body-${index}`)!);

describe("Modules page 'Elective' label tick box", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  });

  it('is offered only on Elective modules', async () => {
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={vi.fn()} />);
    await openModule(1, 'ECS');
    await openModule(2, 'DS');
    await openModule(3, 'AI');
    expect(body(0).queryByRole('checkbox', { name: LABEL_BOX })).not.toBeInTheDocument();
    expect(body(1).getByRole('checkbox', { name: LABEL_BOX })).toBeInTheDocument();
    expect(body(2).getByRole('checkbox', { name: LABEL_BOX })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { name: LABEL_BOX })).toHaveLength(2);
  });

  it('is prefilled from the saved setting', async () => {
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={vi.fn()} />);
    await openModule(2, 'DS');
    await openModule(3, 'AI');
    expect(body(1).getByRole('checkbox', { name: LABEL_BOX })).not.toBeChecked();
    expect(body(2).getByRole('checkbox', { name: LABEL_BOX })).toBeChecked();
    /* A collapsed card says so in its summary, so the hidden badge is visible without opening it. */
    expect(screen.getByRole('button', { name: /^Module 2 — DS/ })).toHaveTextContent('Label hidden');
    expect(screen.getByRole('button', { name: /^Module 3 — AI/ })).not.toHaveTextContent('Label hidden');
  });

  it('disappears when the type is switched to Main and keeps its value when switched back', async () => {
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={vi.fn()} />);
    await openModule(2, 'DS');
    await openModule(3, 'AI');
    for (const [index, ticked] of [
      [1, false],
      [2, true],
    ] as const) {
      const type = body(index).getByLabelText(/Module type/);
      await userEvent.selectOptions(type, 'MAIN');
      expect(body(index).queryByRole('checkbox', { name: LABEL_BOX })).not.toBeInTheDocument();
      await userEvent.selectOptions(type, 'ELECTIVE');
      expect(body(index).getByRole<HTMLInputElement>('checkbox', { name: LABEL_BOX }).checked).toBe(ticked);
    }
  });

  it('sends showElectiveLabel for every module when the page is saved', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    vi.mocked(modulesService.update).mockResolvedValue(page());
    renderWithProviders(<ModulesEdit />);
    await screen.findByRole('button', { name: /^Module 3 — AI/ });
    await openModule(2, 'DS');
    await openModule(3, 'AI');
    await userEvent.click(body(1).getByRole('checkbox', { name: LABEL_BOX }));
    await userEvent.click(body(2).getByRole('checkbox', { name: LABEL_BOX }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Modules page' }));
    await waitFor(() => expect(modulesService.update).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(modulesService.update).mock.calls[0]![0];
    expect(sent.modules.map((m) => [m.code, m.showElectiveLabel])).toEqual([
      ['ECS', true],
      ['DS', true],
      ['AI', false],
    ]);
    /* The PUT is .strict() on the server and no longer accepts the old publish switch. */
    expect(sent).not.toHaveProperty('isPublished');
  });
});

describe('Modules page publish switch removed', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('has no Visibility card in the edit form', () => {
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: 'Visibility' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Publish this content on the public website/)).not.toBeInTheDocument();
    expect(screen.queryByText(/built-in Modules page/)).not.toBeInTheDocument();
  });

  it('has no Publish button, warning or published badge on the view page, even if the server says unpublished', async () => {
    /* An older row the server still reports as unpublished: the website shows it regardless. */
    const legacy = { ...page(), isPublished: false };
    vi.mocked(modulesService.get).mockResolvedValue(legacy);
    renderWithProviders(<ModulesView />);
    expect(await screen.findByRole('button', { name: /Edit content/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Publish|Unpublish)$/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/not published/)).not.toBeInTheDocument();
    /* The Modules card header is just its title now; the row badges are the modules' own status. */
    expect(screen.getByRole('heading', { name: 'Modules' }).parentElement).toHaveTextContent(/^Modules$/);
  });

  it("shows each elective's label setting on the view page", async () => {
    /* A fourth elective from an older server that does not send the setting: the badge shows. */
    const { showElectiveLabel: _dropped, ...older } = mod(4, 'OLD', 'ELECTIVE', false);
    const withOlder = page();
    withOlder.modules.push(older as ApiModule);
    vi.mocked(modulesService.get).mockResolvedValue(withOlder);
    renderWithProviders(<ModulesView />);
    await screen.findByRole('heading', { name: 'Modules' });
    const rows = screen.getAllByRole('row');
    const rowOf = (code: string) => rows.find((r) => within(r).queryByText(code, { selector: 'code' }))!;
    expect(rowOf('ECS')).not.toHaveTextContent(/Label (shown|hidden)/);
    expect(rowOf('DS')).toHaveTextContent('Label hidden');
    expect(rowOf('AI')).toHaveTextContent('Label shown');
    expect(rowOf('OLD')).toHaveTextContent('Label shown');
  });

  it('no longer offers a separate publish call', async () => {
    const actual = await vi.importActual<{ modulesService: object }>('./services/modulesService');
    expect(actual.modulesService).not.toHaveProperty('setPublished');
  });
});
