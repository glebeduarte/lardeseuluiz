import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub;

    // Check admin
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: isAdminResult } = await adminClient.rpc("is_admin", { user_id: userId });
    if (!isAdminResult) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { lesson_ids, quantity = 10, question_types = ["multiple_choice", "true_false"], content_text, exclude_statements } = await req.json();

    // Build content from lessons or provided text
    let contentParts: string[] = [];

    if (content_text) {
      contentParts.push(content_text);
    }

    if (lesson_ids && lesson_ids.length > 0) {
      const { data: lessons } = await adminClient
        .from("lessons")
        .select("title, description")
        .in("id", lesson_ids);
      
      if (lessons) {
        for (const l of lessons) {
          contentParts.push(`Aula: ${l.title}\n${l.description || ""}`);
        }
      }

      // Also get attachments info
      const { data: attachments } = await adminClient
        .from("attachments")
        .select("name, lesson_id")
        .in("lesson_id", lesson_ids);
      
      if (attachments && attachments.length > 0) {
        contentParts.push("Materiais de apoio: " + attachments.map(a => a.name).join(", "));
      }
    }

    const content = contentParts.join("\n\n---\n\n");
    if (!content.trim()) {
      return new Response(JSON.stringify({ error: "Nenhum conteúdo disponível para gerar questões." }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), { 
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const typeInstructions = question_types.map((t: string) => {
      if (t === "multiple_choice") return "Múltipla escolha (4 alternativas: a, b, c, d)";
      if (t === "true_false") return "Verdadeiro ou Falso (alternativas: v=Verdadeiro, f=Falso)";
      return t;
    }).join(" e ");

    let excludeInstructions = '';
    if (exclude_statements && exclude_statements.length > 0) {
      excludeInstructions = `\n- NÃO repita questões semelhantes a estas:\n${exclude_statements.map((s: string) => `  * "${s}"`).join('\n')}`;
    }

    const systemPrompt = `Você é um especialista em educação espírita e avaliações pedagógicas. 
Gere questões de avaliação sobre o conteúdo fornecido.

REGRAS:
- Gere exatamente ${quantity} questões
- Tipos permitidos: ${typeInstructions}
- Cada questão deve ter: enunciado claro, alternativas, resposta correta e uma explicação
- Para múltipla escolha: use IDs a, b, c, d
- Para verdadeiro/falso: use IDs v (Verdadeiro), f (Falso)
- As questões devem testar compreensão, não apenas memorização
- Varie a dificuldade entre fácil, média e difícil
- Escreva em português brasileiro${excludeInstructions}`;

    const userPrompt = `Com base no conteúdo abaixo, gere ${quantity} questões de avaliação.

CONTEÚDO:
${content}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_questions",
            description: "Generate assessment questions from educational content",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question_type: { type: "string", enum: ["multiple_choice", "true_false"] },
                      statement: { type: "string", description: "The question statement" },
                      alternatives: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            text: { type: "string" },
                          },
                          required: ["id", "text"],
                        },
                      },
                      correct_answer: { type: "string", description: "ID of the correct alternative" },
                      explanation: { type: "string", description: "Explanation of the correct answer" },
                    },
                    required: ["question_type", "statement", "alternatives", "correct_answer", "explanation"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar questões via IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "IA não retornou questões estruturadas" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generated = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ questions: generated.questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
