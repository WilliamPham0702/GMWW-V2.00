// GMWW V5.61: integrity and ownership checks for original V4.17 cloth sample.
// No screenshot or 2D sprite layers are attached to bones in this implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
 V561_SWATCH_IMAGE_DATA_URI,V561_SWATCH_PNG_SHA256,
 V561_SWATCH_WEBP_SHA256,V561_SWATCH_SOURCE
} from '../assets/characters/v5/skin-v561-original-swatch.mjs';
import {V561_VERSION} from '../assets/characters/v5/skin-v561-original-art-uv.mjs';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

test('V5.61 actual original V4.17 pixels are packed correctly; not synthetic shapes',()=>{
 assert.match(V561_SWATCH_IMAGE_DATA_URI,/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/);
 const data=Buffer.from(V561_SWATCH_IMAGE_DATA_URI.slice('data:image/webp;base64,'.length),'base64');
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.equal(data.length,4170);
 assert.equal(sha256(data),V561_SWATCH_WEBP_SHA256);
 assert.equal(V561_SWATCH_WEBP_SHA256,'a6346c071978546d15384c3bd6d6da049498c60c999a648c72a2dad55be2467c');
 assert.equal(V561_SWATCH_PNG_SHA256,'fefe16599c584265e14354a4e6cd679dff375a1e10f219264561bb31860594f3');
 assert.match(V561_SWATCH_SOURCE,/V4\.17 original/);
});
test('V5.61 is 3D weighted cloth preview, not cutout cards or live game',()=>{
 assert.match(V561_VERSION,/^5\.61-/);
 const mod=readFileSync(new URL('../assets/characters/v5/skin-v561-original-art-uv.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../assets/characters/v5/test-skin-v561.html',import.meta.url),'utf8');
 assert.match(mod,/addV560WeightedSkin\(rig,\{texture/);
 assert.match(mod,/new THREE\.TextureLoader\(\)\.load/);
 assert.match(mod,/isOriginalCompleteSkin:false/);
 assert.match(mod,/originalV417UVAtlasReady:false/);
 assert.match(mod,/gameIntegrated:false/);
 assert.match(html,/addV561OriginalArtSwatchToRig/);
 assert.match(html,/Chưa đạt Skin gốc hoàn chỉnh/);
 assert.doesNotMatch(html,/layers\/hair_back\.png/);
});
