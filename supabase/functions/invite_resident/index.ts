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

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Token ausente.' }), { headers: corsHeaders, status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado.' }), { headers: corsHeaders, status: 401 });
    }

    // Verificar se pode convidar
    const { data: profile } = await supabaseAdmin.from('profiles').select('unit, block_id, role').eq('id', user.id).single();
    if (!profile) {
      return new Response(JSON.stringify({ success: false, error: 'Perfil não encontrado.' }), { headers: corsHeaders, status: 403 });
    }

    const canInvite = profile.role === 'admin' || profile.role === 'manager' || profile.role === 'resident';
    if (!canInvite) {
      return new Response(JSON.stringify({ success: false, error: 'Sem permissão.' }), { headers: corsHeaders, status: 403 });
    }

    // Receber dados
    const { email, name, phone } = await req.json();
    if (!email || !name) {
      return new Response(JSON.stringify({ success: false, error: 'Email e nome são obrigatórios.' }), { headers: corsHeaders, status: 400 });
    }

    // Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase() + "!";
    const origin = Deno.env.get('PUBLIC_APP_URL') || req.headers.get('origin') || 'https://app-wm-gestao-de-condominios.vercel.app';

    console.log(`Criando familiar: ${email} vinculado ao morador ${user.id}`);

    // Criar usuário no Supabase Auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: { name, role: 'familiar', phone: phone || '', unit: profile.unit, block_id: profile.block_id }
    });

    if (createError) {
      console.error("Erro ao criar usuário:", createError);
      return new Response(JSON.stringify({ success: false, error: createError.message }), { headers: corsHeaders, status: 200 });
    }

    // Marcar email como confirmado
    try {
      await supabaseAdmin.auth.admin.updateUserById(userData.user.id, { email_confirm: true });
    } catch (e) {
      console.warn("Aviso ao marcar email:", e);
    }

    const userId = userData.user.id;
    const moradorId = user.id;

    // SALVAR PERFIL com parent_id (vínculo)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      name: name || email,
      role: 'familiar',
      phone: phone || null,
      unit: profile.unit,
      block_id: profile.block_id,
      status: 'active',
      can_invite: false,
      parent_id: moradorId,
    });

    if (profileError) {
      console.error("Erro ao salvar perfil:", profileError);
    }

    // SALVAR NA TABELA INVITES
    try {
      await supabaseAdmin.from('invites').upsert({
        id: userId,
        email,
        name: name || email,
        phone: phone || null,
        unit: profile.unit,
        block_id: profile.block_id,
        role: 'familiar',
        invited_by: moradorId,
        temp_password: tempPassword,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, { onConflict: 'email' });
    } catch (e) {
      console.warn("Aviso ao salvar convite:", e);
    }

    // Retornar dados para WhatsApp
    return new Response(JSON.stringify({
      success: true,
      data: {
        userId,
        tempPassword,
        email,
        phone,
        loginLink: origin.replace(/\/$/, ''),
        roleLabel: 'Familiar/Dependente'
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error("Erro global:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: corsHeaders, status: 500 });
  }
});