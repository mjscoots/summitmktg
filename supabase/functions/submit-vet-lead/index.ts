import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
  "http://localhost:8080",
];

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app"));
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const REJECTED = "That did not go through. Check the phone and email and try again.";

const cap = (value: unknown, max: number) => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : "";
};

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const reject = () =>
    new Response(JSON.stringify({ error: REJECTED }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const fullName = cap(body.full_name, 120);
    const phone = cap(body.phone, 30);
    const email = cap(body.email, 254).toLowerCase();
    const currentCompany = cap(body.current_company, 120);
    const yearsD2d = cap(body.years_d2d, 120);
    const markets = cap(body.markets, 2000);
    const bestTime = cap(body.best_time_to_call, 120);

    const digits = phone.replace(/[^0-9]/g, "");
    if (
      !fullName ||
      !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email) ||
      digits.length < 10 ||
      digits.length > 15
    ) {
      return reject();
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Max 5 submissions per IP per hour.
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const { data: allowed } = await admin.rpc("check_rate_limit", {
      p_key: `vet-lead:${ip}`,
      p_max_attempts: 5,
      p_window_seconds: 3600,
    });
    if (allowed === false) return reject();

    // A repeat submission inside 24 hours updates the existing row and does not
    // notify the owner a second time (enforced by a database trigger too).
    const { data: recent } = await admin
      .from("vet_leads")
      .select("id")
      .or(`email.eq.${email},phone.eq.${phone}`)
      .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .limit(1);
    const isDuplicate = (recent ?? []).length > 0;


    const revenueRaw = String(body.last_season_active_revenue ?? "").replace(/[^0-9.]/g, "");
    const revenue = revenueRaw ? Number(revenueRaw) : null;

    const { data: lead, error } = await admin
      .from("vet_leads")
      .insert({
        full_name: fullName,
        phone,
        email,
        current_company: currentCompany || null,
        years_d2d: yearsD2d || null,
        last_season_active_revenue: Number.isFinite(revenue as number) ? revenue : null,
        markets: markets || null,
        best_time_to_call: bestTime || null,
        bid_requested: true,
        source_type: "public_calculator",
      })
      .select("id")
      .maybeSingle();

    // A duplicate inside 24 hours is folded into the existing row by the
    // database trigger, so no row comes back and that is not an error.
    if (error && !isDuplicate) return reject();

    // In-app notification for owner and admins — first submission only
    const { data: staff } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["owner", "admin"]);

    const recipients = [...new Set((staff ?? []).map((r: { user_id: string }) => r.user_id))];
    if (recipients.length && !isDuplicate) {
      await admin.from("user_notifications").insert(
        recipients.map((uid) => ({
          user_id: uid,
          title: "Veteran wants a bid",
          message: `${fullName} · ${phone}${currentCompany ? ` · ${currentCompany}` : ""}`,
          link: "/app/recruits",
        })),
      );
    }


    // Email the owner and admins
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && recipients.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("email")
        .in("user_id", recipients);
      const to = (profiles ?? [])
        .map((p: { email: string | null }) => p.email)
        .filter((e: string | null): e is string => Boolean(e));

      if (to.length) {
        const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
        const rows = [
          ["Name", fullName],
          ["Phone", phone],
          ["Email", email],
          ["Current company", body.current_company ?? ""],
          ["Years in D2D", body.years_d2d ?? ""],
          ["Last season active revenue", body.last_season_active_revenue ?? ""],
          ["Markets", body.markets ?? ""],
          ["Best time to call", body.best_time_to_call ?? ""],
        ];
        const html = `
          <p><strong>${fullName}</strong> asked for a bid.</p>
          <p><a href="tel:${phone.replace(/[^0-9+]/g, "")}">Tap to call ${phone}</a></p>
          <table>${rows
            .filter(([, v]) => String(v).trim() !== "")
            .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`)
            .join("")}</table>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Summit Marketing <${from}>`,
            to,
            subject: `Veteran bid request — ${fullName}`,
            html,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, id: lead?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-vet-lead failed", e);
    return new Response(JSON.stringify({ error: "Could not save that request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
