import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Gera o parágrafo de introdução da mensagem de WhatsApp de uma palestra, a partir do tema.
// O resto da mensagem (data, horários dos trabalhos, contato) é montado no app com os dados da palestra cadastrada.
// Substitui o antigo gerador lar-seu-luiz-whatsapp.vercel.app, que lia o cartaz por imagem.
// Qualquer pessoa logada pode chamar. Segredo necessário no Supabase: OPENAI_API_KEY (o mesmo da arte das aulas).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const INSTRUCOES = [
  "Você escreve para o Centro Espírita Lar de Seu Luiz, que segue a Doutrina Espírita codificada por Allan Kardec.",
  "Escreva UM parágrafo de introdução, com 2 a 3 frases (no máximo 60 palavras), convidando para a palestra pública do tema dado.",
  "Explique em linguagem simples e acolhedora o que o tema traz para a vida de quem vem, com base no Evangelho e na Doutrina Espírita.",
  "Português do Brasil, tom fraterno e sereno. Não use travessões, emojis, aspas, exclamações em excesso, frases de efeito nem hipérboles.",
  "Não repita o tema literalmente no começo, não cumprimente, não assine e não cite datas ou horários. Devolva só o parágrafo.",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Entre na plataforma para gerar a mensagem." });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: quem, error: quemErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (quemErr || !quem?.user) return json({ error: "Sessão expirada. Entre de novo." });

    const chave = Deno.env.get("OPENAI_API_KEY");
    if (!chave) return json({ error: "A chave da OpenAI ainda não foi configurada no Supabase (OPENAI_API_KEY)." });

    const corpo = await req.json();
    const tema = String(corpo.tema ?? "").trim().slice(0, 300);
    if (!tema || tema === "-") return json({ error: "A palestra precisa ter um tema para gerar a mensagem." });

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: INSTRUCOES },
          { role: "user", content: `Tema da palestra: ${tema}` },
        ],
      }),
    });
    const r = await resp.json();
    if (!resp.ok) {
      console.error("OpenAI", r);
      return json({ error: `A IA não conseguiu escrever a introdução: ${r?.error?.message ?? resp.status}` });
    }
    const intro = String(r?.choices?.[0]?.message?.content ?? "").replace(/[—–]/g, ",").trim();
    if (!intro) return json({ error: "A IA não devolveu texto. Tente de novo." });
    return json({ intro });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado ao gerar a mensagem. Tente de novo." });
  }
});
