import Icon from '../../../../components/ui/Icon';
import { Badge, Callout, KvList, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import { SectionTabHead } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useApiData } from '../../shared';
import {
  CARD_CREATE_PATH,
  LIVE_DASHBOARD_SETTINGS_PATH,
  STAT_CREATE_PATH,
  cardEditPath,
  cardTone,
  cardViewPath,
  statEditPath,
  statViewPath,
} from '../constants';
import { liveDashboardCardsService, liveDashboardService, liveDashboardStatsService } from '../services/liveDashboardService';
import type { ApiLiveDashboardCard, ApiLiveDashboardStat, Bilingual } from '../types/livedashboard.types';
import DistrictsCard from './DistrictsCard';
import OrderedItemsCard from './OrderedItemsCard';

/* Marathi first, as on the public site; English underneath. Long text wraps. */
const Pair = ({ value }: { value: Bilingual }) =>
  value.mr || value.en ? (
    <div style={{ whiteSpace: 'normal' }}>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">None</span>
  );

const Shown = ({ on }: { on: boolean }) => <Badge tone={on ? 'green' : 'grey'}>{on ? 'Shown' : 'Hidden'}</Badge>;

/* The colour a card is drawn in: a swatch of its edge and the tone's name. */
const Tone = ({ tone }: { tone: string }) => {
  const t = cardTone(tone);
  return (
    <span className="f ac gp4 fs12" style={{ whiteSpace: 'nowrap' }}>
      <span aria-hidden="true" style={{ width: 10, height: 18, borderRadius: 3, background: t.edge, display: 'inline-block' }} />
      {t.label}
    </span>
  );
};

/*
 * Programme Progress – Live Dashboard — the Live Dashboard tab of Home Page Management: the section under the quick
 * actions strip of the public home page. Every part of it is managed here: the section settings (heading, the map and
 * training modes cards' texts and switches, the note), the KPI cards, the side figures beside the training modes
 * donut and the 36 districts of the map. Whether the website shows the section at all is the tab's "Show on website"
 * switch above it (HomePageView).
 */
export default function LiveDashboardTab() {
  const go = useGo();
  const settings = useApiData(() => liveDashboardService.getSettings(), []);
  const s = settings.data;

  return (
    <>
      <SectionTabHead
        actions={
          <Can action="updateLiveDashboard">
            <button type="button" className="btn" onClick={() => go(LIVE_DASHBOARD_SETTINGS_PATH)}>
              <Icon name="edit" />
              Edit settings
            </button>
          </Can>
        }
      >
        The Programme Progress &ndash; Live Dashboard of the public home page: its KPI cards, the district map, the training modes
        card and the note under them.
      </SectionTabHead>

      <div className="mb14">
        <Callout tone="info" title="These figures are entered by hand">
          Every value is shown on the website exactly as entered here; none of them is counted automatically from the programme&rsquo;s
          records. Update them here as the programme progresses.
        </Callout>
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Section settings</h3>
        </div>
        <div className="card-b">
          <LoadState loading={settings.loading && !s} error={settings.error} onRetry={() => void settings.reload()} />
          {s ? (
            <KvList
              pairs={[
                ['Heading', <Pair key="h" value={s.heading} />],
                ['Subtitle', <Pair key="s" value={s.subtitle} />],
                ['District map card', <Shown key="m" on={s.showMap} />],
                ['Map title', <Pair key="mt" value={s.mapTitle} />],
                ['Training modes card', <Shown key="md" on={s.showModes} />],
                ['Training modes title', <Pair key="mdt" value={s.modesTitle} />],
                [
                  'Offline',
                  <span key="off">
                    <b className="mono">{s.offlineCount.toLocaleString('en-IN')}</b> — {s.offlineLabel.en} <span lang="mr">/ {s.offlineLabel.mr}</span>
                  </span>,
                ],
                [
                  'Online',
                  <span key="on">
                    <b className="mono">{s.onlineCount.toLocaleString('en-IN')}</b> — {s.onlineLabel.en} <span lang="mr">/ {s.onlineLabel.mr}</span>
                  </span>,
                ],
                [
                  'Donut centre',
                  <span key="c">
                    <b className="mono">{(s.offlineCount + s.onlineCount).toLocaleString('en-IN')}</b> — {s.donutCenterLabel.en}{' '}
                    <span lang="mr">/ {s.donutCenterLabel.mr}</span>
                  </span>,
                ],
                ['Note under the section', <Shown key="d" on={s.showDisclaimer && !!(s.disclaimer.mr || s.disclaimer.en)} />],
                ['Note', <Pair key="dt" value={s.disclaimer} />],
                ['Last updated', fmtDateTime(s.updatedAt)],
              ]}
            />
          ) : null}
        </div>
      </div>

      <OrderedItemsCard<ApiLiveDashboardCard>
        title="KPI cards"
        noun="KPI card"
        dependencyKind="live-dashboard-card"
        api={liveDashboardCardsService}
        addLabel="Add card"
        createPath={CARD_CREATE_PATH}
        viewPath={cardViewPath}
        editPath={cardEditPath}
        searchText={(c) => [c.label.en, c.label.mr, c.value, c.detail.en, c.detail.mr, c.link].join(' ')}
        searchLabel="title, value, detail or link"
        emptyMsg="No KPI cards yet: the section shows no cards until one is added. Use Add card to create the first one."
        columns={[
          {
            k: 'detail',
            l: 'Detail',
            sortable: false,
            render: (c) =>
              c.detail.en || c.detail.mr ? (
                <div style={{ whiteSpace: 'normal', minWidth: 140, maxWidth: 240 }}>
                  <div className="fs12">{c.detail.en}</div>
                  <div className="muted fs12" lang="mr">
                    {c.detail.mr}
                  </div>
                </div>
              ) : (
                <span className="muted fs12">None</span>
              ),
          },
          {
            k: 'link',
            l: 'Link',
            sortable: false,
            render: (c) => (c.link ? <span className="mono fs12">{c.link}</span> : <span className="muted fs12">Not a link</span>),
          },
          { k: 'tone', l: 'Colour', sortable: false, render: (c) => <Tone tone={c.tone} /> },
        ]}
      />

      <OrderedItemsCard<ApiLiveDashboardStat>
        title="Side figures"
        noun="figure"
        dependencyKind="live-dashboard-stat"
        api={liveDashboardStatsService}
        addLabel="Add figure"
        createPath={STAT_CREATE_PATH}
        viewPath={statViewPath}
        editPath={statEditPath}
        searchText={(f) => [f.label.en, f.label.mr, f.value].join(' ')}
        searchLabel="label or value"
        emptyMsg="No side figures yet: the training modes card lists none until one is added. Use Add figure to create the first one."
        columns={[]}
      />

      <DistrictsCard />
    </>
  );
}
