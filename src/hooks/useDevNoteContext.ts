import { useEffect, useRef } from 'react';
import { registerNoteContext, type NoteContext } from '@/lib/devNotes';
export function useDevNoteContext(getter: () => NoteContext) {
  const latest = useRef(getter); latest.current = getter;
  useEffect(() => registerNoteContext(() => latest.current()), []);
}