#!/usr/bin/env bash
set -euo pipefail
: "${URL:?Production origin required}"

# Character V5.60 is an isolated lab, not a runtime/IPA game change.
# Confirm that a clickable HTML test AND its REAL SkinnedMesh adapter are
# deployed, rather than claiming the CI merge alone implies a live page.
echo "Verify Production: checking V5.60 real 3D skin lab delivery."
curl --location --retry 6 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v5/test-skin-v560.html?verify=$(date +%s)" > /tmp/gmww-skin-v560.html
curl --retry 6 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v5/skin-v560-weighted-surface.mjs?verify=$(date +%s)" > /tmp/gmww-skin-v560.mjs
echo "V5.60 delivery: HTML=$(wc -c </tmp/gmww-skin-v560.html) bytes; module=$(wc -c </tmp/gmww-skin-v560.mjs) bytes."
if ! grep -Fq 'Skin 3D gắn vào 16 xương thật' /tmp/gmww-skin-v560.html; then
  echo "::error::V5.60 HTML asset path returned HTTP 200 but wrong content. Actual first bytes:"
  head -c 350 /tmp/gmww-skin-v560.html; echo
  exit 1
fi
if ! grep -Fq 'addV560WeightedSkin' /tmp/gmww-skin-v560.mjs; then
  echo "::error::V5.60 SkinnedMesh module path returned HTTP 200 but wrong content. Actual first bytes:"
  head -c 350 /tmp/gmww-skin-v560.mjs; echo
  exit 1
fi
echo "Verify Production: V5.60 3D skin lab HTML + module PASS."

echo "Verify Production: checking isolated Character V4 Web studio."
curl --location --retry 8 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/index.html?verify=$(date +%s)" > /tmp/character-v4-web.html
grep -Fq '20 Character mới' /tmp/character-v4-web.html
grep -Fq 'Chưa phát hành Character mới vào trận' /tmp/character-v4-web.html
grep -Fq 'action-lab.mjs' /tmp/character-v4-web.html
curl --location --retry 8 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/action-lab.mjs?verify=$(date +%s)" > /tmp/character-v4-action-lab.mjs
node --check /tmp/character-v4-action-lab.mjs
grep -Fq 'export function sampleV4Action' /tmp/character-v4-action-lab.mjs
grep -Fq 'export function createV4StageController' /tmp/character-v4-action-lab.mjs
echo "Verify Production: V4 nine-action motion lab JavaScript PASS."
curl --retry 8 --retry-all-errors --retry-delay 2 -fsS "$URL/api/game-characters/v4?verify=$(date +%s)" > /tmp/character-v4.json
node - <<'NODE'
const fs=require('node:fs');
const v4=JSON.parse(fs.readFileSync('/tmp/character-v4.json','utf8'));
if(!v4.ok||v4.webOnly!==true||v4.ipaDeployed!==false||v4.count!==20||v4.approvedCount!==0||v4.characters?.length!==20)process.exit(1);
if(v4.previewCount!==2||!v4.characters.every(c=>!c.approved))process.exit(2);
if(!v4.characters.slice(0,2).every(c=>c.hasArtwork&&c.status==='preview-artwork'))process.exit(3);
if(!v4.characters.slice(2).every(c=>!c.hasArtwork&&c.status==='awaiting-artwork'))process.exit(4);
console.log('Verify Production: Character V4 two actual artwork previews + 18 pending PASS.');
NODE
echo "Verify Production: checking real Character 01/02 four-direction artwork."
curl --retry 8 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/approved-two-characters.avif?verify=$(date +%s)" > /tmp/v4-two-characters.avif
test "$(wc -c </tmp/v4-two-characters.avif)" -gt 10000
test "$(shasum -a 256 assets/characters/v4/approved-two-characters.avif | awk '{print $1}')" = "$(shasum -a 256 /tmp/v4-two-characters.avif | awk '{print $1}')"
# The accepted live forty-character catalog now owns /api/game-characters.
# Its original/atlas bytes and four-action contract are independently verified
# by verify-character40-production.mjs. Lab checks use only isolated lab assets.
grep -Fq 'id="labCharacter"' /tmp/character-v4-web.html
echo "Verify Production: isolated V4 source artwork exact SHA PASS; active roster uses Character40 audit."
echo "Verify Production: checking V4 articulated two-character action module."
grep -Fq '<canvas id="labCharacter"' /tmp/character-v4-web.html
grep -Fq 'animated-sprite.mjs' /tmp/character-v4-web.html
curl --location --retry 8 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/animated-sprite.mjs?verify=$(date +%s)" > /tmp/character-v4-animated-sprite.mjs
node --check /tmp/character-v4-animated-sprite.mjs
grep -Fq "export function v4ActionPose" /tmp/character-v4-animated-sprite.mjs
grep -Fq "export function createV4SpriteRenderer" /tmp/character-v4-animated-sprite.mjs
node - <<'NODE'
const fs=require('node:fs'), html=fs.readFileSync('/tmp/character-v4-web.html','utf8');
if(!html.includes('sprite.render({')||html.includes('actor.src=imageUrl('))process.exit(1);
console.log('Verify Production: V4 canvas articulated limb animation wired to Action controls PASS.');
NODE
echo "Verify Production: rejected Skin 4.13 withdrawn; show skeleton only."
for F in skeleton.html skeleton-rig.mjs skin.html skin-art-spec.json; do
  EXPECTED_HASH=$(shasum -a 256 "assets/characters/v4/$F" | awk '{print $1}')
  MATCHED=0
  for ATTEMPT in $(seq 1 15); do
    curl --location --retry 3 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/$F?skinverify=$(date +%s)-$ATTEMPT" > "/tmp/v4-$F"
    LIVE_HASH=$(shasum -a 256 "/tmp/v4-$F" | awk '{print $1}')
    if [ "$EXPECTED_HASH" = "$LIVE_HASH" ]; then
      echo "Verify Production: $F exact bytes match on attempt $ATTEMPT."
      MATCHED=1
      break
    fi
    echo "::warning::$F hash mismatch on attempt $ATTEMPT expected $EXPECTED_HASH observed $LIVE_HASH, $(wc -c < "/tmp/v4-$F") bytes"
    if [ "$ATTEMPT" -eq 1 ]; then head -c 120 "/tmp/v4-$F"; echo; fi
    sleep 2
  done
  if [ "$MATCHED" -ne 1 ]; then echo "::error::Character V4 file $F did not synchronize to the approved commit."; exit 1; fi
