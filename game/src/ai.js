// ai.js — the Keeper, the AI opponent. Its choices are readable and can be
// countered: it chases lanes where a ship is one or two steps from its own
// harbor, it lights a Lantern when the player is about to dock, it Squalls
// the lane closest to the player docking, and it Anchors a lane whose ship
// is in danger of being pushed home by the player.

import { CARD_KINDS } from './deck.js';

/** Distance from a ship to a harbor: 0 means it is already docked. */
function distanceTo(lane, harbor) {
  return harbor === 'ai' ? 6 - lane.ship : lane.ship;
}

/**
 * Pick the AI's move: { card, lane } — lane is null for Gale, which hits
 * every lane. Returns null only when the AI holds no card at all.
 */
export function chooseAiMove(state) {
  const hand = state.aiHand;
  const lanes = state.lanes;
  const byKind = (kind) => hand.filter((c) => c.kind === kind);
  const bestWave = byKind('wave').sort((a, b) => b.value - a.value)[0];

  // 1. Finish the job: a Wave that docks a ship right now wins the lane.
  if (bestWave) {
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      if (lane.ship + bestWave.value >= 6 && !lane.reversed) return { card: bestWave, lane: i };
      if (lane.ship - bestWave.value <= 0 && lane.reversed) return { card: bestWave, lane: i };
    }
  }

  // 2. The player is about to dock: light a Lantern to turn their Wave back.
  const lantern = byKind('lantern')[0];
  if (lantern) {
    for (let i = 0; i < lanes.length; i++) {
      if (distanceTo(lanes[i], 'player') <= 2 && !lanes[i].reversed) {
        return { card: lantern, lane: i };
      }
    }
  }

  // 3. Squall to finish a docking of the Keeper's own (ship at 4–5 sails
  //    to 6), or to shove a ship away from the player's harbor so the
  //    player cannot dock it next turn. A squall never docks for the Keeper
  //    from 3 or closer to the player's side, so it is safe denial there.
  const squall = byKind('squall')[0];
  if (squall) {
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].ship >= 4) return { card: squall, lane: i };
    }
    let target = -1;
    let closest = Infinity;
    for (let i = 0; i < lanes.length; i++) {
      const d = distanceTo(lanes[i], 'player');
      if (d < closest) { closest = d; target = i; }
    }
    if (target >= 0 && closest <= 3) return { card: squall, lane: target };
  }

  // 4. Anchor a lane whose ship the player could dock next turn.
  const anchor = byKind('anchor')[0];
  if (anchor) {
    for (let i = 0; i < lanes.length; i++) {
      if (distanceTo(lanes[i], 'player') <= 3 && !lanes[i].shield) {
        return { card: anchor, lane: i };
      }
    }
  }

  // 5. Gale when at least two ships sit on the AI's half of the table.
  const gale = byKind('gale')[0];
  if (gale) {
    const far = lanes.filter((l) => l.ship >= 4).length;
    if (far >= 2) return { card: gale, lane: null };
  }

  // 6. Otherwise play the strongest Wave on the lane nearest its own harbor.
  if (bestWave) {
    let target = 0;
    let closest = Infinity;
    for (let i = 0; i < lanes.length; i++) {
      const d = distanceTo(lanes[i], 'ai');
      if (d < closest) { closest = d; target = i; }
    }
    return { card: bestWave, lane: target };
  }

  // 7. Fallback: play whatever is left — Lantern, Squall, Anchor, then Gale.
  const fallback = byKind('lantern')[0] || byKind('squall')[0]
    || byKind('anchor')[0] || byKind('gale')[0] || hand[0];
  if (!fallback) return null;
  if (fallback.kind === 'gale') return { card: fallback, lane: null };
  let target = 0;
  let closest = Infinity;
  for (let i = 0; i < lanes.length; i++) {
    const d = distanceTo(lanes[i], 'ai');
    if (d < closest) { closest = d; target = i; }
  }
  return { card: fallback, lane: target };
}

/** One-line explanation of a card kind, shown in the hand's tooltip. */
export function kindHint(kind) {
  return CARD_KINDS[kind].blurb;
}
