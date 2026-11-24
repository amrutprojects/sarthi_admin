import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DistrictMap, MarkerMap } from '..';

const tiles = (c: HTMLElement) => [...c.querySelectorAll<SVGGElement>('.mh-tile')];
const values = (c: HTMLElement) => [...c.querySelectorAll('.mh-val')].map((v) => v.textContent);
const fills = (c: HTMLElement) => new Set([...c.querySelectorAll('.mh-rect')].map((r) => r.getAttribute('fill')));
/* The old sample dataset's RAG statuses and colours. */
const STATUS_WORDS = /On Track|Needs Attention|Critical|Delayed|On Hold|Not Started/;
const STATUS_COLOURS = ['#16A34A', '#C98A1E', '#B3271E', '#B3A08D'];

/* The map shows real geography and the live counts it is given; nothing from the sample dataset. */
describe('<DistrictMap>', () => {
  it('keeps all 36 districts with their names and drill-down links', () => {
    const { container } = render(<DistrictMap />);
    expect(tiles(container)).toHaveLength(36);
    expect(container.querySelector('[data-district="PUN"]')).toHaveAttribute('data-go', '#/districts/PUN');
    expect(container.textContent).toContain('Pune');
    expect(container.textContent).toContain('Chh. Sambhaj.');
  });

  it('with no live data (old status colouring) shows no number, no status and a bilingual no-data legend', () => {
    const { container } = render(<DistrictMap metric="enrolled" colorMode="status" statusFilter="RED" filterMode="OFFLINE" />);
    expect(values(container)).toEqual([]);
    expect(container.textContent).not.toMatch(STATUS_WORDS);
    expect(container.textContent).not.toMatch(/\/ \d/);
    expect(container.querySelector('.mh-tile.dim')).toBeNull();
    expect([...fills(container)]).toEqual(['#E4EAF2']);
    for (const c of STATUS_COLOURS) expect(container.innerHTML).not.toContain('fill="' + c);
    const legend = container.querySelector('[data-testid="map-no-data"]');
    expect(legend).toHaveTextContent('No live figures for this view yet');
    expect(legend).toHaveTextContent('या दृश्यासाठी अद्याप थेट आकडे नाहीत');
  });

  it('ignores invented metrics even when live counts are passed', () => {
    const live = { PUN: { applications: 5, eligible: 3, enrolled: 2 } };
    for (const metric of ['target', 'active', 'completed', 'certified', 'attendance', 'achievement']) {
      const { container, unmount } = render(<DistrictMap metric={metric} colorMode="metric" live={live} />);
      expect(values(container)).toEqual([]);
      expect(container.querySelector('[data-testid="map-no-data"]')).not.toBeNull();
      unmount();
    }
  });

  it('shows and shades the live count per district for a live metric', () => {
    const live = { PUN: { applications: 12, eligible: 7, enrolled: 4 }, NAS: { applications: 3, eligible: 1, enrolled: 0 } };
    const { container } = render(<DistrictMap metric="applications" colorMode="status" live={live} />);
    const vals = values(container);
    expect(vals).toHaveLength(36);
    expect(container.querySelector('[data-district="PUN"] .mh-val')).toHaveTextContent('12');
    expect(container.querySelector('[data-district="NAS"] .mh-val')).toHaveTextContent('3');
    expect(container.querySelector('[data-district="BEE"] .mh-val')).toHaveTextContent('0');
    expect(container.querySelector('[data-district="PUN"]')).toHaveAttribute('data-live', '12,7,4');
    expect(container.textContent).not.toMatch(STATUS_WORDS);
    expect(container.textContent).toContain('Shading by live applications count');
    expect(container.textContent).toContain('थेट अर्ज संख्येनुसार छटा');
  });
});

describe('<MarkerMap>', () => {
  it('claims no legend when there are no markers', () => {
    const { container } = render(<MarkerMap markers={[]} />);
    expect(tiles(container)).toHaveLength(36);
    expect(container.textContent).not.toContain('Live session in progress');
    expect(container.querySelector('[data-testid="map-no-data"]')).toHaveTextContent('No data yet · अद्याप माहिती नाही');
  });
});
