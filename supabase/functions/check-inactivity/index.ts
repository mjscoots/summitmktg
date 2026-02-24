import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── helpers ──────────────────────────────────────────────────────────
function daysInactive(lastActiveAt: string | null): number {
  if (!lastActiveAt) return 999; // never logged in
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0] || fullName;
}

function formatDate(d: string | null): string {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntilSummer(): number {
  const now = new Date();
  const summer = new Date(now.getFullYear(), 4, 15); // May 15
  if (now > summer) summer.setFullYear(summer.getFullYear() + 1);
  return Math.ceil((summer.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── email builders ──────────────────────────────────────────────────
function buildDay3Email(user: any, trainingPct: number, appUrl: string): { subject: string; html: string } {
  return {
    subject: "Summit Training Reminder - Let's Get Back on Track! 🎯",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
        <h2 style="color: #1a1a2e;">Hi ${firstName(user.full_name)},</h2>
        <p>We noticed you haven't been active on Summit for the past 3 days. Your training progress is important to your success this summer, and we want to make sure you stay on track!</p>
        
        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin-top:0;">Your Current Stats:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>📊 Training Progress: <strong>${trainingPct}%</strong></li>
            <li>⏰ Last Active: <strong>${daysInactive(user.last_active_at)} days ago</strong></li>
            <li>☀️ Days Until Summer: <strong>${daysUntilSummer()} days</strong></li>
          </ul>
        </div>

        <h3>Quick Wins to Get Back:</h3>
        <ul>
          <li>✅ Complete one training module (15-20 minutes)</li>
          <li>✅ Watch a training video</li>
          <li>✅ Review your pitch scripts</li>
        </ul>

        <p><strong>Why Daily Training Matters:</strong><br/>
        Every day you're not training is a day your competitors are getting ahead. The reps who train consistently are the ones who crush their goals when summer hits.</p>

        <p>Your team is counting on you, and so is your future self.</p>

        <p style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}/app" style="background: #1a1a2e; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Log Into Summit →</a>
        </p>

        <p>Questions? Reply to this email or reach out to your team leader.</p>

        <p>See you in the platform,<br/><strong>The Summit Team</strong></p>

        ${user.pillar_name ? `<p style="color:#666; font-size: 13px;">P.S. – Your pillar, <strong>${user.pillar_name}</strong>, is rooting for you and wants to see you succeed. Let's make them proud!</p>` : ""}
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
        <p style="color: #999; font-size: 11px;">You're receiving this because you have an active Summit account. If you believe this is an error, reply to this email.</p>
      </div>
    `,
  };
}

function buildDay4Email(user: any, trainingPct: number, teamStats: any, appUrl: string): { subject: string; html: string } {
  return {
    subject: "Missing You on Summit! Your Team Needs You 💪",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
        <h2 style="color: #1a1a2e;">Hey ${firstName(user.full_name)},</h2>
        <p>Quick check-in – we haven't seen you on Summit in 4 days and wanted to make sure everything's okay!</p>

        <p><strong>Here's the truth:</strong><br/>
        The difference between reps who crush it this summer and those who struggle? Daily training.</p>

        <p>You're currently at <strong>${trainingPct}%</strong> training progress. Imagine where you'd be if you locked in for just 20 minutes today.</p>

        ${teamStats ? `
        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin-top:0;">What Your Peers Are Doing Right Now:</h3>
          <ul>
            ${teamStats.topRookie ? `<li>🏆 ${teamStats.topRookie.name} just hit ${teamStats.topRookie.pct}% training completion</li>` : ""}
            ${teamStats.teamName ? `<li>📈 ${teamStats.teamName} team is training hard this week</li>` : ""}
            <li>💪 Your peers are putting in the work daily</li>
          </ul>
        </div>
        ` : ""}

        <p>You've got what it takes. We've seen your potential. Now it's time to show up for yourself.</p>

        <h3>Start with something small:</h3>
        <ol>
          <li>Watch one 5-minute video</li>
          <li>Complete one quiz</li>
          <li>Review your door approach</li>
        </ol>
        <p>That's it. Small wins build momentum.</p>

        <p style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}/app" style="background: #1a1a2e; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Get Back to Training →</a>
        </p>

        <p>Your team is waiting for you.</p>
        <p>– <strong>Summit Team</strong></p>

        ${user.pillar_name ? `<p style="color:#666; font-size: 13px;">CC: <strong>${user.pillar_name}</strong> – Your pillar is in your corner and wants to see you win.</p>` : ""}

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
        <p style="color: #999; font-size: 11px;">You're receiving this because you have an active Summit account. If you believe this is an error, reply to this email.</p>
      </div>
    `,
  };
}

function buildPillarEmail(
  pillarName: string,
  userName: string,
  userRole: string,
  teamName: string,
  lastActive: string | null,
  trainingPct: number,
  daysCount: number,
  teamActiveCount: number,
  teamInactiveCount: number,
  teamAvgTraining: number,
): { subject: string; html: string } {
  return {
    subject: `${userName} - ${daysCount} Day Inactivity Alert (${teamName})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
        <h2 style="color: #1a1a2e;">Hi ${firstName(pillarName)},</h2>
        <p>This is an automated alert to let you know that <strong>${userName}</strong> from your <strong>${teamName}</strong> team has been inactive on Summit for <strong>${daysCount} days</strong>.</p>

        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin-top:0;">Team Member Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>👤 Name: <strong>${userName}</strong></li>
            <li>🏷️ Role: <strong>${userRole}</strong></li>
            <li>⏰ Last Active: <strong>${formatDate(lastActive)}</strong></li>
            <li>📊 Training Progress: <strong>${trainingPct}%</strong></li>
            <li>📅 Days Inactive: <strong>${daysCount}</strong></li>
          </ul>
        </div>

        <h3>What Happens Next:</h3>
        <ul>
          <li>✅ ${userName} has been sent a training reminder email</li>
          <li>📊 They're still able to access all training materials</li>
          <li>🎯 A follow-up check-in may be needed</li>
        </ul>

        <h3>Suggested Action:</h3>
        <p>Consider reaching out personally via text, call, or in-person to:</p>
        <ul>
          <li>Check if they're facing any obstacles</li>
          <li>Remind them of upcoming training milestones</li>
          <li>Re-energize their commitment to the summer</li>
        </ul>

        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin-top:0;">Quick Stats – Your ${teamName} team:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>🟢 ${teamActiveCount} members active daily</li>
            <li>🔴 ${teamInactiveCount} members inactive 3+ days</li>
            <li>📈 ${teamAvgTraining}% average team training completion</li>
          </ul>
        </div>

        <p>You can view detailed team activity in the Teams section of Summit.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
        <p style="color: #999; font-size: 11px;">This is an automated alert from Summit. You're receiving this as a pillar leader.</p>
      </div>
    `,
  };
}

// ── main handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    // Use the published app URL for links
    const appUrl = "https://summitmktg.lovable.app";
    // Email sender – change once domain is verified in Resend
    const fromEmail = "Summit <onboarding@resend.dev>";

    const now = new Date();
    const thresholdMs72 = 72 * 60 * 60 * 1000; // 3 days

    // ── 1. Get all profiles that could be inactive ──
    const { data: allProfiles, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, last_active_at, team_id, direct_manager, status, pillar_slug, time_this_week_minutes")
      .not("status", "eq", "nlc");

    if (profErr) throw profErr;
    if (!allProfiles?.length) {
      return new Response(JSON.stringify({ message: "No profiles found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Get roles (exclude admins) ──
    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map<string, string>();
    (allRoles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

    // ── 3. Get training progress per user ──
    const { data: lessonData } = await supabase
      .from("lesson_progress")
      .select("user_id, completed_at");

    const { data: totalLessons } = await supabase
      .from("training_lessons")
      .select("id")
      .eq("is_active", true);

    const totalLessonCount = totalLessons?.length || 1;
    const completedByUser = new Map<string, number>();
    (lessonData || []).forEach((lp: any) => {
      if (lp.completed_at) {
        completedByUser.set(lp.user_id, (completedByUser.get(lp.user_id) || 0) + 1);
      }
    });

    function trainingPct(userId: string): number {
      const c = completedByUser.get(userId) || 0;
      return Math.round((c / totalLessonCount) * 100);
    }

    // ── 4. Get team info ──
    const { data: teams } = await supabase.from("teams").select("id, name, leader_id");
    const teamMap = new Map<string, any>();
    (teams || []).forEach((t: any) => teamMap.set(t.id, t));

    // Map pillar leader user_id → profile
    const pillarLeaderIds = [...new Set((teams || []).map((t: any) => t.leader_id).filter(Boolean))];
    const { data: pillarProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", pillarLeaderIds.length ? pillarLeaderIds : ["00000000-0000-0000-0000-000000000000"]);

    const pillarProfileMap = new Map<string, any>();
    (pillarProfiles || []).forEach((p: any) => pillarProfileMap.set(p.user_id, p));

    // ── 5. Filter inactive users ──
    const inactiveUsers: any[] = [];
    for (const p of allProfiles) {
      const role = roleMap.get(p.user_id);
      if (role === "admin") continue; // exclude admins
      if (p.status === "nlc" || p.status === "pending" || p.status === "rejected") continue;
      if (trainingPct(p.user_id) >= 100) continue; // fully trained

      const days = daysInactive(p.last_active_at);
      if (days < 3) continue;

      // Get team info
      const team = p.team_id ? teamMap.get(p.team_id) : null;
      const pillarLeader = team?.leader_id ? pillarProfileMap.get(team.leader_id) : null;

      inactiveUsers.push({
        ...p,
        days_inactive: days,
        role: role || "rookie",
        team_name: team?.name || "Unknown",
        pillar_leader: pillarLeader,
        pillar_name: pillarLeader?.full_name || null,
      });
    }

    if (!inactiveUsers.length) {
      // Resolve any previously tracked inactive users who are now active
      await supabase
        .from("inactive_users_log")
        .update({ resolved_at: now.toISOString(), updated_at: now.toISOString() })
        .is("resolved_at", null);

      return new Response(
        JSON.stringify({ message: "No inactive users found", emails_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 6. Get existing inactive_users_log ──
    const { data: existingLogs } = await supabase
      .from("inactive_users_log")
      .select("*")
      .is("resolved_at", null);

    const logMap = new Map<string, any>();
    (existingLogs || []).forEach((l: any) => logMap.set(l.user_id, l));

    // ── 7. Compute team stats for pillar emails ──
    function teamStats(teamId: string | null) {
      if (!teamId) return { activeCount: 0, inactiveCount: 0, avgTraining: 0 };
      const teamMembers = (allProfiles || []).filter((p: any) => p.team_id === teamId && roleMap.get(p.user_id) !== "admin");
      const activeCount = teamMembers.filter((p: any) => daysInactive(p.last_active_at) < 3).length;
      const inactiveCount = teamMembers.filter((p: any) => daysInactive(p.last_active_at) >= 3).length;
      const avgTraining = teamMembers.length
        ? Math.round(teamMembers.reduce((s: number, p: any) => s + trainingPct(p.user_id), 0) / teamMembers.length)
        : 0;
      return { activeCount, inactiveCount, avgTraining };
    }

    // Find top rookie per team for day-4 email
    function topRookieForTeam(teamId: string | null) {
      if (!teamId) return null;
      const rookies = (allProfiles || [])
        .filter((p: any) => p.team_id === teamId && roleMap.get(p.user_id) === "rookie")
        .map((p: any) => ({ name: firstName(p.full_name), pct: trainingPct(p.user_id) }))
        .sort((a: any, b: any) => b.pct - a.pct);
      return rookies[0] || null;
    }

    // ── 8. Send emails & create notifications ──
    let userEmailsSent = 0;
    let pillarEmailsSent = 0;
    let notificationsCreated = 0;

    for (const user of inactiveUsers) {
      const existingLog = logMap.get(user.user_id);
      const dayCount = user.days_inactive;

      // Upsert inactive_users_log
      if (!existingLog) {
        await supabase.from("inactive_users_log").upsert({
          user_id: user.user_id,
          started_inactive_at: user.last_active_at || now.toISOString(),
          days_count: dayCount,
          email_day_3_sent: false,
          email_day_4_sent: false,
          resolved_at: null,
          updated_at: now.toISOString(),
        }, { onConflict: "user_id" });
      } else {
        await supabase
          .from("inactive_users_log")
          .update({ days_count: dayCount, updated_at: now.toISOString() })
          .eq("user_id", user.user_id);
      }

      const alreadySentDay3 = existingLog?.email_day_3_sent || false;
      const alreadySentDay4 = existingLog?.email_day_4_sent || false;

      // ── DAY 3: send first email ──
      if (dayCount >= 3 && !alreadySentDay3) {
        const pct = trainingPct(user.user_id);
        const email = buildDay3Email(user, pct, appUrl);

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({ from: fromEmail, to: [user.email], subject: email.subject, html: email.html }),
          });

          if (res.ok) {
            userEmailsSent++;
            await supabase.from("inactivity_email_log").insert({
              user_id: user.user_id,
              email_type: "day_3_user",
              subject: email.subject,
              recipient_email: user.email,
              days_inactive: dayCount,
            });
          } else {
            console.error(`Day3 user email failed for ${user.email}:`, await res.text());
          }
        } catch (e) {
          console.error(`Day3 user email error for ${user.email}:`, e);
        }
        await delay(600);

        // Send pillar CC email
        if (user.pillar_leader) {
          const ts = teamStats(user.team_id);
          const pe = buildPillarEmail(
            user.pillar_leader.full_name, user.full_name, user.role,
            user.team_name, user.last_active_at, pct, dayCount,
            ts.activeCount, ts.inactiveCount, ts.avgTraining,
          );

          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
              body: JSON.stringify({ from: fromEmail, to: [user.pillar_leader.email], subject: pe.subject, html: pe.html }),
            });
            if (res.ok) {
              pillarEmailsSent++;
              await supabase.from("inactivity_email_log").insert({
                user_id: user.user_id,
                email_type: "day_3_pillar",
                subject: pe.subject,
                recipient_email: user.pillar_leader.email,
                days_inactive: dayCount,
              });
            } else {
              console.error(`Day3 pillar email failed:`, await res.text());
            }
          } catch (e) {
            console.error(`Day3 pillar email error:`, e);
          }
          await delay(600);
        }

        // Create in-app notification for pillar (skip if pillar IS the inactive user)
        if (user.pillar_leader && user.pillar_leader.user_id !== user.user_id) {
          // Dedup: skip if a similar notification was already created today
          const todayStr = new Date().toISOString().split("T")[0];
          const { count: existingNotif } = await supabase
            .from("user_notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.pillar_leader.user_id)
            .ilike("message", `%${user.full_name}%inactive%`)
            .gt("created_at", todayStr);

          if (!existingNotif || existingNotif === 0) {
            await supabase.from("user_notifications").insert({
              user_id: user.pillar_leader.user_id,
              title: "Team Inactivity Alert",
              message: `${user.full_name} has been inactive for ${dayCount} days`,
              link: "/app/team",
            });
            notificationsCreated++;
          }
        }

        // Mark day 3 sent
        await supabase
          .from("inactive_users_log")
          .update({ email_day_3_sent: true, last_email_sent_at: now.toISOString(), updated_at: now.toISOString() })
          .eq("user_id", user.user_id);
      }

      // ── DAY 4: send motivational email ──
      if (dayCount >= 4 && alreadySentDay3 && !alreadySentDay4) {
        const pct = trainingPct(user.user_id);
        const topRookie = topRookieForTeam(user.team_id);
        const email = buildDay4Email(user, pct, { topRookie, teamName: user.team_name }, appUrl);

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({ from: fromEmail, to: [user.email], subject: email.subject, html: email.html }),
          });

          if (res.ok) {
            userEmailsSent++;
            await supabase.from("inactivity_email_log").insert({
              user_id: user.user_id,
              email_type: "day_4_user",
              subject: email.subject,
              recipient_email: user.email,
              days_inactive: dayCount,
            });
          } else {
            console.error(`Day4 user email failed:`, await res.text());
          }
        } catch (e) {
          console.error(`Day4 user email error:`, e);
        }
        await delay(600);

        // Pillar CC for day 4
        if (user.pillar_leader) {
          const ts = teamStats(user.team_id);
          const pe = buildPillarEmail(
            user.pillar_leader.full_name, user.full_name, user.role,
            user.team_name, user.last_active_at, pct, dayCount,
            ts.activeCount, ts.inactiveCount, ts.avgTraining,
          );

          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
              body: JSON.stringify({ from: fromEmail, to: [user.pillar_leader.email], subject: pe.subject, html: pe.html }),
            });
            if (res.ok) {
              pillarEmailsSent++;
              await supabase.from("inactivity_email_log").insert({
                user_id: user.user_id,
                email_type: "day_4_pillar",
                subject: pe.subject,
                recipient_email: user.pillar_leader.email,
                days_inactive: dayCount,
              });
            } else {
              console.error(`Day4 pillar email failed:`, await res.text());
            }
          } catch (e) {
            console.error(`Day4 pillar email error:`, e);
          }
          await delay(600);
        }

        // Update in-app notification (skip self-notification)
        if (user.pillar_leader && user.pillar_leader.user_id !== user.user_id) {
          const todayStr = new Date().toISOString().split("T")[0];
          const { count: existingNotif } = await supabase
            .from("user_notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.pillar_leader.user_id)
            .ilike("message", `%${user.full_name}%inactive%`)
            .gt("created_at", todayStr);

          if (!existingNotif || existingNotif === 0) {
            await supabase.from("user_notifications").insert({
              user_id: user.pillar_leader.user_id,
              title: "Team Inactivity Alert",
              message: `${user.full_name} still inactive (${dayCount} days) - follow-up sent`,
              link: "/app/team",
            });
            notificationsCreated++;
          }
        }

        // Mark day 4 sent
        await supabase
          .from("inactive_users_log")
          .update({ email_day_4_sent: true, last_email_sent_at: now.toISOString(), updated_at: now.toISOString() })
          .eq("user_id", user.user_id);
      }
    }

    // ── 9. Resolve users who became active ──
    const activeAgainIds = (allProfiles || [])
      .filter((p: any) => daysInactive(p.last_active_at) < 3)
      .map((p: any) => p.user_id);

    if (activeAgainIds.length) {
      await supabase
        .from("inactive_users_log")
        .update({ resolved_at: now.toISOString(), updated_at: now.toISOString() })
        .is("resolved_at", null)
        .in("user_id", activeAgainIds);

      // Track return metrics on email logs
      for (const uid of activeAgainIds) {
        // Check if they had emails sent in last 24h/48h/7d
        const { data: recentEmails } = await supabase
          .from("inactivity_email_log")
          .select("id, sent_at")
          .eq("user_id", uid)
          .eq("returned_within_7d", false)
          .order("sent_at", { ascending: false })
          .limit(5);

        for (const email of (recentEmails || [])) {
          const sentAt = new Date(email.sent_at).getTime();
          const diff = now.getTime() - sentAt;
          const updates: any = { returned_within_7d: diff <= 7 * 24 * 60 * 60 * 1000 };
          if (diff <= 24 * 60 * 60 * 1000) updates.returned_within_24h = true;
          if (diff <= 48 * 60 * 60 * 1000) updates.returned_within_48h = true;
          await supabase.from("inactivity_email_log").update(updates).eq("id", email.id);
        }
      }
    }

    const result = {
      message: "Inactivity check complete",
      inactive_users_found: inactiveUsers.length,
      user_emails_sent: userEmailsSent,
      pillar_emails_sent: pillarEmailsSent,
      notifications_created: notificationsCreated,
    };

    console.log(JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in check-inactivity:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
