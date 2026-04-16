import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Cliente com service role (para operações admin)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── Validação manual do JWT do chamador ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token de autenticação ausente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Cria cliente com o token do usuário chamador para verificar identidade
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Verifica se o chamador tem role 'admin' na tabela profiles
    const { data: profile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileCheckError || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Acesso negado. Apenas administradores podem convidar usuários.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    // ── Fim da validação ──

    const { email, name, unit, role } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ success: false, error: "Email e role são obrigatórios" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const validRoles = ['manager', 'resident'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ success: false, error: "Role inválida. Use manager ou resident" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let origin = req.headers.get('origin') || 'http://localhost:3000';
    if (origin.endsWith('/')) {
      origin = origin.slice(0, -1);
    }

    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: origin
    });

    if (inviteError) {
      return new Response(JSON.stringify({ success: false, error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!userData || !userData.user) {
      return new Response(JSON.stringify({ success: false, error: "Usuário não foi criado. Provavelmente já existe!" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const userId = userData.user.id;

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ name: name || email, unit: unit || null, role: role })
      .eq('id', userId);

    if (profileUpdateError) {
      console.warn("Aviso: Convite enviado, mas falha ao atualizar o perfil:", profileUpdateError);
    }

    const roleLabel = role === 'manager' ? 'Zelador/Gestor' : 'Morador';

    return new Response(JSON.stringify({
      success: true,
      message: `${roleLabel} convidado com sucesso!`,
      user: userData.user
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});