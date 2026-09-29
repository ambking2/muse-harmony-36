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
import { isDurable } from "@/lib/server/db";

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
      return json({ username, durable: await isDurable() });
    }
    if (action === "durable") return json({ durable: await isDurable() });
    return json({ error: "unknown action" }, 400);
  }

  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  // The account database is a SQLite file on disk. Where there is no writable
  // disk — the deployed Cloudflare worker — it cannot be opened at all, so say
  // so here, where a client can act on it, rather than accepting a registration
  // that would be gone the moment the isolate recycles.
  if (!(await isDurable())) {
    return json(
      {
        error:
          "پایگاه‌داده در دسترس نیست. این نسخه روی محیطی اجرا می‌شود که دیسک ماندگار ندارد، پس ثبت‌نام و ورود ممکن نیست.",
        code: "database-unavailable",
      },
      503,
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
    code?: string;
  };

  if (action === "register") {
    const result = await register(body.username ?? "", body.password ?? "");
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
