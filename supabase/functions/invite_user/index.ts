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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, name, unit, role } = await req.json();
    
    if (!email || !role) {
      return new Response(JSON.stringify({ success: false, error: "Email e role são obrigatórios" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const validRoles = ['manager', 'resident'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ success: false, error: "Role inválida. Use manager ou resident" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let origin = req.headers.get('origin') || 'http://localhost:3000';
    if (origin.endsWith('/')) {
        origin = origin.slice(0, -1);
    }

    const { data: userData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
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

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ name: name || email, unit: unit || null, role: role })
      .eq('id', userId);

    if (profileError) {
      console.warn("Aviso: Convite enviado, mas falha ao atualizar o perfil:", profileError);
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
      status: 200,
    });
  }
});