// What a fallen enemy leaves behind, and what the arsenal and the bag call things.
// A weapon taken from an enemy carries a limited number of shots; the hero's own weapon never runs out.

/** The weapon each kind of enemy carries, as one of the player's weapons. Enemies who fight hand to hand leave nothing to shoot with. */
export const LOOT = {
  cowboy: 'revolver', officer: 'revolver', agent: 'revolver', westBoss: 'revolver', russiaBoss: 'revolver',
  bandit: 'carbine', soldier: 'carbine', pla: 'carbine', arcabucero: 'carbine',
  gunner: 'sten', warBoss: 'sten', militia: 'sten', plaGunner: 'sten', tibetBoss: 'sten',
  archer: 'bow', bowman: 'bow', ninja: 'shuriken', japanBoss: 'shuriken', crossbowman: 'crossbow', ballestero: 'crossbow',
  peltast: 'javelin', viking: 'axe', berserker: 'axe', chieftain: 'axe', northBoss: 'axe',
};
/** Shots that come with a weapon picked up (a second one of the same kind adds as many). */
export const ROUNDS = { revolver: 12, carbine: 16, sten: 64, rifle: 10, bow: 10, crossbow: 8, shuriken: 12, javelin: 5, axe: 6, dart: 10, stone: 8 };
/** Every weapon runs out, the hero's own too. START: the shots a hero sets out with (the loaded ones included); a weapon never holds more than twice that. */
export const START = { revolver: 42, carbine: 40, sten: 128, rifle: 25, bow: 30, crossbow: 20, shuriken: 20, javelin: 10, axe: 10, dart: 20, stone: 15 };
export const most = (kind) => (START[kind] || 20) * 2;
/** What a box of ammunition (dropped by an enemy, found in a crate or a chest) gives for a weapon of each kind. */
export const PACK = { revolver: 12, carbine: 8, sten: 32, rifle: 5, bow: 8, crossbow: 6, shuriken: 6, javelin: 3, axe: 3, dart: 6, stone: 5 };
export const MAX_SLOTS = 6;      // weapons carried at once, the hero's own included (the fists, always there, are not counted)
export const MAX_ITEMS = 9;      // of each thing in the bag

/** The explosive of each chapter where there is one, and the enemies who may carry it. */
export const BOMBS = { west: 'dynamite', japan: 'hbomb', war: 'grenade', russia: 'grenade', tibet: 'grenade' };
const BOMBERS = { bandit: 1, cowboy: 1, ninja: 1, soldier: 1, gunner: 1, officer: 1, militia: 1, agent: 1, pla: 1, plaGunner: 1 };

/** The same answer in both browsers of a duel: a number in [0, 1) from where an enemy stood at the start and what it is. */
function chance(e, salt) {
  let h = Math.imul(Math.round(e.home.x * 10) | 0, 73856093) ^ Math.imul(Math.round(e.home.z * 10) | 0, 19349663) ^ Math.imul(salt, 83492791);
  for (let i = 0; i < e.type.length; i++) h = Math.imul(h ^ e.type.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** What this enemy drops when it falls: a list of { type: 'weapon', kind } or { type: 'item', id }. */
export function dropsOf(e, chapter) {
  const out = [], w = LOOT[e.type];
  if (w) out.push({ type: 'weapon', kind: w });
  else if (!e.cfg.dog && chance(e, 3) < 0.6) out.push({ type: 'ammo' });            // one who fought hand to hand may still carry ammunition
  if (BOMBS[chapter] && BOMBERS[e.type] && chance(e, 1) < 0.3) out.push({ type: 'item', id: BOMBS[chapter] });
  if (chance(e, 2) < 0.18) out.push({ type: 'item', id: 'heal' });
  return out;
}

const WEAPON_NAMES = { fists: 'Fists', revolver: 'Revolver', carbine: 'Rifle', sten: 'Submachine gun', rifle: 'Scoped rifle', bow: 'Bow', crossbow: 'Crossbow', shuriken: 'Throwing stars', javelin: 'Javelins', axe: 'Throwing axes', dart: 'Darts', stone: 'Stones' };
const BOMB_NAMES = { dynamite: 'Dynamite', grenade: 'Grenades', hbomb: 'Fire bombs' };

export function weaponName(kind, def) { return kind === 'revolver' && def && (def.id === 'russia' || def.id === 'tibet' || def.id === 'war') ? 'Pistol' : WEAPON_NAMES[kind] || kind; }
/** The line under the weapon's name: what the other buttons do with it. */
export function weaponAlt(kind, def) {
  const id = def && def.id, knife = def && def.knife ? '   ·   F — knife' : '';
  switch (kind) {
    case 'revolver': case 'carbine': case 'sten': return 'right mouse — aim' + knife;
    case 'rifle': return 'right mouse — scope' + knife;
    case 'crossbow': return 'right mouse — aim   ·   F — halberd';
    case 'bow': return id === 'aztec' ? 'right mouse — club' : id === 'japan' ? 'right mouse — katana' : 'right mouse — sword';
    case 'shuriken': return 'right mouse — aim   ·   F — katana';
    case 'javelin': return 'right mouse — aim   ·   F — sword';
    case 'axe': return 'right mouse — aim   ·   F — flail';
    case 'dart': case 'stone': return 'right mouse — aim   ·   F — club';
    case 'fists': return 'left mouse — jab   ·   right mouse — hook';
  }
  return '';
}
/** What a broken crate, chest or barrel holds (the same in both browsers of a duel): ammunition, something that heals, or nothing. */
export function lootOf(p, seed) {
  let h = Math.imul(p.id + 1, 2654435761) ^ Math.imul(seed | 0, 40503); h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13;
  const r = (h >>> 0) / 4294967296, t = { crate: [0.32, 0.42], chest: [0.45, 0.72], barrel: [0.18, 0.22] }[p.loot];
  if (!t) return null;
  return r < t[0] ? { type: 'ammo' } : r < t[1] ? { type: 'item', id: 'heal' } : null;
}

/** The name of something in the bag: the chapter's healing food or drink ("Tonic", "Rice cake"...), or its explosive. */
export function itemName(id, def) {
  if (id === 'heal') return def && def.pickupText ? def.pickupText.split(/\s{2,}|\s\+/)[0].trim() : 'Tonic';
  return BOMB_NAMES[id] || id;
}
export function itemAlt(id) { return id === 'heal' ? 'left mouse — use   ·   H — use without taking it in hand' : 'right mouse — aim   ·   left mouse — throw: it goes off after two seconds'; }
/** The weapons that are thrown: right mouse aims them and shows where they will land. */
export const THROWN = { shuriken: 1, javelin: 1, axe: 1, dart: 1, stone: 1 };
