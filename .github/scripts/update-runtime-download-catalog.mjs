import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_REPO = 'WilliamPham0702/GMWW-V2.00';

export function buildCatalog(releases, repo = DEFAULT_REPO) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('Invalid repository');
  if (!Array.isArray(releases)) throw new Error('Releases must be an array');
  const origin = 'https://github.com/' + repo + '/releases/download/';
  const byVersion = new Map();
  for (const release of releases) {
    if (!release || release.draft || release.prerelease) continue;
    const tag = /^gmww-(runtime-)?v(3\.\d+)$/.exec(String(release.tag_name || ''));
    if (!tag) continue;
    const version = tag[2];
    const name = 'GMWW-Runtime-V' + version + '.gmwwupdate';
    const files = Array.isArray(release.assets) ? release.assets : [];
    const file = files.find(x => x.name === name && typeof x.browser_download_url === 'string' &&
      x.browser_download_url.startsWith(origin + encodeURIComponent(release.tag_name) + '/'));
    if (!file) continue;
    const sha = files.find(x => x.name === name + '.sha256' &&
      typeof x.browser_download_url === 'string' &&
      x.browser_download_url.startsWith(origin + encodeURIComponent(release.tag_name) + '/'));
    const old = byVersion.get(version);
    if (old && (tag[1] || !old.native)) continue;
    byVersion.set(version, { version, file, sha, release, native: Boolean(tag[1]) });
  }
  const versions = [...byVersion.values()].sort((a,b) =>
    Number(b.version.split('.')[1]) - Number(a.version.split('.')[1]));
  const lines = [
    '# KHO TẢI RUNTIME GMWW',
    '',
    '📦 **Tải trực tiếp các file Runtime gốc trên GitHub Releases. Không có file sao chép.**',
    '',
    '**Cách dùng:** Nhấn **Tải Runtime** ở phiên bản cần dùng. SHA-256 dùng để xác minh file.',
    '',
    'Chỉ hiển thị bản đã được phát hành với file thật trên GitHub. Bản đang trong PR chưa xuất hiện.',
    '',
    '| Phiên bản | File cập nhật gốc | SHA-256 | Thông tin |',
    '|:--|:--|:--|:--|',
  ];
  for (const x of versions) {
    const releaseUrl = 'https://github.com/' + repo + '/releases/tag/' + encodeURIComponent(x.release.tag_name);
    lines.push('| **V' + x.version + '** | [⬇️ Tải Runtime](' + x.file.browser_download_url +
      ') | ' + (x.sha ? '[Kiểm tra](' + x.sha.browser_download_url + ')' : '—') +
      ' | [Chi tiết](' + releaseUrl + ') |');
  }
  lines.push('', '---', '',
    '**' + versions.length + ' phiên bản Runtime duy nhất.** Ưu tiên file Production nếu cùng phiên bản được phát hành qua hai kênh.',
    '',
    'Danh mục chỉ chứa các đường dẫn; không nhân đôi file .gmwwupdate. Không ảnh hưởng IPA, Worker, Oracle hoặc dữ liệu.',
    '');
  return lines.join('\n');
}

export async function fetchAllReleases(repo = DEFAULT_REPO, token = process.env.GH_TOKEN) {
  const releases = [];
  for (let page = 1; page <= 100; page++) {
    const response = await fetch('https://api.github.com/repos/' + repo + '/releases?per_page=100&page=' + page, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'gmww-download-index',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    });
    if (!response.ok) throw new Error('GitHub releases API: HTTP ' + response.status);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Unexpected GitHub release response');
    releases.push(...batch);
    if (batch.length < 100) return releases;
  }
  throw new Error('Too many release pages; refusing incomplete catalog');
}

async function main() {
  const output = process.argv[2];
  if (!output) throw new Error('Output path required');
  const repo = process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
  await writeFile(output, buildCatalog(await fetchAllReleases(repo), repo));
  console.log('Refreshed download index using GitHub Release URLs (no binaries copied).');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
