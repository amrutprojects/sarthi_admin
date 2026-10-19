import { useEffect, useState } from 'react';

export interface UserFilterValues {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

/* Search (debounced) and status filter for the user list. */
export default function UserFilters({ value, onChange }: { value: UserFilterValues; onChange: (v: UserFilterValues) => void }) {
  const [search, setSearch] = useState(value.search);
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== value.search) onChange({ ...value, search });
    }, 300);
    return () => clearTimeout(t);
  }, [search, value, onChange]);

  return (
    <div className="tw-flex tw-w-full tw-flex-wrap tw-items-center tw-gap-2 sm:tw-w-auto">
      <input
        type="search"
        className="inp sm tw-min-w-0 tw-flex-1 sm:tw-w-60 sm:tw-flex-none"
        placeholder="Search name or email"
        aria-label="Search users"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        className="inp sm tw-w-auto"
        aria-label="Filter by status"
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as UserFilterValues['status'] })}
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}
