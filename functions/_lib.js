// Shared helpers for the Nota.Lawyer intake Pages Functions.

// Country calling code -> CALL-E region + interview languages we believe are supported there.
// Verified 2026-09-04: US numbers accept en-US and REJECT Spanish (es, es-US, es-MX, even with region=MX).
// Other rows follow CALL-E's published language/region list; the API is the final arbiter and its
// rejection message is surfaced to the user verbatim.
export const REGIONS = {
  "1":   { region: "US", locales: [["en-US", "English"]] },
  "52":  { region: "MX", locales: [["es-MX", "Español"], ["en-US", "English"]] },
  "55":  { region: "BR", locales: [["pt-BR", "Português"], ["en-US", "English"]] },
  "44":  { region: "GB", locales: [["en-GB", "English"]] },
  "61":  { region: "AU", locales: [["en-AU", "English"]] },
  "91":  { region: "IN", locales: [["en-IN", "English"], ["hi", "हिन्दी"]] },
  "33":  { region: "FR", locales: [["fr", "Français"], ["en-US", "English"]] },
  "49":  { region: "DE", locales: [["de", "Deutsch"], ["en-US", "English"]] },
  "81":  { region: "JP", locales: [["ja", "日本語"], ["en-US", "English"]] },
  "84":  { region: "VN", locales: [["vi", "Tiếng Việt"], ["en-US", "English"]] },
  "65":  { region: "SG", locales: [["en-US", "English"]] },
  "971": { region: "AE", locales: [["ar", "العربية"], ["en-US", "English"]] },
};

export function regionFor(e164) {
  const digits = (e164 || "").replace(/[^\d]/g, "");
  for (const len of [3, 2, 1]) {
    const cc = digits.slice(0, len);
    if (REGIONS[cc]) return { cc, ...REGIONS[cc] };
  }
  return null;
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}
