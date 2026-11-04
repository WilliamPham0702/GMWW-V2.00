// Immutable package of original role cards shared by older runtime bundles.
// Do not substitute a different role's artwork or any user-persisted card.
export const LAST_PACKAGED_ROLE_ARTWORK_VERSION = 'V3.119';

export async function fetchCanonicalRoleArtwork(assets, requestUrl, roleId, runtimeVersion) {
  const versions = [runtimeVersion, LAST_PACKAGED_ROLE_ARTWORK_VERSION]
    .filter((version, index, all) => version && all.indexOf(version) === index);
  let asset = null;
  for (const version of versions) {
    const imageUrl = new URL('/updates/runtime/' + version +
      '/assets/role-artwork-v251/original/' + roleId + '.webp', requestUrl);
    asset = await assets.fetch(new Request(imageUrl.toString(), {method: 'GET'}));
    // Fall back only for a genuinely absent runtime asset, not a server error.
    if (asset.ok || asset.status !== 404) break;
  }
  return asset;
}
