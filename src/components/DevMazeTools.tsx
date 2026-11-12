import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { formatSignedTerms, storeDevConsoleAnswer, type DevConsoleAnswer } from '@/lib/console';

export type DevMazeActions = { level: number; collectAll: () => Promise<string>; jumpDoor: () => void; jumpConsole?: () => void };

const btn = { background: 'transparent', border: '1px solid var(--game-dev-text)', color: 'var(--game-dev-text)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' } as const;

/** Rob-only maze speedwalk tools; every action uses the normal pickup and move paths. */
export default function DevMazeTools({ maze }: { maze: DevMazeActions }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const flight = useRef(false);
  const run = async (task: () => Promise<string>) => {
    if (flight.current) return;
    flight.current = true; setBusy(true);
    try { setNote(await task()); } catch (e) { setNote(e instanceof Error ? e.message : 'Failed'); }
    finally { flight.current = false; setBusy(false); }
  };
  const answer = async () => {
    const { data, error } = await supabase.rpc('dev_console_answer' as never, { p_level: maze.level } as never);
    if (error) throw error;
    const result = data as DevConsoleAnswer | null;
    if (!result?.ok) return `No answer: ${(result as { reason?: string } | null)?.reason ?? 'unknown'}`;
    storeDevConsoleAnswer(maze.level, result.terms);
    return formatSignedTerms(result.terms);
  };
  return (
    <>
      <div style={{ opacity: 0.7, fontSize: 11 }}>MAZE SPEEDWALK</div>
      <Button variant="ghost" type="button" disabled={busy} style={btn} onClick={() => void run(maze.collectAll)}>COLLECT ALL</Button>
      <Button variant="ghost" type="button" disabled={busy} style={btn} onClick={() => void run(answer)}>CONSOLE ANSWER</Button>
      <Button variant="ghost" type="button" style={btn} onClick={maze.jumpDoor}>JUMP TO DOOR</Button>
      {maze.jumpConsole && <Button variant="ghost" type="button" style={btn} onClick={maze.jumpConsole}>JUMP TO CONSOLE</Button>}
      {note && <div data-testid="dev-maze-note" style={{ fontSize: 11 }}>{note}</div>}
      <div style={{ height: 1, background: 'var(--game-dev-divider)', margin: '6px 0' }} />
    </>
  );
}
