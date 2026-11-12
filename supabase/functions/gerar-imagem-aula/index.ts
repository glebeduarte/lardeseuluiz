import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Gera o FUNDO em aquarela da arte de uma aula do ESDE, a partir do tema, com a IA de imagens da OpenAI.
// O fundo vem sem nenhum texto: título, referência ESDE e logo são desenhados por cima no app,
// para a tipografia ficar igual em todas as artes. Só administradores da Formação podem chamar.
// Segredo necessário no Supabase: OPENAI_API_KEY.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Erros voltam com status 200 e { error }, para o app mostrar a mensagem.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function montarPrompt(tema: string, modulo: string, ideia: string) {
  return [
    `Ilustração de fundo para a capa de uma aula de estudo espírita (Doutrina Espírita, Allan Kardec).`,
    `Tema da aula: "${tema}"${modulo ? ` (${modulo})` : ""}.`,
    ideia ? `Direção visual pedida pelo facilitador: ${ideia}.` : "",
    `Estilo: pintura em aquarela impressionista sobre papel texturizado, pinceladas soltas, manchas e respingos de tinta,`,
    `bordas que se dissolvem no papel, luz suave. Escolha a cena ou a composição simbólica que melhor representa o tema:`,
    `pode ser uma cena com pessoas comuns em situações afetivas e cotidianas, ou uma composição abstrata e cósmica, conforme o tema pedir.`,
    `Paleta harmoniosa puxando para azul royal, azul petróleo, dourado suave e toques quentes.`,
    `Composição quadrada. Deixe a faixa central horizontal e o topo com menos detalhe e tons médios,`,
    `porque um título grande em letras brancas será colocado no centro e um texto no topo.`,
    `Deixe a parte de baixo, no centro, sem elementos importantes, pois ali entra um logotipo.`,
    `IMPORTANTE: nenhum texto, nenhuma letra, nenhum número, nenhuma marca d'água, nenhum logotipo na imagem.`,
    `Sem símbolos religiosos de outras tradições, sem conteúdo assustador.`,
  ].filter(Boolean).join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Entre na plataforma para gerar imagens." });
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "formacao" } });

    const { data: quem, error: quemErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (quemErr || !quem?.user) return json({ error: "Sessão expirada. Entre de novo." });
    const { data: ehAdmin } = await admin.rpc("is_admin", { user_id: quem.user.id });
    if (!ehAdmin) return json({ error: "Só administradores da Formação podem gerar imagens das aulas." });

    const chave = Deno.env.get("OPENAI_API_KEY");
    if (!chave) return json({ error: "A chave da OpenAI ainda não foi configurada no Supabase (OPENAI_API_KEY)." });

    const corpo = await req.json();
    const tema = String(corpo.tema ?? "").trim().slice(0, 300);
    const modulo = String(corpo.modulo ?? "").trim().slice(0, 40);
    const ideia = String(corpo.ideia ?? "").trim().slice(0, 400);
    if (!tema) return json({ error: "A aula precisa ter um tema para gerar a imagem." });

    // Tenta o modelo configurado e, se a conta não tiver acesso a ele, os seguintes da lista
    const modelos = [Deno.env.get("OPENAI_IMAGE_MODEL"), "gpt-image-2", "chatgpt-image-latest", "gpt-image-1.5", "gpt-image-1"]
      .filter((m, i, l): m is string => !!m && l.indexOf(m) === i);
    let dados: any = null;
    let ultimoErro = "";
    for (const modelo of modelos) {
      const resp = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelo, prompt: montarPrompt(tema, modulo, ideia), size: "1024x1024", quality: "medium", n: 1 }),
      });
      const r = await resp.json();
      if (resp.ok) { dados = r; break; }
      console.error("OpenAI", modelo, r);
      ultimoErro = r?.error?.message ?? String(resp.status);
      const semAcesso = /does not exist|not found|model_not_found|must be verified|do not have access/i.test(ultimoErro);
      if (!semAcesso) break;
    }
    if (!dados) return json({ error: `A IA não conseguiu gerar a imagem: ${ultimoErro}` });
    const b64 = dados?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "A IA não devolveu imagem. Tente de novo." });
    return json({ imagem: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado ao gerar a imagem. Tente de novo." });
  }
});
