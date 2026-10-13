import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewUserNotificationRequest {
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, userEmail, userName, userPhone }: NewUserNotificationRequest = await req.json();

    console.log(`Notifying admins about new user: ${userEmail}`);

    if (!userId || !userEmail || !userName) {
      throw new Error("Missing required fields: userId, userEmail, or userName");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all admin emails
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("role", "admin")
      .eq("is_active", true);

    if (adminsError) {
      console.error("Error fetching admins:", adminsError);
      throw new Error("Failed to fetch admin list");
    }

    if (!admins || admins.length === 0) {
      console.log("No admins found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${admins.length} admins to notify`);

    const registrationDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Send email to each admin
    const emailPromises = admins.map(async (admin) => {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Formação Lar Seu Luiz <contato@lardeseuluiz.com.br>",
            to: [admin.email],
            subject: `Novo Aluno Cadastrado - ${userName}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #0d9488, #0891b2); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .info-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #0d9488; margin: 20px 0; }
                  .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                  .info-label { font-weight: bold; color: #374151; min-width: 100px; }
                  .info-value { color: #6b7280; }
                  .button { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                  .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">👤 Novo Aluno Cadastrado!</h1>
                  </div>
                  <div class="content">
                    <p>Olá, <strong>${admin.full_name || "Administrador"}</strong>!</p>
                    <p>Um novo aluno acabou de se cadastrar na plataforma de formação.</p>
                    
                    <div class="info-box">
                      <h3 style="margin-top: 0; color: #0d9488;">Dados do Novo Aluno</h3>
                      <div style="margin-bottom: 8px;">
                        <strong>Nome:</strong> ${userName}
                      </div>
                      <div style="margin-bottom: 8px;">
                        <strong>Email:</strong> ${userEmail}
                      </div>
                      ${userPhone ? `
                      <div style="margin-bottom: 8px;">
                        <strong>Telefone:</strong> ${userPhone}
                      </div>
                      ` : ""}
                      <div>
                        <strong>Data do Cadastro:</strong> ${registrationDate}
                      </div>
                    </div>
                    
                    <p>Acesse o painel administrativo para ver mais detalhes.</p>
                    <p style="text-align: center;">
                      <a href="https://formacao.lardeseuluiz.com.br/admin/students" class="button" style="color: white;">Ver Alunos</a>
                    </p>
                  </div>
                  <div class="footer">
                    <p>Área de Formação - Lar de Seu Luiz</p>
                    <p>Secretaria de Formação</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error(`Error sending email to ${admin.email}:`, result);
          return { email: admin.email, success: false, error: result };
        }

        console.log(`Email sent to admin ${admin.email}`);
        return { email: admin.email, success: true, id: result.id };
      } catch (error) {
        console.error(`Exception sending email to ${admin.email}:`, error);
        return { email: admin.email, success: false, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Admin notifications sent: ${successful} successful, ${failed} failed`);

    // Log the email in email_logs
    await supabaseAdmin.from("email_logs").insert({
      user_id: userId,
      email_to: admins.map((a) => a.email).join(", "),
      email_type: "admin_new_user_notification",
      subject: `Novo Aluno Cadastrado - ${userName}`,
      status: failed === 0 ? "sent" : "partial",
      sent_at: new Date().toISOString(),
      metadata: { userName, userEmail, userPhone, adminCount: admins.length, successful, failed },
    });

    return new Response(
      JSON.stringify({ success: true, sent: successful, failed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-admins-new-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
