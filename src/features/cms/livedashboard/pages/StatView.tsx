import { liveDashboardStatsService } from '../services/liveDashboardService';
import ItemViewPage from '../components/ItemViewPage';
import { statEditPath } from '../constants';

/* View side figure (/cms/live-dashboard/stats/:id/view): one line of the list beside the training modes donut. */
export default function StatView() {
  return (
    <ItemViewPage
      noun="figure"
      load={liveDashboardStatsService.get}
      setStatus={liveDashboardStatsService.setStatus}
      remove={liveDashboardStatsService.remove}
      editPath={statEditPath}
      details={() => []}
    />
  );
}
