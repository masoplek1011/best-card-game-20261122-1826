// deck.js — the cards of Tide & Lantern: what each card is and how the deck is built.
//
// Every card has a kind, a big readable value, a glyph, a colour and a short
// rule line. The deck is a plain array; drawing reshuffles the discard pile
// when the deck runs out, so a game can never stall for lack of cards.

export const CARD_KINDS = {
  wave: {
    name: 'Wave',
    glyph: '≋',
    color: '#2f7fd0',
    dark: '#174a7d',
    blurb: 'Push a ship 1–3 steps toward your harbor.',
  },
  lantern: {
    name: 'Lantern',
    glyph: '☀',
    color: '#d99a1f',
    dark: '#7d5a10',
    blurb: 'Reverse the current in a lane.',
  },
  squall: {
    name: 'Squall',
    glyph: '↯',
    color: '#7a4fd0',
    dark: '#452a7d',
    blurb: 'Drive a ship 2 steps toward the Keeper harbor.',
  },
  anchor: {
    name: 'Anchor',
    glyph: '⚓',
    color: '#3f8f6a',
    dark: '#1f5240',
    blurb: 'Shield a lane: its ship is safe next turn.',
  },
  gale: {
    name: 'Gale',
    glyph: '≫',
    color: '#1899a8',
    dark: '#0d5a66',
    blurb: 'Push EVERY ship 1 step your way.',
  },
};

/** Build one fresh 36-card deck: 18 Waves, 6 Lanterns, 6 Squalls, 3 Anchors, 3 Gales. */
export function buildDeck() {
  const cards = [];
  let id = 0;
  const push = (kind, value) => {
    cards.push({ id: id++, kind, value, ...CARD_KINDS[kind] });
  };
  for (let i = 0; i < 6; i++) push('wave', 1);
  for (let i = 0; i < 6; i++) push('wave', 2);
  for (let i = 0; i < 6; i++) push('wave', 3);
  for (let i = 0; i < 6; i++) push('lantern', 0);
  for (let i = 0; i < 6; i++) push('squall', 2);
  for (let i = 0; i < 3; i++) push('anchor', 0);
  for (let i = 0; i < 3; i++) push('gale', 1);
  return cards;
}

/** Fisher–Yates shuffle, in place, using the browser's own randomness. */
export function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Draw one card, refilling the deck from the discard pile when it runs out. */
export function drawCard(state) {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return null;
    state.deck = shuffle(state.discard.splice(0));
  }
  return state.deck.pop();
}

/** A short label for a card, used in the move log. */
export function cardLabel(card) {
  if (card.kind === 'wave') return `Wave ${card.value}`;
  if (card.kind === 'gale') return 'Gale';
  return CARD_KINDS[card.kind].name;
}
