import useLegacyEvents from '../hooks/useLegacyEvents';
import { AppRoutes } from './router';

/* Root component: wires the legacy markup click handlers (charts, maps) and renders the routes. */
export default function App() {
  useLegacyEvents();
  return <AppRoutes />;
}
