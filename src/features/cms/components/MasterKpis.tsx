import { Kpi } from '../../../components/ui';

export interface MasterKpi {
  label: string;
  value: number | undefined;
  /* Tile accent: b brand, g green, a amber, r red, v violet, s saffron. */
  tone?: string;
  sub?: string;
  /* Clicking the tile applies the filter it describes. */
  link?: string;
  title?: string;
}

/*
 * The KPI row every CMS listing opens with, matching the other admin screens (Documents, Roles).
 *
 * The counts come from the backend rather than from the rows on screen: one page of a paginated list
 * is not the total, and a tile that silently means "15 of them, on this page" is worse than no tile.
 * A value of undefined is still loading and shows a dash, so the row never flashes a wrong zero.
 */
export default function MasterKpis({ items }: { items: MasterKpi[] }) {
  return (
    <div className="grid g4 mb14">
      {items.map((i) => (
        <Kpi
          key={i.label}
          label={i.label}
          value={i.value === undefined ? '—' : i.value}
          tone={i.tone}
          sub={i.sub}
          link={i.link}
          title={i.title}
        />
      ))}
    </div>
  );
}
