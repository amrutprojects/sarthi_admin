import { liveDashboardCardsService } from '../services/liveDashboardService';
import ItemViewPage from '../components/ItemViewPage';
import KpiCardPreview from '../components/KpiCardPreview';
import { cardEditPath, cardTone } from '../constants';

/* View KPI card (/cms/live-dashboard/cards/:id/view), with a preview of the card as the home page draws it. */
export default function CardView() {
  return (
    <ItemViewPage
      noun="KPI card"
      dependencyKind="live-dashboard-card"
      load={liveDashboardCardsService.get}
      setStatus={liveDashboardCardsService.setStatus}
      remove={liveDashboardCardsService.remove}
      editPath={cardEditPath}
      details={(c) => [
        ['Detail (Marathi)', c.detail.mr ? <span lang="mr">{c.detail.mr}</span> : <span className="muted">None</span>],
        ['Detail (English)', c.detail.en ? <span lang="en">{c.detail.en}</span> : <span className="muted">None</span>],
        ['Link', c.link ? <span className="mono fs12">{c.link}</span> : <span className="muted">Not a link</span>],
        ['Colour', cardTone(c.tone).label],
      ]}
      aside={(c) => (
        <div className="card">
          <div className="card-h">
            <h3>
              Preview <span className="sub">the card as the home page draws it</span>
            </h3>
          </div>
          <div className="card-b">
            <KpiCardPreview label={c.label} value={c.value} detail={c.detail} tone={c.tone} />
          </div>
        </div>
      )}
    />
  );
}
