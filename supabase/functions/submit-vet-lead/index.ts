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

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const fullName = String(body.full_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim();

    if (!fullName || !phone || !email) {
      return new Response(JSON.stringify({ error: "Name, phone and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const revenueRaw = String(body.last_season_active_revenue ?? "").replace(/[^0-9.]/g, "");
    const revenue = revenueRaw ? Number(revenueRaw) : null;

    const { data: lead, error } = await admin
      .from("vet_leads")
      .insert({
        full_name: fullName,
        phone,
        email,
        current_company: body.current_company ?? null,
        years_d2d: body.years_d2d ?? null,
        last_season_active_revenue: Number.isFinite(revenue as number) ? revenue : null,
        markets: body.markets ?? null,
        best_time_to_call: body.best_time_to_call ?? null,
        bid_requested: true,
        source_type: "public_calculator",
      })
      .select("id")
      .single();

    if (error) throw error;

    // In-app notification for owner and admins
    const { data: staff } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["owner", "admin"]);

    const recipients = [...new Set((staff ?? []).map((r: { user_id: string }) => r.user_id))];
    if (recipients.length) {
      await admin.from("user_notifications").insert(
        recipients.map((uid) => ({
          user_id: uid,
          title: "Veteran wants a bid",
          message: `${fullName} · ${phone}${body.current_company ? ` · ${body.current_company}` : ""}`,
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
