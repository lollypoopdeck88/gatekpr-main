import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the specific invite by token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('resident_invites')
      .select('id, hoa_id, house_number, street_name, city, state, zip_code, email, expires_at, used_at')
      .eq('invite_token', token)
      .maybeSingle();

    if (inviteError) {
      console.error('Error fetching invite:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate invite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invite) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid invite link' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invite.used_at) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This invite has already been used' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This invite has expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch HOA info
    const { data: hoa } = await supabaseAdmin
      .from('hoas')
      .select('id, name')
      .eq('id', invite.hoa_id)
      .maybeSingle();

    // Return validated invite data (without exposing the token)
    return new Response(
      JSON.stringify({
        valid: true,
        invite: {
          id: invite.id,
          hoa_id: invite.hoa_id,
          house_number: invite.house_number,
          street_name: invite.street_name,
          city: invite.city,
          state: invite.state,
          zip_code: invite.zip_code,
          email: invite.email,
        },
        hoa: hoa || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating invite:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to validate invite' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
