import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from './test-utils';
import { ApiError } from '../src/services/api-client';
import BatchesPage from '../src/modules/delivery/pages/BatchesPage';
import TrainersPage from '../src/modules/delivery/pages/TrainersPage';
import CentresPage from '../src/modules/network/pages/CentresPage';
import LmsDistrictsPage from '../src/modules/lms-live/pages/LmsDistrictsPage';
import LmsTracksPage from '../src/modules/lms-live/pages/LmsTracksPage';
import AttendancePage from '../src/modules/training/pages/AttendancePage';
import LivePage from '../src/modules/training/pages/LivePage';
import OfflinePage from '../src/modules/training/pages/OfflinePage';
import OnlinePage from '../src/modules/training/pages/OnlinePage';
import { LiveDataSettingCard, lmsLiveApi, type LiveDataState, type LiveResult } from '../src/modules/lms-live';

/* Id pattern of the retired sample batches (e.g. AMRUT-PUN-C01-B001): none may appear. */
const SAMPLE_BATCH_ID = /AMRUT-[A-Z]{3}-Cd{2}-Bd{3}/;

/*
 * G-2 "Show live LMS data" on the Panel screens. Off (default, or any error of the state call): each screen renders its
 * current local data under "Local data" and no live read is made. On: the live view, one live answer, "Live from LMS"
 * with the fetch time; an LMS error is shown as an error, never replaced by local data. The API is faked with spies.
 */
let granted = new Set<string>();
vi.mock('../src/modules/auth', () => ({
  useCan: () => (a: string) => granted.has(a),
  Can: ({ action, children }: { action: string; children: ReactNode }) => (granted.has(action) ? <>{children}</> : null),
}));

const state = (over: Partial<LiveDataState> = {}): LiveDataState => ({
  setting: false,
  masterSwitch: false,
  configured: true,
  canEnable: false,
  blocker: 'MASTER_SWITCH_OFF',
  missing: [],
  live: false,
  source: 'local',
  updatedAt: null,
  updatedByUserId: null,
  ...over,
});
const ON = state({ setting: true, masterSwitch: true, canEnable: true, blocker: null, live: true, source: 'live' });
const FETCHED = '2026-11-21T09:30:00.000Z';
const live = <T,>(data: T, total?: number): LiveResult<T> => ({
  data,
  source: 'live',
  fetchedAt: FETCHED,
  ...(total !== undefined ? { meta: { page: 1, limit: 100, total, totalPages: 1 } } : {}),
});

