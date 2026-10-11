// Internal-only Cloudflare Durable Object PITR authorization.
// Never use the legacy GM sync token for this operation.
export async function authorizedPitr(request, configuredSecret) {
 if (typeof configuredSecret !== 'string' || configuredSecret.length < 32) return false;
 const raw = request.headers.get('authorization') || '';
 if (!raw.startsWith('Bearer ') || raw.length > 520) return false;
 const supplied = raw.slice(7);
 if (!supplied || supplied.length > 512) return false;
 const encoder = new TextEncoder();
 const [a, b] = await Promise.all([
  crypto.subtle.digest('SHA-256', encoder.encode(configuredSecret)),
  crypto.subtle.digest('SHA-256', encoder.encode(supplied))
 ]);
 const one = new Uint8Array(a), two = new Uint8Array(b);
 let difference = 0;
 for (let i = 0; i < one.length; i++) difference |= one[i] ^ two[i];
 return difference === 0;
}
