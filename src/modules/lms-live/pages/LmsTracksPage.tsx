import { LiveOnlyPage } from '../components/LiveOnlyPage';
import { LiveTracksPage } from './LiveScreens';

/* Route page of /lms-live/tracks: the entity-owned LMS tracks (live only). */
export default function LmsTracksPage() {
  return (
    <LiveOnlyPage title="LMS Tracks" crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'LMS tracks' }]} live={<LiveTracksPage />} />
  );
}