/* Synthetic LMS answers (shapes of amrut-kalash-api docs/lms-reads/README.md). */
const BATCH = {
  id: 'b-1',
  code: 'LMS-B-0001',
  entityCode: 'SBX-08',
  courseCode: 'C-DA',
  centreCode: 'NAG-01',
  centreName: 'Synthetic Centre',
  trackCode: 'T07',
  startDate: '2026-11-01',
  endDate: '2027-01-31',
  deliveryMode: 'OFFLINE',
  status: 'ACTIVE',
  capacity: 30,
  learnersEnrolled: 25,
  learnersActive: 24,
  learnersCompleted: 0,
  learnersWithdrawn: 1,
  updatedAt: FETCHED,
};
const SESSION = (mode: string, code: string) => ({
  id: code,
  batchCode: code,
  centreCode: 'NAG-01',
  entityCode: 'SBX-08',
  title: 'Module 3',
  moduleNo: 3,
  startsAt: FETCHED,
  endsAt: FETCHED,
  deliveryMode: mode,
  attendanceMode: 'TRAINER',
  status: 'COMPLETED',
  trainerCode: 'TR-1',
  attendance: { present: 20, late: 2, absent: 3, excused: 0 },
  updatedAt: FETCHED,
});
function fakeLiveReads() {
  vi.spyOn(lmsLiveApi, 'batches').mockResolvedValue(live([BATCH], 250));
  vi.spyOn(lmsLiveApi, 'centres').mockResolvedValue(
    live(
      [
        {
          code: 'LMS-C-01',
          name: 'Synthetic LMS Centre',
          districtCode: 'NAG',
          districtName: 'Nagpur',
          centreTypeName: 'ITI',
          status: 'ACTIVE',
          isActive: true,
          sourceUpdatedAt: null,
          entityCode: 'SBX-08',
          taluka: 'Nagpur Urban',
          readinessStatus: 'READY',
          maxSeating: 30,
          computerSystems: 15,
          tracksOffered: ['T07'],
          divisionCode: 'NGP',
          divisionName: 'Synthetic Division',
        },
      ],
      1,
    ),
  );
  vi.spyOn(lmsLiveApi, 'tracks').mockResolvedValue(
    live(
      [
        {
          entityCode: 'SBX-08',
          code: 'LMS-T07',
          name: 'Synthetic Track',
          nameMr: null,
          sortOrder: 7,
          status: 'ACTIVE',
          isActive: true,
          updatedAt: null,
        },
      ],
      1,
    ),
  );
  vi.spyOn(lmsLiveApi, 'districts').mockResolvedValue(
    live(
      [
        {
          entityCode: 'SBX-08',
          code: 'LMS-D-NAG',
          nameEn: 'Synthetic District',
          nameMr: null,
          divisionCode: 'NGP',
          divisionName: 'Synthetic Division',
          status: 'ACTIVE',
          isActive: true,
          updatedAt: null,
        },
      ],
      1,
    ),
  );
  vi.spyOn(lmsLiveApi, 'trainers').mockResolvedValue(
    live(
      [
        {
          id: 't',
          code: 'LMS-TR-1',
          displayName: 'Synthetic Trainer',
          status: 'ACTIVE',
          entityCode: 'SBX-08',
          centreCodes: ['NAG-01'],
          batchCodes: [],
          updatedAt: null,
        },
      ],
      1,
    ),
  );
  vi.spyOn(lmsLiveApi, 'sessions').mockResolvedValue(live([SESSION('OFFLINE', 'LMS-OFF-1'), SESSION('ONLINE', 'LMS-ON-1')], 2));
  vi.spyOn(lmsLiveApi, 'liveSessions').mockResolvedValue(
    live({
      asOf: FETCHED,
      date: '2026-11-21',
      items: [
        {
          id: 'l',
          batchCode: 'LMS-LIVE-1',
          centreCode: 'NAG-01',
          deliveryMode: 'OFFLINE',
          trainerCode: 'TR-1',
          trainerName: 'Synthetic Trainer',
          topic: 'SQL joins',
          startsAt: FETCHED,
          endsAt: FETCHED,
          status: 'IN_PROGRESS',
          inProgress: true,
          enrolled: 25,
          present: 20,
          late: 2,
        },
      ],
    }),
  );
  vi.spyOn(lmsLiveApi, 'attendance').mockResolvedValue(
    live({
      groupBy: 'district',
      dateFrom: null,
      dateTo: null,
      items: [
        {
          code: 'LMS-NAG',
          batches: 2,
          sessionsHeld: 4,
          present: 80,
          late: 5,
          absent: 15,
          excused: 0,
          selfCheckIns: 0,
          geoCheckIns: 3,
          selfies: 2,
          groupPhotos: 4,
        },
      ],
    }),
  );
}
const READS = ['batches', 'centres', 'tracks', 'districts', 'trainers', 'sessions', 'liveSessions', 'attendance'] as const;

/* Every G-2 screen: the local page's own title, the live view's distinctive row. */
const SCREENS: [name: string, Page: ComponentType, liveText: string][] = [
  ['Batches', BatchesPage, 'LMS-B-0001'],
  ['Training centres', CentresPage, 'Synthetic LMS Centre'],
  ['LMS tracks', LmsTracksPage, 'Synthetic Track'],
  ['LMS districts', LmsDistrictsPage, 'Synthetic District'],
  ['Trainers', TrainersPage, 'LMS-TR-1'],
  ['Live training monitor', LivePage, 'LMS-LIVE-1'],
  ['Offline training', OfflinePage, 'LMS-OFF-1'],
  ['Online training', OnlinePage, 'LMS-ON-1'],
  ['Attendance', AttendancePage, 'LMS-NAG'],
];

beforeEach(() => {
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  granted = new Set();
  window.localStorage.clear();
  fakeLiveReads();
});

const badge = () => screen.findByTestId('data-source');

