import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email} for user ${userId}`);

    // Validate required fields
    if (!userId || !email || !fullName) {
      throw new Error("Missing required fields: userId, email, or fullName");
    }

    // Create Supabase client with service role for logging
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the welcome email template from the database
    const { data: template, error: templateError } = await supabaseAdmin
      .from("email_templates")
      .select("subject, html_content, is_active")
      .eq("template_key", "welcome")
      .single();

    if (templateError) {
      console.error("Error fetching email template:", templateError);
      throw new Error("Failed to fetch email template");
    }

    if (!template.is_active) {
      console.log("Welcome email template is disabled, skipping send");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Template disabled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Replace variables in the template
    const dashboardUrl = "https://formacaolsl.lovable.app/dashboard";
    const emailHtml = template.html_content
      .replace(/\{\{full_name\}\}/g, fullName)
      .replace(/\{\{dashboard_url\}\}/g, dashboardUrl);

    const emailSubject = template.subject
      .replace(/\{\{full_name\}\}/g, fullName);

    // Create initial log entry
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from("email_logs")
      .insert({
        user_id: userId,
        email_to: email,
        email_type: "welcome",
        subject: emailSubject,
        status: "pending",
        metadata: { full_name: fullName },
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating email log:", logError);
    }

    // Send the welcome email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Formação Lar Seu Luiz <contato@lardeseuluiz.com.br>",
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      
      // Update log entry with error
      if (logEntry) {
        await supabaseAdmin
          .from("email_logs")
          .update({
            status: "failed",
            error_message: emailResult.message || "Failed to send email",
          })
          .eq("id", logEntry.id);
      }
      
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Welcome email sent successfully:", emailResult);

    // Update log entry with success
    if (logEntry) {
      await supabaseAdmin
        .from("email_logs")
        .update({
          status: "sent",
          resend_id: emailResult.id,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
