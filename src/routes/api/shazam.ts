import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_SHAZAM_SERVICE_URL =
  "https://muse-harmony-36-production.up.railway.app";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getRuntimeEnv() {
  return (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
}

async function recognize(request: Request) {
  if (request.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const env = getRuntimeEnv();
  const serviceUrl =
    env?.SHAZAM_SERVICE_URL?.replace(/\/$/, "") ||
    DEFAULT_SHAZAM_SERVICE_URL;
  const apiKey = env?.SHAZAM_API_KEY || "";

  if (!apiKey) {
    console.error("SHAZAM_API_KEY is not configured");
    return json({ error: "shazam service is not configured" }, 503);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return json({ error: "multipart/form-data required" }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
    return json({ error: "audio file too large" }, 413);
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) {
    return json({ error: "audio file required" }, 400);
  }

  if (body.byteLength > MAX_AUDIO_BYTES + 1024 * 1024) {
    return json({ error: "audio file too large" }, 413);
  }

  try {
    const upstream = await fetch(`${serviceUrl}/api/recognize`, {
      method: "POST",
      headers: {
        "content-type": contentType,
        "X-Muse-Shazam-Key": apiKey,
      },
      body,
    });

    const responseBody = await upstream.text();

    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Shazam upstream request failed", error);
    return json({ error: "shazam service unavailable" }, 502);
  }
}

export const Route = createFileRoute("/api/shazam")({
  server: {
    handlers: {
      POST: ({ request }) => recognize(request),
    },
  },
});
