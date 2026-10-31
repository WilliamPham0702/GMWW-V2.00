#!/usr/bin/env node
// Safe, isolated Cloudflare Pages alias changes MUST NOT publish game Worker/Runtime.
// Any unknown path fails closed (the existing game release gates remain active).
import {readFileSync} from 'node:fs';

export const pagesOnlyPaths = new Set([
  '.github/scripts/pages-redirect-scope.mjs',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/github-runtime-ota.yml',
  '.github/workflows/check-gamemasoi-pages.yml',
  'tests/pages-redirect-scope.test.mjs',
  'tests/gamemasoi-pages-redirect.test.mjs',
  'sites/gamemasoi-pages/index.html',
  'sites/gamemasoi-pages/_redirects',
  'docs/architecture/gamemasoi-pages-redirect.md'
]);

export function isPagesOnlyChange(files) {
  return files.length > 0 &&
    files.every(file => pagesOnlyPaths.has(file)) &&
    new Set(files).size === files.length;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const input = readFileSync(0, 'utf8');
  const paths = input.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (!isPagesOnlyChange(paths)) {
    process.stderr.write('Not isolated Pages scope: use normal release gates.\n');
    process.exit(1);
  }
  process.stdout.write('Isolated gamemasoi.pages.dev scope: no Worker/Runtime publish.\n');
}
