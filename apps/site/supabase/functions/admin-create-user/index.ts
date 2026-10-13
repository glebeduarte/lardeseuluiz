import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify calling user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin");
    if (!roleCheck?.length) throw new Error("Admin access required");

    const { email, password, full_name, role } = await req.json();
    if (!email || !password) throw new Error("Email and password required");

    // Create user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });
    if (createError) throw createError;

    // Assign role
    if (role && newUser.user) {
      await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
