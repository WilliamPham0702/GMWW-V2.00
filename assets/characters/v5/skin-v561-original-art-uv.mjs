// Character V5.61: real V4.17 artwork pixels painted onto a REAL weighted 3D shirt.
// DO NOT replace the 16-bone skeleton or use 2D sprites/flat body image strips.
// Still a swatch preview, NOT an artist-unwrapped full 3D Skin/approved complete costume.
import * as THREE from './vendor/three.module.min.js';
import {addV560WeightedSkin} from './skin-v560-weighted-surface.mjs';
import {
 V561_SWATCH_IMAGE_DATA_URI,V561_SWATCH_PNG_SHA256,
 V561_SWATCH_WEBP_SHA256,V561_SWATCH_SOURCE
} from './skin-v561-original-swatch.mjs';
export const V561_VERSION='5.61-original-v417-artwork-pixels-on-3d-weighted-shirt';
export function addV561OriginalArtSwatchToRig(rig,{onTextureLoaded=()=>{},debug=false}={}){
 if(!rig?.mesh?.isSkinnedMesh||rig.bones?.length!==16)
  throw Error('V561_EXPECTS_REAL_V510_16_BONE_3D_RIG');
 // The data URI is committed and hash-traceable, and never uses file://,
 // network requests, cross-origin CDN URLs, or a user-supplied ZIP.
 // WebP decoded natively in modern Safari iOS.
 const texture=new THREE.TextureLoader().load(
  V561_SWATCH_IMAGE_DATA_URI,
  ()=>onTextureLoaded({ok:true,source:V561_SWATCH_SOURCE}),
  undefined,
  error=>onTextureLoaded({ok:false,error:String(error)})
 );
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=THREE.RepeatWrapping;
 texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.anisotropy=4;
 const garment=addV560WeightedSkin(rig,{texture,debug});
 return Object.freeze({
  ...garment,
  previewVersion:V561_VERSION,
  sourcePNG_SHA256:V561_SWATCH_PNG_SHA256,
  artworkSwatch_SHA256:V561_SWATCH_WEBP_SHA256,
  source:V561_SWATCH_SOURCE,
  originalArtPixelsOn3DSurface:true,
  isOriginalCompleteSkin:false,
  originalV417UVAtlasReady:false,
  gameIntegrated:false
 });
}
