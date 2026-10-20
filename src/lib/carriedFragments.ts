export type FolderFragment = { id: string; prime_number: number; banked?: boolean | null };

/** Folder and Library are presentation views of the same persisted rows. */
export function fragmentInventory<T extends { banked?: boolean | null }>(rows: T[]) {
  return {
    carried: rows.filter(row => row.banked === false),
    bankedCount: rows.filter(row => row.banked === true).length,
  };
}