// HORIN — admin-only translation (PL <-> EN) through the Barabash AI gateway.
// The gateway key lives in the BARABASH_AI_KEY secret; the browser never sees it.

const AI_URL = "https://barabash-ai.tailcd3444.ts.net/v1/chat/completions";
const MODELS = ["qwen3.5:27b", "qwen3.5:9b"];
const LANG: Record<string, string> = { pl: "Polish", en: "English" };

const ALLOWED_ORIGINS = ["https://horin.pl", "https://www.horin.pl"];
const cors = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const ok = ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "content-type": "application/json" },
  });

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: {
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
      authorization: auth,
      "content-type": "application/json",
    },
    body: "{}",
  });
  return r.ok && (await r.json()) === true;
}

async function translate(text: string, from: string, to: string): Promise<string> {
  const system =
    `You translate website copy for HORIN, a fashion design atelier, from ${LANG[from]} to ${LANG[to]}. ` +
    "Return only the translation: no quotes around it, no notes, no explanations. " +
    "Keep the tone editorial, calm and precise, like a fashion collection description. " +
    "Preserve line breaks and blank lines between paragraphs exactly as in the source. " +
    "Keep the same letter case style as the source. " +
    "Never translate proper names: HORIN, Twój, Dawid, Letnie Brzmienia, Deformed in Concrete.";
  let lastErr = "";
  for (const model of MODELS) {
    try {
      const r = await fetch(AI_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${Deno.env.get("BARABASH_AI_KEY")}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: text },
          ],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!r.ok) { lastErr = `ai ${r.status}`; continue; }
      const out = (await r.json())?.choices?.[0]?.message?.content;
      if (typeof out === "string" && out.trim()) {
        // a one-line source (title, label) must stay one line
        return text.includes("\n") ? out.trim() : out.trim().replace(/\s*\n+\s*/g, " ");
      }
      lastErr = "empty answer";
    } catch (e) {
      lastErr = String(e);
    }
  }
  throw new Error(lastErr || "translation failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method" }, 405);
  if (!(await isAdmin(req))) return json(req, { error: "not_allowed" }, 403);

  let body: { text?: unknown; from?: unknown; to?: unknown };
  try { body = await req.json(); } catch { return json(req, { error: "bad_json" }, 400); }
  const text = typeof body.text === "string" ? body.text : "";
  const from = body.from === "en" ? "en" : "pl";
  const to = body.to === "pl" ? "pl" : "en";
  if (from === to) return json(req, { error: "same_lang" }, 400);
  if (!text.trim()) return json(req, { text: "" });
  if (text.length > 8000) return json(req, { error: "too_long" }, 400);

  try {
    return json(req, { text: await translate(text, from, to) });
  } catch (e) {
    return json(req, { error: "ai_unavailable", detail: String(e) }, 502);
  }
});
