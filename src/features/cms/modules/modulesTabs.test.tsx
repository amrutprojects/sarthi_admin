import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import ModulesEdit from './pages/ModulesEdit';
import ModulesForm from './pages/ModulesForm';
import ModulesView from './pages/ModulesView';
import { firstTabWithErrors, parseModulesTab, tabOfField } from './pages/modulesTabs';
import { modulesService } from './services/modulesService';
import type { ApiElectiveDomain, ApiModule, ApiModulesPage, Bilingual } from './types/modules.types';
import { toFormValues } from './validation/modules.validation';

vi.mock('./services/modulesService', () => ({ modulesService: { get: vi.fn(), update: vi.fn() } }));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: new Set(['cms-modules.view', 'cms-modules.update']), hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });

const domain = (no: number, en: string, certificate: string): ApiElectiveDomain => ({
  id: `dom${no}-${en}`,
  no,
  domain: pair('क्षेत्र', en),
  certificate,
  displayOrder: no - 1,
  isActive: true,
});

const mod = (no: number, code: string, kind: ApiModule['kind'], electives: ApiElectiveDomain[] = []): ApiModule => ({
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
  showElectiveLabel: true,
  electives,
});

/*
 * A Main module with no domains (no card on the view's domains tab), an elective with two domains,
 * and an elective with none (its card shows the "empty table on the public site" note).
 */
const page = (
  modules: ApiModule[] = [
    mod(1, 'ECS', 'MAIN'),
    mod(2, 'DS', 'ELECTIVE', [domain(1, 'Healthcare', 'Health aide'), domain(2, 'Retail', 'Retail associate')]),
    mod(3, 'AI', 'ELECTIVE'),
  ],
): ApiModulesPage => ({
  id: 'm1',
  pageTitle: pair('मॉड्यूल्स', 'Modules'),
  pageSubtitle: pair('उपशीर्षक', 'Subtitle'),
  modules,
  learningPath: { sessionLength: pair('१ तास', '1 hr'), sessionLabel: pair('सत्र', 'Per session'), fixedPathPct: 60, selfPathPct: 40 },
  stats: { districtCount: 36 },
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
});

/* Shows where the router is, so a test can see where a button navigated to. */
function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}
const where = () => screen.getByTestId('where').textContent;

/* A tab by its label; a tab with an error marker is named "<label> has errors". */
const tab = (label: string) => screen.getByRole('tab', { name: (name) => name === label || name === `${label} has errors` });
/* An open module card's body (cards start collapsed, but their inputs are still in the page). */
const moduleBody = (index: number) => within(document.getElementById(`module-body-${index}`)!);
const TAB_NAMES = ['Modules', 'Employment domains', 'Page heading & learning path'];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
});

describe('Modules page tabs — helpers', () => {
  it('reads ?tab= and falls back to the Modules tab', () => {
    expect(parseModulesTab(null)).toBe('modules');
    expect(parseModulesTab('domains')).toBe('domains');
    expect(parseModulesTab('heading')).toBe('heading');
    expect(parseModulesTab('nonsense')).toBe('modules');
  });

  it('puts each error key on the tab that shows its input', () => {
    expect(tabOfField('modules')).toBe('modules');
    expect(tabOfField('modules.0.code')).toBe('modules');
    expect(tabOfField('modules.2.timeSplit.moduleHours')).toBe('modules');
    expect(tabOfField('modules.1.electives.0.certificate')).toBe('domains');
    expect(tabOfField('modules.1.electives')).toBe('domains');
    expect(tabOfField('pageTitle.mr')).toBe('heading');
    expect(tabOfField('pageSubtitle.en')).toBe('heading');
    expect(tabOfField('learningPath.fixedPathPct')).toBe('heading');
    expect(tabOfField('somethingElse')).toBeNull();
    expect(firstTabWithErrors(['learningPath.selfPathPct', 'modules.0.electives.0.no'])).toBe('domains');
    expect(firstTabWithErrors([])).toBeNull();
  });
});

