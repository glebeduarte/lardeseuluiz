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
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: "formacao" } });

    // Find link by token
    const { data: link, error: linkError } = await supabase
      .from("attendance_links")
      .select("id, lesson_id, expires_at, created_at, redirect_url")
      .eq("token", token)
      .maybeSingle();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: "Link não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "expired", message: "O período de registro de presença encerrou." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get lesson info with module and course
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, order_index, module_id")
      .eq("id", link.lesson_id)
      .maybeSingle();

    if (!lesson) {
      return new Response(JSON.stringify({ error: "Aula não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get module info
    const { data: module } = await supabase
      .from("modules")
      .select("title, course_id")
      .eq("id", lesson.module_id)
      .maybeSingle();

    let courseName = "ESDE";
    if (module) {
      const { data: course } = await supabase
        .from("courses")
        .select("title")
        .eq("id", module.course_id)
        .maybeSingle();
      if (course) courseName = course.title;
    }

    return new Response(
      JSON.stringify({
        link_id: link.id,
        lesson_id: link.lesson_id,
        lesson_title: lesson.title,
        lesson_order: lesson.order_index,
        course_name: courseName,
        expires_at: link.expires_at,
        redirect_url: (link as any).redirect_url ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
