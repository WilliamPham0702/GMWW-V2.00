// Adapter from the existing GMWW V2.00 authoritative Room DTO.
// Side-effect free and unused by Production until separately approved.
import {publicRoom} from './gmww-public-room-contract.js';
import {createPublicRendererFrame,rendererCommands} from '../assets/village/dual-renderer-core.mjs';

// Call only with server-derived, already sanitized publicPlayer rows.
// Do not hand unfiltered storage rows or private Role/Artifact assignments to any renderer.
export function fromAuthoritativePublicRoom(meta,publicPlayers){
  return createPublicRendererFrame({room:publicRoom(meta),players:publicPlayers});
}
export function pairedRendererCommands(meta,publicPlayers){
  const frame=fromAuthoritativePublicRoom(meta,publicPlayers);
  return {frame,twoD:rendererCommands(frame,'2d'),threeD:rendererCommands(frame,'3d')};
}