done
node --check /tmp/v4-skeleton-rig.mjs
grep -Fq 'KHÔNG ĐẠT NGHIỆM THU' /tmp/v4-skin.html
grep -Fq 'Skin 4.13 đã bị loại' /tmp/v4-skin.html
grep -Fq 'skeleton-rig.mjs' /tmp/v4-skin.html
! grep -Fq 'skeleton-skin.mjs' /tmp/v4-skin.html
! grep -Fq 'renderV4Skin' /tmp/v4-skin.html
node - <<'NODE'
const fs=require('node:fs');
const c=JSON.parse(fs.readFileSync('/tmp/v4-skin-art-spec.json','utf8'));
if(c.skinStatus!=='rejected-awaiting-redesign' || c.deliveryGate.productionSkinEnabled!==false || c.deliveryGate.ownerApproved!==false)process.exit(1);
console.log('Verify Production: rejected Skin disabled; premium layered redesign required before release.');
NODE
echo "Verify Production: skeleton-only fallback and rejected Skin exact-byte check PASS."

echo "Verify Production: checking joint-bound Character V4.14 isolated skin lab."
for F in skin-preview-v414.html skin-v414.mjs; do
  EXPECTED_HASH=$(shasum -a 256 "assets/characters/v4/$F" | awk '{print $1}')
  MATCHED=0
  for ATTEMPT in $(seq 1 12); do
    curl --location --retry 3 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/$F?skinpreview=$(date +%s)-$ATTEMPT" > "/tmp/v4-$F"
    LIVE_HASH=$(shasum -a 256 "/tmp/v4-$F" | awk '{print $1}')
    if [ "$EXPECTED_HASH" = "$LIVE_HASH" ]; then MATCHED=1; break; fi
    sleep 2
  done
  if [ "$MATCHED" -ne 1 ]; then echo "::error::V4.14 $F did not match deployed bytes"; exit 1; fi
