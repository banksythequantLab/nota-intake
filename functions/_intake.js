// The phone interview: task text per language + the structured result CALL-E must return.

export const RESULT_SCHEMA = {
  type: "object",
  required: ["full_name", "matter_type", "matter_summary", "urgency", "consent_to_contact"],
  properties: {
    full_name: { type: "string" },
    preferred_language: { type: "string" },
    matter_type: {
      type: "string",
      enum: ["business_formation", "contract", "international_discovery", "litigation",
             "immigration", "family", "real_estate", "employment", "other", "unknown"],
    },
    matter_summary: { type: "string", description: "2-3 sentence summary in English" },
    opposing_party: { type: "string", description: "Other side's name(s), for the conflict check, or 'none'" },
    urgency: { type: "string", enum: ["low", "normal", "high"] },
    deadline_or_court_date: { type: "string", description: "Any date mentioned, verbatim, or 'none'" },
    best_time_to_call: { type: "string" },
    consent_to_contact: { type: "string", enum: ["yes", "no", "unknown"] },
  },
};

const PREAMBLE = {
  en: `You are the intake assistant for {firm}, a law firm. You are calling {name}, who just requested a consultation through the website. Open by confirming you are speaking with {name}, then say clearly: this is an intake call to gather information, it is not legal advice, and no attorney-client relationship exists until an attorney confirms in writing.`,
  es: `Eres la asistente de admisión de {firm}, un despacho de abogados. Estás llamando a {name}, quien acaba de solicitar una consulta por el sitio web. Empieza confirmando que hablas con {name}; luego di claramente: esta es una llamada de admisión para recopilar información, no es asesoría legal, y no existe relación abogado-cliente hasta que un abogado lo confirme por escrito.`,
};

const QUESTIONS = {
  en: `Then, conversationally, learn: (1) their full name as they want it written; (2) what the legal matter is about, in their own words — ask one follow-up if unclear; (3) the name of any other party involved (person or company), which the firm needs for a conflict check; (4) whether there is any deadline, court date or hearing coming up, and when; (5) how urgent this feels to them; (6) the best day and time to reach them; (7) whether they consent to the firm contacting them by phone and email. Do not quote fees, do not give legal advice, do not promise outcomes. If they ask a legal question, say an attorney will address it in the consultation. Keep the call under four minutes. Close by saying an attorney will review and the firm will follow up.`,
  es: `Después, de forma conversacional, averigua: (1) su nombre completo tal como quiere que se escriba; (2) de qué trata el asunto legal, en sus propias palabras — haz una pregunta de seguimiento si no queda claro; (3) el nombre de cualquier otra parte involucrada (persona o empresa), que el despacho necesita para verificar conflictos de interés; (4) si hay alguna fecha límite, fecha de corte o audiencia próxima, y cuándo; (5) qué tan urgente le parece; (6) el mejor día y hora para localizarle; (7) si da su consentimiento para que el despacho le contacte por teléfono y correo electrónico. No menciones honorarios, no des asesoría legal, no prometas resultados. Si hace una pregunta legal, di que un abogado la responderá en la consulta. Mantén la llamada por debajo de cuatro minutos. Cierra diciendo que un abogado revisará la información y el despacho se comunicará.`,
};

// TTS reads "Nota.Lawyer" as "Nota dot Lawyer" — speak the brand without the dot.
const spoken = (firm) => String(firm || "the firm").replace(/\./g, " ").replace(/\s+/g, " ").trim();

export function intakeTask({ lang, firm, name, matterHint }) {
  const l = lang === "es" ? "es" : "en";
  firm = spoken(firm);
  const hint = matterHint
    ? (l === "es" ? ` En el formulario escribió: "${matterHint}".` : ` On the form they wrote: "${matterHint}".`)
    : "";
  return PREAMBLE[l].replace(/{firm}/g, firm).replace(/{name}/g, name) + hint + " " + QUESTIONS[l];
}

export function reminderTask({ lang, firm, name, when }) {
  firm = spoken(firm);
  return lang === "es"
    ? `Eres la asistente de ${firm}. Llama a ${name} para recordarle su consulta con un abogado el ${when}. Confirma si podrá asistir; si no, pregunta qué día y hora le conviene. Sé breve y amable. No des asesoría legal.`
    : `You are the assistant for ${firm}. Call ${name} to remind them of their consultation with an attorney on ${when}. Confirm whether they can make it; if not, ask what day and time works instead. Be brief and warm. Do not give legal advice.`;
}

export const REMINDER_SCHEMA = {
  type: "object",
  required: ["confirmed"],
  properties: {
    confirmed: { type: "string", enum: ["yes", "no", "unknown"] },
    reschedule_request: { type: "string" },
  },
};
