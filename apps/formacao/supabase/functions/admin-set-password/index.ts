import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Correção de segurança da plataforma unificada: a versão antiga não conferia quem chamava
// (qualquer pessoa podia trocar a senha de qualquer conta) e permitia redefinir todas as senhas de uma vez.
// Agora só um administrador da Formação logado pode definir a senha de uma conta, e a redefinição em massa foi removida.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "formacao" } });

    const { data: quem, error: quemErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (quemErr || !quem?.user) return json({ error: "Unauthorized" }, 401);
    const { data: ehAdmin } = await admin.rpc("is_admin", { user_id: quem.user.id });
    if (ehAdmin !== true) return json({ error: "Forbidden - Admin access required" }, 403);

    const { email, password, resetAll } = await req.json();
    if (resetAll === true) return json({ error: "A redefinição de todas as senhas foi desativada por segurança." }, 400);
    if (!email || !password || String(password).length < 8) return json({ error: "Informe o e-mail e uma senha com pelo menos 8 caracteres." }, 400);

    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;
    const user = list.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (!user) return json({ error: "user not found" }, 404);
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
    return json({ ok: true, id: user.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
