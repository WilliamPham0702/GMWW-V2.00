import {validateSkin,SAMPLE_SKINS,sampleRigAction,sampleSynchronizedAction} from './rig-skin-core.mjs';

// Unlike the old renderer, every limb is a separately drawn skin attachment.
// The hierarchy expresses hip -> thigh -> shin -> foot and chest -> upper arm -> forearm.
function svgMarkup(skin){
  const c=validateSkin(skin);
  return `<svg class="rig-skin-svg" viewBox="0 0 400 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Nhân vật mẫu với tay chân chuyển động bằng khớp">
    <defs>
      <linearGradient id="skinBody" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c.body}"/><stop offset="1" stop-color="${c.shadow}"/></linearGradient>
      <linearGradient id="skinFabric" x1="0" y1="0" x2="0.9" y2="1"><stop stop-color="${c.top}"/><stop offset="1" stop-color="${c.pants}"/></linearGradient>
    </defs>
    <ellipse data-shadow cx="200" cy="294" rx="38" ry="7" fill="#000000" opacity=".25"/>
    <g data-joint="root" transform="translate(200 283)">
      <g data-joint="thighL" transform="translate(-12 -79)">
        <path d="M-11 -2 Q-18 16 -13 48 L10 48 Q18 15 12 -2 Z" fill="${c.pants}" stroke="${c.trim}" stroke-width="1"/>
        <g data-joint="shinL" transform="translate(0 43)">
          <path d="M-11 -2 Q-12 17 -9 41 L9 41 Q14 16 10 -2 Z" fill="${c.pants}"/>
          <path d="M-11 20 L11 20" stroke="${c.trim}" stroke-width="2.8" opacity=".65"/>
          <g data-joint="footL" transform="translate(0 39)">
            <path d="M-11 -2 L11 -2 Q23 2 22 10 L-13 10 Q-16 5 -11 -2Z" fill="${c.boots}" stroke="${c.trim}" stroke-width="1"/>
          </g>
        </g>
      </g>
      <g data-joint="thighR" transform="translate(12 -79)">
        <path d="M-12 -2 Q-17 17 -11 48 L12 48 Q18 14 11 -2 Z" fill="${c.pants}" stroke="${c.trim}" stroke-width="1"/>
        <g data-joint="shinR" transform="translate(0 43)">
          <path d="M-10 -2 Q-11 17 -9 41 L10 41 Q13 15 11 -2 Z" fill="${c.pants}"/>
          <path d="M-10 20 L12 20" stroke="${c.trim}" stroke-width="2.8" opacity=".65"/>
          <g data-joint="footR" transform="translate(0 39)">
            <path d="M-10 -2 L10 -2 Q24 2 22 10 L-13 10 Q-16 5 -10 -2Z" fill="${c.boots}" stroke="${c.trim}" stroke-width="1"/>
          </g>
        </g>
      </g>
      <g data-joint="torso" transform="translate(0 -79)">
        <g data-joint="upperArmL" transform="translate(-26 -49)">
          <path d="M-10 -2 Q-20 5 -15 30 L-9 38 L11 37 Q17 15 9 1Z" fill="url(#skinBody)" stroke="${c.shadow}" stroke-width="1"/>
          <g data-joint="forearmL" transform="translate(0 32)">
            <path d="M-9 -3 Q-13 13 -9 30 L10 30 Q13 11 10 -3Z" fill="url(#skinBody)"/>
            <ellipse cx="0" cy="31" rx="10" ry="11" fill="${c.body}"/>
          </g>
        </g>
        <path d="M-27 -53 Q-39 -48 -33 -23 L-28 6 Q0 16 28 6 L33 -23 Q39 -49 26 -53 L17 -59 L-17 -59 Z" fill="url(#skinFabric)" stroke="${c.trim}" stroke-width="2"/>
        <path d="M-22 -43 Q0 -36 22 -43 M-20 -23 Q0 -16 20 -23" fill="none" stroke="${c.trim}" opacity=".45" stroke-width="2"/>
        <path d="M-28 4 Q0 10 28 4" stroke="${c.belt}" stroke-width="8"/>
        <rect x="-6" y="1" width="12" height="8" rx="2" fill="${c.trim}"/>
        <g data-joint="upperArmR" transform="translate(26 -49)">
          <path d="M-9 -2 Q-19 4 -13 30 L-9 38 L10 37 Q18 12 10 1Z" fill="url(#skinBody)" stroke="${c.shadow}" stroke-width="1"/>
          <g data-joint="forearmR" transform="translate(0 32)">
            <path d="M-9 -3 Q-13 13 -10 30 L11 30 Q13 11 9 -3Z" fill="url(#skinBody)"/>
            <ellipse cx="0" cy="31" rx="10" ry="11" fill="${c.body}"/>
          </g>
        </g>
        <g data-joint="head" transform="translate(0 -72)">
          <rect x="-9" y="-5" width="18" height="17" rx="6" fill="${c.body}"/>
          <ellipse cx="0" cy="-20" rx="32" ry="35" fill="url(#skinBody)" stroke="${c.shadow}" stroke-width="1"/>
          <ellipse cx="-32" cy="-17" rx="5" ry="9" fill="${c.body}"/>
          <ellipse cx="32" cy="-17" rx="5" ry="9" fill="${c.body}"/>
          <g data-joint="hair">
            <path d="M-33 -27 Q-42 -57 -18 -62 Q-3 -76 22 -60 Q36 -54 34 -27 L25 -44 Q15 -37 6 -48 Q-5 -38 -16 -44 L-28 -30Z" fill="${c.hair}" stroke="${c.trim}" stroke-width="1"/>
            <path d="M-32 -31 Q-35 -14 -25 -9 M33 -35 Q38 -15 26 -6" stroke="${c.hair}" stroke-width="7" stroke-linecap="round"/>
          </g>
          <g data-eyes>
            <ellipse cx="-13" cy="-17" rx="3.5" ry="5.5" fill="${c.eye}"/>
            <ellipse cx="13" cy="-17" rx="3.5" ry="5.5" fill="${c.eye}"/>
            <circle cx="-14" cy="-19" r="1.2" fill="#fff"/><circle cx="12" cy="-19" r="1.2" fill="#fff"/>
          </g>
          <path d="M-7 -3 Q0 2 7 -3" stroke="${c.shadow}" stroke-width="2" fill="none" stroke-linecap="round"/>
          <ellipse data-mouth cx="0" cy="-3" rx="3" ry="1" fill="${c.eye}" opacity="0"/>
        </g>
      </g>
    </g>
  </svg>`;
}
function getJoints(svg){
  const out={};
  for(const node of svg.querySelectorAll('[data-joint]'))out[node.getAttribute('data-joint')]=node;
  out.eyes=svg.querySelector('[data-eyes]');
  out.mouth=svg.querySelector('[data-mouth]');
  out.shadow=svg.querySelector('[data-shadow]');
  return out;
}
const rot=(x,y,a)=>`translate(${x} ${y}) rotate(${Number(a).toFixed(2)})`;
export function renderRigPose(joints,p){
  if(!joints?.root)return;
  joints.root.setAttribute('transform',`translate(${(200+p.rootX).toFixed(2)} ${(283+p.rootY).toFixed(2)}) rotate(${p.rootRotation.toFixed(2)}) scale(${p.scaleX.toFixed(3)} 1)`);
  joints.root.setAttribute('opacity',String(p.alpha));
  joints.torso.setAttribute('transform',rot(0,-79,p.torso));
  joints.head.setAttribute('transform',rot(0,-72,p.head));
  joints.hair.setAttribute('transform',rot(0,-15,p.hair));
  for(const [side,x] of [['L',-12],['R',12]]){
    joints['thigh'+side].setAttribute('transform',rot(x,-79,p['thigh'+side]));
    joints['shin'+side].setAttribute('transform',rot(0,43,p['shin'+side]));
    joints['foot'+side].setAttribute('transform',`translate(${p['footComp'+side].toFixed(2)} 39) rotate(${p['foot'+side].toFixed(2)})`);
    joints['upperArm'+side].setAttribute('transform',rot(side==='L'?-26:26,-49,p['upperArm'+side]));
    joints['forearm'+side].setAttribute('transform',rot(0,32,p['forearm'+side]));
  }
  joints.eyes.setAttribute('transform',`translate(0 -17) scale(1 ${p.eyesClosed>.5?.12:1}) translate(0 17)`);
  joints.mouth.setAttribute('opacity',p.mouth?'1':'0');
  joints.shadow.setAttribute('rx',(38*p.shadowScale).toFixed(2));
}
export function mountRigSkin(host,{skin=SAMPLE_SKINS[0]}={}){
  if(!host || typeof host.innerHTML!=='string')throw new TypeError('INVALID_RIG_HOST');
  host.innerHTML=svgMarkup(skin);
  const svg=host.querySelector('svg'),joints=getJoints(svg);
  return Object.freeze({
    svg,skinId:skin.id,
    render:(pose)=>renderRigPose(joints,pose),
    action:(id,elapsed,opts)=>renderRigPose(joints,sampleRigAction(id,elapsed,opts)),
    synchronized:(cmd,now,clockOffset)=>renderRigPose(joints,sampleSynchronizedAction(cmd,now,clockOffset))
  });
}
