// GĐ54 - Nhân vật GMWW thật (bộ 40 ảnh) đứng trên sàn 3D của tranh làng, dạng billboard.
// Vị trí/hướng do chính field.actors (Core -> adapter) quyết định; file này chỉ vẽ lại, không có luật game.
export const SPRITES_VERSION='gmww.character-sprites.1';
export function characterImageId(characterId){
  const m=String(characterId||'').match(/(\d+)$/),n=m?Number(m[1]):1;
  if(n===41)return 'character-39';if(n===42)return 'character-40';
  const i=Number.isSafeInteger(n)&&n>0?((n-1)%40)+1:1;return 'character-'+String(i).padStart(2,'0');
}
// Bán kính ghế do character-atelier quyết định (giữ đồng bộ): 6-8 ghế 4.15 ... 30 ghế 8.35.
export function seatRadius(count){const c=Math.min(30,Math.max(6,Math.trunc(count)||6));return c<=8?4.15:c<=12?5.1:c<=18?6.15:c<=24?7.2:8.35}
// Vòng ghế chiếm 90% bán kính quảng trường của tranh; số người ít thì phóng to cảnh để nhân vật không bị lọt thỏm.
export const SEAT_FILL=.9;
export function paintedWorldRadius(count){return seatRadius(count)/SEAT_FILL}
// Chiều cao nhân vật tính theo bề ngang khung tranh (≈17% / 15% / 12.5%).
export function spriteHeight(count,worldRadius=paintedWorldRadius(count),halfWidthPct=44){
  const frameWidth=worldRadius/(halfWidthPct/100);return frameWidth*(count<=12?.17:count<=20?.15:.125)}
export function installCharacterSprites(THREE,scene,field,{base=new URL('../../characters/gmww40/originals/',import.meta.url).href}={}){
  const group=new THREE.Group();group.name='arena-character-sprites';scene.add(group);
  const textures=new Map(),sprites=new Map(),loader=new THREE.TextureLoader();
  const texture=imageId=>{
    if(!textures.has(imageId)){const entry={tex:null,aspect:.75};
      entry.tex=loader.load(base+imageId+'.webp',t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;
        entry.aspect=t.image?.width&&t.image?.height?t.image.width/t.image.height:.75;entry.loaded=true});
      textures.set(imageId,entry)}
    return textures.get(imageId);
  };
  field.setBodiesVisible?.(false);
  function update(now){
    const actors=field.actors,live=new Set(),h=spriteHeight(Math.max(6,actors.length));
    for(const a of actors){
      live.add(a.id);
      let s=sprites.get(a.id);const imageId=characterImageId(a.characterId);
      if(!s||s.userData.imageId!==imageId){
        if(s){group.remove(s);s.material.dispose()}
        const t=texture(imageId);
        s=new THREE.Sprite(new THREE.SpriteMaterial({map:t.tex,transparent:true,depthWrite:false,alphaTest:.02}));
        s.center.set(.5,.04);s.userData={imageId,entry:t};sprites.set(a.id,s);group.add(s);
      }
      const asp=s.userData.entry.aspect||.75;
      s.scale.set(h*asp,h,1);
      const p=a.renderPosition||a.position,bob=Math.sin(now*.0025+(a.id.length+(p.x*3)))*.04;
      s.position.set(p.x,bob+(a.standing?.15:0),p.z);
    }
    for(const [id,s] of sprites)if(!live.has(id)){group.remove(s);s.material.dispose();sprites.delete(id)}
  }
  return {group,update,get count(){return sprites.size},
    dispose(){for(const s of sprites.values())s.material.dispose();for(const e of textures.values())e.tex.dispose();scene.remove(group);field.setBodiesVisible?.(true)}};
}
