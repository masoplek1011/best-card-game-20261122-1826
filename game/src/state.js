// state.js — the whole game state of Tide & Lantern and the rules that move it.
//
// Three sea lanes. Each lane holds one ship on a track of 0–6: 0 is the
// player's harbor, 6 is the AI harbor, every ship starts at 3. A ship that
// reaches a harbor docks: its side scores a point and the enemy harbor takes
// 2 damage, then a fresh ship appears at 3. First to 7 points, or a harbor
// reduced to 0 HP, wins. Harbor HP starts at 12 each.

import { buildDeck, shuffle, drawCard } from './deck.js';

export const WIN_POINTS = 7;
export const HARBOR_HP = 12;
export const DOCK_DAMAGE = 2;
export const HAND_SIZE = 5;
export const LANE_COUNT = 3;
export const TRACK_END = 6;

/** A brand-new game: shuffled deck, five cards each, ships at mid-track. */
export function newGame() {
  const state = {
    phase: 'title', // title | play | win | loss
    turn: 'player',
    lanes: [
      { ship: 3, reversed: false, shield: null },
      { ship: 3, reversed: false, shield: null },
      { ship: 3, reversed: false, shield: null },
    ],
    playerHand: [],
    aiHand: [],
    deck: shuffle(buildDeck()),
    discard: [],
    playerScore: 0,
    aiScore: 0,
    playerHp: HARBOR_HP,
    aiHp: HARBOR_HP,
    log: ['The tide is rising. The lighthouse keeper deals the first hand.'],
    lastMove: null,
    winner: null,
  };
  for (let i = 0; i < HAND_SIZE; i++) {
    state.playerHand.push(drawCard(state));
    state.aiHand.push(drawCard(state));
  }
  return state;
}

/** Add a line to the move log, keeping only the newest few. */
export function addLog(state, line) {
  state.log.unshift(line);
  if (state.log.length > 5) state.log.length = 5;
}

function dockShip(state, laneIndex, side) {
  const lane = state.lanes[laneIndex];
  if (side === 'player') {
    state.playerScore += 1;
    state.aiHp = Math.max(0, state.aiHp - DOCK_DAMAGE);
    addLog(state, `Ship docked at YOUR harbor! +1 point, enemy harbor −${DOCK_DAMAGE} HP.`);
  } else {
    state.aiScore += 1;
    state.playerHp = Math.max(0, state.playerHp - DOCK_DAMAGE);
    addLog(state, `Ship docked at the ENEMY harbor! AI +1 point, your harbor −${DOCK_DAMAGE} HP.`);
  }
  lane.ship = 3;
  lane.reversed = false;
  lane.shield = null;
  checkEnd(state);
}

/** Move one lane's ship by `steps` toward a harbor, honoring shields. */
export function moveShip(state, laneIndex, steps, toward, mover) {
  const lane = state.lanes[laneIndex];
  if (lane.shield && lane.shield !== mover) {
    addLog(state, `Anchor held lane ${laneIndex + 1} — the ship did not move.`);
    lane.shield = null;
    return 'blocked';
  }
  lane.shield = null;
  const delta = toward === 'player' ? -steps : steps;
  lane.ship += delta;
  if (lane.ship <= 0) {
    lane.ship = 0;
    dockShip(state, laneIndex, 'player');
    return 'docked-player';
  }
  if (lane.ship >= TRACK_END) {
    lane.ship = TRACK_END;
    dockShip(state, laneIndex, 'ai');
    return 'docked-ai';
  }
  return 'moved';
}

function checkEnd(state) {
  if (state.phase !== 'play') return;
  if (state.playerScore >= WIN_POINTS || state.aiHp <= 0) {
    state.phase = 'win';
    state.winner = 'player';
    addLog(state, 'YOU WIN — the harbor is full of your ships!');
  } else if (state.aiScore >= WIN_POINTS || state.playerHp <= 0) {
    state.phase = 'loss';
    state.winner = 'ai';
    addLog(state, 'THE TIDE TOOK YOUR HARBOR.');
  }
}

/**
 * Play a card from a hand onto a lane (or the whole table for Gale).
 * Returns a short description of what happened, or null when illegal.
 */
export function playCard(state, side, card, laneIndex) {
  const hand = side === 'player' ? state.playerHand : state.aiHand;
  const at = hand.indexOf(card);
  if (at < 0 || state.phase !== 'play') return null;
  hand.splice(at, 1);
  state.discard.push(card);
  const who = side === 'player' ? 'You' : 'The Keeper';
  const home = side === 'player' ? 'player' : 'ai';
  const foe = side === 'player' ? 'ai' : 'player';
  const homeName = side === 'player' ? 'your harbor' : 'the enemy harbor';
  const foeName = side === 'player' ? 'the enemy harbor' : 'your harbor';
  let outcome = '';

  if (card.kind === 'wave') {
    const lane = state.lanes[laneIndex];
    const toward = lane.reversed ? foe : home;
    const dir = toward === 'player' ? 'your harbor' : 'the enemy harbor';
    if (lane.reversed) {
      addLog(state, `${who} played Wave ${card.value} on a reversed lane — it sails backward!`);
      lane.reversed = false;
    }
    const result = moveShip(state, laneIndex, card.value, toward, side);
    outcome = result === 'blocked'
      ? `${who} played Wave ${card.value} on lane ${laneIndex + 1}, but the Anchor held.`
      : `${who} played Wave ${card.value} on lane ${laneIndex + 1} toward ${dir}.`;
  } else if (card.kind === 'lantern') {
    const lane = state.lanes[laneIndex];
    lane.reversed = !lane.reversed;
    outcome = `${who} lit a Lantern on lane ${laneIndex + 1} — the current is reversed.`;
  } else if (card.kind === 'squall') {
    // A squall always blows toward the Keeper's harbor, whoever plays it:
    // the Keeper uses it to shove ships away from the player's harbor (or
    // to finish a docking of its own); the player spends it to cycle a hand
    // when the push cannot hand the Keeper a dock.
    const result = moveShip(state, laneIndex, card.value, 'ai', side);
    outcome = result === 'blocked'
      ? `${who} played Squall on lane ${laneIndex + 1}, but the Anchor held.`
      : `${who} played Squall on lane ${laneIndex + 1} toward the Keeper's harbor.`;
  } else if (card.kind === 'anchor') {
    state.lanes[laneIndex].shield = side;
    outcome = `${who} anchored lane ${laneIndex + 1} — its ship is safe next turn.`;
  } else if (card.kind === 'gale') {
    for (let i = 0; i < LANE_COUNT; i++) {
      if (state.phase !== 'play') break;
      moveShip(state, i, 1, home, side);
    }
    outcome = `${who} played Gale — every ship is pushed toward ${homeName}!`;
  }

  addLog(state, outcome);
  state.lastMove = { side, card: card.kind, value: card.value, lane: laneIndex };
  const drawn = drawCard(state);
  if (drawn) hand.push(drawn);
  checkEnd(state);
  return outcome;
}

/** True while the game is in progress and it is the given side's turn. */
export function isTurn(state, side) {
  return state.phase === 'play' && state.turn === side;
}
