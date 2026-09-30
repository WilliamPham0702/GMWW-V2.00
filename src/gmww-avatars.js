import a0 from './gmww-avatar-set-0.js';
import a1 from './gmww-avatar-set-1.js';
import a2 from './gmww-avatar-set-2.js';
import a3 from './gmww-avatar-set-3.js';
import a4a from './gmww-avatar-set-4a.js';
import a4b from './gmww-avatar-set-4b.js';
import a4c from './gmww-avatar-set-4c.js';
import a4d from './gmww-avatar-set-4d.js';

export const GMWW_MEMBER_AVATARS = [...a0, ...a1, ...a2, ...a3, ...a4a, ...a4b, ...a4c, ...a4d];
export const GMWW_MEMBER_AVATAR_IDS = new Set(GMWW_MEMBER_AVATARS.map(a => a.id));
export function gmwwAvatarById(id){ return GMWW_MEMBER_AVATARS.find(a => a.id === id) || GMWW_MEMBER_AVATARS[0]; }
