import { useEffect, useState, type ReactNode } from 'react';

export interface ListFilterValues {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

/* Debounced search box and status filter for server-paged lists; extra filters go in `children`. */
export default function ListFilters({
  value,
  onChange,
  placeholder,
  label,
  children,
}: {
  value: ListFilterValues;
  onChange: (v: ListFilterValues) => void;
  placeholder: string;
  label: string;
  children?: ReactNode;
}) {
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
        placeholder={placeholder}
        aria-label={label}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {children}
      <select
        className="inp sm tw-w-auto"
        aria-label="Filter by status"
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as ListFilterValues['status'] })}
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}

export const statusParam = (s: ListFilterValues['status']) => (s === 'all' ? undefined : s === 'active');
