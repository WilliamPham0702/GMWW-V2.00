import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_REPO = 'WilliamPham0702/GMWW-V2.00';
const DOWNLOAD_BASE = 'https://github.com/';

function validRepo(repo) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) &&
    repo.split('/').every(segment => segment !== '.' && segment !== '..');
}
function numericVersion(version) {
  return Number(version.split('.')[1]);
}
function releaseLink(repo, tag) {
  return DOWNLOAD_BASE + repo + '/releases/tag/' + encodeURIComponent(tag);
}
function chooseCanonical(releases, repo, kind) {
  const byVersion = new Map();
  for (const release of releases) {
    if (!release || release.draft || release.prerelease) continue;
    const m = /^gmww-(runtime-)?v(3\.\d+)$/.exec(String(release.tag_name || ''));
    if (!m) continue;
    const version = m[2];
    const name = kind === 'runtime' ?
      'GMWW-Runtime-V' + version + '.gmwwupdate' :
      'GMWW-V' + version + '.ipa';
    const prefix = DOWNLOAD_BASE + repo + '/releases/download/' +
      encodeURIComponent(release.tag_name) + '/';
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = assets.find(a => a.name === name &&
      typeof a.browser_download_url === 'string' &&
      a.browser_download_url.startsWith(prefix));
    if (!asset) continue;
    const sha = assets.find(a => a.name === name + '.sha256' &&
      typeof a.browser_download_url === 'string' &&
      a.browser_download_url.startsWith(prefix));
    const standard = release.tag_name === 'gmww-v' + version;
    const existing = byVersion.get(version);
    if (!existing || (standard && !existing.standard)) {
      byVersion.set(version, { version, asset, sha, standard, release });
    }
  }
  return [...byVersion.values()].sort((a,b) =>
    numericVersion(b.version) - numericVersion(a.version));
}
function row(entry, detailed = true) {
  const { version, asset, sha, release } = entry;
  const cells = [
    '**V' + version + '**',
    '[⬇️ Tải gốc](' + asset.browser_download_url + ')',
    sha ? '[SHA-256](' + sha.browser_download_url + ')' : '—'
  ];
  if (detailed) cells.push('[Chi tiết](' + release.html_url + ')');
  return '| ' + cells.join(' | ') + ' |';
}
export function buildCatalogs(releases, repo = DEFAULT_REPO) {
  if (!validRepo(repo)) throw new Error('Invalid repository');
  if (!Array.isArray(releases)) throw new Error('Releases must be an array');

  const runtimes = chooseCanonical(releases, repo, 'runtime');
  const ipas = chooseCanonical(releases, repo, 'ipa');
  const backups = releases.filter(r => r && !r.draft && !r.prerelease &&
    /^gmww-backup-\d{4}-\d{2}$/.test(String(r.tag_name))).flatMap(r =>
    (r.assets || []).filter(a =>
      /^GMWW-Backup-(?:runtime|ipa)-\d{4}-\d{2}-V3\.\d+\.(?:gmwwupdate|ipa)$/.test(a.name) &&
      typeof a.browser_download_url === 'string' &&
      a.browser_download_url.startsWith(DOWNLOAD_BASE + repo + '/releases/download/' + r.tag_name + '/')
    ).map(a => ({ release: r, asset: a }))
  ).sort((a,b) => (b.release.published_at || '').localeCompare(a.release.published_at || ''));

  const lines = [
    '# GMWW — KHO TẢI FILE',
    '',
    '> **Một địa chỉ tải chung.** Chỉ dẫn tới file gốc trên GitHub Releases, không lưu bản sao.',
    '',
    '## 1. RUNTIME — CẬP NHẬT THỦ CÔNG',
    '',
    '**Bản mới nhất đã xác minh trên GitHub: ' +
      (runtimes[0] ? 'V' + runtimes[0].version : 'chưa có') +
      '.** Bản gửi riêng qua ChatGPT chỉ xuất hiện tại đây sau khi được phát hành trên GitHub.',
    '',
    '| Phiên bản | Tải .gmwwupdate | Xác minh | Ghi chú |',
    '|:--|:--|:--|:--|',
    ...runtimes.slice(0,5).map(x => row(x)),
    '',
    '## 2. IPA — CÀI ỨNG DỤNG',
    '',
    '**IPA mới nhất đã xác minh trên GitHub: ' +
      (ipas[0] ? 'V' + ipas[0].version : 'chưa có') +
      '.** Cập nhật Runtime bình thường không cần cài lại IPA.',
    '',
    '| Phiên bản | Tải .ipa | Xác minh | Ghi chú |',
    '|:--|:--|:--|:--|',
    ...ipas.slice(0,3).map(x => row(x)),
    '',
    '## 3. BACKUP THÁNG',
    '',
    ...backups.map(({release,asset}) =>
      '- **' + asset.name + '** — [Tải backup gốc](' + asset.browser_download_url + ')' +
      ' · [Chi tiết](' + releaseLink(repo, release.tag_name) + ')'),
    ...(!backups.length ? ['Chưa có file backup theo tháng đã xác minh trên GitHub.'] : []),
    ...(!backups.some(x => x.asset.name.endsWith('.gmwwupdate')) ?
      ['**Runtime backup:** hiện chưa có file trong các Release backup.'] : []),
    '',
    '## 4. LỊCH SỬ VÀ CHÍNH SÁCH',
    '',
    '- [Runtime cũ](RUNTIME-HISTORY.md)',
    '- [IPA cũ](IPA-HISTORY.md)',
    '- [Chính sách lưu giữ](' + DOWNLOAD_BASE + repo +
      '/blob/main/docs/releases/GMWW-GITHUB-BACKUP-RETENTION-20261031.md)',
    '',
    '**5 Runtime mới nhất, 3 IPA mới nhất** được đưa lên đầu để dễ tải. Các file cũ vẫn có thể tồn tại vì chính sách bảo vệ 14 ngày, rollback và tag tham chiếu. Việc ẩn khỏi kho tải nhanh **không xóa file trên GitHub**.',
    '',
    '**' + runtimes.length + ' phiên bản Runtime duy nhất** đã được tìm thấy trên Releases.',
    ''
  ];
  const historical = (title, entries) => [
    '# ' + title + ' — LỊCH SỬ',
    '',
    '> Chỉ liệt kê các file Release gốc còn tồn tại; không tạo bản sao.',
    '',
    '| Phiên bản | Tải file gốc | SHA-256 |',
    '|:--|:--|:--|',
    ...entries.map(x => row(x, false)),
    '',
    '[Quay về kho tải chính](RUNTIME-DOWNLOADS.md)',
    ''
  ].join('\n');

  return {
    index: lines.join('\n'),
    runtimeHistory: historical('RUNTIME', runtimes.slice(5)),
    ipaHistory: historical('IPA', ipas.slice(3))
  };
}
export function buildCatalog(releases, repo = DEFAULT_REPO) {
  return buildCatalogs(releases, repo).index;
}

export async function fetchAllReleases(repo = DEFAULT_REPO, token = process.env.GH_TOKEN) {
  if (!validRepo(repo)) throw new Error('Invalid repository');
  const releases = [];
  for (let page = 1; page <= 100; page++) {
    const response = await fetch('https://api.github.com/repos/' + repo +
      '/releases?per_page=100&page=' + page, {
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
  if (!output || !output.endsWith('.md')) throw new Error('Markdown output path required');
  const repo = process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
  const docs = buildCatalogs(await fetchAllReleases(repo), repo);
  await Promise.all([
    writeFile(output, docs.index),
    writeFile(join(dirname(output), 'RUNTIME-HISTORY.md'), docs.runtimeHistory),
    writeFile(join(dirname(output), 'IPA-HISTORY.md'), docs.ipaHistory)
  ]);
  console.log('Refreshed Runtime + IPA + backup links without copying binaries.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
