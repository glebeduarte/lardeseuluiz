import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, email } = await req.json();
    if (!token || !email) {
      return new Response(JSON.stringify({ error: "Token e e-mail são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: "formacao" } });

    // Verify link exists and not expired
    const { data: link, error: linkError } = await supabase
      .from("attendance_links")
      .select("id, lesson_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: "Link não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "expired", message: "O período de registro de presença encerrou." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "E-mail não encontrado na plataforma. Verifique se está utilizando o mesmo e-mail do cadastro.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("lesson_id", link.lesson_id)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "duplicate",
          message: "Sua presença já foi confirmada nesta aula!",
          name: profile.full_name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IP for audit
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    // Insert attendance record
    const { error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        link_id: link.id,
        lesson_id: link.lesson_id,
        user_id: profile.id,
        ip_address: ip,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao registrar presença" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Presença confirmada com sucesso!",
        name: profile.full_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
