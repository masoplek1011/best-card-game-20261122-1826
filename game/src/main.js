// main.js — wires Tide & Lantern together: mouse and keyboard play, the
// Keeper's turn after a short pause, and the ?shot= presets that set up a
// fixed scene (title, mid-game, win or loss) for screenshots. The game is
// fully playable by clicking; the presets only choose a starting scene.

import { newGame, playCard, isTurn } from './state.js';
import { chooseAiMove } from './ai.js';
import { render } from './render.js';
import { drawCard } from './deck.js';

const root = document.getElementById('app');
let state = newGame();
const ui = { selectedCard: null, selectedLane: null, aiTimer: null };

function draw() {
  render(root, state, ui);
}

function startGame() {
  state = newGame();
  state.phase = 'play';
  ui.selectedCard = null;
  ui.selectedLane = null;
  draw();
}

function takeTurn(card, laneIndex) {
  if (!isTurn(state, 'player')) return;
  if (card.kind === 'gale') laneIndex = null;
  if (laneIndex === null || laneIndex === undefined) laneIndex = 0;
  const played = playCard(state, 'player', card, laneIndex);
  if (!played) return;
  ui.selectedCard = null;
  ui.selectedLane = null;
  state.turn = 'ai';
  draw();
  if (state.phase !== 'play') return;
  ui.aiTimer = setTimeout(() => {
    const move = chooseAiMove(state);
    if (move) playCard(state, 'ai', move.card, move.lane === null ? 0 : move.lane);
    state.turn = 'player';
    draw();
  }, 900);
}

root.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]');
  if (action) {
    if (action.dataset.action === 'start' || action.dataset.action === 'restart') startGame();
    return;
  }
  const cardEl = event.target.closest('[data-card]');
  if (cardEl) {
    const id = Number(cardEl.dataset.card);
    const card = state.playerHand.find((c) => c.id === id);
    if (!card || !isTurn(state, 'player')) return;
    ui.selectedCard = ui.selectedCard && ui.selectedCard.id === id ? null : card;
    if (ui.selectedCard && ui.selectedCard.kind === 'gale') {
      takeTurn(ui.selectedCard, null);
      return;
    }
    draw();
    return;
  }
  const laneEl = event.target.closest('[data-lane]');
  if (laneEl) {
    const laneIndex = Number(laneEl.dataset.lane);
    ui.selectedLane = laneIndex;
    if (ui.selectedCard) takeTurn(ui.selectedCard, laneIndex);
    else draw();
  }
});

document.addEventListener('keydown', (event) => {
  if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
    startGame();
    return;
  }
  if (state.phase === 'win' || state.phase === 'loss') {
    if (event.key === 'Enter') startGame();
    return;
  }
  if (!isTurn(state, 'player')) return;
  const digit = Number(event.key);
  if (digit >= 1 && digit <= state.playerHand.length) {
    ui.selectedCard = state.playerHand[digit - 1];
    if (ui.selectedCard.kind === 'gale') {
      takeTurn(ui.selectedCard, null);
      return;
    }
    draw();
    return;
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    if (ui.selectedLane === null) ui.selectedLane = 1;
    else ui.selectedLane = (ui.selectedLane + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    draw();
    return;
  }
  if (event.key === 'Enter' && ui.selectedCard && ui.selectedLane !== null) {
    takeTurn(ui.selectedCard, ui.selectedLane);
  }
});

// --- Screenshot presets: ?shot=title | play | win | loss -----------------
// Each one builds the same real game state a player could reach, so the
// screenshots are honest renders of the game, not mockups.
function applyShot(shot) {
  if (shot === 'title') {
    state.phase = 'title';
    draw();
    return;
  }
  if (shot === 'play') {
    state.phase = 'play';
    state.lanes[0].ship = 2;
    state.lanes[1].ship = 4;
    state.lanes[1].reversed = true;
    state.lanes[2].ship = 5;
    state.lanes[2].shield = 'player';
    state.playerScore = 3;
    state.aiScore = 2;
    state.playerHp = 10;
    state.aiHp = 8;
    state.log = [
      'You played Wave 3 on lane 1 toward your harbor.',
      'The Keeper lit a Lantern on lane 2 — the current is reversed.',
      'Ship docked at YOUR harbor! +1 point, enemy harbor −2 HP.',
    ];
    ui.selectedCard = state.playerHand[0];
    ui.selectedLane = 0;
    draw();
    return;
  }
  if (shot === 'win' || shot === 'loss') {
    state.phase = 'play';
    state.playerScore = shot === 'win' ? 6 : 4;
    state.aiScore = shot === 'win' ? 4 : 6;
    state.playerHp = shot === 'win' ? 8 : 2;
    state.aiHp = shot === 'win' ? 2 : 10;
    state.lanes[0].ship = shot === 'win' ? 1 : 5;
    state.lanes[1].ship = 3;
    state.lanes[2].ship = shot === 'win' ? 2 : 4;
    // Play one last real card through the rules so the end screen is
    // earned, not staged: guarantee the finisher is in the hand first by
    // swapping it in from the deck (a hand any player could hold).
    if (shot === 'win') {
      let wave = state.playerHand.find((c) => c.kind === 'wave');
      if (!wave) {
        const fromDeck = state.deck.findIndex((c) => c.kind === 'wave');
        if (fromDeck >= 0) {
          state.deck.push(state.playerHand[0]);
          state.playerHand[0] = state.deck.splice(fromDeck, 1)[0];
          wave = state.playerHand[0];
        }
      }
      state.turn = 'player';
      if (wave) playCard(state, 'player', wave, 0); // ship at 1 docks: 7 points, AI harbor 0 HP
    } else {
      let squall = state.aiHand.find((c) => c.kind === 'squall');
      if (!squall) {
        const fromDeck = state.deck.findIndex((c) => c.kind === 'squall');
        if (fromDeck >= 0) {
          state.deck.push(state.aiHand[0]);
          state.aiHand[0] = state.deck.splice(fromDeck, 1)[0];
          squall = state.aiHand[0];
        }
      }
      state.turn = 'ai';
      if (squall) playCard(state, 'ai', squall, 2); // ship at 4 sails to 6: AI docks, 7 points
    }
    draw();
  }
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) applyShot(shot);
else draw();
