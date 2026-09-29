import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://music-api.gdstudio.xyz/api.php";

async function proxy(request: Request) {
  const url = new URL(request.url);
  const target = `${UPSTREAM}${url.search}`;
  const type = url.searchParams.get("types") ?? "";

  // Artwork is fetched in two steps — resolve the CDN URL, then download the
  // image — and every cover in a list pays for both. A (source, pic id, size)
  // always resolves to the same picture, so those lookups can be cached hard;
  // everything else is live data and keeps a short TTL.
  const isPic = type === "pic";
  const cacheControl = isPic
    ? "public, max-age=31536000, immutable"
    : "public, max-age=60, s-maxage=60";

  try {
    const res = await fetch(target, {
      headers: { "user-agent": "Mozilla/5.0 muis-lovable/1.0" },
    });
    // Upstream frequently returns 5xx for individual providers (e.g. joox pic).
    // Never propagate those — the frontend just wants a graceful empty payload
    // so the UI can fall back (placeholder art, next provider, etc.).
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `upstream ${res.status}`, url: "" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          // An upstream failure is not a stable answer, so don't let it stick
          // for a year the way a real artwork URL does.
          "cache-control": "public, max-age=30",
          "access-control-allow-origin": "*",
        },
      });
    }
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": cacheControl,
        "access-control-allow-origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), url: "", type }), {
      status: 200,
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
