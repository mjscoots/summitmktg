import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Core tables captured in each snapshot. Keep this list explicit so a new
// table never silently lands in a backup without being reviewed.
const CORE_TABLES = [
  "profiles",
  "user_roles",
  "teams",
  "downline_edges",
  "recruiting_leads",
  "recruiting_ref_codes",
  "leaderboard_points",
  "point_events",
  "lesson_progress",
  "training_courses",
  "training_modules",
  "training_lessons",
  "training_content",
  "scripts",
  "training_drills",
  "calendar_events",
  "calendar_attendance",
  "chat_channels",
  "chat_messages",
  "action_items",
  "rep_triage",
  "rep_commission",
  "rep_housing",
  "rep_logistics",
  "car_groups",
  "car_group_members",
  "badge_definitions",
  "user_badges",
  "seasons",
  "season_results",
  "season_checklist_items",
  "incentives",
  "weekly_awards",
  "weekly_reports",
  "manager_meeting_submissions",
  "weekly_one_on_ones_rookie",
  "weekly_one_on_ones_manager",
  "applications",
  "daily_login_streaks",
  "assistant_faq",
  "recruiting_faq",
  "recruiting_timeline",
  "recruiting_testimonials",
  "app_settings",
  "audit_log",
];

const KEEP = 8;
const PAGE = 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── Authorize: cron secret OR an admin/owner JWT ───────────────────
  let source = "cron";
  const cronSecret = Deno.env.get("BACKUP_CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  const secretOk = !!cronSecret && providedSecret === cronSecret;

  if (!secretOk) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roles ?? []).some((r: { role: string }) =>
      r.role === "admin" || r.role === "owner"
    );
    if (!allowed) return json({ error: "Forbidden" }, 403);
    source = "manual";
  }

  try {
    const snapshot: Record<string, unknown[]> = {};
    const skipped: string[] = [];
    let rowCount = 0;

    for (const table of CORE_TABLES) {
      const rows: unknown[] = [];
      let from = 0;
      for (;;) {
        const { data, error } = await admin
          .from(table)
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) {
          skipped.push(table);
          break;
        }
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      if (!skipped.includes(table)) {
        snapshot[table] = rows;
        rowCount += rows.length;
      }
    }

    const takenAt = new Date();
    const stamp = takenAt.toISOString().replace(/[:.]/g, "-");
    const path = `snapshots/summit-${stamp}.json`;
    const payload = JSON.stringify(
      { taken_at: takenAt.toISOString(), source, tables: Object.keys(snapshot), data: snapshot },
      null,
      0,
    );
    const bytes = new TextEncoder().encode(payload);

    const { error: uploadErr } = await admin.storage
      .from("backups")
      .upload(path, bytes, { contentType: "application/json", upsert: false });
    if (uploadErr) return json({ error: `Upload failed: ${uploadErr.message}` }, 500);

    const { error: insertErr } = await admin.from("backup_snapshots").insert({
      storage_path: path,
      file_bytes: bytes.byteLength,
      table_count: Object.keys(snapshot).length,
      row_count: rowCount,
      trigger_source: source,
    });
    if (insertErr) console.error("snapshot row insert failed", insertErr.message);

    // ── Retention: keep the newest KEEP snapshots ─────────────────────
    const { data: all } = await admin
      .from("backup_snapshots")
      .select("id, storage_path")
      .order("created_at", { ascending: false });
    const stale = (all ?? []).slice(KEEP);
    if (stale.length) {
      await admin.storage.from("backups").remove(stale.map((s) => s.storage_path));
      await admin.from("backup_snapshots").delete().in("id", stale.map((s) => s.id));
    }

    return json({
      ok: true,
      path,
      bytes: bytes.byteLength,
      tables: Object.keys(snapshot).length,
      rows: rowCount,
      skipped,
      pruned: stale.length,
    });
  } catch (e) {
    console.error("backup failed", e instanceof Error ? e.message : String(e));
    return json({ error: "Backup failed" }, 500);
  }
});
