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

    // Verificar autenticação via token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Token ausente.' }), { headers: corsHeaders, status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado.' }), { headers: corsHeaders, status: 401 });
    }

    // Verificar se o autor do convite existe no sistema
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('unit, block_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ success: false, error: 'Perfil do morador não encontrado.' }), { headers: corsHeaders, status: 403 });
    }

    const canInvite = profile.role === 'admin' || profile.role === 'manager' || profile.role === 'resident';
    if (!canInvite) {
      return new Response(JSON.stringify({ success: false, error: 'Você não tem permissão para convidar familiares.' }), { headers: corsHeaders, status: 403 });
    }

    // Receber dados do convidado
    const { email, name, phone } = await req.json();
    if (!email || !name) {
      return new Response(JSON.stringify({ success: false, error: 'Email e nome são obrigatórios.' }), { headers: corsHeaders, status: 400 });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase() + "!";
    let origin = Deno.env.get('PUBLIC_APP_URL') || req.headers.get('origin') || 'https://app-wm-gestao-de-condominios.vercel.app';
    if (origin.endsWith('/')) origin = origin.slice(0, -1);

    console.log(`Criando familiar: ${email} vinculado ao morador ${user.id}`);

    // Criar usuário no Supabase Auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        name, 
        role: 'familiar', 
        phone: phone || '', 
        unit: profile.unit, 
        block_id: profile.block_id 
      }
    });

    if (createError) {
      console.error("Erro ao criar familiar no Auth:", createError.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: createError.message.includes('already registered') ? "Este e-mail já está em uso." : createError.message 
      }), { headers: corsHeaders, status: 200 });
    }

    const userId = userData.user.id;

    // SALVAR PERFIL DO FAMILIAR
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: email, // Agora garantido pela migration 033
      name: name,
      role: 'familiar',
      phone: phone || null,
      unit: profile.unit,
      block_id: profile.block_id,
      status: 'active',
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Erro ao salvar perfil do familiar:", profileError.message);
    }

    // SALVAR NA TABELA INVITES
    try {
      await supabaseAdmin.from('invites').upsert({
        id: userId,
        email,
        name,
        phone: phone || null,
        unit: profile.unit,
        block_id: profile.block_id,
        role: 'familiar',
        invited_by: user.id,
        temp_password: tempPassword,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, { onConflict: 'email' });
    } catch (e) {
      console.warn("Aviso ao salvar histórico de convite:", e.message);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        userId,
        tempPassword,
        email,
        phone,
        loginLink: origin,
        roleLabel: 'Familiar/Dependente'
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error("Erro global na função invite_resident:", error.message);
    return new Response(JSON.stringify({ success: false, error: 'Erro interno ao processar convite familiar.' }), { headers: corsHeaders, status: 500 });
  }
});