describe('Modules view page tabs', () => {
  it('shows the three tabs, opening on Modules by default', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    renderWithProviders(<ModulesView />);
    await screen.findByRole('tablist');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(TAB_NAMES);
    expect(tab('Modules')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Employment domains')).toHaveAttribute('aria-selected', 'false');
    /* The panel is labelled by its tab, and the tab names the panel it controls. */
    const panel = screen.getByRole('tabpanel', { name: 'Modules' });
    expect(tab('Modules')).toHaveAttribute('aria-controls', panel.id);
    expect(within(panel).getByRole('heading', { name: 'Modules' })).toBeInTheDocument();
    expect(within(panel).getAllByRole('row')).toHaveLength(4);
    expect(screen.queryByRole('heading', { name: /Employment domains/ })).not.toBeInTheDocument();
    /* Above the tabs on every tab. */
    expect(screen.getByRole('heading', { name: 'Modules Page Management' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit content/ })).toBeInTheDocument();
  });

  it('opens on the Modules tab for an unknown ?tab= value', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    renderWithProviders(<ModulesView />, { route: '/cms/modules?tab=bogus' });
    await screen.findByRole('tablist');
    expect(tab('Modules')).toHaveAttribute('aria-selected', 'true');
  });

  it('shows a card per module with domains, and every elective, on ?tab=domains', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    renderWithProviders(<ModulesView />, { route: '/cms/modules?tab=domains' });
    await screen.findByRole('tablist');
    expect(tab('Employment domains')).toHaveAttribute('aria-selected', 'true');
    const headings = screen.getAllByRole('heading', { name: /^Employment domains/ }).map((h) => h.textContent);
    /* The Main module offers none, so it has no card; the empty elective still does. */
    expect(headings).toEqual(['Employment domains — DS', 'Employment domains — AI']);
    expect(screen.getByText('2 domains')).toBeInTheDocument();
    expect(screen.getByText('Health aide')).toBeInTheDocument();
    expect(screen.getByText('0 domains')).toBeInTheDocument();
    expect(screen.getByText(/marked elective but offers no domains/)).toBeInTheDocument();
    /* The Modules table is on its own tab. */
    expect(screen.queryByRole('heading', { name: 'Modules' })).not.toBeInTheDocument();
  });

  it('counts a single domain as "1 domain"', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page([mod(1, 'DS', 'ELECTIVE', [domain(1, 'Healthcare', 'Health aide')])]));
    renderWithProviders(<ModulesView />, { route: '/cms/modules?tab=domains' });
    expect(await screen.findByText('1 domain')).toBeInTheDocument();
  });

  it('says so when no module has domains and none is elective', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page([mod(1, 'ECS', 'MAIN')]));
    renderWithProviders(<ModulesView />, { route: '/cms/modules?tab=domains' });
    expect(await screen.findByText(/No module offers employment domains/)).toBeInTheDocument();
  });

  it('shows the heading, learning path and session label on the third tab, and keeps the tab in the URL', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    renderWithProviders(
      <>
        <ModulesView />
        <Where />
      </>,
      { route: '/cms/modules' },
    );
    await screen.findByRole('tablist');
    await userEvent.click(tab('Page heading & learning path'));
    expect(where()).toBe('/cms/modules?tab=heading');
    const panel = screen.getByRole('tabpanel', { name: 'Page heading & learning path' });
    expect(within(panel).getByText('Page title')).toBeInTheDocument();
    expect(within(panel).getByText('60% fixed-path / 40% self-path')).toBeInTheDocument();
    expect(within(panel).getByText('Session length')).toBeInTheDocument();
    expect(within(panel).getByText('Session label')).toBeInTheDocument();
    expect(within(panel).getByText('Per session')).toBeInTheDocument();
    expect(within(panel).getByText('सत्र')).toBeInTheDocument();
    expect(within(panel).getByText('Last updated')).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    renderWithProviders(<ModulesView />);
    await screen.findByRole('tablist');
    tab('Modules').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Employment domains')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Employment domains')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(tab('Page heading & learning path')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Page heading & learning path')).toHaveFocus();
    /* Only the open tab is a tab stop. */
    expect(tab('Modules')).toHaveAttribute('tabindex', '-1');
  });

  it('opens the editor on the tab being read', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    renderWithProviders(
      <>
        <ModulesView />
        <Where />
      </>,
      { route: '/cms/modules?tab=domains' },
    );
    await userEvent.click(await screen.findByRole('button', { name: /Edit content/ }));
    expect(where()).toBe('/cms/modules/edit?tab=domains');
  });
});