describe('off (default): every screen keeps its local data', () => {
  it.each(SCREENS)('%s: "Local data", the local screen, no live read', async (_name, Page, liveText) => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(state());
    const { container } = renderWithProviders(<Page />);
    expect(await badge()).toHaveTextContent('Local data');
    expect(container.querySelector('.page')).not.toBeNull();
    expect(screen.queryByText(liveText)).not.toBeInTheDocument();
    expect(screen.queryByText('Live from LMS')).not.toBeInTheDocument();
    for (const r of READS) expect(lmsLiveApi[r]).not.toHaveBeenCalled();
  });

  it('Batches off shows no sample rows, only "turn on live LMS data" (no invented figures)', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(state());
    renderWithProviders(<BatchesPage />);
    await badge();
    expect(screen.getByText(/Turn on “Show live LMS data” in System Settings/)).toBeInTheDocument();
    expect(screen.queryByText(SAMPLE_BATCH_ID)).not.toBeInTheDocument();
  });

  it('a server without G-2 (404) or a refused state call keeps the local screen', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockRejectedValue(new ApiError('Not found', 404, 'ROUTE_NOT_FOUND'));
    renderWithProviders(<BatchesPage />);
    expect(await badge()).toHaveTextContent('Local data');
    expect(lmsLiveApi.batches).not.toHaveBeenCalled();
  });

  it('LMS tracks and districts have no local data: they say live data is off', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(state());
    renderWithProviders(<LmsTracksPage />);
    expect(await screen.findByText('Live LMS data is switched off')).toBeInTheDocument();
    expect(lmsLiveApi.tracks).not.toHaveBeenCalled();
  });

  it('the setting on but the master switch off is still local', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(state({ setting: true, live: false }));
    renderWithProviders(<CentresPage />);
    expect(await badge()).toHaveTextContent('Local data');
  });
});

describe('on: live from the LMS', () => {
  it.each(SCREENS)('%s: "Live from LMS" with the fetch time and only live rows', async (_name, Page, liveText) => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(ON);
    renderWithProviders(<Page />);
    expect(await screen.findByText(liveText)).toBeInTheDocument();
    const b = await badge();
    expect(b).toHaveTextContent('Live from LMS');
    expect(b).toHaveTextContent(/fetched .*2026/);
    expect(screen.queryByText('Local data')).not.toBeInTheDocument();
  });

  it('Training centres: the owning entity and the division of each centre', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(ON);
    renderWithProviders(<CentresPage />);
    const row = (await screen.findByText('Synthetic LMS Centre')).closest('tr');
    expect(row).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: /Entity/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Division/ })).toBeInTheDocument();
    expect(row).toHaveTextContent('SBX-08');
    expect(row).toHaveTextContent('Synthetic Division');
  });

  it('LMS districts: the division of each district', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(ON);
    renderWithProviders(<LmsDistrictsPage />);
    const row = (await screen.findByText('Synthetic District')).closest('tr');
    expect(row).toHaveTextContent('Synthetic Division');
    expect(row).toHaveTextContent('SBX-08');
  });

  it('Batches: no mock row, and says when the LMS has more records than one page', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(ON);
    renderWithProviders(<BatchesPage />);
    await screen.findByText('LMS-B-0001');
    expect(screen.queryByText(SAMPLE_BATCH_ID)).not.toBeInTheDocument();
    expect(screen.getByText('Showing the first 1 of 250 records from the LMS.')).toBeInTheDocument();
  });

  it('Offline / Online show only sessions of their mode', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(ON);
    renderWithProviders(<OfflinePage />);
    await screen.findByText('LMS-OFF-1');
    expect(screen.queryByText('LMS-ON-1')).not.toBeInTheDocument();
  });

  it('LMS unreachable: a clear error state with a retry, never local data', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(ON);
    vi.spyOn(lmsLiveApi, 'batches')
      .mockRejectedValueOnce(new ApiError('LMS down', 503, 'LMS_UNAVAILABLE', [{ field: 'lmsRequestId', message: 'rq-9' }]))
      .mockResolvedValueOnce(live([BATCH], 1));
    renderWithProviders(<BatchesPage />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Live LMS data could not be loaded');
    expect(alert).toHaveTextContent('The LMS is temporarily unavailable.');
    expect(alert).toHaveTextContent('LMS_UNAVAILABLE');
    expect(alert).toHaveTextContent('rq-9');
    expect(screen.queryByText(SAMPLE_BATCH_ID)).not.toBeInTheDocument();
    expect(screen.queryByText('Local data')).not.toBeInTheDocument();
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('LMS-B-0001')).toBeInTheDocument();
  });

  it('Attendance re-reads when the grouping changes', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(ON);
    renderWithProviders(<AttendancePage />);
    await screen.findByText('LMS-NAG');
    await userEvent.selectOptions(screen.getByLabelText('Group by'), 'centre');
    await waitFor(() => expect(lmsLiveApi.attendance).toHaveBeenLastCalledWith('centre'));
  });
});

