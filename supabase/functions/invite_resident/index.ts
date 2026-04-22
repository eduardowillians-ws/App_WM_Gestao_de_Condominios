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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token de autenticação ausente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
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

    const { data: profile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('unit, block_id, can_invite, role, parent_id')
      .eq('id', user.id)
      .single();

    if (profileCheckError || !profile) {
      return new Response(JSON.stringify({ success: false, error: 'Perfil não encontrado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const canInvite = profile.role === 'admin' || profile.role === 'manager' || profile.role === 'resident' || profile.can_invite === true;
    
    if (!canInvite) {
      return new Response(JSON.stringify({ success: false, error: 'Você não tem permissão para criar familiares.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { email, name, phone } = await req.json();
    const unit = profile.unit;
    const block_id = profile.block_id;

    if (!email || !name) {
      return new Response(JSON.stringify({ success: false, error: "Email e nome são obrigatórios" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase() + "!";
    let origin = Deno.env.get('PUBLIC_APP_URL') || req.headers.get('origin') || 'https://app-wm-gestao-de-condominios.vercel.app';
    if (origin.endsWith('/')) origin = origin.slice(0, -1);

    console.log(`Iniciando criação de usuário familiar: ${email} para o morador ${user.id}`);

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: name,
        role: 'familiar',
        phone: phone || '',
        unit: unit,
        block_id: block_id
      }
    });

    if (createError) {
      console.error("Erro no auth.admin.createUser:", createError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: createError.message.includes('already registered') ? "Este e-mail já está em uso!" : createError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const userId = userData.user.id;
    console.log(`Usuário Auth criado com sucesso ID: ${userId}. Agora vinculando ao morador ${user.id}...`);

    // Atualizar perfil na tabela profiles e vincular ao morador (parent_id)
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        name: name || email,
        role: 'familiar',
        phone: phone || null,
        unit: unit,
        block_id: block_id,
        status: 'active',
        can_invite: false,
        parent_id: user.id, // VINCULO CRITICO
        updated_at: new Date().toISOString(),
      });

    if (profileUpdateError) {
      console.error("Erro CRITICO ao atualizar perfil na tabela profiles:", profileUpdateError);
    } else {
      console.log("Perfil na tabela 'profiles' atualizado com sucesso como 'familiar'.");
    }

    // Salvar convite na tabela invites para rastreamento
    let inviteSaved = false;
    try {
      const { error: inviteRecordError } = await supabaseAdmin
        .from('invites')
        .upsert({
          id: userId,
          email: email,
          name: name || email,
          phone: phone || null,
          unit: unit || null,
          block_id: block_id || null,
          role: 'familiar',
          invited_by: user.id,
          temp_password: tempPassword,
          status: 'pending',
          created_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      if (inviteRecordError) {
         console.warn("Aviso: Convite não salvo na tabela invites:", inviteRecordError.message);
      } else {
         inviteSaved = true;
         console.log("Convite registrado na tabela 'invites'.");
      }
    } catch (inviteErr) {
       console.warn("Aviso: Falha ao acessar tabela invites:", inviteErr);
    }

    return new Response(JSON.stringify({
      success: true,
      invite_recorded: inviteSaved,
      data: {
        userId: userId,
        tempPassword: tempPassword,
        email: email,
        phone: phone,
        loginLink: origin,
        roleLabel: 'Familiar/Dependente'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro global na função invite_resident:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});