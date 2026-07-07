import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://music-api.gdstudio.xyz/api.php";

async function proxy(request: Request) {
  const url = new URL(request.url);
  const target = `${UPSTREAM}${url.search}`;
  try {
    const res = await fetch(target, {
      headers: { "user-agent": "Mozilla/5.0 muis-lovable/1.0" },
    });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": "public, max-age=60, s-maxage=60",
        "access-control-allow-origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/gd/$")({
  server: {
    handlers: {
      GET: async ({ request }) => proxy(request),
      POST: async ({ request }) => proxy(request),
    },
  },
});