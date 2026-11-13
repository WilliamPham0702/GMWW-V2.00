// Băm mật khẩu, token ngẫu nhiên, base64.
import { PBKDF2_ITERATIONS } from "../config.js";

export async function derivePasswordHash(password,salt,iterations=PBKDF2_ITERATIONS){const count=Number(iterations);if(!Number.isSafeInteger(count)||count<1)throw new Error("INVALID_PASSWORD_ITERATIONS");const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),{name:"PBKDF2"},false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:count},key,256);return bytesToBase64(new Uint8Array(bits))}
export async function verifyPassword(password,m){const iterations=Number(m?.passwordIterations)||PBKDF2_ITERATIONS;return timingSafeEqual(await derivePasswordHash(password,base64ToBytes(m.passwordSalt),iterations),m.passwordHash)}
export async function sha256(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
export function timingSafeEqual(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
export function randomToken(n){return bytesToBase64(crypto.getRandomValues(new Uint8Array(n))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
export function bytesToBase64(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
export function base64ToBytes(v){const s=atob(v);return Uint8Array.from(s,c=>c.charCodeAt(0))}