done
node --check /tmp/v4-skin-v414.mjs
grep -Fq "skin-v414.mjs" /tmp/v4-skin-preview-v414.html
grep -Fq "BẢN THỬ HÌNH VẼ" /tmp/v4-skin-preview-v414.html
grep -Fq "17 lớp" /tmp/v4-skin-preview-v414.html
grep -Fq "skin-preview-v414.html" /tmp/v4-skin.html
echo "Verify Production: isolated V4.14 Skin preview exact-byte SHA check PASS."

echo "Verify Production: checking V4.15 1200x1920 layered master exporter."
for F in skin-master-v415.html skin-master-v415.mjs; do
  EXPECTED_HASH=$(shasum -a 256 "assets/characters/v4/$F" | awk '{print $1}')
  MATCHED=0
  for ATTEMPT in $(seq 1 12); do
    curl --location --retry 3 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/$F?masterverify=$(date +%s)-$ATTEMPT" > "/tmp/v4-$F"
    LIVE_HASH=$(shasum -a 256 "/tmp/v4-$F" | awk '{print $1}')
    if [ "$EXPECTED_HASH" = "$LIVE_HASH" ]; then MATCHED=1; break; fi
    sleep 2
  done
  if [ "$MATCHED" -ne 1 ]; then echo "::error::V4.15 $F did not match deployed bytes"; exit 1; fi
done
node --check /tmp/v4-skin-master-v415.mjs
grep -Fq '1200 × 1920' /tmp/v4-skin-master-v415.html
grep -Fq 'export8MasterPNGs' /tmp/v4-skin-master-v415.html
grep -Fq 'export17Layers' /tmp/v4-skin-master-v415.html
grep -Fq 'skin-master-v415.html' /tmp/v4-skin-preview-v414.html
echo "Verify Production: V4.15 8 full-body masters + 17 transparent layers exporter exact SHA PASS."

echo "Verify Production: Character V4.16 art QA is staging-only."
for F in artwork-intake-v416.html artwork-intake-v416.mjs; do
  EXPECTED_HASH=$(shasum -a 256 "assets/characters/v4/$F" | awk '{print $1}')
  MATCHED=0
  for ATTEMPT in $(seq 1 12); do
    curl --location --retry 3 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/$F?assetverify=$(date +%s)-$ATTEMPT" > "/tmp/v416-$F"
    LIVE_HASH=$(shasum -a 256 "/tmp/v416-$F" | awk '{print $1}')
    if [ "$EXPECTED_HASH" = "$LIVE_HASH" ]; then MATCHED=1; break; fi
    sleep 2
  done
  if [ "$MATCHED" -ne 1 ]; then echo "::error::V4.16 $F does not match deployed bytes"; exit 1; fi
done
node --check /tmp/v416-artwork-intake-v416.mjs
grep -Fq 'CHƯA THAY CHARACTER TRONG GAME' /tmp/v416-artwork-intake-v416.html
grep -Fq 'artwork-intake-v416.mjs' /tmp/v416-artwork-intake-v416.html
grep -Fq 'artwork-intake-v416.html' /tmp/v4-skin-master-v415.html
echo "Verify Production: V4.16 staging artwork validator exact-byte SHA PASS."

echo "Verify Production: checking Character V4.16 HD source intake metadata."
for F in artwork-v416.html artwork-v416.mjs artwork-v416-manifest.json; do
  EXPECTED_HASH=$(shasum -a 256 "assets/characters/v4/$F" | awk '{print $1}')
  MATCHED=0
  for ATTEMPT in $(seq 1 12); do
    curl --location --retry 3 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/$F?sourceverify=$(date +%s)-$ATTEMPT" > "/tmp/v416-$F"
    LIVE_HASH=$(shasum -a 256 "/tmp/v416-$F" | awk '{print $1}')
    if [ "$EXPECTED_HASH" = "$LIVE_HASH" ]; then MATCHED=1; break; fi
    sleep 2
  done
  if [ "$MATCHED" -ne 1 ]; then echo "::error::V4.16 $F artwork source QA byte mismatch"; exit 1; fi
done
node --check /tmp/v416-artwork-v416.mjs
grep -Fq 'CHƯA GẮN VÀO GAME' /tmp/v416-artwork-v416.html
grep -Fq 'artwork-v416.html' /tmp/v416-artwork-intake-v416.html
node - <<'NODE'
const fs=require('node:fs');
const j=JSON.parse(fs.readFileSync('/tmp/v416-artwork-v416-manifest.json','utf8'));
if(j.drafts?.length!==4||j.limitations?.requiredViews!==8||
   j.limitations?.individualRigLayersAvailable!==false||
   j.limitations?.productionSkinEnabled!==false||
   j.limitations?.ownerApproved!==false)process.exit(1);
