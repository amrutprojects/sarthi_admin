import { masterOptions } from '../../options';
import { useApiData } from '../../shared';

/*
 * Every active district, grouped by state, for the coordinator and district-office pickers. Read from
 * the public geography feed (the same active rows the website sees), one request per state.
 */
export function useDistrictOptions() {
  return useApiData(async () => {
    const states = await masterOptions.states();
    const perState = await Promise.all(
      states.map(async (s) => (await masterOptions.districtsOfState(s.id)).map((d) => ({ id: d.id, name: d.name, code: d.code ?? '', state: s.name }))),
    );
    return perState.flat();
  }, []);
}
