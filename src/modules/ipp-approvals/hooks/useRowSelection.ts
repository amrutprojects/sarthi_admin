import { useEffect, useState } from 'react';

/*
 * The applications chosen for "Approve selected". Kept across pages; cleared when the tab or a filter changes
 * (`scope`), so nothing out of sight of the list being worked on is ever approved. `wholeBatch` = every application
 * of the filtered batch that waits for me, on this page or not.
 */
export function useRowSelection(scope: string) {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const [wholeBatch, setWholeBatch] = useState(false);
  const clear = () => {
    setIds(new Set());
    setWholeBatch(false);
  };
  useEffect(clear, [scope]);
  return {
    ids,
    wholeBatch,
    clear,
    has: (id: string) => ids.has(id),
    set: (rowIds: string[], on: boolean) =>
      setIds((prev) => {
        const next = new Set(prev);
        rowIds.forEach((id) => (on ? next.add(id) : next.delete(id)));
        return next;
      }),
    selectBatch: () => {
      setIds(new Set());
      setWholeBatch(true);
    },
  };
}
export type RowSelection = ReturnType<typeof useRowSelection>;
