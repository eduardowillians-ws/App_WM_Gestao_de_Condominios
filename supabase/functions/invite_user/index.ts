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

    const validRoles = ['admin', 'manager', 'resident'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ success: false, error: "Role inválida." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Gerar uma senha temporária aleatória
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase() + "!";
    
    // Determina a URL base para o link do WhatsApp
    let origin = Deno.env.get('PUBLIC_APP_URL') || req.headers.get('origin') || 'https://app-wm-gestao-de-condominios.vercel.app';
    if (origin.endsWith('/')) origin = origin.slice(0, -1);

    console.log(`Criando usuário: ${email} com cargo ${role}`);

    // Criar o usuário diretamente (Bypass no limite de convite por e-mail)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: role,
        unit: unit
      }
    });

    if (createError) {
      console.error("Erro ao criar usuário:", createError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: createError.message.includes('already registered') ? "Este e-mail já está em uso!" : createError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const userId = userData.user.id;

    // Criar ou Atualizar perfil na tabela profiles
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: name || email,
        role: role,
        unit: unit || null,
        updated_at: new Date().toISOString(),
      });

    if (profileUpdateError) {
      console.warn("Aviso: Usuário criado, mas falha no perfil:", profileUpdateError);
    }

    const roleLabels: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Zelador/Gestor',
      resident: 'Morador'
    };
    const roleLabel = roleLabels[role] || role;

    return new Response(JSON.stringify({
      success: true,
      message: `Usuário criado com sucesso!`,
      data: {
        userId: userId,
        tempPassword: tempPassword,
        email: email,
        loginLink: origin,
        roleLabel: roleLabel
      }
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