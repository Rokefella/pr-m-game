import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchOrCreateUser } from '@/lib/userData';
import DoorTransition from '@/components/theme/transition/DoorTransition';

const LibraryDoor = () => {
  const { user } = useAuth();
  const [level, setLevel] = useState(1);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    (async () => {
      const row = await fetchOrCreateUser(user.id);
      if (!cancelled && row?.level) setLevel(row.level);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return <DoorTransition kind="library" lines={['What do you', 'already know?']} destination={`/room/${level}/library`} />;
};

export default LibraryDoor;
