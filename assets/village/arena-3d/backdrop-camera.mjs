// Camera trực giao nghiêng khớp vòng ghế 2D (village-layout.js: lửa ở 50%,64%; ghế 30 người rộng ±35% bề ngang, ±20% bề cao).
// Chiếu trực giao của mặt phẳng là phép biến đổi tuyến tính => % của ghế 2D <-> toạ độ sàn 3D chính xác.
export const BACKDROP_TILT_DEG=58;
export const BACKDROP_FIRE={x:50,y:64};
export const BACKDROP_RING={worldRadius:8.35,halfWidthPct:35,halfHeightPct:20};
export function backdropFrustum(tiltDeg=BACKDROP_TILT_DEG,fire=BACKDROP_FIRE,ring=BACKDROP_RING){
  const sin=Math.sin(tiltDeg*Math.PI/180);
  const width=ring.worldRadius/(ring.halfWidthPct/100);       // bề ngang khung theo đơn vị thế giới
  const height=ring.worldRadius*sin/(ring.halfHeightPct/100); // bề cao khung (đã nhân sin độ nghiêng)
  const below=(fire.y/100);                                  // phần khung nằm dưới điểm lửa (tính từ trên xuống)
  return {left:-width*fire.x/100,right:width*(1-fire.x/100),top:height*below,bottom:-height*(1-below)};
}
export function backdropCameraPosition(tiltDeg=BACKDROP_TILT_DEG,distance=60){
  const t=tiltDeg*Math.PI/180;return {x:0,y:Math.sin(t)*distance,z:Math.cos(t)*distance};
}
// Toạ độ % khung 2D -> toạ độ sàn 3D (x,z) tại y=0. Dùng cho test và cho nhân vật 3D sau này.
export function framePctToFloor(xPct,yPct,tiltDeg=BACKDROP_TILT_DEG,fire=BACKDROP_FIRE,ring=BACKDROP_RING){
  const sin=Math.sin(tiltDeg*Math.PI/180),width=ring.worldRadius/(ring.halfWidthPct/100),height=ring.worldRadius*sin/(ring.halfHeightPct/100);
  return {x:(xPct-fire.x)/100*width,z:(yPct-fire.y)/100*height/sin};
}
