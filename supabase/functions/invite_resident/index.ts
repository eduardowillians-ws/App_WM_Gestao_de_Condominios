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

    const canInvite = profile.role === 'admin' || profile.role === 'manager' || profile.can_invite === true;
    
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

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: name,
        role: 'resident',
        phone: phone,
        unit: unit,
        block_id: block_id
      }
    });

    if (createError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: createError.message.includes('already registered') ? "Este e-mail já está em uso!" : createError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const userId = userData.user.id;

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        name: name,
        role: 'resident',
        phone: phone || null,
        unit: unit,
        block_id: block_id,
        status: 'active',
        parent_id: user.id,
        can_invite: true,
        updated_at: new Date().toISOString(),
      });

    if (profileUpdateError) {
      console.error("Erro ao atualizar perfil:", profileUpdateError);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        userId: userId,
        tempPassword: tempPassword,
        email: email,
        phone: phone,
        loginLink: origin,
        name: name,
        unit: unit
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});