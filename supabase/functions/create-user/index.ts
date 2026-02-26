import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE, PUT',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedRoles = new Set(['admin', 'diretor', 'professor']);
const normalizeRole = (role: string | undefined) =>
  role && allowedRoles.has(role) ? role : 'professor';
const formatDisplayNameFromEmail = (email: string) => {
  const localPart = email.split('@')[0] || '';
  const normalized = localPart.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Usuario';

  const particles = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((token, index) => {
      const lower = token.toLowerCase();
      if (index > 0 && particles.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

type AdminListUsersClient = {
  auth: {
    admin: {
      listUsers: (params: { page: number; perPage: number }) => Promise<{
        data: { users: Array<{ id: string; email?: string | null }> };
        error: unknown;
      }>;
    };
  };
};

const findUserByEmail = async (client: AdminListUsersClient, email: string) => {
  const perPage = 200;
  const maxPages = 10;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) return null;

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;

    if (data.users.length < perPage) break;
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'DELETE' && req.method !== 'PUT') {
    return jsonResponse({ error: 'Metodo nao permitido.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Ambiente Supabase nao configurado.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  if (!authHeader.trim()) {
    return jsonResponse({ error: 'Nao autenticado.' }, 401);
  }

  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData.user) {
    return jsonResponse({ error: 'Nao autenticado.' }, 401);
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: 'Falha ao validar permissao.' }, 500);
  }

  if (profile?.role !== 'admin') {
    return jsonResponse({ error: 'Nao autorizado.' }, 403);
  }

  let payload: { email?: string; role?: string; name?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON invalido.' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';

  if (!email || !emailRegex.test(email)) {
    return jsonResponse({ error: 'Email invalido.' }, 400);
  }

  // --- UPDATE (PUT) LOGIC ---
  if (req.method === 'PUT') {
    const roleToUpdate = normalizeRole(
      typeof payload.role === 'string' ? payload.role : undefined,
    );
    const nameToUpdate = typeof payload.name === 'string' ? payload.name.trim() : '';
    const resolvedDisplayName = nameToUpdate || formatDisplayNameFromEmail(email);

    // 1. Update authorized_emails
    const { error: updateEmailError } = await adminClient
      .from('authorized_emails')
      .update({
        role: roleToUpdate,
        display_name: resolvedDisplayName,
      })
      .eq('email', email);

    if (updateEmailError) {
      return jsonResponse({ error: 'Erro ao atualizar email autorizado.' }, 500);
    }

    // 2. Find user to update profile
    const existingUser = await findUserByEmail(adminClient as unknown as AdminListUsersClient, email);

    if (existingUser) {
      // 3. Update public.profiles
      const profileUpdates: { role: string; name: string } = {
        role: roleToUpdate,
        name: resolvedDisplayName,
      };

      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', existingUser.id);

      if (updateProfileError) {
        return jsonResponse({ warning: 'Email atualizado, mas perfil falhou. Verifique permissoes.' });
      }

      // 4. Update auth.users metadata (optional but good for consistency)
      const metadataUpdates: Record<string, string> = {
        role: roleToUpdate,
        name: resolvedDisplayName,
      };

      await adminClient.auth.admin.updateUserById(existingUser.id, {
        user_metadata: metadataUpdates,
      });
    }

    return jsonResponse({ ok: true });
  }

  // --- DELETE LOGIC ---
  if (req.method === 'DELETE') {
    let deletedCount = 0;

    // 1. Find user in auth.users by email
    const existingUser = await findUserByEmail(adminClient as unknown as AdminListUsersClient, email);

    // 2. Delete from auth.users if exists
    if (existingUser) {
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(existingUser.id);
      if (deleteUserError) {
        return jsonResponse({ error: `Erro ao remover conta de usuario: ${deleteUserError.message}` }, 500);
      }
      deletedCount++;
    }

    // 3. Delete from authorized_emails
    const { error: deleteEmailError } = await adminClient
      .from('authorized_emails')
      .delete()
      .eq('email', email);

    if (deleteEmailError) {
      return jsonResponse({ error: 'Erro ao remover email autorizado.' }, 500);
    }

    // Check if we deleted anything just for info (optional, delete queries usually succeed even if 0 rows)

    return jsonResponse({
      ok: true,
      message: 'Usuario removido com sucesso.',
      details: {
        authAccountRemoved: !!existingUser,
        emailRemoved: true
      }
    });
  }

  // --- POST (CREATE) LOGIC ---
  const role = typeof payload.role === 'string' ? payload.role : 'professor';
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';

  const normalizedRole = normalizeRole(role);
  const displayName = name || formatDisplayNameFromEmail(email);

  let userId: string | null = null;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: displayName,
      role: normalizedRole,
    },
  });

  if (createError) {
    const message = createError.message?.toLowerCase() ?? '';
    // Ignore "already exists" errors, we just want to ensure it's in authorized_emails and has profile
    if (!message.includes('already') && !message.includes('exists')) {
      return jsonResponse({ error: createError.message }, 400);
    }
  } else {
    userId = created?.user?.id ?? null;
  }

  const { error: upsertError } = await adminClient
    .from('authorized_emails')
    .upsert(
      { email, role: normalizedRole, display_name: displayName },
      { onConflict: 'email' },
    );

  if (upsertError) {
    return jsonResponse({ error: 'Falha ao salvar usuario autorizado.' }, 500);
  }

  if (!userId) {
    const existingUser = await findUserByEmail(adminClient as unknown as AdminListUsersClient, email);
    userId = existingUser?.id ?? null;
  }

  if (userId) {
    const { error: profileUpsertError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: userId,
          name: displayName,
          role: normalizedRole,
        },
        { onConflict: 'id' }
      );

    if (profileUpsertError) {
      return jsonResponse({
        warning: 'Usuario criado, mas nao foi possivel atualizar o perfil.',
      });
    }
  }

  return jsonResponse({ ok: true, userId, created: Boolean(created?.user?.id) });
});
