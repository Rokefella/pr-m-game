import { memo } from 'react';

export default memo(function FolderSlots({ total = 20, filled, revealed }: { total?: number; filled: number; revealed: boolean }) {
  const newIndex = Math.min(filled, total - 1);
  return <div className="folder-slots" aria-label="Folder slots">
    {Array.from({ length: total }, (_, i) => {
      const isNew = i === newIndex;
      const occupied = i < filled;
      return <span key={i} className={`folder-slot ${isNew ? revealed ? 'slot-new-revealed' : 'slot-new' : occupied ? 'slot-filled' : ''}`}>
        {(occupied && !isNew || isNew && revealed) && <i />}
      </span>;
    })}
  </div>;
});