import {validateSkin,SAMPLE_SKINS,sampleRigAction,sampleSynchronizedAction} from './rig-skin-core.mjs';

// The 2D skin is drawn as continuous curved contours following anatomical joints.
// No overlapping rectangular "limb cards", no clipping one full-body bitmap to create bones.
const n=x=>Number(x).toFixed(2);
const p=x=>n(x.x)+' '+n(x.y);
const line=(a,b)=>'M'+p(a)+' L'+p(b);
const curve=(a,b,c)=>'M'+p(a)+' Q'+p(b)+' '+p(c);
const point=(x,y)=>({x,y});
export function svgMarkup(s){
  const c=validateSkin(s);
  return `<svg class="rig-skin-svg" viewBox="95 18 210 305" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Character-01 GMWW có mặt và tóc từ artwork gốc, tay chân chuyển động mềm"><defs><clipPath id="character01-original-head-clip"><path d="M-11 -55 Q17 -66 35 -42 Q52 -22 43 5 Q37 30 15 39 Q-11 47 -33 29 Q-49 9 -48 -20 Q-45 -47 -11 -55Z"/></clipPath></defs>
  <ellipse data-shadow cx="200" cy="297" rx="42" ry="6" fill="#133b38" opacity=".26"/>
  <g data-body>
    <g data-leg-left>
      <path data-leg-l fill="none" stroke="${c.skin}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
      <path data-leg-l-shade fill="none" stroke="${c.shade}" stroke-width="3" opacity=".32" stroke-linecap="round"/>
    </g>
    <g data-leg-right>
      <path data-leg-r fill="none" stroke="${c.skin}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
      <path data-leg-r-shade fill="none" stroke="${c.shade}" stroke-width="3" opacity=".32" stroke-linecap="round"/>
    </g>
    <g data-feet>
      <path data-sandal-l fill="${c.sandal}" stroke="#083748" stroke-width="1.8" stroke-linejoin="round"/>
      <path data-strap-l fill="none" stroke="${c.vestLight}" stroke-width="3.3" stroke-linecap="round"/>
      <path data-sandal-r fill="${c.sandal}" stroke="#083748" stroke-width="1.8" stroke-linejoin="round"/>
      <path data-strap-r fill="none" stroke="${c.vestLight}" stroke-width="3.3" stroke-linecap="round"/>
    </g>
    <!-- Cross-legged pose is a dedicated soft silhouette, not a crouched standing leg rig.
         Opacity eases during sit-down/stand-up; no rigid disconnected kneecaps. -->
    <g data-seated-legs opacity="0">
      <path d="M-13 1 Q-44 -6 -45 17 Q-39 28 14 27" fill="none" stroke="${c.shade}" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-13 -1 Q-42 -8 -43 15 Q-34 25 17 25" fill="none" stroke="${c.skin}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M13 1 Q44 -6 45 17 Q39 29 -14 28" fill="none" stroke="${c.shade}" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M13 -1 Q42 -8 43 15 Q34 25 -17 26" fill="none" stroke="${c.skin}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8 21 Q20 15 29 24 L30 29 Q22 34 8 29Z" fill="${c.sandal}" stroke="${c.vestLight}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M-8 21 Q-20 15 -29 24 L-30 29 Q-22 34 -8 29Z" fill="${c.sandal}" stroke="${c.vestLight}" stroke-width="2" stroke-linejoin="round"/>
    </g>
    <path data-shorts fill="${c.shorts}" stroke="#138fa4" stroke-width="2" stroke-linejoin="round"/>
    <path data-shorts-waist fill="none" stroke="${c.vestLight}" stroke-width="4"/>
    <g data-shorts-pattern fill="${c.pattern}" opacity=".88">
      <path data-flower-l d="M0 -6 Q4 -6 3 -1 Q8 -2 7 2 Q3 4 1 4 Q-2 9 -5 5 Q-5 3 -4 2 Q-10 1 -7 -3 Q-3 -4 0 -6Z"/>
      <path data-flower-r d="M0 -5 Q5 -7 4 0 Q10 -1 8 4 Q3 5 1 5 Q-3 9 -5 5 Q-4 1 -5 1 Q-8 -1 -4 -4Z"/>
    </g>
    <g data-arm-left>
      <path data-arm-l fill="none" stroke="${c.skin}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
      <path data-arm-l-highlight fill="none" stroke="${c.light}" stroke-width="3.5" opacity=".45" stroke-linecap="round"/>
      <circle data-hand-l r="9" fill="${c.light}" stroke="${c.shade}" stroke-width="1.4"/>
    </g>
    <g data-torso>
      <path data-chest fill="${c.skin}" stroke="${c.shade}" stroke-width="1.4" stroke-linejoin="round"/>
      <path data-vest-left fill="${c.vest}" stroke="${c.vestLight}" stroke-width="2" stroke-linejoin="round"/>
      <path data-vest-right fill="${c.vest}" stroke="${c.vestLight}" stroke-width="2" stroke-linejoin="round"/>
      <g data-abs fill="none" stroke="${c.shade}" opacity=".56" stroke-width="1.6" stroke-linecap="round">
        <path data-abs-1/><path data-abs-2/><path data-abs-3/><path data-abs-middle/>
      </g>
      <path data-necklace fill="none" stroke="#ebc77f" stroke-width="1.8"/>
      <circle data-pendant r="3.3" fill="#e4b755" stroke="#a7752d" stroke-width="1"/>
      <g data-rear-torso opacity="0">
        <path d="M-28 -3 Q0 -18 28 -3 L23 52 Q0 65 -23 52Z" fill="${c.vest}" stroke="${c.vestLight}" stroke-width="2"/>
        <path d="M-14 6 Q0 14 14 6 M0 7 L0 48" fill="none" stroke="${c.vestLight}" stroke-width="3" opacity=".62"/>
        <path d="M-17 48 Q0 56 17 48" fill="none" stroke="${c.pattern}" stroke-width="3"/>
      </g>
    </g>
    <g data-arm-right>
      <path data-arm-r fill="none" stroke="${c.skin}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
      <path data-arm-r-highlight fill="none" stroke="${c.light}" stroke-width="3.5" opacity=".45" stroke-linecap="round"/>
      <circle data-hand-r r="9" fill="${c.light}" stroke="${c.shade}" stroke-width="1.4"/>
    </g>
    <g data-head>
      <g data-vector-head opacity="0">
      <path d="M-9 19L9 19L9 35L-9 35Z" fill="${c.skin}"/>
      <ellipse cy="-1" rx="37" ry="37" fill="${c.skin}" stroke="${c.shade}" stroke-width="1.5"/>
      <circle cx="-36" cy="4" r="6" fill="${c.light}"/><circle cx="36" cy="4" r="6" fill="${c.light}"/>
      <path d="M-35 -14L-45 -28L-29 -28L-35 -46L-20 -39L-23 -57L-7 -45L3 -62L11 -46L25 -57L25 -41L41 -43L33 -25L41 -18L27 -27L14 -29L5 -23L-10 -28L-22 -19Z" fill="${c.hair}" stroke="#45475a" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M-34 -17Q-24 -32 -9 -23 M5 -26Q19 -31 32 -18" fill="none" stroke="#101720" stroke-width="3.5" stroke-linecap="round"/>
      <g data-eyes>
        <ellipse cx="-15" cy="-1" rx="5" ry="8" fill="#fff"/>
        <ellipse cx="15" cy="-1" rx="5" ry="8" fill="#fff"/>
        <ellipse cx="-14" cy="0" rx="3" ry="6" fill="${c.eye}"/><ellipse cx="16" cy="0" rx="3" ry="6" fill="${c.eye}"/>
        <circle cx="-15" cy="-2" r="1.6" fill="#fff"/><circle cx="15" cy="-2" r="1.6" fill="#fff"/>
      </g>
      <path d="M-9 15Q0 22 10 14Q9 27 -1 26Q-7 25 -9 15Z" data-smile fill="#73352e" stroke="#995b46" stroke-width="1"/>
      <path d="M-6 17Q0 20 6 17" fill="none" stroke="#fff0e7" stroke-width="3"/>
      <path d="M-24 14Q-18 17 -15 14 M15 14Q21 17 24 14" stroke="${c.shade}" stroke-width="1" fill="none" opacity=".4"/>
      </g>
      <!-- Official Character-01 hair/face, cropped from the existing source asset.
           Limbs and trunk remain independently skinned, never a translated full-body bitmap. -->
      <g data-original-head opacity="1">
        <image href="../characters/v253/chibi-01.webp" x="-91" y="-52" width="182" height="227.5"
          preserveAspectRatio="none" clip-path="url(#character01-original-head-clip)"/>
      </g>
      <!-- Side profile visibly differs from the frontal face, rather than sliding sideways. -->
      <g data-profile-face opacity="0">
        <ellipse cx="0" cy="-2" rx="36" ry="37" fill="${c.skin}" stroke="${c.shade}" stroke-width="1.4"/>
        <path d="M-5 -22 Q8 -30 24 -18 Q37 -8 41 0 L28 4 Q25 21 2 27" fill="${c.light}" opacity=".5"/>
        <ellipse cx="13" cy="-3" rx="5" ry="7.5" fill="#fff"/>
        <ellipse cx="16" cy="-3" rx="2.8" ry="5" fill="${c.eye}"/>
        <path d="M9 -19 Q17 -23 24 -16" stroke="${c.hair}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M19 16 Q27 20 31 14" stroke="${c.shade}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M-35 -15 Q-40 -56 -6 -61 Q23 -57 33 -31 L12 -35 Q-6 -33 -25 -22Z" fill="${c.hair}" stroke="#303747" stroke-width="1.5"/>
      </g>
      <!-- Rear view hides the facial features and exposes the hair on the back of the head. -->
      <g data-rear-head opacity="0">
        <ellipse cy="-1" rx="37" ry="37" fill="${c.skin}" stroke="${c.shade}" stroke-width="1.4"/>
        <path d="M-36 -13 Q-47 -59 -11 -65 Q27 -69 38 -35 Q40 -7 32 15 Q20 30 6 29 Q-13 37 -31 18Z" fill="${c.hair}" stroke="#303747" stroke-width="1.6"/>
        <path d="M-26 -31 Q0 -53 26 -32 M-22 -10 Q-8 3 -16 19 M20 -13 Q4 0 16 18" fill="none" stroke="#576173" stroke-width="2.5" stroke-linecap="round" opacity=".62"/>
        <path d="M-13 29 Q0 34 13 29" fill="none" stroke="${c.light}" stroke-width="4"/>
      </g>
    </g>
  </g></svg>`;
}
const byAttr=(svg,name)=>svg.querySelector('[data-'+name+']');
function nodesFor(svg){
  const n={svg};for(const attr of [
    'body','shadow','leg-left','leg-right','feet','seated-legs','leg-l','leg-r','leg-l-shade','leg-r-shade',
    'sandal-l','sandal-r','strap-l','strap-r','shorts','shorts-waist',
    'flower-l','flower-r','arm-l','arm-r','arm-l-highlight','arm-r-highlight',
    'hand-l','hand-r','chest','vest-left','vest-right','abs-1','abs-2','abs-3','abs-middle',
    'necklace','pendant','head','eyes','smile','rear-torso','profile-face','rear-head','original-head'
  ])n[attr]=byAttr(svg,attr);return n;
}
const set=(n,k,v)=>n?.setAttribute(k,v);
export function renderRigPose(nodes,pose,{facing='down',headingDeg=null}={}){
  if(!nodes?.body)return;
  const b=nodes;
  // Keep world displacement separate from body orientation. Never side-step with a front-facing sprite.
  const valid=['left','right','up','down'].includes(facing)?facing:'down';
  const facingDegrees={down:0,right:90,up:180,left:270};
  const angle=Number.isFinite(headingDeg)?headingDeg:facingDegrees[valid];
  const rad=angle*Math.PI/180,front=Math.max(0,Math.cos(rad)),back=Math.max(0,-Math.cos(rad)),profile=Math.abs(Math.sin(rad));
  const weights=front+profile+back||1;
  const xScale=(Math.sin(rad)<-.0001?-1:1)*(1-.3*profile);
  set(b.body,'transform',`translate(${n(pose.root.x)} ${n(pose.root.y)}) translate(200 0) scale(${xScale} 1) translate(-200 0)`);
  set(b['rear-head'],'opacity',n(back/weights));
  set(b['rear-torso'],'opacity',n(back/weights));
  // Rear jacket is a local garment shape: anchor it to the moving shoulder, not SVG origin.
  set(b['rear-torso'],'transform',`translate(${n(200+pose.shoulder.x)} ${n(pose.shoulder.y)})`);
  set(b['profile-face'],'opacity',n(profile/weights));
  set(b['original-head'],'opacity',n(front/weights));
  if(b.svg){b.svg.dataset.facing=valid;b.svg.dataset.heading=String(Math.round(angle));}
  set(b.body,'opacity',n(pose.alpha));
  set(b.shadow,'rx',n(42*pose.shadow));
  const sitting=Math.max(0,Math.min(1,pose.sitBlend||0));
  set(b['leg-left'],'opacity',n(1-sitting));
  set(b['leg-right'],'opacity',n(1-sitting));
  set(b.feet,'opacity',n(1-sitting));
  set(b['seated-legs'],'opacity',n(sitting));
  set(b['seated-legs'],'transform',`translate(${n(200+pose.hip.x)} ${n(pose.hip.y)})`);

  const hip=point(200+pose.hip.x,pose.hip.y), shoulder=point(200+pose.shoulder.x,pose.shoulder.y);
  const sx=shoulder.x,sy=shoulder.y,hx=hip.x,hy=hip.y;
  const joint={L:point(hx-13,hy),R:point(hx+13,hy)};
  for(const side of ['L','R']){
    const low=side.toLowerCase(),k=pose.knees[side],a=pose.ankles[side];
    const knee=point(200+k.x,k.y),ankle=point(200+a.x,a.y),hipPoint=joint[side];
    // One continuous skin envelope, not two visible disconnected cylinders.
    const path=`M${p(hipPoint)} Q${n(knee.x+(hipPoint.x-knee.x)*.08)} ${n(knee.y-12)} ${p(knee)} Q${n(ankle.x)} ${n(knee.y+16)} ${p(ankle)}`;
    set(b['leg-'+low],'d',path);
    set(b['leg-'+low+'-shade'],'d',`M${n(knee.x+ (side==='L'?-6:6))} ${n(knee.y+5)} Q${n(ankle.x+ (side==='L'?-4:4))} ${n((knee.y+ankle.y)/2)} ${n(ankle.x+(side==='L'?-4:4))} ${n(ankle.y)}`);
    const fx=200+pose.footX[side],fy=pose.footY[side];
    set(b['sandal-'+low],'d',`M${n(fx-11)} ${n(fy-5)} Q${n(fx+4)} ${n(fy-10)} ${n(fx+13)} ${n(fy-3)} L${n(fx+17)} ${n(fy+3)} Q${n(fx+10)} ${n(fy+8)} ${n(fx-12)} ${n(fy+4)}Z`);
    set(b['strap-'+low],'d',`M${n(fx-3)} ${n(fy-6)} Q${n(fx+4)} ${n(fy-1)} ${n(fx+11)} ${n(fy-5)}`);
  }
  // Rounded shorts cover both hip attachments so leg roots never form visible gaps.
  set(b.shorts,'d',`M${n(hx-24)} ${n(hy-14)} Q${n(hx)} ${n(hy-4)} ${n(hx+24)} ${n(hy-14)}
  L${n(hx+27)} ${n(hy+13)} Q${n(hx+15)} ${n(hy+19)} ${n(hx+6)} ${n(hy+12)}
  L${n(hx)} ${n(hy+5)} L${n(hx-6)} ${n(hy+12)}
  Q${n(hx-15)} ${n(hy+19)} ${n(hx-27)} ${n(hy+13)}Z`);
  set(b['shorts-waist'],'d',`M${n(hx-22)} ${n(hy-11)} Q${n(hx)} ${n(hy-5)} ${n(hx+22)} ${n(hy-11)}`);
  set(b['flower-l'],'transform',`translate(${n(hx-17)} ${n(hy+6)}) scale(.75)`);
  set(b['flower-r'],'transform',`translate(${n(hx+17)} ${n(hy+6)}) scale(.65)`);

  for(const side of ['L','R']){
    const low=side.toLowerCase(),dir=side==='L'?-1:1;
    const top=point(sx+dir*27,sy+1),e=point(200+pose.elbows[side].x,pose.elbows[side].y),h=point(200+pose.hands[side].x,pose.hands[side].y);
    const arm=`M${p(top)} Q${n(e.x+dir*4)} ${n(e.y-5)} ${p(e)} Q${n((e.x+h.x)/2+dir*3)} ${n((e.y+h.y)/2)} ${p(h)}`;
    set(b['arm-'+low],'d',arm);
    set(b['arm-'+low+'-highlight'],'d',`M${n(e.x-dir*3)} ${n(e.y-9)} Q${n((e.x+h.x)/2)} ${n((e.y+h.y)/2)} ${n(h.x-dir*1)} ${n(h.y-5)}`);
    set(b['hand-'+low],'cx',n(h.x));set(b['hand-'+low],'cy',n(h.y));
  }
  const left=sx-27,right=sx+27;
  set(b.chest,'d',`M${n(left)} ${n(sy-1)} Q${n(sx)} ${n(sy-15)} ${n(right)} ${n(sy-1)}
    Q${n(right+8)} ${n(sy+23)} ${n(hx+18)} ${n(hy-13)}
    Q${n(hx)} ${n(hy-8)} ${n(hx-18)} ${n(hy-13)}
    Q${n(left-8)} ${n(sy+23)} ${n(left)} ${n(sy-1)}Z`);
  set(b['vest-left'],'d',`M${n(left-6)} ${n(sy+1)} Q${n(left+3)} ${n(sy-7)} ${n(sx-10)} ${n(sy+7)}
    L${n(sx-15)} ${n(hy-17)} L${n(hx-24)} ${n(hy-15)} Q${n(left-16)} ${n(sy+22)} ${n(left-6)} ${n(sy+1)}Z`);
  set(b['vest-right'],'d',`M${n(right+6)} ${n(sy+1)} Q${n(right-3)} ${n(sy-7)} ${n(sx+10)} ${n(sy+7)}
    L${n(sx+15)} ${n(hy-17)} L${n(hx+24)} ${n(hy-15)} Q${n(right+16)} ${n(sy+22)} ${n(right+6)} ${n(sy+1)}Z`);
  for(let i=1;i<=3;i++){
    const y=sy+20+i*10,half=11;
    set(b['abs-'+i],'d',`M${n(sx-half)} ${n(y)} Q${n(sx)} ${n(y+3)} ${n(sx+half)} ${n(y)}`);
  }
  set(b['abs-middle'],'d',`M${n(sx)} ${n(sy+18)} L${n(sx)} ${n(hy-18)}`);
  set(b.necklace,'d',`M${n(sx-12)} ${n(sy+3)} Q${n(sx)} ${n(sy+19)} ${n(sx+12)} ${n(sy+3)}`);
  set(b.pendant,'cx',n(sx));set(b.pendant,'cy',n(sy+16));
  set(b.head,'transform',`translate(${n(200+pose.head.x)} ${n(pose.head.y)}) rotate(${n(pose.headTilt)})`);
  set(b.eyes,'opacity',String(1-pose.eyes));
  set(b.smile,'opacity',pose.mouth<0?'.28':'1');
}
export function mountRigSkin(host,{skin=SAMPLE_SKINS[0]}={}){
  if(!host||typeof host.innerHTML!=='string')throw new TypeError('INVALID_RIG_HOST');
  host.innerHTML=svgMarkup(skin);
  const svg=host.querySelector('svg'),nodes=nodesFor(svg);
  return Object.freeze({
    svg,skinId:skin.id,
    render:(pose,visual={})=>renderRigPose(nodes,pose,visual),
    action:(id,elapsed,opts={})=>renderRigPose(nodes,sampleRigAction(id,elapsed,opts),opts),
    synchronized:(cmd,now,clockOffset,visual={})=>renderRigPose(nodes,sampleSynchronizedAction(cmd,now,clockOffset),visual)
  });
}
