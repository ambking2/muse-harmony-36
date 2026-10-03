import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type ServerEnv = {
  SHAZAM_API_KEY?: string;
  SHAZAM_SERVICE_URL?: string;
};

const DEFAULT_SHAZAM_SERVICE_URL =
  "https://muse-harmony-36-production.up.railway.app";
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handleShazam(request: Request, env: ServerEnv): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  const apiKey = env.SHAZAM_API_KEY?.trim();
  if (!apiKey) {
    return json({ error: "Shazam service is not configured" }, 503);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return json({ error: "Expected multipart/form-data" }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
    return json({ error: "Audio file is too large" }, 413);
  }

  const serviceUrl = (
    env.SHAZAM_SERVICE_URL?.trim() || DEFAULT_SHAZAM_SERVICE_URL
  ).replace(/\/$/, "");

  try {
    const upstream = await fetch(`${serviceUrl}/api/recognize`, {
      method: "POST",
      headers: {
        "content-type": contentType,
        "x-muse-shazam-key": apiKey,
      },
      body: request.body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ??
          "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Shazam proxy failed", error);
    return json({ error: "Recognition service unavailable" }, 502);
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/shazam") {
        return await handleShazam(request, (env ?? {}) as ServerEnv);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
