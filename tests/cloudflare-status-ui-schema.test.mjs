import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../server-game/current/GMWW.html", import.meta.url), "utf8");
const match = html.match(/<script>\s*(\/\* GMWW Cloudflare maintenance[\s\S]*?)<\/script>/);
assert.ok(match, "Server settings Cloudflare status reader exists");
const script = match[1];

async function renderStatus(report) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      const handlers = {};
      elements.set(id, {
        id, handlers, textContent: "", hidden: true, dataset: {},
        addEventListener(name, callback) { handlers[name] = callback; },
        setAttribute() {}
      });
    }
    return elements.get(id);
  };
  const document = {
    readyState: "complete",
    getElementById: element,
    addEventListener() {}
  };
  const body = "<!-- GMWW_CF_STATUS_START -->\n" + JSON.stringify(report) +
    "\n<!-- GMWW_CF_STATUS_END -->";
  const fetch = async () => ({ ok: true, json: async () => ({ body }) });
  runInNewContext(script, {
    document, fetch, Date, JSON, Number, String, Error,
    window: { location: { assign() {} } }
  });
  element("gmwwCloudflareOpen").handlers.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  return element;
}

for (const schema of [1, 2]) {
  test("iPhone Server accepts verified Cloudflare status schema " + schema, async () => {
    const element = await renderStatus({
      schema, productionProtected: true, namespaceCount: 33,
      previewCount: 32, eligibleCount: 0, deletedCount: 0,
      state: "success", mode: "scan",
      updatedAt: "2026-10-23T13:09:36.425Z"
    });
    assert.equal(element("gmwwCfState").textContent, "ĐÃ KIỂM TOÁN");
    assert.equal(element("gmwwCfNamespaces").textContent, "33");
    assert.equal(element("gmwwCfPreviews").textContent, "32");
    assert.equal(element("gmwwCfDeleted").textContent, "0");
  });
}

for (const schema of [2, 3]) {
  test("iPhone Server rejects unverified report, schema " + schema, async () => {
    const element = await renderStatus({
      schema, productionProtected: schema === 3,
      namespaceCount: 33, previewCount: 32, eligibleCount: 0,
      deletedCount: 0, mode: "scan", updatedAt: "2026-10-23T13:09:36.425Z"
    });
    assert.equal(element("gmwwCfState").textContent, "KHÔNG KẾT NỐI");
    assert.match(element("gmwwCfLastRun").textContent, /chưa xác minh an toàn Production/);
  });
}
