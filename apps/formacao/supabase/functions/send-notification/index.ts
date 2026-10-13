import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const DAILY_LIMIT = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "enrollment_approved" | "content_updated" | "bulk_email";
  user_id?: string;
  user_email?: string;
  user_name?: string;
  course_id?: string;
  course_title?: string;
  content_type?: string;
  content_title?: string;
  recipients?: { email: string; name: string; courses?: string[]; user_type?: string }[];
  subject?: string;
  html_content?: string;
}

async function getDailyRemaining(supabase: any): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("email_daily_usage")
    .select("sent_count")
    .eq("usage_date", today)
    .single();
  return DAILY_LIMIT - (data?.sent_count || 0);
}

async function incrementDailyUsage(supabase: any, count: number) {
  await supabase.rpc("increment_daily_email_usage", { count });
}

async function queueEmails(supabase: any, emails: any[], campaignId?: string) {
  const rows = emails.map((e) => ({
    recipient_email: e.recipient_email,
    recipient_name: e.recipient_name,
    subject: e.subject,
    html_content: e.html_content,
    email_type: e.email_type || "bulk_email",
    campaign_id: campaignId || null,
    status: "queued",
    metadata: e.metadata || {},
  }));
  const { error } = await supabase.from("email_queue").insert(rows);
  if (error) console.error("Error queuing emails:", error);
  return rows.length;
}