describe('System Settings switch', () => {
  const sw = () => screen.findByRole('switch', { name: 'Show live LMS data' });

  it('shows en + mr labels and help; disabled with the reason while the master switch is off', async () => {
    granted = new Set(['editSettings']);
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(state());
    renderWithProviders(<LiveDataSettingCard />);
    expect(await sw()).toBeDisabled();
    expect(screen.getByText('LMS चा थेट डेटा दाखवा')).toBeInTheDocument();
    expect(screen.getByText(/the LMS screens .* read live from the LMS/)).toBeInTheDocument();
    expect(screen.getByText(/थेट LMS मधून डेटा दाखवतात/)).toBeInTheDocument();
    expect(screen.getByTestId('live-data-blocker')).toHaveTextContent('LMS_READS_ENABLED');
    expect(screen.getByTestId('live-data-blocker')).toHaveTextContent('मुख्य स्विच');
  });

  it('disabled with the missing link values named while the LMS link is not configured', async () => {
    granted = new Set(['editSettings']);
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(
      state({ masterSwitch: true, configured: false, blocker: 'LMS_NOT_CONFIGURED', missing: ['LMS_TENANT_CODE'] }),
    );
    renderWithProviders(<LiveDataSettingCard />);
    expect(await sw()).toBeDisabled();
    expect(screen.getByTestId('live-data-blocker')).toHaveTextContent('tenant code');
    expect(screen.getByTestId('live-data-blocker')).toHaveTextContent('Missing: LMS_TENANT_CODE');
  });

  it('switches on with settings.update and shows the new state', async () => {
    granted = new Set(['editSettings']);
    /* The server's state before, then after the switch (the screens re-read it). */
    vi.spyOn(lmsLiveApi, 'state')
      .mockResolvedValueOnce(state({ masterSwitch: true, canEnable: true, blocker: null }))
      .mockResolvedValue({ ...ON, updatedAt: FETCHED });
    const setState = vi.spyOn(lmsLiveApi, 'setState').mockResolvedValue({ ...ON, updatedAt: FETCHED });
    renderWithProviders(<LiveDataSettingCard />);
    const s = await sw();
    expect(s).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(s);
    expect(setState).toHaveBeenCalledWith(true);
    await waitFor(() => expect(s).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByText('Live from LMS')).toBeInTheDocument();
    expect(screen.getByText(/recorded in the audit log/)).toBeInTheDocument();
  });

  it('switching off stays possible even when it could not be switched on again', async () => {
    granted = new Set(['editSettings']);
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(state({ setting: true }));
    const setState = vi.spyOn(lmsLiveApi, 'setState').mockResolvedValue(state());
    renderWithProviders(<LiveDataSettingCard />);
    const s = await sw();
    expect(s).toBeEnabled();
    await userEvent.click(s);
    expect(setState).toHaveBeenCalledWith(false);
  });

  it('read-only without settings.update', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(state({ masterSwitch: true, canEnable: true, blocker: null }));
    renderWithProviders(<LiveDataSettingCard />);
    expect(await sw()).toBeDisabled();
  });

  it('shows the server refusal', async () => {
    granted = new Set(['editSettings']);
    vi.spyOn(lmsLiveApi, 'state').mockResolvedValue(state({ masterSwitch: true, canEnable: true, blocker: null }));
    vi.spyOn(lmsLiveApi, 'setState').mockRejectedValue(
      new ApiError('Live LMS data cannot be switched on', 409, 'LMS_LIVE_DATA_UNAVAILABLE'),
    );
    renderWithProviders(<LiveDataSettingCard />);
    await userEvent.click(await sw());
    expect(await screen.findByRole('alert')).toHaveTextContent('Live LMS data cannot be switched on');
  });

  it('hidden when the server has no G-2 (the settings screen stays as it was)', async () => {
    vi.spyOn(lmsLiveApi, 'state').mockRejectedValue(new ApiError('Not found', 404, 'ROUTE_NOT_FOUND'));
    const { container } = renderWithProviders(<LiveDataSettingCard />);
    await waitFor(() => expect(lmsLiveApi.state).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