describe('Modules edit page tabs', () => {
  it('shows the same three tabs, with the domains moved out of the module cards', async () => {
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={vi.fn()} />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(TAB_NAMES);
    expect(tab('Modules')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Each module stands on its own')).toBeInTheDocument();
    /* A module card no longer holds domains, but its summary still counts them. */
    const ds = screen.getByRole('button', { name: /^Module 2 — DS/ });
    expect(ds).toHaveTextContent('2 domains');
    await userEvent.click(ds);
    const body = within(document.getElementById('module-body-1')!);
    expect(body.getByText('Hours for this module')).toBeInTheDocument();
    expect(body.queryByRole('button', { name: /Add a domain/ })).not.toBeInTheDocument();
    expect(body.queryByLabelText(/Certificate awarded/)).not.toBeInTheDocument();

    await userEvent.click(tab('Employment domains'));
    expect(screen.getAllByRole('heading', { name: /^Employment domains/ }).map((h) => h.textContent)).toEqual([
      'Employment domains — ECS (Module 1)',
      'Employment domains — DS (Module 2)',
      'Employment domains — AI (Module 3)',
    ]);
    expect(screen.getAllByRole('button', { name: /Add a domain/ })).toHaveLength(3);
    expect(screen.getAllByLabelText(/Certificate awarded/)).toHaveLength(2);

    await userEvent.click(tab('Page heading & learning path'));
    expect(screen.getByRole('heading', { name: 'Page heading' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Learning path split' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Session label \(English\)/)).toHaveValue('Per session');
    /* The Save bar is below every tab. */
    expect(screen.getByRole('button', { name: 'Save Modules page' })).toBeInTheDocument();
  });

  it('names a module without a code by its number in its domains card', async () => {
    const blank = page([mod(1, 'ECS', 'MAIN'), mod(2, '', 'ELECTIVE')]);
    renderWithProviders(<ModulesForm initial={toFormValues(blank)} backTo="/cms/modules" onSave={vi.fn()} />, {
      route: '/cms/modules/edit?tab=domains',
    });
    expect(screen.getByRole('heading', { name: 'Employment domains — Module 2' })).toBeInTheDocument();
  });

  it('keeps what was typed when switching between tabs', async () => {
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /^Module 1 — ECS/ }));
    const code = moduleBody(0).getByLabelText(/Module code/);
    await userEvent.clear(code);
    await userEvent.type(code, 'ECX');

    await userEvent.click(tab('Employment domains'));
    await userEvent.click(screen.getAllByRole('button', { name: /Add a domain/ })[0]!);
    const cert = screen.getAllByLabelText(/Certificate awarded/)[0]!;
    await userEvent.type(cert, 'Typed certificate');

    await userEvent.click(tab('Page heading & learning path'));
    const title = screen.getByLabelText(/Page title \(English\)/);
    await userEvent.clear(title);
    await userEvent.type(title, 'Typed title');

    await userEvent.click(tab('Modules'));
    /* Adding a domain shifts no module's index, so the card opened earlier is still open. */
    expect(screen.getByRole('button', { name: /^Module 1 — ECX/ })).toHaveAttribute('aria-expanded', 'true');
    expect(moduleBody(0).getByLabelText(/Module code/)).toHaveValue('ECX');
    expect(screen.getByRole('button', { name: /^Module 1 — ECX/ })).toHaveTextContent('1 domain');

    await userEvent.click(tab('Employment domains'));
    expect(screen.getAllByLabelText(/Certificate awarded/)[0]).toHaveValue('Typed certificate');

    await userEvent.click(tab('Page heading & learning path'));
    expect(screen.getByLabelText(/Page title \(English\)/)).toHaveValue('Typed title');
  });

  it('marks a tab as soon as one of its fields shows an error', async () => {
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={vi.fn()} />, {
      route: '/cms/modules/edit?tab=heading',
    });
    expect(screen.queryByRole('img', { name: 'has errors' })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/Page title \(English\)/));
    await userEvent.tab();
    expect(within(tab('Page heading & learning path')).getByRole('img', { name: 'has errors' })).toBeInTheDocument();
    expect(within(tab('Modules')).queryByRole('img', { name: 'has errors' })).not.toBeInTheDocument();
  });

  it('on Save with a domain error, opens the Employment domains tab, marks it and focuses the field', async () => {
    const onSave = vi.fn();
    const broken = page([mod(1, 'ECS', 'MAIN'), mod(2, 'DS', 'ELECTIVE', [domain(1, 'Healthcare', '')])]);
    renderWithProviders(<ModulesForm initial={toFormValues(broken)} backTo="/cms/modules" onSave={onSave} />, {
      route: '/cms/modules/edit?tab=modules',
    });
    expect(tab('Modules')).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Save Modules page' }));

    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(tab('Employment domains')).toHaveAttribute('aria-selected', 'true'));
    expect(within(tab('Employment domains')).getByRole('img', { name: 'has errors' })).toBeInTheDocument();
    expect(within(tab('Modules')).queryByRole('img', { name: 'has errors' })).not.toBeInTheDocument();
    const cert = screen.getByLabelText(/Certificate awarded/);
    expect(cert).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('heading', { name: 'Employment domains — DS (Module 2)' }).parentElement).toHaveTextContent('Needs attention');
    await waitFor(() => expect(cert).toHaveFocus());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    /* The module's own card has nothing wrong, so it is not flagged. */
    await userEvent.click(tab('Modules'));
    expect(screen.getByRole('button', { name: /^Module 2 — DS/ })).not.toHaveTextContent('Needs attention');
  });

  it('on Save, goes to the first tab in order that has an error and opens the module card', async () => {
    const broken = page([mod(1, 'ECS', 'MAIN'), mod(2, '', 'ELECTIVE', [domain(1, 'Healthcare', '')])]);
    renderWithProviders(<ModulesForm initial={toFormValues(broken)} backTo="/cms/modules" onSave={vi.fn()} />, {
      route: '/cms/modules/edit?tab=heading',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save Modules page' }));
    await waitFor(() => expect(tab('Modules')).toHaveAttribute('aria-selected', 'true'));
    expect(within(tab('Modules')).getByRole('img', { name: 'has errors' })).toBeInTheDocument();
    expect(within(tab('Employment domains')).getByRole('img', { name: 'has errors' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Module 2/ })).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(moduleBody(1).getByLabelText(/Module code/)).toHaveFocus());
  });

  it("puts the server's message about a module's whole domain list in that module's domains card", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(
        new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
          { field: 'body.modules.1.electives', message: 'At most 50 employment domains for DS' },
        ]),
      );
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={onSave} />, {
      route: '/cms/modules/edit?tab=heading',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save Modules page' }));

    await waitFor(() => expect(tab('Employment domains')).toHaveAttribute('aria-selected', 'true'));
    expect(within(tab('Employment domains')).getByRole('img', { name: 'has errors' })).toBeInTheDocument();
    const card = screen.getByRole('heading', { name: 'Employment domains — DS (Module 2)' }).closest('.card') as HTMLElement;
    expect(within(card).getByRole('alert')).toHaveTextContent('At most 50 employment domains for DS');
    expect(card).toHaveTextContent('Needs attention');
    /* It is on the form, so it is not also toasted. */
    expect(document.getElementById('toast-root')).not.toHaveTextContent('At most 50 employment domains for DS');
  });

  it('lists a server message with no input of its own at the top of the tab it belongs to', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(
        new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
          { field: 'body.modules.0', message: "Unrecognized key in module 1: 'legacy'" },
        ]),
      );
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={onSave} />, {
      route: '/cms/modules/edit?tab=heading',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save Modules page' }));

    await waitFor(() => expect(tab('Modules')).toHaveAttribute('aria-selected', 'true'));
    expect(within(tab('Modules')).getByRole('img', { name: 'has errors' })).toBeInTheDocument();
    const panel = screen.getByRole('tabpanel', { name: /^Modules/ });
    expect(within(panel).getAllByRole('alert')[0]).toHaveTextContent("Unrecognized key in module 1: 'legacy'");
  });

  it('toasts a server message that belongs to no tab and stays on the open tab', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(
        new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.facts', message: 'Unrecognized key: facts' }]),
      );
    renderWithProviders(<ModulesForm initial={toFormValues(page())} backTo="/cms/modules" onSave={onSave} />, {
      route: '/cms/modules/edit?tab=heading',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save Modules page' }));

    await waitFor(() => expect(document.getElementById('toast-root')).toHaveTextContent('Unrecognized key: facts'));
    expect(tab('Page heading & learning path')).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('img', { name: 'has errors' })).not.toBeInTheDocument();
  });

  it('returns to the view page on the same tab on Cancel and after saving', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    vi.mocked(modulesService.update).mockResolvedValue(page());
    renderWithProviders(
      <>
        <ModulesEdit />
        <Where />
      </>,
      { route: '/cms/modules/edit?tab=domains' },
    );
    await screen.findByRole('tablist');
    expect(tab('Employment domains')).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(tab('Page heading & learning path'));
    expect(where()).toBe('/cms/modules/edit?tab=heading');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(where()).toBe('/cms/modules?tab=heading');
  });

  it('saves every tab in one request and lands on the same tab', async () => {
    vi.mocked(modulesService.get).mockResolvedValue(page());
    vi.mocked(modulesService.update).mockResolvedValue(page());
    renderWithProviders(
      <>
        <ModulesEdit />
        <Where />
      </>,
      { route: '/cms/modules/edit?tab=domains' },
    );
    await screen.findByRole('tablist');
    await userEvent.type(screen.getAllByLabelText(/Certificate awarded/)[0]!, ' plus');
    await userEvent.click(tab('Page heading & learning path'));
    const title = screen.getByLabelText(/Page title \(English\)/);
    await userEvent.clear(title);
    await userEvent.type(title, 'New title');
    await userEvent.click(screen.getByRole('button', { name: 'Save Modules page' }));

    await waitFor(() => expect(modulesService.update).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(modulesService.update).mock.calls[0]![0];
    expect(sent.pageTitle.en).toBe('New title');
    expect(sent.modules[1]!.electives[0]!.certificate).toBe('Health aide plus');
    await waitFor(() => expect(where()).toBe('/cms/modules?tab=heading'));
  });
});
