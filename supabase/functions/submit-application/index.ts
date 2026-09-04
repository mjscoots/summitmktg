import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Pass 165 - the only way an application reaches the table. The anon insert
 * policy is gone, so both public forms post here. Rate limited per visitor and
 * per email, honeypot checked, email and phone validated in the database.
 */

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
    "Vary": "Origin",
  };
}

const REJECTED = "That did not go through. Check the phone and email and try again.";
const TOO_MANY = "Too many tries. Wait an hour and try again.";

const cap = (value: unknown, max: number) => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : "";
};

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const send = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const reject = () => send({ error: REJECTED }, 400);

  try {
    const body = await req.json();

    // A filled honeypot means a bot filled the hidden field.
    if (cap(body.website, 200)) return send({ status: "ok" }, 200);

    const type = body.application_type === "vet" ? "vet" : "rookie";
    const fullName = cap(body.full_name, 120);
    const email = cap(body.email, 254).toLowerCase();
    const phone = cap(body.phone, 30);
    const cityState = cap(body.city_state, 160);
    const referralSource = cap(body.referral_source, 200);
    const vertical = cap(body.vertical, 40) || null;
    const previousCompany = cap(body.previous_company, 2000) || null;
    const yearsRaw = String(body.years_experience ?? "").replace(/[^0-9]/g, "");
    const yearsExperience = yearsRaw ? Number(yearsRaw) : null;

    if (!fullName || !email || !phone || !cityState || !referralSource) return reject();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const [{ data: emailOk }, { data: phoneOk }] = await Promise.all([
      admin.rpc("valid_public_email", { _email: email }),
      admin.rpc("valid_public_phone", { _phone: phone }),
    ]);
    if (emailOk === false || phoneOk === false) return reject();

    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const [{ data: ipAllowed }, { data: emailAllowed }] = await Promise.all([
      admin.rpc("check_rate_limit", {
        p_key: `application_ip_${ip}`,
        p_max_attempts: 5,
        p_window_seconds: 3600,
      }),
      admin.rpc("check_rate_limit", {
        p_key: `application_email_${email}`,
        p_max_attempts: 5,
        p_window_seconds: 3600,
      }),
    ]);
    if (ipAllowed === false || emailAllowed === false) return send({ error: TOO_MANY }, 429);

    const { error } = await admin.from("applications").insert({
      application_type: type,
      full_name: fullName,
      email,
      phone,
      city_state: cityState,
      referral_source: referralSource,
      vertical: vertical === "unsure" ? null : vertical,
      previous_company: previousCompany,
      years_experience: Number.isFinite(yearsExperience as number) ? yearsExperience : null,
      source_type: cap(body.source_type, 40) || "organic",
      source_code: cap(body.source_code, 60) || null,
      referrer_user_id: cap(body.referrer_user_id, 60) || null,
      partner_id: cap(body.partner_id, 60) || null,
    });
    if (error) {
      console.error("application insert failed:", error.message);
      return reject();
    }

    return send({ status: "ok" }, 200);
  } catch (e) {
    console.error("submit-application failed:", e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify({ error: REJECTED }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