function buildEmailHtml(subject: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #0d9488, #0891b2); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style></head>
    <body><div class="container">
      <div class="header"><h1 style="margin: 0;">✉️ ${subject}</h1></div>
      <div class="content">${body}</div>
      <div class="footer"><p>Área de Formação - Lar de Seu Luiz</p></div>
    </div></body></html>`;
}

async function sendSingleEmail(to: string, subject: string, html: string, retries = 3): Promise<{ success: boolean; error?: any }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: "Área de Formação <contato@lardeseuluiz.com.br>",
        to: [to],
        subject,
        html,
      });
      if (error) {
        // Retry on rate limit (429)
        if ((error as any).statusCode === 429 && attempt < retries - 1) {
          console.warn(`Rate limited sending to ${to}, retrying in ${(attempt + 1) * 1000}ms...`);
          await delay((attempt + 1) * 1000);
          continue;
        }
        console.error(`Error sending to ${to}:`, error);
        return { success: false, error };
      }
      return { success: true };
    } catch (e: any) {
      if (attempt < retries - 1 && e?.message?.includes("429")) {
        await delay((attempt + 1) * 1000);
        continue;
      }
      console.error(`Exception sending to ${to}:`, e);
      return { success: false, error: e };
    }
  }
  return { success: false, error: "Max retries exceeded" };
}

// Delay helper - 550ms = ~1.8 req/s (safely under Resend's 2 req/s limit)
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SEND_DELAY = 550;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: "formacao" } });

    const payload: NotificationRequest = await req.json();
    console.log("Notification payload type:", payload.type);

    if (payload.type === "bulk_email") {
      const { recipients, subject, html_content } = payload;
      if (!recipients || recipients.length === 0 || !subject || !html_content) {
        throw new Error("Missing required fields for bulk_email");
      }

      const remaining = await getDailyRemaining(supabase);
      console.log(`Daily email remaining: ${remaining}/${DAILY_LIMIT}, recipients: ${recipients.length}`);

      // Split into sendable now vs queued
      const toSendNow = recipients.slice(0, Math.max(0, remaining));
      const toQueue = recipients.slice(Math.max(0, remaining));

      let successful = 0;
      let failed = 0;

      // Send emails within daily limit with 600ms delay between each
      for (const recipient of toSendNow) {
        const firstName = (recipient.name || "Aluno(a)").split(" ")[0];
        const coursesList = (recipient.courses || []).join(", ") || "Nenhum curso";
        const coursesCount = String((recipient.courses || []).length);
        const userType = recipient.user_type || "Frequentador";

        const personalizedHtml = html_content
          .replace(/\{\{full_name\}\}/g, recipient.name || "Aluno(a)")
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{email\}\}/g, recipient.email)
          .replace(/\{\{user_type\}\}/g, userType)
          .replace(/\{\{courses_list\}\}/g, coursesList)
          .replace(/\{\{courses_count\}\}/g, coursesCount);

        const fullHtml = buildEmailHtml(subject, personalizedHtml);
        const result = await sendSingleEmail(recipient.email, subject, fullHtml);

        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        // Rate limit: Resend allows 2 req/s
        await delay(SEND_DELAY);
      }

      // Increment daily usage for successfully sent
      if (successful > 0) {
        await incrementDailyUsage(supabase, successful);
      }

      // Queue remaining emails for next day(s)
      let queued = 0;
      if (toQueue.length > 0) {
        const queueItems = toQueue.map((r) => {
          const firstName = (r.name || "Aluno(a)").split(" ")[0];
          const coursesList = (r.courses || []).join(", ") || "Nenhum curso";
          const coursesCount = String((r.courses || []).length);
          const userType = r.user_type || "Frequentador";

          const personalizedHtml = html_content
            .replace(/\{\{full_name\}\}/g, r.name || "Aluno(a)")
            .replace(/\{\{first_name\}\}/g, firstName)
            .replace(/\{\{email\}\}/g, r.email)
            .replace(/\{\{user_type\}\}/g, userType)
            .replace(/\{\{courses_list\}\}/g, coursesList)
            .replace(/\{\{courses_count\}\}/g, coursesCount);

          return {
            recipient_email: r.email,
            recipient_name: r.name,
            subject,
            html_content: buildEmailHtml(subject, personalizedHtml),
            email_type: "bulk_email",
            metadata: { original_body: html_content },
          };
        });

        queued = await queueEmails(supabase, queueItems);
        console.log(`Queued ${queued} emails for later delivery`);
      }

      console.log(`Bulk email: ${successful} sent, ${failed} failed, ${queued} queued`);

      // Log the email
      await supabase.from("email_logs").insert({
        email_to: recipients.map((r) => r.email).join(", "),
        email_type: "bulk_email",
        subject,
        status: queued > 0 ? "partial_queued" : failed === 0 ? "sent" : "partial",
        metadata: { total: recipients.length, successful, failed, queued },
      });

      return new Response(
        JSON.stringify({ success: true, sent: successful, failed, queued }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For transactional emails (enrollment_approved, content_updated), also check daily limit
    if (payload.type === "enrollment_approved") {
      const { user_email, user_name, course_title } = payload;
      if (!user_email || !course_title) throw new Error("Missing required fields for enrollment_approved");

      const remaining = await getDailyRemaining(supabase);
      if (remaining <= 0) {
        // Queue this transactional email
        console.log("Daily limit reached, queuing enrollment email");
        await queueEmails(supabase, [{
          recipient_email: user_email,
          recipient_name: user_name || "Aluno(a)",
          subject: `Matrícula Aprovada - ${course_title}`,
          html_content: buildEmailHtml(`🎉 Matrícula Aprovada!`, `
            <p>Olá, <strong>${user_name || "Aluno(a)"}</strong>!</p>
            <p>Sua matrícula no curso <strong>"${course_title}"</strong> foi aprovada.</p>
            <p>Acesse a plataforma para conferir o conteúdo.</p>
            <p style="text-align: center;">
              <a href="https://formacao.lardeseuluiz.com.br/dashboard" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Acessar Meus Cursos</a>
            </p>
            <p>Bons estudos!</p>
          `),
          email_type: "enrollment_approved",
        }]);

        return new Response(
          JSON.stringify({ success: true, queued: true, message: "Daily limit reached, email queued" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const html = buildEmailHtml(`🎉 Matrícula Aprovada!`, `
        <p>Olá, <strong>${user_name || "Aluno(a)"}</strong>!</p>
        <p>Sua matrícula no curso <strong>"${course_title}"</strong> foi aprovada.</p>
        <p>Acesse a plataforma para conferir o conteúdo.</p>
        <p style="text-align: center;">
          <a href="https://formacao.lardeseuluiz.com.br/dashboard" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Acessar Meus Cursos</a>
        </p>
        <p>Bons estudos!</p>
      `);

      const result = await sendSingleEmail(user_email, `Matrícula Aprovada - ${course_title}`, html);
      if (result.success) await incrementDailyUsage(supabase, 1);

    } else if (payload.type === "content_updated") {
      const { course_id, course_title, content_type, content_title } = payload;
      if (!course_id || !course_title) throw new Error("Missing required fields for content_updated");

      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`user_id, profiles:user_id (email, full_name)`)
        .eq("course_id", course_id)
        .eq("status", "approved");

      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No enrolled students to notify" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const remaining = await getDailyRemaining(supabase);
      let sentCount = 0;

      const contentDescription = content_type === "lesson"
        ? `uma nova aula: "${content_title}"`
        : content_type === "module"
        ? `um novo módulo: "${content_title}"`
        : `novo conteúdo: "${content_title}"`;

      for (let i = 0; i < enrollments.length; i++) {
        const enrollment: any = enrollments[i];
        const profile = enrollment.profiles;
        if (!profile?.email) continue;

        if (sentCount >= remaining) {
          // Queue remaining
          const toQueue = enrollments.slice(i).filter((e: any) => e.profiles?.email).map((e: any) => ({
            recipient_email: e.profiles.email,
            recipient_name: e.profiles.full_name || "Aluno(a)",
            subject: `Novo Conteúdo - ${course_title}`,
            html_content: buildEmailHtml(`📚 Novo Conteúdo Disponível!`, `
              <p>Olá, <strong>${e.profiles.full_name || "Aluno(a)"}</strong>!</p>
              <p>Temos novidades no curso <strong>"${course_title}"</strong>!</p>
              <div style="background:#ecfdf5;padding:15px;border-radius:6px;border-left:4px solid #0d9488;">
                <p style="margin:0;">Foi adicionado ${contentDescription}</p>
              </div>
              <p style="text-align:center;">
                <a href="https://formacao.lardeseuluiz.com.br/dashboard" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Acessar o Curso</a>
              </p>
            `),
            email_type: "content_updated",
          }));
          await queueEmails(supabase, toQueue);
          console.log(`Queued ${toQueue.length} content update emails`);
          break;
        }

        const html = buildEmailHtml(`📚 Novo Conteúdo Disponível!`, `
          <p>Olá, <strong>${profile.full_name || "Aluno(a)"}</strong>!</p>
          <p>Temos novidades no curso <strong>"${course_title}"</strong>!</p>
          <div style="background:#ecfdf5;padding:15px;border-radius:6px;border-left:4px solid #0d9488;">
            <p style="margin:0;">Foi adicionado ${contentDescription}</p>
          </div>
          <p style="text-align:center;">
            <a href="https://formacao.lardeseuluiz.com.br/dashboard" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Acessar o Curso</a>
          </p>
        `);

        const result = await sendSingleEmail(profile.email, `Novo Conteúdo - ${course_title}`, html);
        if (result.success) sentCount++;
        await delay(SEND_DELAY);
      }

      if (sentCount > 0) await incrementDailyUsage(supabase, sentCount);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
