import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Debug das variáveis
    console.log('ENV CHECK:', { 
      url: supabaseUrl ? 'OK' : 'MISSING',
      anonKey: supabaseAnonKey ? 'OK' : 'MISSING', 
      serviceKey: supabaseServiceKey ? 'OK' : 'MISSING'
    });

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Configuração missing - variáveis de ambiente não encontradas" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, name, unit, role } = await req.json();
    
    if (!email || !role) {
      return new Response(JSON.stringify({ success: false, error: "Email e role são obrigatórios" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const validRoles = ['manager', 'resident'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ success: false, error: "Role inválida" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Sem token de autorização" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Validating token...');
    
    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Auth error:', authError);
      return new Response(JSON.stringify({ success: false, error: "Token inválido: " + authError?.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    console.log('User authenticated:', user.id);

    // Verifica role no perfil
    const { data: profile } = await supabasePublic
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Profile role:', profile?.role);

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: "Usuário não é admin" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Convida usuário
    const origin = req.headers.get('origin') || 'https://app-wm-gestao-de-condominios.vercel.app';
    const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    console.log('Inviting:', email);
    
    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: cleanOrigin
    });

    if (inviteError) {
      console.log('Invite error:', inviteError);
      return new Response(JSON.stringify({ success: false, error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Falha ao criar usuário" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const userId = userData.user.id;
    await supabaseAdmin.from('profiles').update({ name: name || email, unit: unit || null, role }).eq('id', userId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: role === 'manager' ? 'Zelador convidado!' : 'Morador convidado!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.log('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});