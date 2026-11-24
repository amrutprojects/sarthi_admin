/*
 * Maharashtra's districts (code, name, region, talukas and schematic map position): fixed reference data, not
 * programme figures. Read from window.AS.db (src/legacy/data.js), which holds only reference data since the sample
 * dataset was retired (24 Nov 2026).
 */
import AS from '../legacy';
import type { District } from '../types/domain';

export const districts = (): District[] => AS.db.districts;
export const district = (code: string): District | undefined => AS.db.districtBy[code];
export const regions = (): string[] => [...new Set(districts().map((d) => d.region))];
export const mapProvider = (): string => AS.map.provider;
