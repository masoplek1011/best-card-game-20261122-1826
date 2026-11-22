// render.js — draws the whole table into the DOM: scoreboard, harbors, the
// three lanes with their ships, both hands, the turn banner and the log.
// The page never rebuilds the document; render() only refreshes what the
// state says, so cards slide and snap with a CSS transition.

import { CARD_KINDS } from './deck.js';
import { WIN_POINTS, HARBOR_HP } from './state.js';

function hpBar(hp, label, side) {
  const pct = Math.max(0, Math.round((hp / HARBOR_HP) * 100));
  return `<div class="harbor ${side}">
    <div class="harbor-name">${label}</div>
    <div class="hp-track"><div class="hp-fill" style="width:${pct}%"></div></div>
    <div class="hp-text">${hp} / ${HARBOR_HP} HP</div>
  </div>`;
}

function cardFace(card, selected) {
  const value = card.kind === 'wave' ? String(card.value) : '★';
  return `<button class="card kind-${card.kind}${selected ? ' selected' : ''}"
      data-card="${card.id}" title="${card.name}: ${card.blurb}">
    <span class="card-glyph">${card.glyph}</span>
    <span class="card-value">${value}</span>
    <span class="card-name">${card.name}</span>
    <span class="card-blurb">${card.blurb}</span>
  </button>`;
}

function laneRow(lane, index, selectedLane) {
  let cells = '';
  for (let pos = 0; pos <= 6; pos++) {
    const isShip = lane.ship === pos;
    const end = pos === 0 ? ' harbor-you' : pos === 6 ? ' harbor-ai' : '';
    cells += `<span class="cell${end}">${isShip ? '<span class="ship">⛵</span>' : '·'}</span>`;
  }
  const marks = [];
  if (lane.reversed) marks.push('<span class="mark reversed" title="Current reversed">↺ reversed</span>');
  if (lane.shield) marks.push('<span class="mark shield" title="Anchored">⚓ shielded</span>');
  return `<div class="lane${selectedLane === index ? ' lane-target' : ''}" data-lane="${index}">
    <div class="lane-label">LANE ${index + 1}</div>
    <div class="track">${cells}</div>
    <div class="lane-marks">${marks.join(' ')}</div>
  </div>`;
}

export function render(root, state, ui) {
  const turnText = state.phase === 'win'
    ? 'You win!'
    : state.phase === 'loss'
      ? 'The tide took your harbor.'
      : state.turn === 'player'
        ? 'Your turn — pick a card, then a lane (keys 1–5, arrows, Enter)'
        : 'The Keeper is thinking…';

  const backs = state.aiHand.map(() =>
    '<span class="card back"><span class="card-glyph">≋</span><span class="card-name">Keeper</span></span>'
  ).join('');

  const hand = state.playerHand.map((card) =>
    cardFace(card, ui.selectedCard && ui.selectedCard.id === card.id)
  ).join('');

  const logLines = state.log.map((line) => `<li>${line}</li>`).join('');

  root.innerHTML = `
  <div class="table">
    <header class="scoreboard">
      <div class="score you"><span class="score-num">${state.playerScore}</span><span class="score-who">YOU</span></div>
      <div class="score-mid">
        <div class="game-title">TIDE &amp; LANTERN</div>
        <div class="score-goal">First to ${WIN_POINTS} points wins · Deck ${state.deck.length} · Discard ${state.discard.length}</div>
        <div class="turn">${turnText}</div>
      </div>
      <div class="score ai"><span class="score-num">${state.aiScore}</span><span class="score-who">KEEPER</span></div>
    </header>
    <div class="harbors">
      ${hpBar(state.playerHp, '⚓ YOUR HARBOR', 'you')}
      ${hpBar(state.aiHp, 'KEEPER HARBOR ⚓', 'ai')}
    </div>
    <section class="opponent">
      <div class="hand-label">The Keeper's hand — ${state.aiHand.length} cards</div>
      <div class="hand ai-hand">${backs}</div>
    </section>
    <section class="lanes">
      ${state.lanes.map((lane, i) => laneRow(lane, i, ui.selectedLane)).join('')}
      <div class="lane-hint">Ships sail left toward YOUR harbor, right toward the KEEPER's. Dock one to score.</div>
    </section>
    <section class="player">
      <div class="hand-label">Your hand — click a card, then click a lane</div>
      <div class="hand player-hand">${hand}</div>
    </section>
    <aside class="log"><div class="log-title">Captain's log</div><ul>${logLines}</ul></aside>
  </div>
  ${state.phase === 'title' ? `
  <div class="overlay title-screen">
    <div class="panel">
      <div class="big-title">TIDE &amp; LANTERN</div>
      <div class="tagline">A duel of lighthouse keepers, played with cards and the tide.</div>
      <div class="howto">
        <p>Three lanes. One ship each. Push ships into <b>your</b> harbor (left) to score.</p>
        <p><b>Wave</b> pushes a ship toward your harbor · <b>Lantern</b> reverses a lane's current ·
        <b>Squall</b> shoves a ship toward the Keeper · <b>Anchor</b> shields a lane ·
        <b>Gale</b> pushes every ship your way.</p>
        <p>Dock a ship: +1 point and the enemy harbor loses 2 HP. First to ${WIN_POINTS} points,
        or a harbor at 0 HP, wins the duel.</p>
        <p>Mouse: click a card, then a lane. Keyboard: 1–5 pick a card, ← → pick a lane, Enter plays it.</p>
      </div>
      <button class="big-button" data-action="start">⚓ Set sail</button>
    </div>
  </div>` : ''}
  ${state.phase === 'win' ? `
  <div class="overlay end-screen win">
    <div class="panel">
      <div class="big-title">YOU WIN</div>
      <div class="tagline">The harbor is full of your ships!</div>
      <p class="final-score">You ${state.playerScore} — ${state.aiScore} Keeper · Harbors ${state.playerHp} / ${state.aiHp} HP</p>
      <button class="big-button" data-action="restart">Play again</button>
    </div>
  </div>` : ''}
  ${state.phase === 'loss' ? `
  <div class="overlay end-screen loss">
    <div class="panel">
      <div class="big-title">THE TIDE TOOK YOUR HARBOR</div>
      <div class="tagline">The Keeper's ships ride in on the evening tide.</div>
      <p class="final-score">You ${state.playerScore} — ${state.aiScore} Keeper · Harbors ${state.playerHp} / ${state.aiHp} HP</p>
      <button class="big-button" data-action="restart">Try again</button>
    </div>
  </div>` : ''}`;
}
