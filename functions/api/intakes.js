// GET /api/intakes?token=…[&sync=1]   — attorney review list (newest first)
import { json } from "../_lib.js";
import { syncIntake } from "../_calle.js";

function authed(request, env) {
  const t = new URL(request.url).searchParams.get("token") || request.headers.get("x-review-token");
  return env.REVIEW_TOKEN && t === env.REVIEW_TOKEN;
}

export async function onRequestGet({ request, env }) {
  if (!authed(request, env)) return json({ error: "forbidden" }, 403);
  const sync = new URL(request.url).searchParams.get("sync") === "1";
  const list = await env.INTAKES.list({ prefix: "intake_" });
  const out = [];
  for (const k of list.keys) {
    let rec = JSON.parse(await env.INTAKES.get(k.name));
    if (sync && rec.status === "calling") rec = await syncIntake(env, rec.id) || rec;
    out.push(rec);
  }
  out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return json({ intakes: out });
}
