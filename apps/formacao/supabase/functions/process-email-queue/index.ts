import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const DAILY_LIMIT = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SEND_DELAY = 550; // ~1.8 req/s, safely under Resend's 2 req/s

async function sendWithRetry(email: string, subject: string, html: string, retries = 3): Promise<{ success: boolean; error?: any }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: "Área de Formação <contato@lardeseuluiz.com.br>",
        to: [email],
        subject,
        html,
      });
      if (error) {
        if ((error as any).statusCode === 429 && attempt < retries - 1) {
          console.warn(`Rate limited for ${email}, retrying in ${(attempt + 1) * 1000}ms...`);
          await delay((attempt + 1) * 1000);
          continue;
        }
        return { success: false, error };
      }
      return { success: true };
    } catch (e: any) {
      if (attempt < retries - 1 && e?.message?.includes("429")) {
        await delay((attempt + 1) * 1000);
        continue;
      }
      return { success: false, error: e };
    }
  }
  return { success: false, error: "Max retries exceeded" };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get today's usage
    const today = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase
      .from("email_daily_usage")
      .select("sent_count")
      .eq("usage_date", today)
      .single();

    const currentUsage = usageData?.sent_count || 0;
    const remaining = DAILY_LIMIT - currentUsage;

    if (remaining <= 0) {
      console.log("Daily limit already reached, skipping queue processing");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "Daily limit reached" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch queued emails (oldest first), limited to remaining quota
    const { data: queuedEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(remaining);

    if (fetchError) throw fetchError;
    if (!queuedEmails || queuedEmails.length === 0) {
      console.log("No emails in queue");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "Queue empty" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing ${queuedEmails.length} queued emails (remaining quota: ${remaining})`);

    let sent = 0;
    let failed = 0;

    for (const email of queuedEmails) {
      const result = await sendWithRetry(email.recipient_email, email.subject, email.html_content);

      if (result.success) {
        await supabase
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", email.id);
        sent++;
      } else {
        console.error(`Failed to send queued email to ${email.recipient_email}:`, result.error);
        await supabase
          .from("email_queue")
          .update({ status: "failed", error_message: JSON.stringify(result.error), updated_at: new Date().toISOString() })
          .eq("id", email.id);
        failed++;
      }

      await delay(SEND_DELAY);
    }

    // Increment daily usage
    if (sent > 0) {
      await supabase.rpc("increment_daily_email_usage", { count: sent });
    }

    console.log(`Queue processing complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, processed: sent + failed, sent, failed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in process-email-queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
