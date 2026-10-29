import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const bundle=fs.readFileSync('server-game/current/app.js','utf8');
const begin=source.indexOf('function artifactArtworkSideMargins(');
const end=source.indexOf('async function renderEntityFront()',begin);
assert.ok(begin>=0&&end>begin,'the canonical GM Artifact alignment helper exists');
const helper=source.slice(begin,end);

function sample(left=0,right=0,width=240,height=200){
  const pixels=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=4*(y*width+x),art=x>=left&&x<width-right;
    pixels[i]=art?175:4;
    pixels[i+1]=art?43:6;
    pixels[i+2]=art?51:9;
    pixels[i+3]=255;
  }
  return{pixels,width,height};
}
const detect=vm.runInNewContext(helper+'\nartifactArtworkSideMargins');

test('Artifact: a dark left-side gutter is detected across artwork layouts',()=>{
  const {pixels,width,height}=sample(17,0);
  const result=detect(pixels,width,height);
  assert.ok(result,'asymmetric blank strip should be detected');
  assert.ok(result.left>.06&&result.left<.09);
  assert.equal(result.right,0);
});
test('Artifact: detects right-side gutter too, without a hard-coded left offset',()=>{
  const {pixels,width,height}=sample(0,18);
  const result=detect(pixels,width,height);
  assert.ok(result);
  assert.equal(result.left,0);
  assert.ok(result.right>.06&&result.right<.09);
});
test('Artifact: centered padding and fully dark artworks are not modified',()=>{
  const symmetric=sample(8,8);
  assert.equal(detect(symmetric.pixels,symmetric.width,symmetric.height),null);
  const dark=new Uint8ClampedArray(240*200*4);
  assert.equal(detect(dark,240,200),null);
});
test('Artifact: margins over safety cap cannot crop original card frame',()=>{
  const {pixels,width,height}=sample(46,0);
  assert.equal(detect(pixels,width,height),null);
});
test('Artifact: browser preview aligns the image but keeps source bytes untouched',()=>{
  const {pixels}=sample(17,0);
  const document={createElement:()=>({
    width:0,height:0,
    getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})
  })};
  const align=vm.runInNewContext(helper+'\nalignArtifactPreviewArtwork',{document});
  const img={naturalWidth:3072,naturalHeight:2560,style:{transform:''}};
  align(img);
  assert.match(img.style.transform,/translate3d\(-\d+(?:\.\d+)?%,0,0\) scaleX\(1\.\d+\)/);
  assert.match(source,/if\(kind==='artifacts'&&currentKind===kind/);
  assert.match(source,/img\.style\.removeProperty\('transform'\)/);
  assert.match(source,/if\(currentKind!==kind\|\|editDraft\?\.id!==e\.id\)return/);
  assert.ok(bundle.includes(helper),'shipped GM bundle must include the same preview alignment algorithm');
});

test('Vai Trò: switching from Artifact resets stale image shift and does not reapply it',()=>{
  const render=source.slice(source.indexOf('async function renderEntityFront(){'),source.indexOf('function fitPlayerCardTitle()'));
  assert.match(render,/img\.style\.removeProperty\('transform'\)/);
  assert.match(render,/if\(kind==='artifacts'&&currentKind===kind&&editDraft\?\.id===e\.id\)/);
  assert.match(render,/if\(currentKind!==kind\|\|editDraft\?\.id!==e\.id\)return/);
  assert.match(render,/img\.onerror=\(\)=>img\.style\.removeProperty\('transform'\)/);
});

test('Artifact: no drift for balanced artwork and no persistent artwork mutation',()=>{
  const balanced=sample(9,9);
  assert.equal(detect(balanced.pixels,balanced.width,balanced.height),null);
  assert.doesNotMatch(source,/putImageData\(|toDataURL\(|convertToBlob\(/);
});
