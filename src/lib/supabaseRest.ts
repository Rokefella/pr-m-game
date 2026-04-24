const SUPABASE_URL = 'https://jngofylkynipsnzyyzdq.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ29meWxreW5pcHNuenl5emRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjIzNDEsImV4cCI6MjA5MjUzODM0MX0.FWvc_DwabUSkxgHVwKRA3T2SMTlQ7aQr12a7yGUEW64';

const baseHeaders = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export const restInsert = async (table: string, data: object) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...baseHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const restUpdate = async (
  table: string,
  data: object,
  column: string,
  value: string,
) => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`,
    {
      method: 'PATCH',
      headers: { ...baseHeaders, Prefer: 'return=representation' },
      body: JSON.stringify(data),
    },
  );
  return response.json();
};

export const restSelect = async (
  table: string,
  column: string,
  value: string,
  select = '*',
) => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}&select=${select}`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );
  return response.json();
};
