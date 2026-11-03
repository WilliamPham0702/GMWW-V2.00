/**
 * P0 GMWW admin authentication: Worker secret binding only.
 * Never fall back to a key from code, assets, URL or client request.
 * This module is safe to import in Worker and Durable Object.
 */
const MIN = 32;
const MAX = 256;
export function configuredAdminToken(env) {
  const value = env?.GMWW_ADMIN_SYNC_TOKEN;
  if (typeof value !== 'string' || value.length < MIN || value.length > MAX ||
      !/^[\x21-\x7e]+$/.test(value)) return null;
  return value;
}
export function matchesAdminToken(token, env) {
  const expected = configuredAdminToken(env);
  if (!expected || typeof token !== 'string' || token.length > MAX) return false;
  // No successful prefix/early-exit; a missing secret NEVER matches.
  let difference = token.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ (token.charCodeAt(i) || 0);
  }
  return difference === 0;
}
