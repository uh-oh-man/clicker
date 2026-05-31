const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const INVITE_TTL_SECONDS = 30 * 60;
const INVITE_LINK_BASE = "https://uh-oh-man.github.io/clicker/#/invite";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

const errorJson = (message, status = 400) => json({ ok: false, error: message }, status);

const makeCode = (length = 7) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
};

const readJson = async (request) => {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false, response: errorJson("Malformed JSON.", 400) };
  }
};

const loadInvite = async (env, code) => {
  const raw = await env.CLICKER_INVITES.get(code);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveInvite = (env, code, invite) =>
  env.CLICKER_INVITES.put(code, JSON.stringify(invite), {
    expirationTtl: INVITE_TTL_SECONDS,
  });

const publicInvite = (invite) => ({
  ok: true,
  code: invite.code,
  offer: invite.offer,
  hostPeerId: invite.hostPeerId,
  hostName: invite.hostName,
  answer: invite.answer ?? null,
  guestPeerId: invite.guestPeerId ?? null,
  guestName: invite.guestName ?? null,
  answeredAt: invite.answeredAt ?? null,
  createdAt: invite.createdAt,
  expiresAt: invite.expiresAt,
});

const createUniqueCode = async (env) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = makeCode();
    if (!(await env.CLICKER_INVITES.get(code))) return code;
  }
  throw new Error("Could not create a unique invite code.");
};

const createInvite = async (request, env) => {
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;

  const { body } = parsed;
  if (!isObject(body.offer)) return errorJson("Missing offer.", 400);

  const code = await createUniqueCode(env);
  const now = Date.now();
  const createdAt = typeof body.createdAt === "string" ? body.createdAt : new Date(now).toISOString();
  const expiresAt = new Date(now + INVITE_TTL_SECONDS * 1000).toISOString();
  const invite = {
    code,
    offer: body.offer,
    hostPeerId: typeof body.hostPeerId === "string" ? body.hostPeerId : body.offer.hostPeerId ?? "",
    hostName: typeof body.hostName === "string" ? body.hostName : body.offer.hostDisplayName ?? "Host",
    answer: null,
    createdAt,
    expiresAt,
  };

  await saveInvite(env, code, invite);

  return json({
    ok: true,
    code,
    inviteUrl: `${INVITE_LINK_BASE}/${code}`,
    expiresAt,
  });
};

const getInvite = async (env, code) => {
  const invite = await loadInvite(env, code);
  if (!invite) return errorJson("Invite not found or expired.", 404);
  return json(publicInvite(invite));
};

const submitAnswer = async (request, env, code) => {
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  if (!isObject(parsed.body.answer)) return errorJson("Missing answer.", 400);

  const invite = await loadInvite(env, code);
  if (!invite) return errorJson("Invite not found or expired.", 404);

  invite.answer = parsed.body.answer;
  invite.guestPeerId = typeof parsed.body.guestPeerId === "string" ? parsed.body.guestPeerId : parsed.body.answer.guestPeerId ?? "";
  invite.guestName = typeof parsed.body.guestName === "string" ? parsed.body.guestName : parsed.body.answer.guestDisplayName ?? "Guest";
  invite.answeredAt = new Date().toISOString();

  await saveInvite(env, code, invite);
  return json({ ok: true });
};

const getAnswer = async (env, code) => {
  const invite = await loadInvite(env, code);
  if (!invite) return errorJson("Invite not found or expired.", 404);
  return json({
    ok: true,
    answer: invite.answer ?? null,
    guestPeerId: invite.guestPeerId ?? null,
    guestName: invite.guestName ?? null,
    answeredAt: invite.answeredAt ?? null,
  });
};

const deleteInvite = async (env, code) => {
  await env.CLICKER_INVITES.delete(code);
  return json({ ok: true });
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const [api, resource, code, action, extra] = url.pathname.split("/").filter(Boolean);

    try {
      if (api !== "api" || resource !== "invite" || extra) return errorJson("Not found.", 404);
      if (request.method === "POST" && !code && !action) return createInvite(request, env);
      if (request.method === "GET" && code && !action) return getInvite(env, code);
      if (request.method === "POST" && code && action === "answer") return submitAnswer(request, env, code);
      if (request.method === "GET" && code && action === "answer") return getAnswer(env, code);
      if (request.method === "DELETE" && code && !action) return deleteInvite(env, code);
      return errorJson("Not found.", 404);
    } catch (error) {
      return errorJson(error.message || "Worker error.", 500);
    }
  },
};
