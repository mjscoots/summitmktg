import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if this is a manual trigger (skip rate limiting)
  let forceRemind = false;
  try {
    if (req.method === "POST") {
      const body = await req.clone().json().catch(() => ({}));
      forceRemind = body?.force === true;
    }
  } catch { /* ignore */ }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Get deadline hours setting
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bootcamp_deadline_hours")
      .maybeSingle();

    const deadlineHours = setting?.value ? parseFloat(setting.value) : 0.5;

    // Get incomplete bootcamp rookies
    const { data: rookieRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "rookie");

    if (!rookieRoles?.length) {
      return new Response(
        JSON.stringify({ message: "No rookies found", reminders_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rookieIds = rookieRoles.map((r) => r.user_id);

    // Get incomplete bootcamp progress
    const { data: bootcampData } = await supabase
      .from("bootcamp_progress")
      .select("user_id, bootcamp_completed, bootcamp_exempt, last_rep_reminder_at, last_manager_reminder_at")
      .in("user_id", rookieIds)
      .eq("bootcamp_completed", false)
      .eq("bootcamp_exempt", false);

    if (!bootcampData?.length) {
      return new Response(
        JSON.stringify({ message: "No incomplete bootcamp reps", reminders_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const incompleteUserIds = bootcampData.map((b) => b.user_id);

    // Get profiles with email info
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, created_at, direct_manager, status")
      .in("user_id", incompleteUserIds)
      .eq("status", "active");

    if (!profiles?.length) {
      return new Response(
        JSON.stringify({ message: "No active profiles", reminders_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    let repEmailsSent = 0;
    let managerEmailsSent = 0;

    // Build a map of bootcamp data by user_id
    const bootcampMap = new Map(bootcampData.map((b) => [b.user_id, b]));

    // Get all manager profiles for email lookup
    const managerNames = [...new Set(profiles.map((p) => p.direct_manager).filter(Boolean))];
    const { data: managerProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("full_name", managerNames);

    const managerEmailMap = new Map<string, { email: string; userId: string }>();
    (managerProfiles || []).forEach((m) => {
      managerEmailMap.set(m.full_name, { email: m.email, userId: m.user_id });
    });

    // Track which managers need reminders (aggregate reps per manager)
    const managerReminders = new Map<string, { managerEmail: string; managerName: string; reps: string[] }>();

    for (const profile of profiles) {
      const bp = bootcampMap.get(profile.user_id);
      if (!bp || !profile.created_at) continue;

      const createdAt = new Date(profile.created_at);
      const deadlineAt = new Date(createdAt.getTime() + deadlineHours * 60 * 60 * 1000);
      const hoursRemaining = (deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if rep needs reminder (every 1 hour)
      const repReminderDue = forceRemind || !lastRepReminder || (now.getTime() - lastRepReminder.getTime()) >= 60 * 60 * 1000;

      if (repReminderDue) {
        const isOverdue = hoursRemaining <= 0;
        const subject = isOverdue
          ? "⚠️ Boot Camp Overdue — Complete Now"
          : `⏰ Boot Camp Reminder — ${Math.ceil(hoursRemaining)}h remaining`;

        const body = isOverdue
          ? `<h2>Hi ${profile.full_name},</h2>
             <p>Your boot camp deadline has passed. Please complete it immediately to unlock full access to the platform.</p>
             <p>Most reps complete boot camp in under 15 minutes.</p>
             <p><strong>Log in now to finish your boot camp.</strong></p>`
          : `<h2>Hi ${profile.full_name},</h2>
             <p>You have <strong>${Math.ceil(hoursRemaining)} hours</strong> remaining to complete your boot camp.</p>
             <p>Most reps complete boot camp in under 15 minutes.</p>
             <p><strong>Log in now to finish your boot camp.</strong></p>`;

        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Summit <onboarding@resend.dev>",
              to: [profile.email],
              subject,
              html: body,
            }),
          });

          if (emailRes.ok) {
            repEmailsSent++;
            await supabase
              .from("bootcamp_progress")
              .update({ last_rep_reminder_at: now.toISOString() })
              .eq("user_id", profile.user_id);
          } else {
            console.error(`Failed to send rep email to ${profile.email}:`, await emailRes.text());
          }
        } catch (e) {
          console.error(`Error sending rep email to ${profile.email}:`, e);
        }
      }

      // Aggregate manager reminders (every 12 hours)
      if (profile.direct_manager) {
        const managerInfo = managerEmailMap.get(profile.direct_manager);
        if (managerInfo) {
          const managerReminderDue = forceRemind || !lastManagerReminder || (now.getTime() - lastManagerReminder.getTime()) >= 12 * 60 * 60 * 1000;

          if (managerReminderDue) {
            if (!managerReminders.has(profile.direct_manager)) {
              managerReminders.set(profile.direct_manager, {
                managerEmail: managerInfo.email,
                managerName: profile.direct_manager,
                reps: [],
              });
            }
            managerReminders.get(profile.direct_manager)!.reps.push(profile.full_name);

            // Update the last_manager_reminder_at for this rep's bootcamp record
            await supabase
              .from("bootcamp_progress")
              .update({ last_manager_reminder_at: now.toISOString() })
              .eq("user_id", profile.user_id);
          }
        }
      }
    }

    // Send aggregated manager emails
    for (const [, info] of managerReminders) {
      const repList = info.reps.map((r) => `<li>${r}</li>`).join("");
      const subject = `🚨 ${info.reps.length} rep(s) haven't completed boot camp`;
      const body = `<h2>Hi ${info.managerName},</h2>
        <p>The following rep(s) on your team have not yet completed boot camp:</p>
        <ul>${repList}</ul>
        <p>Please follow up with them to ensure they complete it promptly.</p>`;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Summit <onboarding@resend.dev>",
            to: [info.managerEmail],
            subject,
            html: body,
          }),
        });

        if (emailRes.ok) {
          managerEmailsSent++;
        } else {
          console.error(`Failed to send manager email to ${info.managerEmail}:`, await emailRes.text());
        }
      } catch (e) {
        console.error(`Error sending manager email to ${info.managerEmail}:`, e);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${repEmailsSent} rep reminder(s) and ${managerEmailsSent} manager reminder(s)`,
        rep_emails_sent: repEmailsSent,
        manager_emails_sent: managerEmailsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in bootcamp-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
