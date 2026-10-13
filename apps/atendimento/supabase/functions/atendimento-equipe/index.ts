// Equipe do Atendimento na plataforma unificada (substitui as server functions do sistema original).
// Só administradores do Atendimento podem usar, exceto "concluirTrocaSenha", que vale para a própria conta.
//
// Correções em relação ao original:
//  - não existe mais senha padrão pública: redefinir senha gera uma senha provisória diferente para cada pessoa;
//  - com o login único, quem já tem conta na plataforma recebe os papéis do Atendimento sem criar outra conta;
//  - "remover" tira a pessoa do Atendimento (papéis, macas, acesso), mas não apaga a conta, que vale para as outras áreas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PAPEIS = ["admin", "dialogador", "recepcao", "medium"];

function senhaProvisoria() {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "Lsl-" + Array.from(bytes, (b) => letras[b % letras.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "atendimento" } });

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: quem } = await admin.auth.getUser(token);
    if (!quem?.user) return json({ error: "Não autorizado" }, 401);
    const eu = quem.user.id;

    const { acao, data } = await req.json();

    if (acao === "concluirTrocaSenha") {
      const { error } = await admin.from("profiles").update({ must_change_password: false }).eq("id", eu);
      if (error) throw error;
      return json({ ok: true });
    }

    const { data: ehAdmin } = await admin.rpc("is_admin", { _user_id: eu });
    if (ehAdmin !== true) return json({ error: "Não autorizado" }, 403);

    async function contaPorEmail(email: string) {
      for (let page = 1; page < 50; page++) {
        const { data: lista, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        const u = lista.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
        if (u || lista.users.length < 1000) return u ?? null;
      }
      return null;
    }

    async function criarUm(u: { nome: string; email: string; telefone?: string; data_nascimento?: string; como_chamar?: string; senha: string; roles: string[] }) {
      if (!u?.nome || !u?.email || !Array.isArray(u.roles) || u.roles.some((r) => !PAPEIS.includes(r))) throw new Error("Dados inválidos");
      let conta = await contaPorEmail(u.email);
      if (!conta) {
        if (!u.senha || u.senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres");
        const { data: criada, error } = await admin.auth.admin.createUser({
          email: u.email, password: u.senha, email_confirm: true, user_metadata: { nome: u.nome, full_name: u.nome, como_chamar: u.como_chamar },
        });
        if (error) throw new Error(error.message);
        conta = criada.user;
      }
      const { error: pErr } = await admin.from("profiles").upsert({
        id: conta.id, nome: u.nome, email: u.email, telefone: u.telefone, data_nascimento: u.data_nascimento || null,
        como_chamar: u.como_chamar, ativo: true,
      });
      if (pErr) throw new Error(pErr.message);
      const linhas = Array.from(new Set(u.roles)).map((role) => ({ user_id: conta!.id, role }));
      const { error: rErr } = await admin.from("user_roles").upsert(linhas, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (rErr) throw new Error(rErr.message);
      return { userId: conta.id, email: u.email };
    }

    switch (acao) {
      case "criarUsuario":
        return json(await criarUm(data));

      case "importarUsuarios": {
        const sucesso: string[] = [];
        const erros: { email: string; erro: string }[] = [];
        for (const u of (data?.usuarios ?? []).slice(0, 500)) {
          try { await criarUm(u); sucesso.push(u.email); } catch (e) { erros.push({ email: u?.email, erro: (e as Error).message }); }
        }
        return json({ sucesso, erros });
      }

      case "atualizarTelefone": {
        const { error } = await admin.from("profiles").update({ telefone: data.telefone }).eq("id", data.user_id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "definirAtivoUsuario": {
        if (data.user_id === eu && !data.ativo) return json({ error: "Você não pode desativar a si mesmo." }, 400);
        const { error } = await admin.from("profiles").update({ ativo: !!data.ativo }).eq("id", data.user_id);
        if (error) throw error;
        if (!data.ativo) await admin.from("user_roles").delete().eq("user_id", data.user_id);
        return json({ ok: true });
      }

      case "removerUsuario": {
        if (data.user_id === eu) return json({ error: "Você não pode remover a si mesmo." }, 400);
        await admin.from("user_roles").delete().eq("user_id", data.user_id);
        await admin.from("maca_mediuns").delete().eq("user_id", data.user_id);
        const { error } = await admin.from("profiles").update({ ativo: false }).eq("id", data.user_id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "resetarSenhaUsuario": {
        const sucesso: string[] = [];
        const erros: { user_id: string; erro: string }[] = [];
        const senhas: Record<string, string> = {};
        for (const id of (data?.user_ids ?? []).slice(0, 500)) {
          try {
            const senha = senhaProvisoria();
            const { data: atualizado, error } = await admin.auth.admin.updateUserById(id, { password: senha });
            if (error) throw new Error(error.message);
            await admin.from("profiles").update({ must_change_password: true }).eq("id", id);
            senhas[atualizado.user.email ?? id] = senha;
            sucesso.push(id);
          } catch (e) { erros.push({ user_id: id, erro: (e as Error).message }); }
        }
        return json({ sucesso, erros, senhas });
      }

      case "criarUsuarioMedium": {
        const r = await criarUm({ nome: data.nome, email: data.email, senha: data.senha, roles: ["medium"] });
        const { error } = await admin.from("maca_mediuns").upsert({ maca_id: data.maca_id, user_id: r.userId }, { onConflict: "maca_id,user_id", ignoreDuplicates: true });
        if (error) throw error;
        return json({ userId: r.userId, nome: data.nome, email: data.email });
      }

      default:
        return json({ error: "Ação desconhecida" }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 500);
  }
});
