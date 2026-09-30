const VERSION = "V2.01";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        project: "GMWW-V2.00",
        version: VERSION,
        status: "healthy"
      });
    }

    return new Response(
      `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GMWW V2.01</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#eef7ff;font-family:system-ui,sans-serif}.card{padding:28px;border:1px solid #28435f;border-radius:20px;background:#0d1b2b;text-align:center;box-shadow:0 20px 60px #0006}h1{margin:0 0 8px}p{margin:0;color:#9fc3df}</style></head><body><main class="card"><h1>GMWW V2.01</h1><p>Foundation online • Cloudflare Worker</p></main></body></html>`,
      { headers: { "content-type": "text/html; charset=UTF-8" } }
    );
  }
};
