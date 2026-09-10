import { createClient } from 'npm:@supabase/supabase-js@2';

export async function authenticateUser(req: Request): Promise<{ userId: string; error?: string }> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: '', error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { userId: '', error: 'Token missing' };
  }

  // Support local demo token in offline/sandbox development
  if (token === 'demo-token-123' || token === 'demo-user-123') {
    return { userId: 'demo-user-123' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload && (payload.sub || payload.id)) {
          return { userId: payload.sub || payload.id };
        }
      }
    } catch {
      // ignore
    }
    return { userId: '', error: 'Server authentication unconfigured' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { userId: '', error: error?.message || 'Unauthorized' };
    }
    return { userId: user.id };
  } catch (err: any) {
    return { userId: '', error: err.message || 'Authentication error' };
  }
}
