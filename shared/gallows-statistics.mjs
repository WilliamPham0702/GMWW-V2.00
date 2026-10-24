/** Shared, side-effect-free gallows tally helpers. Server must validate permissions and persist decisions. */
export function gallowsEligiblePlayers(players = []) {
  return players.filter(p => p && p.alive !== false && p.isAlive !== false && p.dead !== true);
}
export function gallowsTally(players = [], nominations = [], votes = [], restrictions = {}) {
  const eligible = gallowsEligiblePlayers(players);
  const ids = new Set(eligible.map(p => String(p.loginId ?? p.id)));
  const blockedNomination = new Set((restrictions.nominationBans || []).map(String));
  const blockedVoting = new Set((restrictions.voteBans || []).map(String));
  const unique = (records, blocked) => {
    const byVoter = new Map();
    for (const item of records) {
      const voter = String(item?.voterId ?? '');
      const target = String(item?.targetId ?? '');
      if (!ids.has(voter) || !ids.has(target) || blocked.has(voter)) continue;
      byVoter.set(voter, { target, choice: item.choice });
    }
    return [...byVoter.values()];
  };
  const nominationsValid = unique(nominations, blockedNomination);
  const votesValid = unique(votes, blockedVoting);
  const count = new Map(eligible.map(p => [String(p.loginId ?? p.id), { nominations: 0, save: 0, kill: 0 }]));
  for (const { target } of nominationsValid) count.get(target).nominations++;
  for (const { target, choice } of votesValid) {
    if (choice === 'save') count.get(target).save++;
    if (choice === 'kill') count.get(target).kill++;
  }
  const denominator = Math.max(0, ids.size - blockedNomination.size);
  return eligible.map(player => {
    const id = String(player.loginId ?? player.id);
    const tally = count.get(id);
    return { player, id, ...tally, nominationPercent: denominator ? Math.round(tally.nominations / denominator * 10000) / 100 : 0,
      nominationBanned: blockedNomination.has(id), voteBanned: blockedVoting.has(id) };
  }).sort((a, b) => b.nominations - a.nominations || a.id.localeCompare(b.id));
}
