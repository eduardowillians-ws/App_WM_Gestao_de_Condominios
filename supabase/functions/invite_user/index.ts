import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Zelador/Gestor',
    resident: 'Morador',
    familiar: 'Familiar/Dependente'
  };
  return labels[role] || role;
}

serve(async (req) => {
  console.log("--- INÍCIO DA FUNÇÃO INVITE_USER ---");
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas.");
      return new Response(JSON.stringify({ success: false, error: 'Erro de configuração no servidor.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("ERRO: Header Authorization não encontrado na requisição.");
      return new Response(JSON.stringify({ success: false, error: 'Token de autenticação ausente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificação robusta do usuário usando a chave de serviço para validar o token
    console.log("Validando token do usuário...");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("ERRO de Autenticação Supabase:", userError?.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Usuário não autenticado ou sessão expirada.',
        details: userError?.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    console.log(`Usuário autenticado: ${user.email} (ID: ${user.id})`);

    // Verificar perfil do autor
    const { data: profile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileCheckError || !profile) {
      console.error("ERRO: Perfil do autor não encontrado no banco de dados.", profileCheckError);
      return new Response(JSON.stringify({ success: false, error: 'Seu perfil de usuário não foi encontrado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    console.log(`Papel do autor: ${profile.role}`);

    // Permitir admin ou manager
    if (profile.role !== 'admin' && profile.role !== 'manager') {
      console.error(`ERRO: Usuário com papel ${profile.role} tentou realizar convite.`);
      return new Response(JSON.stringify({ success: false, error: 'Acesso negado. Apenas administradores podem convidar.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const body = await req.json();
    const { email, name, phone, role, unit } = body;
    console.log(`Dados recebidos para convite: Email=${email}, Role=${role}`);

    if (!email || !role) {
      return new Response(JSON.stringify({ success: false, error: "Email e papel são obrigatórios" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase() + "!";
    let origin = Deno.env.get('PUBLIC_APP_URL') || req.headers.get('origin') || 'https://app-wm-gestao-de-condominios.vercel.app';
    if (origin.endsWith('/')) origin = origin.slice(0, -1);

    // Criar usuário no Auth
    console.log(`Criando usuário auth para ${email}...`);
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Confirmar direto para evitar problemas de redirect/verificação
      user_metadata: {
        name: name,
        role: role,
        phone: phone || '',
        unit: unit || '',
      }
    });

    if (createError) {
      console.error("ERRO ao criar usuário no Auth:", createError);
      
      const isRateLimit = createError.status === 429 || createError.message.includes('rate limit');
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: isRateLimit ? 'Limite de e-mails do Supabase atingido. Tente em breve.' : (createError.message.includes('already registered') ? "Este e-mail já possui cadastro!" : createError.message)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const userId = userData.user.id;
    console.log(`Usuário auth criado com sucesso: ${userId}`);

    // Upsert no Perfil - Removendo colunas que podem não existir ainda no banco do usuário
    console.log(`Atualizando perfil para o usuário ${userId}...`);
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        name: name || email.split('@')[0], // Nome é NOT NULL
        role: role,
        email: email, // Agora garantido pela nova migration
        phone: phone || null,
        unit: unit || null,
        status: 'active',
        updated_at: new Date().toISOString(),
      });

    if (profileUpdateError) {
      console.error("ERRO CRÍTICO ao atualizar tabela profiles:", profileUpdateError.message);
      // Não retornamos erro aqui para não interromper o fluxo se o Auth já foi criado,
      // mas o log ajudará a identificar se a migration 033 foi aplicada.
    } else {
      console.log("Perfil atualizado com sucesso.");
    }

    // Registrar na tabela de convites
    try {
      const { error: inviteRecordError } = await supabaseAdmin
        .from('invites')
        .upsert({
          id: userId,
          email: email,
          name: name || email,
          phone: phone || null,
          unit: unit || null,
          role: role,
          invited_by: user.id,
          temp_password: tempPassword,
          status: 'pending',
          created_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      if (inviteRecordError) {
        console.warn("AVISO: Falha ao registrar na tabela invites:", inviteRecordError.message);
      }
    } catch (inviteErr) {
       console.warn("AVISO: Tabela invites não acessível ou erro de schema:", inviteErr);
    }

    console.log("--- FINALIZAÇÃO BEM SUCEDIDA DA FUNÇÃO ---");

    return new Response(JSON.stringify({
      success: true,
      data: {
        userId: userId,
        tempPassword: tempPassword,
        email: email,
        phone: phone,
        loginLink: origin,
        roleLabel: getRoleLabel(role)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("ERRO CRÍTICO GLOBAL:", error);
    return new Response(JSON.stringify({ success: false, error: 'Erro interno no servidor de convites.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});