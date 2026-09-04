// POST /api/intake  — form submission -> CALL-E phone interview
import { json, regionFor } from "../_lib.js";
import { intakeTask, RESULT_SCHEMA } from "../_intake.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }

  const name = (body.name || "").trim().slice(0, 120);
  const phone = (body.phone || "").replace(/[^\d+]/g, "");
  const lang = body.lang === "es" ? "es" : "en";
  const locale = (body.locale || "").trim();
  const matterHint = (body.matter || "").trim().slice(0, 500);
  if (!name || !/^\+\d{8,15}$/.test(phone) || body.consent !== true) {
    return json({ error: "missing_fields" }, 400);
  }
  const reg = regionFor(phone);
  if (!reg) return json({ error: "unsupported_country" }, 400);
  const chosen = reg.locales.find(([code]) => code === locale) || reg.locales[0];
  const interviewLang = chosen[0].startsWith("es") ? "es" : "en";

  const id = "intake_" + crypto.randomUUID();
  const firm = env.FIRM_NAME || "the firm";
  const webhook = new URL("/api/calle-webhook?s=" + encodeURIComponent(env.WEBHOOK_SECRET || ""), request.url).toString();

  const res = await fetch(`${env.CALLE_BASE_URL || "https://api.heycall-e.com"}/v1/calls`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CALLE_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": id,
    },
    body: JSON.stringify({
      task: intakeTask({ lang: interviewLang, firm, name, matterHint }),
      recipients: [{ phones: [phone], region: reg.region, locale: chosen[0] }],
      recipient_result_schema: RESULT_SCHEMA,
      webhook_url: webhook,
      metadata: { intake_id: id, form_lang: lang },
    }),
  });
  const calle = await res.json().catch(() => ({}));
  if (!res.ok || calle.status === "failed") {
    const msg = calle?.error?.message || calle?.failure_message || `CALL-E error ${res.status}`;
    return json({ error: "calle_rejected", message: msg }, 502);
  }

  const record = {
    id, created_at: new Date().toISOString(), status: "calling",
    form: { name, phone, lang, matter: matterHint, locale: chosen[0], region: reg.region },
    call_id: calle.id, calle_status: calle.status, result: null, transcript: null, summary: null,
    reminders: [],
  };
  await env.INTAKES.put(id, JSON.stringify(record));
  await env.INTAKES.put("bycall:" + calle.id, id);
  return json({ ok: true, id, call_id: calle.id, interview_language: chosen[1] });
}
