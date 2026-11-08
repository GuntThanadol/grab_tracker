import { supabase } from '@/lib/supabase';

/** Returns the current Supabase access token for requests to protected routes. */
export async function getAuthorizationHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
