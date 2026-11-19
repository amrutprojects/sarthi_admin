import { describe, expect, it } from 'vitest';
import { toDistrictOffice } from '../services/contactService';
import type { ApiDistrictOffice } from '../types/contact.types';
import { OFFICES } from './fixtures';

/*
 * A backend that has not yet run the District Coordinator migration still sends the name as one string.
 * The admin reads it as the same name in both languages, so the list, View and Edit pages keep working.
 */
describe('toDistrictOffice', () => {
  const office = OFFICES[0]!;
  const legacy = (name: unknown) => ({ ...office, collectorName: name }) as unknown as ApiDistrictOffice;

  it('leaves a Marathi/English pair, and no name, exactly as sent', () => {
    expect(toDistrictOffice(office)).toBe(office);
    const unnamed = { ...office, collectorName: null };
    expect(toDistrictOffice(unnamed)).toBe(unnamed);
  });

  it('reads an older plain-string name as the same name in both languages', () => {
    expect(toDistrictOffice(legacy(' Sakshi ')).collectorName).toEqual({ mr: 'Sakshi', en: 'Sakshi' });
  });

  it('reads a blank plain-string name as no name', () => {
    expect(toDistrictOffice(legacy('   ')).collectorName).toBeNull();
  });
});
