import { useEffect, useState } from 'react';
import { findWords, type WorldFind } from '@/lib/worldFinds';

/** Reading only: World claims on contact before opening this card. */
export default function FindCard({ find }: { find: WorldFind }) {
  const [text, setText] = useState(find.text ?? '');
  useEffect(() => {
    let off = false;
    void findWords(find).then(value => { if (!off) setText(value); }).catch(() => undefined);
    return () => { off = true; };
  }, [find]);
  return <><h2 className="font-cinzel">{find.title}</h2><p className="font-fell world-find-text">{text}</p></>;
}