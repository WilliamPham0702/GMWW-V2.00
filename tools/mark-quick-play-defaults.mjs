// Marks one GM Ván Mẫu per player count as the Player Web "Chơi nhanh" default.
// Usage: node tools/mark-quick-play-defaults.mjs <origin> [--apply]
// Without --apply it only prints the plan. The template config is re-sent unchanged,
// so its revision and packaged role artwork are kept.
const origin = String(process.argv[2] || '').replace(/\/$/, '');
const apply = process.argv.includes('--apply');
const token = process.env.GMWW_GM_TOKEN;
if (!token) throw new Error('GMWW_GM_TOKEN env required');
if (!/^https?:\/\//.test(origin)) throw new Error('origin required');

async function api(path, {method = 'GET', body} = {}) {
  const res = await fetch(origin + path, {
    method,
    headers: {authorization: 'Bearer ' + token, ...(body ? {'content-type': 'application/json'} : {})},
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(method + ' ' + path + ' ' + res.status + ' ' + (data.error || ''));
  return data;
}

const {templates = []} = await api('/api/gm/game-templates');
const picked = new Map(), skipped = [];
for (const meta of templates.filter(t => t.source === 'GM')) {
  const {template} = await api('/api/gm/game-templates/' + encodeURIComponent(meta.id));
  const cfg = template?.compiledConfig || {}, roles = Array.isArray(cfg.roles) ? cfg.roles : [];
  const count = Number(cfg.playerCount), sum = roles.reduce((n, r) => n + Number(r.count || 0), 0);
  const why = !Number.isInteger(count) || count < 5 || count > 30 ? 'số người ngoài 5–30'
    : sum !== count ? 'tổng vai ' + sum + ' ≠ ' + count
    : !cfg.timing?.autoAdvance ? 'chưa bật Auto chuyển lượt' : '';
  let ready = false;
  if (!why) ready = (await api('/api/gm/game-templates/' + encodeURIComponent(meta.id) + '/assets/status')).ready === true;
  if (why || !ready) { skipped.push(meta.name + ' (' + meta.id + '): ' + (why || 'thiếu ảnh thẻ vai')); continue; }
  const old = picked.get(count);
  if (!old || String(template.updatedAt || '') > String(old.updatedAt || '')) picked.set(count, template);
}
for (const [count, t] of [...picked].sort((a, b) => a[0] - b[0])) {
  console.log(count + ' người → ' + t.name + ' (' + t.id + ', rev ' + t.revision + ')' + (t.quickPlayDefault ? ' [đã là mặc định]' : ''));
  if (!apply || t.quickPlayDefault) continue;
  const saved = (await api('/api/gm/game-templates', {method: 'PUT', body: {id: t.id, quickPlayDefault: true, gameConfig: t.compiledConfig}})).template;
  if (saved.quickPlayDefault !== true || Number(saved.revision) !== Number(t.revision)) throw new Error('mark failed: ' + t.id);
}
for (const line of skipped) console.log('Bỏ qua: ' + line);
console.log(apply ? 'APPLIED ' + picked.size : 'DRY RUN ' + picked.size);
