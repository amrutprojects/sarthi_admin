/*
 * Chart and map wrappers. The SVG generators in src/legacy/charts.js and map.js are pure
 * functions (data in, SVG out), so they are reused as-is; clicks on their data-go links are
 * handled by the app-wide link handler.
 */
import { useEffect, useRef } from 'react';
import AS from '../../legacy';
import { Html } from '../ui';
import type { CalendarDay, ChartItem, ChartOpts, ChartSeries, MapMarker, MapRenderOpts } from '../../types/legacy';

const C = () => AS.charts;

interface ItemsProps { items: ChartItem[]; opts?: ChartOpts }

export const LineChart = ({ series, labels, opts }: { series: ChartSeries[]; labels: string[]; opts?: ChartOpts }) => <Html html={C().line(series, labels, opts)} />;
export const Donut = ({ items, opts }: ItemsProps) => <Html html={C().donut(items, opts)} />;
export const Funnel = ({ stages }: { stages: ChartItem[] }) => <Html html={C().funnel(stages)} />;
export const HBar = ({ items, opts }: ItemsProps) => <Html html={C().hbar(items, opts)} />;
export const VBar = ({ items, opts }: ItemsProps) => <Html html={C().vbar(items, opts)} />;
export const Ring = ({ value, opts }: { value: number; opts?: ChartOpts }) => <Html html={C().ring(value, opts)} as="span" style={{ display: 'contents' }} />;
export const Stacked = ({ labels, series, opts }: { labels: string[]; series: ChartSeries[]; opts?: ChartOpts }) => <Html html={C().stacked(labels, series, opts)} />;
export const Heatmap = ({ cells, opts }: { cells: ChartItem[]; opts?: ChartOpts }) => <Html html={C().heatmap(cells, opts)} />;
export const Calendar = ({ days }: { days: CalendarDay[] }) => <Html html={C().calendar(days)} />;

/* Inject generator markup and attach the map's hover tooltips. */
function useMountedMap(html: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) AS.map.mount(ref.current);
  }, [html]);
  return ref;
}

/* 36-district schematic map with hover tooltips. */
export function DistrictMap({ metric = 'enrolled', colorMode = 'status', height = 440, statusFilter, filterMode }: MapRenderOpts) {
  const html = AS.map.render({ metric, colorMode, height, statusFilter, filterMode });
  const ref = useMountedMap(html);
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* Marker map (centres, live sessions) with the same hover behaviour. */
export function MarkerMap({ markers, opts }: { markers: MapMarker[]; opts?: { height?: number; legend?: { c: string; l: string }[] } }) {
  const html = AS.map.markers(markers, opts);
  const ref = useMountedMap(html);
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
