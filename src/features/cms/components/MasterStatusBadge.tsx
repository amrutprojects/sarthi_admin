import { GenBadge } from '../../../components/ui';

/*
 * Active / Inactive pill for a master record, using the shared status badge so the CMS lists read the
 * same as every other status column in the panel.
 */
export default function MasterStatusBadge({ isActive }: { isActive: boolean }) {
  return <GenBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} />;
}

/* Value used for CSV / Excel export and for sorting. */
export const statusLabel = (isActive: boolean) => (isActive ? 'Active' : 'Inactive');
