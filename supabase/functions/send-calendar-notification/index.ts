import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  event_id: string;
  event_title: string;
  event_date: string;
  event_location?: string;
  event_description?: string;
  manager_name: string;
  action: "created" | "updated" | "deleted";
  user_ids: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the caller is a manager/admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is manager or admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .in("role", ["manager", "admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Manager/Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      event_id, 
      event_title, 
      event_date, 
      event_location, 
      event_description,
      manager_name, 
      action, 
      user_ids 
    }: NotificationRequest = await req.json();

    if (!event_id || !event_title || !user_ids || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profiles for notifications
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", user_ids);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: "No users found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionText = action === "created" ? "added a new event for you" : 
                       action === "updated" ? "updated an event" : "removed an event";
    
    const formattedDate = new Date(event_date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    });

    const results = {
      in_app: 0,
      email: 0,
      errors: [] as string[]
    };

    // Create in-app notifications
    const inAppNotifications = profiles.map(profile => ({
      user_id: profile.user_id,
      title: `Calendar Event ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: `${manager_name} ${actionText}: "${event_title}" on ${formattedDate}`,
      link: "/app/calendar",
      event_id
    }));

    const { error: notifError } = await supabaseAdmin
      .from("user_notifications")
      .insert(inAppNotifications);

    if (notifError) {
      results.errors.push(`In-app notification error: ${notifError.message}`);
    } else {
      results.in_app = profiles.length;
    }

    // Send email notifications if Resend is configured
    if (resendApiKey && action !== "deleted") {
      const resend = new Resend(resendApiKey);
      
      for (const profile of profiles) {
        if (!profile.email) continue;
        
        try {
          await resend.emails.send({
            from: "Summit <notifications@summitmktgsales.com>",
            to: profile.email,
            subject: `📅 Calendar Event: ${event_title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a2e;">Calendar Event ${action === "created" ? "Added" : "Updated"}</h2>
                <p>Hi ${profile.full_name},</p>
                <p>${manager_name} has ${actionText}:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #1a1a2e;">${event_title}</h3>
                  <p style="margin: 5px 0;"><strong>When:</strong> ${formattedDate}</p>
                  ${event_location ? `<p style="margin: 5px 0;"><strong>Where:</strong> ${event_location}</p>` : ""}
                  ${event_description ? `<p style="margin: 10px 0 0 0;">${event_description}</p>` : ""}
                </div>
                <p>Log in to the Summit app to view details and confirm your attendance.</p>
                <a href="https://summitmktgsales.com/app/calendar" 
                   style="display: inline-block; background: #4A90A4; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin-top: 10px;">
                  View Calendar
                </a>
              </div>
            `
          });
          results.email++;
        } catch (emailError) {
          results.errors.push(`Email to ${profile.email} failed: ${(emailError as Error).message}`);
        }
      }
    }

    // Track notification records
    const notificationRecords = profiles.flatMap(profile => [
      {
        event_id,
        user_id: profile.user_id,
        notification_type: "in_app",
        status: "sent",
        sent_at: new Date().toISOString()
      },
      ...(resendApiKey && profile.email ? [{
        event_id,
        user_id: profile.user_id,
        notification_type: "email",
        status: results.email > 0 ? "sent" : "failed",
        sent_at: new Date().toISOString()
      }] : [])
    ]);

    await supabaseAdmin.from("event_notifications").insert(notificationRecords);

    return new Response(JSON.stringify({ 
      success: true,
      notifications_sent: results,
      users_notified: profiles.length
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
