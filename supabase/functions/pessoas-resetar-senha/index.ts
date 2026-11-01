import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Redefine a senha de uma pessoa a partir da Governança (Pessoas). Mesma regra da Equipe do Atendimento:
// gera uma senha provisória diferente para cada pessoa, mostrada só a quem pediu, e obriga a pessoa a
// criar uma senha nova no próximo acesso. Só administradores ou gestores da Governança podem chamar.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Erros voltam com status 200 e { error }, para o app mostrar a mensagem (o invoke esconde o corpo em respostas 4xx/5xx).
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function senhaProvisoria() {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "Lsl-" + Array.from(bytes, (b) => letras[b % letras.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Entre na plataforma para redefinir senhas." });
    const url = Deno.env.get("SUPABASE_URL")!;
    const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gov = createClient(url, chave, { db: { schema: "governanca" } });

    const { data: quem, error: quemErr } = await gov.auth.getUser(auth.replace("Bearer ", ""));
    if (quemErr || !quem?.user) return json({ error: "Sessão expirada. Entre de novo." });
    const { data: papeisQuem } = await gov.from("user_roles").select("role").eq("user_id", quem.user.id);
    const pode = (papeisQuem ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "gestor");
    if (!pode) return json({ error: "Só administradores ou gestores podem redefinir senhas." });

    const { person_id } = await req.json();
    if (!person_id) return json({ error: "Pessoa não informada." });
    const { data: pessoa, error: pErr } = await gov.from("people").select("id, full_name, email, user_id").eq("id", person_id).single();
    if (pErr || !pessoa) return json({ error: "Pessoa não encontrada." });
    if (!pessoa.user_id) return json({ error: "Esta pessoa ainda não tem login. Crie o acesso pelo painel de acessos." });

    const senha = senhaProvisoria();
    const { data: atualizado, error } = await gov.auth.admin.updateUserById(pessoa.user_id, { password: senha, app_metadata: { must_change_password: true } });
    if (error) return json({ error: error.message });

    // Obriga a troca no próximo acesso, nas áreas que guardam essa marca.
    for (const schema of ["atendimento", "formacao"]) {
      await createClient(url, chave, { db: { schema } })
        .from("profiles").update({ must_change_password: true }).eq("id", pessoa.user_id);
    }

    return json({ ok: true, email: atualizado.user.email ?? pessoa.email, nome: pessoa.full_name, senha });
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) });
  }
});
