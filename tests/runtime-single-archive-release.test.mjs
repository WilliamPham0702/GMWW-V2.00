import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const production=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
const publisher=fs.readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
const readme=fs.readFileSync('README.md','utf8');
const notes=fs.readFileSync('docs/releases/GMWW-RUNTIME-CENTRAL-ARCHIVE-20261031.md','utf8');
const retention=fs.readFileSync('.github/workflows/github-release-backup-retention.yml','utf8');
const classifier=fs.readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
const ci=fs.readFileSync('.github/workflows/check-player-web.yml','utf8');

test('Production and GitHub-first use one canonical Runtime Release, never second gmww-v copy',()=>{
 const marker='- name: Lưu Runtime gốc duy nhất vào kho GitHub Releases chung (không nhân đôi)';
 assert.ok(production.includes(marker),'Production release step missing');
 const tail=production.slice(production.indexOf(marker));
 assert.ok(tail.includes('TAG="gmww-runtime-v$VERSION"'),'Production must publish canonical tag');
 assert.ok(publisher.includes('TAG="gmww-runtime-v$VERSION"'),'GitHub-first must use same tag');
 assert.ok(!tail.includes('TAG="gmww-v$VERSION"'),'No second legacy tag');
 assert.ok(!tail.includes('gh release upload'),'Never upload a second Runtime binary');
 assert.ok(!tail.includes('--clobber'),'Never replace bytes of existing versions');
 assert.ok(tail.includes('gh release view "$TAG"'),'Reuse immutable existing Release');
 assert.ok(tail.includes('sha256sum --check'),'Check package SHA before publishing');
 assert.ok(tail.includes('.digest == $h'),'Verify GitHub original binary SHA after publishing');
 assert.ok(tail.includes('sha256:$LOCAL_SHA'),'Compare GitHub asset digest with local SHA');
 assert.ok(tail.includes('manual-manifest.json'),'Publish original manifest metadata');
});

test('Storage-only PR cannot trigger Runtime rebuild or Cloudflare Production deployment',()=>{
 for(const path of ['README.md','tests/runtime-single-archive-release.test.mjs',
     'docs/releases/GMWW-RUNTIME-CENTRAL-ARCHIVE-20261031.md']){
   assert.ok(production.includes('|'+path+'|'),path+' must be skipped by Production scope');
   assert.ok(publisher.includes("'"+path+"'"),path+' must be in exact GitHub-only gate');
 }
 assert.ok(publisher.includes('if [ "$ARCHIVE_ONLY" = "$ARCHIVE_EXPECTED" ]'),'Missing exact scope guard');
 assert.ok(publisher.includes('SKIP_AUTO_RELEASE=true'),'Unchanged Runtime must not release again');
 assert.ok(classifier.includes("mode:'runtime-central-store'"),'Archive-only code should select focused tests');
 assert.ok(classifier.includes('changed.length===expected.size'),'Extra files must force full CI');
 assert.ok(ci.includes("steps.scope.outputs.mode == 'runtime-central-store'"),'CI must execute focused archive tests');
 assert.ok(ci.includes('node --test tests/runtime-single-archive-release.test.mjs'));
 assert.ok(publisher.includes("'.github/scripts/ci-browser-scope.mjs'"));
 assert.ok(publisher.includes("'.github/workflows/check-player-web.yml'"));
 assert.ok(production.includes('SHOULD_DEPLOY=false'),'CI/docs-only Production skip removed');
});

test('Permanent user-friendly central link and legacy safety policy retained',()=>{
 const url='https://github.com/WilliamPham0702/GMWW-V2.00/releases';
 assert.ok(readme.includes(url),'Repo homepage must expose single archive link');
 assert.ok(notes.includes(url));
 assert.ok(notes.includes('gmww-runtime-v<version>'));
 assert.ok(notes.includes('không có thêm bản sao mỗi PR'));
 assert.ok(retention.includes('gmww-release-retention'));
 assert.ok(retention.includes('release-backup-retention.mjs'));
 assert.ok(publisher.includes("github.event_name != 'pull_request'"),'PR QA must remain non-Production');
});
