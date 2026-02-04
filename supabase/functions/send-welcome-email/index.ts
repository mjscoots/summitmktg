import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
];

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.lovable.app')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  applicationType: "rookie" | "vet";
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email, firstName, applicationType }: WelcomeEmailRequest = await req.json();

    // Validate required fields
    if (!email || !firstName || !applicationType) {
      throw new Error("Missing required fields: email, firstName, or applicationType");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Validate applicationType
    if (!["rookie", "vet"].includes(applicationType)) {
      throw new Error("Invalid application type");
    }

    // Rate limiting using Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const rateLimitKey = `welcome-email:${email.toLowerCase()}`;
      const { data: isAllowed } = await supabaseAdmin
        .rpc("check_rate_limit", { 
          p_key: rateLimitKey, 
          p_max_attempts: 3, 
          p_window_seconds: 3600 // 1 hour
        });

      if (!isAllowed) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    const typeLabel = applicationType === "rookie" ? "Rookie" : "Veteran";
    
    // Send email using Resend's REST API directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Summit Marketing <noreply@summitmktgsales.com>",
        to: [email],
        subject: `Welcome to Summit Marketing, ${firstName}! 🏔️`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; text-align: center;">
                <h1 style="color: #3b82f6; font-size: 28px; font-weight: 800; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 2px;">
                  🏔️ Summit Marketing
                </h1>
                <p style="color: #94a3b8; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                  ${typeLabel} Application Received
                </p>
              </div>
              
              <div style="background: #ffffff; border-radius: 16px; padding: 40px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h2 style="color: #1a1a2e; font-size: 24px; margin: 0 0 20px 0;">
                  Hey ${firstName}! 👋
                </h2>
                
                <p style="color: #64748b; font-size: 16px; margin: 0 0 20px 0;">
                  Thanks for applying to Summit Marketing as a <strong style="color: #3b82f6;">${typeLabel}</strong>. We're excited to learn more about you!
                </p>
                
                <p style="color: #64748b; font-size: 16px; margin: 0 0 20px 0;">
                  <strong style="color: #1a1a2e;">What happens next?</strong>
                </p>
                
                <ul style="color: #64748b; font-size: 16px; margin: 0 0 20px 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Our team will review your application within 24-48 hours</li>
                  <li style="margin-bottom: 8px;">If you're a good fit, we'll reach out to schedule a call</li>
                  <li style="margin-bottom: 8px;">In the meantime, follow us on <a href="https://www.instagram.com/summitmktgsales/" style="color: #3b82f6; text-decoration: none;">Instagram</a> for updates</li>
                </ul>
                
                <p style="color: #64748b; font-size: 16px; margin: 0 0 30px 0;">
                  Got questions? DM us on Instagram and we'll help you out.
                </p>
                
                <div style="text-align: center;">
                  <a href="https://www.instagram.com/summitmktgsales/" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                    Follow Us on Instagram
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; padding: 30px 20px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Summit Marketing. All rights reserved.
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">
                  Your Summer. Your Income.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", responseData);
      throw new Error(`Failed to send email: ${responseData.message || response.statusText}`);
    }

    console.log("Welcome email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, id: responseData.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-welcome-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
