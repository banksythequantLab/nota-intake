// Pull the authoritative call state from CALL-E and fold it into the KV intake record.
export async function syncIntake(env, intakeId) {
  const raw = await env.INTAKES.get(intakeId);
  if (!raw) return null;
  const rec = JSON.parse(raw);
  const res = await fetch(`${env.CALLE_BASE_URL || "https://api.heycall-e.com"}/v1/calls/${rec.call_id}`, {
    headers: { authorization: `Bearer ${env.CALLE_API_KEY}` },
  });
  if (!res.ok) return rec;
  const call = await res.json();
  const rcp = (call.recipients || [])[0] || {};
  const attempts = rcp.attempts || [];
  const last = attempts[attempts.length - 1] || {};

  rec.calle_status = call.status;
  rec.result = rcp.structured_result || call.structured_result || rec.result;
  rec.summary = rcp.summary || call.summary || rec.summary;
  rec.transcript = last.transcript_turns || rec.transcript;
  rec.confidence = call.completion_confidence || rec.confidence;
  rec.evidence = call.evidence || rec.evidence;
  rec.failure = call.failure_message || null;
  rec.status = call.status === "completed" ? (call.task_completed ? "interviewed" : "incomplete")
             : call.status === "failed" ? "failed" : "calling";
  rec.synced_at = new Date().toISOString();
  await env.INTAKES.put(intakeId, JSON.stringify(rec));
  return rec;
}

export function callIdFromWebhook(payload) {
  return payload?.call_id || payload?.id || payload?.data?.id || payload?.data?.call_id
      || payload?.call?.id || payload?.object?.id || null;
}
