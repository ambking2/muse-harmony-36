import { createFileRoute } from "@tanstack/react-router";

import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  currentUser,
  login,
  logout,
  recover,
  register,
} from "@/lib/server/auth";
import { storageMode } from "@/lib/server/db";

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function sessionCookie(token: string) {
  return {
    "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000,
    )}`,
  };
}

const CLEAR_COOKIE = {
  "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
};

function readToken(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "";

  if (request.method === "GET") {
    if (action === "me") {
      const username = await currentUser(readToken(request));
      return json({ username, mode: await storageMode() });
    }
    if (action === "mode") return json({ mode: await storageMode() });
    return json({ error: "unknown action" }, 400);
  }

  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
    code?: string;
  };

  if (action === "register") {
    // A throw here used to come back as a blank crash page with no way to tell
    // what had gone wrong. Password hashing on a host with a tight CPU budget is
    // the kind of thing that throws, so the message is passed on rather than
    // swallowed.
    const result = await register(body.username ?? "", body.password ?? "").catch(
      (err: unknown) => {
        throw new Error(`ثبت‌نام انجام نشد: ${err instanceof Error ? err.message : String(err)}`);
      },
    );
    if (!result.ok) return json(result, 400);
    return json(result, 200, sessionCookie(result.token));
  }

  if (action === "login") {
    const result = await login(body.username ?? "", body.password ?? "");
    if (!result.ok) return json(result, 401);
    return json(result, 200, sessionCookie(result.token));
  }

  if (action === "recover") {
    const result = await recover(body.username ?? "", body.code ?? "", body.password ?? "");
    if (!result.ok) return json(result, 400);
    return json({ ok: true }, 200, CLEAR_COOKIE);
  }

  if (action === "logout") {
    const token = readToken(request);
    if (token) await logout(token);
    return json({ ok: true }, 200, CLEAR_COOKIE);
  }

  return json({ error: "unknown action" }, 400);
}

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
