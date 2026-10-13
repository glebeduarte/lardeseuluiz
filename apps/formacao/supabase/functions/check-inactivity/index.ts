import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SEND_DELAY = 550;
const INACTIVITY_DAYS = 10;

function buildEmailHtml(userName: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #2176AE, #1a6a9e); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style></head>
    <body><div class="container">
      <div class="header"><h1 style="margin: 0;">📖 Sentimos sua falta!</h1></div>
      <div class="content">
        <p>Olá, <strong>${userName}</strong>!</p>
        <p>Percebemos que já faz mais de <strong>10 dias</strong> que você não acessa nenhum conteúdo na nossa plataforma de formação.</p>
        <p>Seus cursos e materiais continuam disponíveis e esperando por você. Que tal dedicar alguns minutos para retomar seus estudos?</p>
        <div style="background:#EBF4FB;padding:15px;border-radius:6px;border-left:4px solid #2176AE;margin:20px 0;">
          <p style="margin:0;"><em>"Para se conhecer uma nova ciência é preciso o estudo sério. É o que aconteceu na investigação sobre a continuidade da vida que se faz."</em></p>
          <p style="margin:5px 0 0;font-size:12px;color:#6b7280;">— Allan Kardec</p>
        </div>
        <p style="text-align: center;">
          <a href="https://formacaolsl.lovable.app/dashboard" style="display:inline-block;background:linear-gradient(135deg,#2176AE,#1a6a9e);color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">Retomar meus estudos</a>
        </p>
        <p style="font-size:13px;color:#6b7280;text-align:center;">Estamos aqui para apoiar sua jornada de conhecimento!</p>
      </div>
      <div class="footer"><p>Área de Formação — Lar de Seu Luiz</p></div>
    </div></body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: "formacao" } });

    // Find active students inactive for 10+ days who haven't received a reminder in the last 10 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    const { data: inactiveUsers, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, last_activity_at, inactivity_reminder_sent_at")
      .eq("is_active", true)
      .eq("role", "student")
      .lt("last_activity_at", cutoffISO)
      .or(`inactivity_reminder_sent_at.is.null,inactivity_reminder_sent_at.lt.${cutoffISO}`);

    if (error) throw error;

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log("No inactive users found");
      return new Response(
        JSON.stringify({ success: true, message: "No inactive users", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${inactiveUsers.length} inactive users`);

    // Check daily email limit
    const today = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase
      .from("email_daily_usage")
      .select("sent_count")
      .eq("usage_date", today)
      .single();
    
    const remaining = 100 - (usageData?.sent_count || 0);
    const toProcess = inactiveUsers.slice(0, Math.max(0, remaining));

    let sent = 0;

    for (const user of toProcess) {
      const firstName = (user.full_name || "Aluno(a)").split(" ")[0];
      const html = buildEmailHtml(firstName);

      try {
        const { error: sendError } = await resend.emails.send({
          from: "Área de Formação <contato@lardeseuluiz.com.br>",
          to: [user.email],
          subject: "📖 Sentimos sua falta! Retome seus estudos",
          html,
        });

        if (!sendError) {
          sent++;
          // Mark reminder as sent
          await supabase
            .from("profiles")
            .update({ inactivity_reminder_sent_at: new Date().toISOString() })
            .eq("id", user.id);
        } else {
          console.error(`Failed to send to ${user.email}:`, sendError);
        }
      } catch (e) {
        console.error(`Exception sending to ${user.email}:`, e);
      }

      await delay(SEND_DELAY);
    }

    // Increment daily usage
    if (sent > 0) {
      await supabase.rpc("increment_daily_email_usage", { count: sent });
    }

    // Log
    await supabase.from("email_logs").insert({
      email_to: toProcess.map((u) => u.email).join(", "),
      email_type: "inactivity_reminder",
      subject: "Sentimos sua falta! Retome seus estudos",
      status: "sent",
      metadata: { total_inactive: inactiveUsers.length, sent, skipped_limit: inactiveUsers.length - toProcess.length },
    });

    console.log(`Inactivity reminder: ${sent} emails sent`);

    return new Response(
      JSON.stringify({ success: true, sent, total_inactive: inactiveUsers.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-inactivity:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
