import { LiveOnlyPage } from '../components/LiveOnlyPage';
import { LiveDistrictsPage } from './LiveScreens';

/* Route page of /lms-live/districts: the entity-owned LMS districts with their division (live only). */
export default function LmsDistrictsPage() {
  return (
    <LiveOnlyPage
      title="LMS Districts"
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'LMS districts' }]}
      live={<LiveDistrictsPage />}
    />
  );
}
