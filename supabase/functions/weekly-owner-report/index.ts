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

function stage(n: number, base: number) {
  if (!base) return "0%";
  return `${Math.round((n / base) * 100)}%`;
}

function buildHtml(weekEnding: string, p: any): string {
  const f = p?.funnel || {};
  const pf = p?.prev_funnel || {};
  const wb = p?.winback || {};
  const risk: any[] = Array.isArray(p?.risk) ? p.risk : [];
  const delta = (a: number, b: number) => {
    const d = (a || 0) - (b || 0);
    return d === 0 ? "±0" : d > 0 ? `+${d}` : `${d}`;
  };
  const row = (label: string, key: string) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${label}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${f[key] ?? 0}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${stage(f[key] ?? 0, f.submitted ?? 0)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#666">${delta(f[key], pf[key])}</td></tr>`;

  return `<!doctype html><html><body style="background:#ffffff;font-family:Arial,sans-serif;color:#111">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <p style="color:#8a7a3d;letter-spacing:2px;font-size:11px;margin:0 0 4px">SUMMIT TRINITY · OWNER REPORT</p>
    <h1 style="font-size:22px;margin:0 0 16px">Week ending ${weekEnding}</h1>

    <p style="font-size:15px;margin:0 0 20px">
      <strong>${p?.signs ?? 0}</strong> signs this week ·
      <strong>${p?.returning ?? 0}</strong> returning ·
      <strong>${p?.queue_open ?? 0}</strong> open admin queue items
    </p>

    <h2 style="font-size:15px;margin:0 0 8px">Recruiting funnel (leads submitted this week)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="color:#666;font-size:12px;text-transform:uppercase">
        <th align="left" style="padding:6px 12px">Stage</th><th align="right" style="padding:6px 12px">Count</th>
        <th align="right" style="padding:6px 12px">%</th><th align="right" style="padding:6px 12px">vs last wk</th>
      </tr>
      ${row("Submitted", "submitted")}${row("Claimed", "claimed")}${row("Contacted", "contacted")}${row("Booked", "booked")}${row("Signed", "signed")}
    </table>

    <h2 style="font-size:15px;margin:24px 0 8px">Win-back activity</h2>
    <p style="font-size:14px;margin:0">
      ${wb.calls ?? 0} calls logged by ${wb.callers ?? 0} reps · ${wb.coming_back ?? 0} coming back
    </p>

    <h2 style="font-size:15px;margin:24px 0 8px">Rep risk list (no activity 5+ days)</h2>
    ${
      risk.length === 0
        ? `<p style="font-size:14px;margin:0;color:#666">Nobody flagged.</p>`
        : `<ul style="font-size:14px;margin:0;padding-left:18px">${risk
            .map((r) => `<li>${r.name} — ${r.days == null ? "never active" : `${r.days}d`}</li>`)
            .join("")}</ul>`
    }
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
    // Falls back to Resend's shared sender so an unverified custom domain cannot
    // turn a successful report generation into a failed request.
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Summit <onboarding@resend.dev>";

    // --- auth: cron secret OR an admin/owner JWT ---
    const cronHeader = req.headers.get("x-cron-secret");
    let authorized = !!(CRON_SECRET && cronHeader && cronHeader === CRON_SECRET);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (!authorized) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
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

    // --- generate this week's report (idempotent) ---
    const { data: gen, error: genErr } = await admin.rpc("generate_weekly_report");
    if (genErr) return json({ error: genErr.message }, 500);

    const { data: latest } = await admin
      .from("weekly_reports")
      .select("week_ending, payload")
      .order("week_ending", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) return json({ generated: gen, emailed: false, reason: "no report yet" });

    const payload: any = latest.payload || {};
    if (payload.emailed_at) {
      return json({ generated: gen, emailed: false, reason: "already emailed" });
    }
    if (!RESEND_API_KEY) {
      return json({ generated: gen, emailed: false, reason: "email not configured" });
    }

    // --- recipients: owners (fall back to admins) ---
    const { data: ownerRoles } = await admin.from("user_roles").select("user_id, role").in("role", ["owner", "admin"]);
    const ownerIds = (ownerRoles || []).filter((r: any) => r.role === "owner").map((r: any) => r.user_id);
    const ids = ownerIds.length ? ownerIds : (ownerRoles || []).map((r: any) => r.user_id);
    const { data: recips } = await admin.from("profiles").select("email").in("user_id", ids);
    const emails = (recips || []).map((r: any) => r.email).filter((e: string) => !!e);
    if (emails.length === 0) return json({ generated: gen, emailed: false, reason: "no recipients" });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: emails,
        subject: `Weekly report — week ending ${latest.week_ending}`,
        html: buildHtml(latest.week_ending, payload),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend failed [${res.status}]: ${body}`);
      // The report itself generated fine; email delivery is a separate concern, so
      // this stays a 200 and the admin screen renders the stored report.
      return json({ generated: gen, emailed: false, reason: "email delivery failed", status: res.status });
    }

    await admin
      .from("weekly_reports")
      .update({ payload: { ...payload, emailed_at: new Date().toISOString() } })
      .eq("week_ending", latest.week_ending);

    return json({ generated: gen, emailed: true, recipients: emails.length });
  } catch (e) {
    console.error("weekly-owner-report error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
