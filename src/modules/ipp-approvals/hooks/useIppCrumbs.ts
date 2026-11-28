import type { Crumb } from '../../../components/ui';
import { useCanOpen } from '../../auth';
import { DASHBOARD_PATH } from '../utils';

/*
 * The trail of a screen of the menu: the programme Dashboard for those who may open it (an IPP officer may not), then
 * IPP Approvals, which leads to its own dashboard.
 */
export function useIppCrumbs(...rest: Crumb[]): Crumb[] {
  const canOpen = useCanOpen();
  return [
    ...(canOpen('dashboard') ? [{ l: 'Dashboard', link: '#/dashboard' }] : []),
    { l: 'IPP Approvals', link: canOpen('ipp-dashboard') ? '#' + DASHBOARD_PATH : undefined },
    ...rest,
  ];
}
