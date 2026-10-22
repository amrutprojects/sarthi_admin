import { describe, expect, it } from 'vitest';
import { toggleRole } from '../components/roleSelection';

const viewer = { id: 'r-viewer', code: 'VIEWER' };
const pmo = { id: 'r-pmo', code: 'PMO' };
const website = { id: 'r-web', code: 'WEBSITE_ADMIN' };
const roles = [viewer, pmo, website];

describe('toggleRole', () => {
  it('ticks and unticks ordinary roles together', () => {
    expect(toggleRole([], viewer, roles)).toEqual(['r-viewer']);
    expect(toggleRole(['r-viewer'], pmo, roles)).toEqual(['r-viewer', 'r-pmo']);
    expect(toggleRole(['r-viewer', 'r-pmo'], viewer, roles)).toEqual(['r-pmo']);
  });

  it('keeps Website Admin on its own', () => {
    expect(toggleRole(['r-viewer', 'r-pmo'], website, roles)).toEqual(['r-web']);
    expect(toggleRole(['r-web'], viewer, roles)).toEqual(['r-viewer']);
    expect(toggleRole(['r-web'], website, roles)).toEqual([]);
  });
});
