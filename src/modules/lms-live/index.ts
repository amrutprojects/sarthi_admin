/*
 * Public API of the lms-live module (G-2 "Show live LMS data"). Other modules import only from here.
 * Off (default): the LMS screens render their current local data under a "Local data" badge.
 * On: they render the live views of this module, read from /api/v1/lms-reads, under "Live from LMS".
 */
export { DataSourceBadge, LmsDataSource } from './components/DataSource';
export { fetchedAtLabel } from './utils/format';
export { LiveDataSettingCard } from './components/LiveDataSettingCard';
export { LIVE_DATA_TEXT } from './utils/liveDataText';
export { LiveError } from './components/LiveListPage';
export { useLiveDataSource, useLiveDataState, useSetLiveData, lmsLiveKeys } from './hooks/useLiveData';
export {
  LiveAttendancePage,
  LiveBatchesPage,
  LiveCentresPage,
  LiveDistrictsPage,
  LiveSessionsByModePage,
  LiveSessionsTodayPage,
  LiveTrainersPage,
  LiveTracksPage,
} from './pages/LiveScreens';
export { LiveOnlyPage } from './components/LiveOnlyPage';
export { lmsLiveApi } from './services/lmsLiveApi';
export type { LiveDataState, LiveResult } from './types/lmsLive.types';
