import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_ACCOUNTS = [
  {
    email: "superadmin@gatekpr.test",
    password: "TestPass123!",
    name: "Super Admin User",
    role: "super_admin",
    hoa_id: null,
  },
  {
    email: "hoaadmin@gatekpr.test",
    password: "TestPass123!",
    name: "HOA Admin User",
    role: "admin",
    hoa_id: "11111111-1111-1111-1111-111111111111",
  },
  {
    email: "resident@gatekpr.test",
    password: "TestPass123!",
    name: "Test Resident",
    role: "resident",
    hoa_id: "11111111-1111-1111-1111-111111111111",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is super admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        throw new Error("Invalid authentication");
      }

      const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", {
        _user_id: user.id,
      });

      if (!isSuperAdmin) {
        throw new Error("Only super admins can create test accounts");
      }
    }

    const results: Array<{ email: string; success: boolean; message: string }> = [];

    for (const account of TEST_ACCOUNTS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === account.email);

        if (existingUser) {
          results.push({
            email: account.email,
            success: true,
            message: "Account already exists",
          });
          continue;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        });

        if (authError) {
          throw authError;
        }

        const userId = authData.user.id;

        // Create profile
        const { error: profileError } = await supabaseAdmin.from("profiles").insert({
          user_id: userId,
          email: account.email,
          name: account.name,
          hoa_id: account.hoa_id,
          status: "active",
          house_number: account.role === "resident" ? "100" : null,
          street_name: account.role === "resident" ? "Test Street" : null,
          city: account.role === "resident" ? "Test City" : null,
          state: account.role === "resident" ? "CA" : null,
          zip_code: account.role === "resident" ? "90210" : null,
        });

        if (profileError) {
          console.error("Profile error:", profileError);
        }

        // Create role
        const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
          user_id: userId,
          role: account.role,
        });

        if (roleError) {
          console.error("Role error:", roleError);
        }

        results.push({
          email: account.email,
          success: true,
          message: "Account created successfully",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({
          email: account.email,
          success: false,
          message,
        });
      }
    }

    return new Response(JSON.stringify({
      message: "Test accounts processed",
      accounts: results,
      credentials: TEST_ACCOUNTS.map(a => ({
        email: a.email,
        password: a.password,
        role: a.role,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating test accounts:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
