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
// Only index GitHub-verified, non-expired Actions artifacts as QA; never call these Production.
function chooseQaArtifacts(artifacts, repo, publishedVersions) {
  const selected = new Map();
  for (const artifact of artifacts) {
    const match = /^GMWW-Runtime-V(3\.\d+)-GitHub-verified$/.exec(String(artifact?.name || ''));
    if (!match || artifact.expired || publishedVersions.has(match[1])) continue;
    if (!Number.isSafeInteger(artifact.id) || artifact.id <= 0 ||
        !Number.isSafeInteger(artifact.workflow_run?.id) ||
        artifact.workflow_run.id <= 0) continue;
    const item = { version: match[1], artifact };
    const current = selected.get(item.version);
    if (!current || String(artifact.created_at || '') > String(current.artifact.created_at || '')) {
      selected.set(item.version, item);
    }
  }
  return [...selected.values()].sort((a,b) => numericVersion(b.version) - numericVersion(a.version));
}
function qaRow({ version, artifact }, repo) {
  const link = DOWNLOAD_BASE + repo + '/actions/runs/' +
    artifact.workflow_run.id + '/artifacts/' + artifact.id;
  const checksum = /^sha256:([a-f0-9]{64})$/.exec(String(artifact.digest || ''));
  const expiry = /^\d{4}-\d{2}-\d{2}T/.test(String(artifact.expires_at || '')) ?
    String(artifact.expires_at).slice(0,10) : 'không rõ';
  return '| **V' + version + ' — QA / KHÔNG CÀI** | [Tệp ZIP kiểm thử](' + link +
    ') (chứa .gmwwupdate) | ' + (checksum ? '\`' + checksum[1] + '\` (ZIP)' : '—') +
    ' | Hết hạn: ' + expiry + '; **chưa phát hành Production** |';
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
export function buildCatalogs(releases, repo = DEFAULT_REPO, artifacts = []) {
  if (!validRepo(repo)) throw new Error('Invalid repository');
  if (!Array.isArray(releases)) throw new Error('Releases must be an array');
  if (!Array.isArray(artifacts)) throw new Error('Artifacts must be an array');

  const runtimes = chooseCanonical(releases, repo, 'runtime');
  const ipas = chooseCanonical(releases, repo, 'ipa');
  const qa = chooseQaArtifacts(artifacts, repo, new Set(runtimes.map(x => x.version)));

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
    '> **Một địa chỉ tải chung.** Link bản Production trỏ tới GitHub Releases; link QA trỏ tới GitHub Actions. Không lưu bản sao.',
    '',
    '## 1. RUNTIME PRODUCTION — CẬP NHẬT THỦ CÔNG',
    '',
    '> **CHỈ CÀI RUNTIME PRODUCTION.** Bản QA từ GitHub Actions chưa được đồng bộ với Server Production; không dùng để cập nhật iPhone đang chơi. Không hạ cấp Runtime đã cài.',
    '',
    '**Runtime Production đã xác minh mới nhất: ' +
      (runtimes[0] ? 'V' + runtimes[0].version : 'chưa có') +
      '.** Các bản QA không thay thế bản chính thức.',
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
    '## 4. QA — CHỈ KIỂM THỬ, KHÔNG CÀI TRÊN PRODUCTION',
    '',
    '> **CẢNH BÁO:** QA là file thử nghiệm chưa phát hành, có thể mới hơn Server và gây lệch phiên bản. ZIP chỉ dành cho kiểm thử độc lập; KHÔNG dùng .gmwwupdate QA để cập nhật ứng dụng đang chơi.',
    '',
    ...(qa.length ? [
      '| QA — KHÔNG CÀI | Tệp kiểm thử gốc | SHA-256 ZIP | Trạng thái |',
      '|:--|:--|:--|:--|',
      ...qa.slice(0,5).map(x => qaRow(x, repo)),
      ''
    ] : ['Không có gói QA còn hiệu lực.', '']),
    '## 5. LỊCH SỬ VÀ CHÍNH SÁCH',
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
export function buildCatalog(releases, repo = DEFAULT_REPO, artifacts = []) {
  return buildCatalogs(releases, repo, artifacts).index;
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
// Read metadata only (never download, upload or copy the binary ZIP).
export async function fetchRecentQaArtifacts(repo = DEFAULT_REPO, token = process.env.GH_TOKEN) {
  if (!validRepo(repo)) throw new Error('Invalid repository');
  if (!token) throw new Error('GH_TOKEN required to list Actions artifacts');
  const artifacts = [];
  for (let page = 1; page <= 6; page++) {
    const response = await fetch('https://api.github.com/repos/' + repo +
      '/actions/artifacts?per_page=100&page=' + page, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'gmww-download-index',
        Authorization: 'Bearer ' + token
      }
    });
    if (!response.ok) throw new Error('GitHub Actions artifacts API: HTTP ' + response.status);
    const result = await response.json();
    if (!Array.isArray(result.artifacts)) throw new Error('Invalid GitHub Actions artifact response');
    artifacts.push(...result.artifacts);
    if (result.artifacts.length < 100) break;
  }
  return artifacts;
}
async function main() {
  const output = process.argv[2];
  if (!output || !output.endsWith('.md')) throw new Error('Markdown output path required');
  const repo = process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
  const [releases, artifacts] = await Promise.all([
    fetchAllReleases(repo), fetchRecentQaArtifacts(repo)
  ]);
  const docs = buildCatalogs(releases, repo, artifacts);
  await Promise.all([
    writeFile(output, docs.index),
    writeFile(join(dirname(output), 'RUNTIME-HISTORY.md'), docs.runtimeHistory),
    writeFile(join(dirname(output), 'IPA-HISTORY.md'), docs.ipaHistory)
  ]);
  console.log('Refreshed QA + Production Runtime, IPA and backup links without copying binaries.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
