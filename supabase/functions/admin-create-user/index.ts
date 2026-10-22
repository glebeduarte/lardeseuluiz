import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Cria o acesso (login) de uma pessoa a partir da Governança: Pessoas › Criar acesso e Usuários › Convidar.
// Só administradores ou gestores da Governança podem chamar. A conta já nasce confirmada, com a senha inicial
// informada, e é ligada ao cadastro da pessoa pelo e-mail. Se o e-mail já tiver conta, só acrescenta o papel.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Erros voltam com status 200 e { error }, para o app mostrar a mensagem (o invoke esconde o corpo em respostas 4xx/5xx).
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PAPEIS = ["admin", "gestor", "trabalhador", "aluno"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Entre na plataforma para criar acessos." });
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "governanca" } });

    const { data: quem, error: quemErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (quemErr || !quem?.user) return json({ error: "Sessão expirada. Entre de novo." });
    const { data: papeisQuem } = await admin.from("user_roles").select("role").eq("user_id", quem.user.id);
    const pode = (papeisQuem ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "gestor");
    if (!pode) return json({ error: "Só administradores ou gestores podem criar acessos." });

    const corpo = await req.json();
    const email = String(corpo.email ?? "").trim().toLowerCase();
    const senha = String(corpo.password ?? "");
    const nome = String(corpo.full_name ?? "").trim();
    const papel = PAPEIS.includes(corpo.role) ? corpo.role : "trabalhador";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Informe um e-mail válido." });
    if (senha.length < 6) return json({ error: "A senha inicial precisa ter pelo menos 6 caracteres." });
    if (papel === "admin" && !(papeisQuem ?? []).some((r: { role: string }) => r.role === "admin")) {
      return json({ error: "Só um administrador pode criar outro administrador." });
    }

    // Conta nova ou já existente com o mesmo e-mail
    let userId: string | null = null;
    let jaExistia = false;
    const criado = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true,
      user_metadata: { full_name: nome, nome, must_change_password: true },
    });
    if (criado.error) {
      const msg = String(criado.error.message || "").toLowerCase();
      if (!msg.includes("already") && !msg.includes("registered") && !msg.includes("exists")) throw criado.error;
      for (let page = 1; page <= 20 && !userId; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const u = data?.users?.find((x) => x.email?.toLowerCase() === email);
        if (u) userId = u.id;
        if (!data?.users?.length) break;
      }
      if (!userId) throw criado.error;
      jaExistia = true;
    } else {
      userId = criado.data.user!.id;
    }

    // Papel na Governança (sem duplicar)
    // Quem administra ou gere também é voluntário (trabalhador), como nas contas que já existem.
    const papeis = papel === "admin" || papel === "gestor" ? [papel, "trabalhador"] : [papel];
    for (const p of papeis) {
      const { data: tem } = await admin.from("user_roles").select("id").eq("user_id", userId).eq("role", p).maybeSingle();
      if (!tem) {
        const { error } = await admin.from("user_roles").insert({ user_id: userId, role: p });
        if (error) throw error;
      }
    }

    // Liga a conta ao cadastro da pessoa pelo e-mail, se ainda não estiver ligada
    await admin.from("people").update({ user_id: userId }).ilike("email", email).is("user_id", null);

    return json({
      ok: true, user_id: userId, ja_existia: jaExistia,
      mensagem: jaExistia ? "Essa pessoa já tinha conta. O papel foi acrescentado e a senha não foi alterada." : "Acesso criado.",
    });
  } catch (e) {
    return json({ error: `Não foi possível criar o acesso: ${e instanceof Error ? e.message : String(e)}` });
  }
});
