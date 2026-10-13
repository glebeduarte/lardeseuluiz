import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { verse, ref } = await req.json();
    if (!verse || !ref) {
      return new Response(JSON.stringify({ error: "verse and ref are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um escritor espírita do Lar de Seu Luiz, centro espírita em Nísia Floresta, RN.
Sua tarefa: criar textos de Stories do Instagram fiéis ao Evangelho segundo o Espiritismo de Allan Kardec.

Receberá uma passagem bíblica. Com ela:
1. Escreva contexto narrativo acolhedor (2-3 frases)
2. Escreva reflexão espírita com 3 parágrafos curtos e motivadores, conectados à passagem. Mencione que a espiritualidade ampara quem age e se esforça.
3. Escolha UMA citação real e curta de Emmanuel, Joanna de Ângelis, Chico Xavier ou do Evangelho segundo o Espiritismo (ESE) relacionada ao tema.
4. Informe a fonte exata (ex: "Emmanuel, em Caminho, Verdade e Vida" ou "ESE, cap. 5").

Responda SOMENTE em JSON válido, sem markdown, sem texto extra:
{
  "contexto": "...",
  "titulo_s2": "...",
  "corpo_s2": "parágrafo1\\n\\nparágrafo2\\n\\nparágrafo3",
  "destaque": "...",
  "fonte": "..."
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Passagem: "${verse}" (${ref})` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar conteúdo." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean markdown fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-stories error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
