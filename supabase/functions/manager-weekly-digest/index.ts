import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
];

function getCorsHeaders(origin: string | null) {
  const isAllowed =
    origin &&
    (allowedOrigins.includes(origin) ||
      origin.endsWith(".lovable.app") ||
      origin.startsWith("http://localhost:"));
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

interface WeekRow {
  user_id: string;
  full_name: string | null;
  sales_week: number;
  training_week: number;
  last_active_at: string | null;
  late_rsvps: number;
  needs_attention: boolean;
}

function reasonFor(r: WeekRow): string {
  if (r.sales_week === 0 && r.training_week === 0) return "no sales and no training this week";
  if (!r.last_active_at) return "has never opened the app";
  const days = Math.floor((Date.now() - new Date(r.last_active_at).getTime()) / 86400000);
  if (days >= 3) return `no app open in ${days} days`;
  if (r.late_rsvps > 0) return "event answer past its deadline";
  return "new note on their profile";
}

function buildHtml(name: string, rows: WeekRow[]): string {
  const items = rows
    .map((r) => `<li>${r.full_name || "Rep"} — ${reasonFor(r)}</li>`)
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 12px">Your week</h1>
    <p style="font-size:15px;margin:0 0 16px">${name}, ${rows.length} ${
    rows.length === 1 ? "rep needs" : "reps need"
  } attention this week.</p>
    <ul style="font-size:14px;padding-left:18px;margin:0">${items}</ul>
    <p style="font-size:13px;color:#666;margin:20px 0 0">Open My week in the app for the full list.</p>
  </div></body></html>`;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const CRON_SECRET = Deno.env.get("WEEKLY_REPORT_CRON_SECRET");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const cronHeader = req.headers.get("x-cron-secret");
    let authorized = !!(CRON_SECRET && cronHeader && cronHeader === CRON_SECRET);

    if (!authorized) {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      if (!token) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await userClient.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return json({ error: "Unauthorized" }, 401);
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
      authorized = (roles || []).some((r: any) => r.role === "admin" || r.role === "owner");
      if (!authorized) return json({ error: "Forbidden" }, 403);
    }

    // Optional: run for one manager only (used for verification runs)
    let onlyUser: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.only_user === "string") onlyUser = body.only_user;
    } catch {
      // no body
    }

    const { data: roleRows } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["manager", "president", "admin", "owner"]);

    let managerIds = Array.from(new Set((roleRows || []).map((r: any) => r.user_id as string)));
    if (onlyUser) managerIds = managerIds.filter((id) => id === onlyUser);

    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", managerIds.length ? managerIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    let notified = 0;
    let emailed = 0;
    const results: { user_id: string; count: number; message: string }[] = [];

    for (const id of managerIds) {
      const { data, error } = await admin.rpc("get_manager_week", { _manager: id });
      if (error) {
        console.error(`get_manager_week failed for ${id}: ${error.message}`);
        continue;
      }
      const rows = (((data as any)?.rows || []) as WeekRow[]).filter((r) => r.needs_attention);
      if (rows.length === 0) continue;

      const message = `${rows.length} ${rows.length === 1 ? "rep needs" : "reps need"} attention this week — open My week`;
      const { error: nErr } = await admin.from("user_notifications").insert({
        user_id: id,
        title: "Your week",
        message,
        link: "/app/week",
      });
      if (nErr) {
        console.error(`notification insert failed for ${id}: ${nErr.message}`);
        continue;
      }
      notified += 1;
      results.push({ user_id: id, count: rows.length, message });

      const prof: any = profileMap.get(id);
      if (RESEND_API_KEY && FROM_EMAIL && prof?.email) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [prof.email],
            subject: "Your week — reps who need attention",
            html: buildHtml((prof.full_name || "").split(" ")[0] || "Hello", rows),
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`Resend failed [${res.status}]: ${body}`);
        } else {
          emailed += 1;
        }
      }
    }

    return json({
      managers: managerIds.length,
      notified,
      emailed,
      email_configured: !!(RESEND_API_KEY && FROM_EMAIL),
      results,
    });
  } catch (e) {
    console.error("manager-weekly-digest error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
