// Khoá và chuẩn hoá nhỏ của ván: chu kỳ bảo vật, nhãn ván, phe thắng, điều kiện gọi Sát Thủ.
import { artifactCycleKey } from "../../gmww-game-scene-rules.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";

// ASSASSIN-01: a target killed THIS night (wolf bite, etc.) is still woken for the 👍👎 choice.
// A correct pick only cancels the Assassin's effect; any other death already recorded stays in force.
// Earlier deaths and expulsions still block the prompt.
export const assassinPromptBlocked=(rows,loginId,matchId,night)=>(Array.isArray(rows)?rows:[]).some(y=>normalizeLoginId(y?.loginId)===loginId&&
  ["expelled","dead"].includes(String(y?.type||""))&&y?.effectActive!==false&&(!y?.matchId||!matchId||String(y.matchId)===String(matchId))&&
  (String(y.type)==="expelled"||String(y?.source||"")==="assassin"||Number(y?.night)!==Number(night)));
export function currentArtifactCycleKey(meta){const n=Math.max(1,Number(meta?.cycleNight||1)),phase=String(meta?.cyclePhase||"").toLowerCase();return phase==="day"||phase==="morning"?String(meta?.matchId||"match")+":day:"+n:artifactCycleKey(meta?.matchId||"match",n)}
export function gameLabelKey(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
export function normalizeWinnerFaction(v){const raw=String(v||"").trim();if(!raw)return"";const n=raw.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();if(n.includes("phe dan"))return"Phe Dân";if(n.includes("phe soi"))return"Phe Sói";if(n.includes("phe ba")||n.includes("phe thu 3")||n.includes("phe thu ba"))return"Phe Ba";if(n.includes("phe khac"))return"Phe Khác";return raw.replace(/^[^A-Za-zÀ-ỹ0-9]+/u,"").trim().slice(0,120)}
