import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import EmailEntry from './EmailEntry';
import Index from './Index';

const RootGate = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    setChecking(true);
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('entity_answer, username')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data || (!data.entity_answer && !data.username)) {
        navigate('/entity-questions', { replace: true });
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  if (loading) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#04040a' }} />;
  }
  if (!user) return <EmailEntry />;
  if (checking) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#04040a' }} />;
  }
  return <Index />;
};

export default RootGate;
