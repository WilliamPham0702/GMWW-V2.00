/** Deterministic, room-local synthetic participants for GMWW Demo rooms. */
export function demoSeatCount(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 8 || n > 30) throw new RangeError('Demo requires 8–30 players');
  return n;
}
export function makeDemoPlayers({roomCode, count, positions, now = new Date()}) {
  const code = String(roomCode || '').toUpperCase();
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) throw new Error('Invalid demo room code');
  const size = demoSeatCount(count);
  if (!Array.isArray(positions) || positions.length < size) throw new Error('Demo seat positions unavailable');
  const at = now.toISOString(), heartbeat = now.getTime(), players = {};
  for (let i = 0; i < size; i++) {
    const loginId = 'dm' + code.toLowerCase() + String(i + 1).padStart(2, '0');
    const seatId = i + 1, point = positions[i], id = 'member:' + loginId;
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) throw new Error('Invalid demo seat point');
    players[id] = {
      participantId: id, kind: 'member', loginId, demoBot: true,
      displayName: 'Demo ' + String(seatId).padStart(2, '0'), avatarId: '',
      gameCharacterId: 'character-' + String((i % 40) + 1).padStart(2, '0'),
      seatId, ready: true, reservedByGM: true,
      positionX: point.x, positionY: point.y, movementStatus: 'idle',
      joinedAt: at, lastSeenAt: at, lastHeartbeatAt: heartbeat
    };
  }
  return players;
}
