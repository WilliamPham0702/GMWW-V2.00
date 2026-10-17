import * as THREE from './vendor/three.module.min.js';
// Approved front artwork is the only observed reference. Side/back are inferred.
export const HYBRID_ACTIONS=Object.freeze(['idle','walk','run','result']);
export const DIRECTION_CORRECTIONS=Object.freeze([
 {yaw:0,head:1,depth:1},{yaw:Math.PI/4,head:.97,depth:1.06},
 {yaw:Math.PI/2,head:.94,depth:1.12},{yaw:3*Math.PI/4,head:.98,depth:1.07},
 {yaw:Math.PI,head:1,depth:1},{yaw:-3*Math.PI/4,head:.98,depth:1.07},
 {yaw:-Math.PI/2,head:.94,depth:1.12},{yaw:-Math.PI/4,head:.97,depth:1.06}
]);
// Contours are in approved image coordinates. Each panel is tessellated, curved,
// UV mapped, and weighted to the same existing 16 joints, never a camera billboard.
export const PARTS=[
 {name:'head',bone:3,depth:.58,center:[552,287],radius:[310,265],poly:[[249,474],[250,352],[259,218],[310,122],[430,65],[431,14],[548,4],[603,59],[607,91],[688,85],[719,61],[758,91],[800,101],[823,131],[846,216],[824,266],[843,309],[806,376],[787,454],[740,494],[644,535],[534,535],[431,517],[345,523],[294,494]]},
 {name:'coat-tail-left',bone:2,aux:1,depth:.13,center:[371,985],radius:[120,180],poly:[[405,795],[481,847],[436,962],[405,1071],[349,1114],[322,1063],[316,993],[354,861]]},
 {name:'coat-tail-right',bone:2,aux:1,depth:.14,center:[797,1007],radius:[130,170],poly:[[663,807],[757,878],[821,928],[860,971],[899,1014],[871,1044],[895,1105],[864,1157],[805,1148],[830,1103],[799,1056],[742,1049],[705,979]]},
 {name:'torso',bone:2,aux:1,depth:.41,center:[550,709],radius:[205,225],poly:[[442,542],[509,521],[565,530],[631,535],[682,560],[725,617],[748,707],[743,791],[777,855],[737,901],[653,892],[603,833],[533,830],[475,865],[445,924],[393,901],[354,867],[382,804],[381,716],[367,646],[406,575]]},
 {name:'shorts-left',bone:10,aux:1,depth:.34,center:[469,956],radius:[101,150],poly:[[442,810],[535,816],[570,852],[554,951],[546,1056],[496,1107],[422,1099],[390,1063],[392,991],[410,893]]},
 {name:'shorts-right',bone:13,aux:1,depth:.34,center:[624,952],radius:[101,150],poly:[[535,815],[632,805],[687,861],[711,953],[720,1047],[686,1094],[612,1096],[567,1063],[551,963],[550,874]]},
 {name:'leg-left',bone:11,aux:10,depth:.20,center:[430,1159],radius:[90,160],poly:[[407,1041],[527,1058],[505,1129],[478,1199],[462,1259],[390,1269],[367,1236],[386,1158]]},
 {name:'leg-right',bone:14,aux:13,depth:.20,center:[656,1157],radius:[88,160],poly:[[576,1058],[686,1040],[701,1129],[722,1218],[709,1261],[638,1270],[604,1178]]},
 {name:'sandal-left',bone:12,depth:.34,center:[382,1322],radius:[103,114],poly:[[373,1208],[444,1200],[477,1252],[460,1321],[458,1378],[451,1421],[354,1440],[290,1420],[286,1375],[314,1315],[327,1254]]},
 {name:'sandal-right',bone:15,depth:.34,center:[689,1323],radius:[108,114],poly:[[631,1205],[704,1199],[754,1240],[772,1297],[747,1341],[781,1385],[774,1421],[692,1436],[611,1414],[600,1376],[610,1311]]},
 {name:'sleeve-left',bone:4,aux:2,depth:.29,center:[350,693],radius:[120,130],poly:[[402,576],[460,614],[421,710],[389,770],[326,803],[268,774],[278,703],[290,655],[347,618]]},
 {name:'sleeve-right',bone:7,aux:2,depth:.29,center:[744,690],radius:[112,130],poly:[[683,575],[735,603],[788,635],[838,677],[827,737],[794,784],[742,798],[711,741],[696,670]]},
 {name:'forearm-left',bone:5,aux:4,depth:.20,center:[280,805],radius:[115,105],poly:[[318,720],[384,765],[349,825],[311,866],[283,898],[228,874],[225,824],[271,777]]},
 {name:'forearm-right',bone:8,aux:7,depth:.20,center:[809,805],radius:[115,105],poly:[[762,722],[816,753],[865,804],[887,845],[863,886],[810,891],[772,847],[733,795]]},
 {name:'hand-left',bone:6,depth:.17,center:[228,903],radius:[75,96],poly:[[235,821],[290,843],[303,875],[273,920],[255,956],[235,966],[225,946],[218,964],[201,960],[194,942],[177,949],[166,935],[174,904],[194,873],[217,852]]},
 {name:'hand-right',bone:9,depth:.17,center:[907,905],radius:[72,95],poly:[[844,835],[888,816],[916,840],[942,867],[964,904],[971,943],[956,954],[943,939],[941,963],[923,965],[910,949],[895,962],[879,953],[872,932],[853,910],[844,878]]},
 {name:'ribbon-left',bone:5,depth:.07,center:[195,944],radius:[86,165],poly:[[273,787],[263,816],[222,861],[189,907],[177,973],[207,1015],[207,1075],[185,1114],[158,1100],[159,1066],[125,1047],[116,999],[131,931],[159,876],[199,837]]},
 {name:'ribbon-right',bone:8,depth:.07,center:[931,956],radius:[58,130],poly:[[852,778],[895,815],[936,869],[960,929],[979,985],[963,1033],[975,1066],[952,1052],[943,1004],[913,983],[921,938],[897,887],[867,861]]}
];
const world=(x,y)=>[(x-543)*.0027,(1440-y)*.0027];
function weights(part,y){
 if(part.aux===undefined)return [part.bone,0,1,0];
 let a=0;
 if(part.bone===2)a=Math.max(0,Math.min(.6,(y-700)/400));
 else if(part.bone===10||part.bone===13)a=Math.max(0,Math.min(.65,(900-y)/130));
 else if(part.bone===11||part.bone===14)a=Math.max(0,Math.min(1,(1225-y)/170));
 else a=Math.max(0,Math.min(.55,(part.center[1]+40-y)/160));
 return [part.bone,part.aux,1-a,a];
}
function attributeGeometry(points,part,project=true){
 const pos=[],uv=[],ids=[],w=[];
 for(const [x,y,zOverride] of points){
 const [wx,wy]=world(x,y),[cx,cy]=part.center,[rx,ry]=part.radius;
 const z=zOverride??(.04+part.depth*Math.sqrt(Math.max(.01,1-((x-cx)/rx)**2*.6-((y-cy)/ry)**2*.5)));
 pos.push(wx,wy,z);uv.push(x/1086,1-y/1448);
 const [b,a,v,t]=weights(part,y);ids.push(b,a,0,0);w.push(v,t,0,0);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(w,4));g.computeVertexNormals();return g;
}
function panel(part){
 const shape=new THREE.Shape(part.poly.map(p=>new THREE.Vector2(...p)));
 const flat=new THREE.ShapeGeometry(shape).toNonIndexed().getAttribute('position');
 const points=[];
 function subdiv(a,b,c,level){
 if(!level){points.push(a,b,c);return;}
 const mid=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2];const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
 subdiv(a,ab,ca,level-1);subdiv(ab,b,bc,level-1);subdiv(ca,bc,c,level-1);subdiv(ab,bc,ca,level-1);
 }
 for(let i=0;i<flat.count;i+=3)subdiv([flat.getX(i),flat.getY(i)],[flat.getX(i+1),flat.getY(i+1)],[flat.getX(i+2),flat.getY(i+2)],3);
 return {name:part.name,geometry:attributeGeometry(points,part),part};
}
function volume(part){
 // Closed ellipsoidal body under each illustrated panel, with projected front UV.
 const g=new THREE.SphereGeometry(1,24,16).toNonIndexed(),p=g.getAttribute('position'),points=[];
 const [cx,cy]=part.center,[rx,ry]=part.radius;
 for(let i=0;i<p.count;i++)points.push([cx+p.getX(i)*rx*.92,cy-p.getY(i)*ry*.92,p.getZ(i)*part.depth*.88-.025]);
 g.dispose();const geometry=attributeGeometry(points,part),uv=geometry.getAttribute('uv');
 // Missing side/back references: sample observed material swatches, never mirror a face.
 for(let i=0;i<points.length;i++)if(points[i][2]<0){
 let swatch=part.name==='head'?[430,175,75,65]:part.name==='torso'||part.name.includes('sleeve')?[740,707,30,45]:part.name.includes('shorts')?[477,949,45,65]:part.name.includes('sandal')?[375,1379,30,10]:[435,1154,26,35];
 const [cx,cy,rx,ry]=swatch;uv.setXY(i,(cx+Math.sin(i*.17)*rx)/1086,1-(cy+Math.cos(i*.13)*ry)/1448);
 }
 return {name:part.name+'-volume',geometry,part};
}
export function buildHybridGeometry(){return {layers:PARTS.map(panel),base:PARTS.filter(p=>!p.name.includes('ribbon')&&!p.name.includes('tail')).map(volume)};}
export function mountHybrid(rig,texture){
 if(rig.bones.length!==16||!rig.mesh.isSkinnedMesh)throw Error('EXISTING_16_BONE_RIG_REQUIRED');
 const data=buildHybridGeometry(),layers=[],base=[];
 const attach=(part,isLayer)=>{
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.12,transparent:false});
 // Closed backing uses the image palette. Its side/back UV are explicitly inferred.
 const mesh=new THREE.SkinnedMesh(part.geometry,material);mesh.name=part.name;
 mesh.skeleton=rig.mesh.skeleton;mesh.bindMode='detached';mesh.bindMatrix.copy(rig.mesh.bindMatrix);mesh.bindMatrixInverse.copy(rig.mesh.bindMatrixInverse);mesh.frustumCulled=false;
 rig.root.add(mesh);(isLayer?layers:base).push(mesh);
 };
 data.base.forEach(p=>attach(p,false));data.layers.forEach(p=>attach(p,true));rig.mesh.visible=false;
 return {layers,base,data,productionSkin:false,reference:'approved-front-only',gameIntegrated:false,
 update(yaw){
 // Continuous interpolation between authored eight-direction correction samples.
 const q=((yaw/(Math.PI/4))%8+8)%8,i=Math.floor(q),t=q-i;
 const a=DIRECTION_CORRECTIONS[i],b=DIRECTION_CORRECTIONS[(i+1)%8];
 const head=a.head*(1-t)+b.head*t,depth=a.depth*(1-t)+b.depth*t;
 for(const m of [...layers,...base]){m.scale.z=depth;m.scale.x=m.name.startsWith('head')?head:1;}
 // Back views use the closed volume; front panels never rotate to face camera.
 const front=Math.cos(yaw);for(const m of layers)m.visible=front>-.12;
 },wireframe(on){for(const m of [...layers,...base])m.material.wireframe=on;}};
}