console.log('Verify Production: 4 source PNGs documented (off-repository), 4 views pending, 17-layer rig disabled PASS.');
NODE
echo "Verify Production: HD V4.16 local-only source gallery SHA PASS."

echo "Verify Production: 17-part Character V4.17 bone-bound motion lab."
for F in skin-motion-v417.html layered-skin-v417.mjs; do
  EXPECTED_HASH=$(shasum -a 256 "assets/characters/v4/$F" | awk '{print $1}')
  MATCHED=0
  for ATTEMPT in $(seq 1 12); do
    curl --location --retry 3 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v4/$F?motionverify=$(date +%s)-$ATTEMPT" > "/tmp/v417-$F"
    LIVE_HASH=$(shasum -a 256 "/tmp/v417-$F" | awk '{print $1}')
    if [ "$EXPECTED_HASH" = "$LIVE_HASH" ]; then MATCHED=1; break; fi
    sleep 2
  done
  if [ "$MATCHED" -ne 1 ]; then echo "::error::V4.17 $F does not match this deployment"; exit 1; fi
done
node --check /tmp/v417-layered-skin-v417.mjs
grep -Fq 'CHƯA VÀO GAME' /tmp/v417-skin-motion-v417.html
grep -Fq '17 lớp' /tmp/v417-skin-motion-v417.html
grep -Fq 'skin-motion-v417.html' /tmp/v416-artwork-v416.html
echo "Verify Production: V4.17 real joint-layer pipeline and iPhone Studio exact SHA PASS."

echo "Verify Production: Character V5.00 isolated 2.5D laboratory."
for F in index.html character-motion-v500.mjs character-master-v500.mjs character-rig-v510.mjs test-board-v520.html test-board-v520.mjs test-gates-v520.mjs vendor/three.module.min.js vendor/three.core.min.js vendor/LICENSE; do
  SAFE_FILE=${F//\//_}
  EXPECTED_HASH=$(shasum -a 256 "assets/characters/v5/$F" | awk '{print $1}')
  MATCHED=0
  for ATTEMPT in 1 2 3 4; do
    curl --location --retry 5 --retry-all-errors --retry-delay 2 -fsS "$URL/characters/v5/$F?masterv500=$(date +%s)-$ATTEMPT" > "/tmp/gmww-v500-$SAFE_FILE"
    LIVE_HASH=$(shasum -a 256 "/tmp/gmww-v500-$SAFE_FILE" | awk '{print $1}')
    if [ "$EXPECTED_HASH" = "$LIVE_HASH" ]; then MATCHED=1; break; fi
    sleep 2
  done
  if [ "$MATCHED" -ne 1 ]; then
    echo "::error::V5.00 laboratory file $F did not synchronize to deployed Worker"; exit 1
  fi
  echo "Verify Production: V5.00 $F exact SHA PASS."
done
node --check /tmp/gmww-v500-character-motion-v500.mjs
node --check /tmp/gmww-v500-character-master-v500.mjs
node --check /tmp/gmww-v500-character-rig-v510.mjs
grep -Fq 'SkinnedMesh' /tmp/gmww-v500-character-rig-v510.mjs
grep -Fq 'V414_SKIN_PALETTES' /tmp/gmww-v500-character-rig-v510.mjs
grep -Fq 'Skin GMWW V4.14' /tmp/gmww-v500-index.html
node --check /tmp/gmww-v500-test-board-v520.mjs
node --check /tmp/gmww-v500-test-gates-v520.mjs
grep -Fq 'CHƯA NGHIỆM THU' /tmp/gmww-v500-test-board-v520.html
grep -Fq 'releaseReadiness' /tmp/gmww-v500-test-gates-v520.mjs
grep -Fq "THỬ NGHIỆM RIÊNG" /tmp/gmww-v500-index.html
grep -Fq "./vendor/three.module.min.js" /tmp/gmww-v500-character-master-v500.mjs
echo "Verify Production: V5.20 acceptance board exact assets and release gates PASS; live Player Web unchanged."
