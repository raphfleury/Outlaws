// The named places of each chapter: landmarks that get their name on the maps once the player (or his partner) has been
// near them, and that are announced the first time. [name, x, z, radius in metres]. The hamlets of a large map get names
// of the chapter's kind (see hamletName).

export const PLACES = {
  west: [
    ['Main Street', 0, 0, 26], ['The Railroad Depot', 0, -50, 22], ['The Church', 62, -27, 13], ['The Water Tower', -52, -17, 9],
    ['The Corral', -67, 13, 14], ['The Homestead', -38, 38, 11], ['Boot Hill', 58, 41, 15], ['Lookout Butte', 6, 48, 11],
    ['The Stage Station', 64, 15, 10], ['The Silver Queen Mine', -86, 47, 13], ['The Mission', -40, -46, 14],
  ],
  japan: [
    ['The Torii Path', 0, 60, 14], ['The Pond', -1, 24, 14], ['The Hamlet Green', -4.5, -9, 13], ['The Shrine Steps', 0, -28, 8],
    ['Kagemori Shrine', 0, -44, 15], ['The Pagoda', -20.7, -48.7, 8], ['The Dojo', 50, -2, 14], ['The Hermitage', -50, 24, 10],
    ['The Rice Paddies', 51, 59, 18], ['The Charcoal Burners’ Camp', -64, 59, 12], ['Kagemori Castle', 70, -58, 14],
  ],
  swiss: [
    ['The Alp', -86, 22, 14], ['The Chapel', -44, 14, 10], ['The Watchtower', 74, 34, 10], ['The Great Hay Barn', 26, 52, 10],
    ['The Mill', 48.6, 13.2, 10], ['The Lake Landing', -16, -65, 12], ['The Sust', -22, -44.5, 8], ['The Rütli', -70, -44, 14],
    ['The Bailiff’s Camp', 54, -36, 16], ['The Keep', 62, -47, 10], ['The Quarry', 84, -44, 10], ['The Waterfall', 101, 22.5, 10], ['The Devil’s Bridge', 83, 19, 8],
    ['The Great Boulder', -52, -17, 10], ['The Suone', 54, 66.3, 10],
  ],
  greece: [
    ['The Temple of Athena', 0, -57, 16], ['The Village Well', -6, 30, 12], ['The Agora', 20, 12, 12], ['The House of Odysseus', 50, 24, 12],
    ['The Theatre', 42, -24, 12], ['The Fishermen’s Cape', 87, 60, 15], ['The Harbour', -3, 104, 16], ['The Cave of the Nymphs', -58, -50, 10],
    ['The Swineherd’s Farm', -51, 61, 12], ['The Marble Quarry', 8, -94.5, 12], ['The Shipwright’s Beach', 24, 91, 10],
  ],
  north: [
    ['The Jarl’s Hall', 0, -52, 16], ['The Bonfire', 0, 22, 13], ['The Hof', 76, -24, 9], ['The Boat Shed', -20, 49, 8],
    ['The Smithy', 31, 22, 7], ['The Burial Mound', 56, 6, 10], ['The Shipyard', 80, 49, 12], ['The Beacon Crag', -62, -26, 8],
    ['The Farm', -87.5, 21, 14], ['The Thing Field', -58, -47, 10], ['The Charcoal Clearing', -28, -86, 10], ['The Jetty', -40, 72, 14],
  ],
  war: [
    ['The Glider', 11, 98, 14], ['Le Clos Farm', -30, 47, 14], ['Sainte-Aubine', 0, 15, 18], ['The Church', 24, 2, 10],
    ['The Churchyard', 38, 5, 8], ['The Manor', 92, 22, 14], ['The Field of Stakes', -20, -55, 18], ['The Battery', 0, -86, 14],
    ['The Trench', -61.5, -89.8, 10], ['The Railway Halt', 85, -44.6, 12], ['The Cider Farm', -80, 70, 12],
  ],
  russia: [
    ['Lenin Prospekt', 0, 60, 18], ['Block 7 Courtyard', -40, 58, 16], ['The Garages', 55, 72, 14], ['The Checkpoint', 5.6, 31, 8],
    ['Revolution Square', 0, 0, 17], ['The Committee', 0, -47, 17], ['The Works', 80, -50, 18], ['The Metro Pavilion', 28, 34.5, 7],
    ['The District Library', -80, -44, 10], ['The Building Site', -86, 62, 14], ['The Goods Siding', 92, 0, 15],
    ['The Kolkhoz Market', -35, 28, 10], ['The Kvas Tanker', -44, 38, 6], ['The Boiler House', -93, -27, 10], ['The Palace of Culture', -64, -6, 12],
    ['Revolution Square Station', 56, 39, 13], ['Entrance 2', -36, 78, 7], ['The Church of St Nicholas', -92, 19, 11],
  ],
  tibet: [
    ['The Mani Wall', -45, 60, 10], ['Che La Village', 10, 25, 20], ['The Village Temple', -24, 2, 8], ['The Ruined Fort', 80, 40, 10],
    ['The Frozen Lake', -58, 4, 20], ['The Army Camp', 47, -28, 14], ['The Great Stair', 0, -40, 10], ['Che La Monastery', 0, -80, 18],
    ['The Barley Terraces', 56, 70, 15], ['The Checkpoint', 84, -22, 8], ['The Hermit’s Cell', -20, 49, 6], ['The Iron Bridge', -47.5, -35, 7],
  ],
  aztec: [
    ['The Sacred Precinct', 0, 50, 14], ['The Great Temple', 0, 82, 13], ['The House of the Eagles', 29, 90, 8], ['The Market Quarter', 55, 88, 14],
    ['The Palace of Axayacatl', -58, 75, 14], ['The House of Birds', -54, 99, 8], ['The Causeway', 0, -45, 14], ['The Landing', 0, -112, 18],
  ],
};

/** A name for a hamlet of the outskirts, in the chapter's own way (the same in both browsers: it comes from the chapter's numbers). */
const PARTS = {
  west: [['Coyote', 'Dead Man’s', 'Rattlesnake', 'Dry', 'Lone', 'Buzzard', 'Mesquite', 'Bitter', 'Red Rock', 'Gila'], [' Flat', ' Wells', ' Gulch', ' Creek', ' Ranch', ' Springs', ' Bend', ' Draw']],
  japan: [['Kita', 'Minami', 'Mizu', 'Take', 'Matsu', 'Kawa', 'Yama', 'Sakura', 'Ishi', 'Kiri'], ['mura', 'zawa', 'no-sato', 'dani', 'hara', 'oka']],
  swiss: [['Ober', 'Unter', 'Hinter', 'Riet', 'Bergli', 'Sonnen', 'Wald', 'Stein', 'Eggen', 'Matt'], ['matt', 'alp', 'boden', 'wil', 'egg', 'stalden', 'berg']],
  greece: [['Ano ', 'Kato ', 'Agios ', 'Palaio', 'Neo', 'Kalo'], ['chori', 'limani', 'pyrgos', 'kampos', 'vrysi', 'ammos']],
  north: [['Ulf', 'Ravn', 'Bjørn', 'Stein', 'Hval', 'Ask', 'Grim', 'Sel'], ['stad', 'vik', 'set', 'heim', 'nes', 'dal']],
  war: [['Le Mesnil', 'La Ferme', 'Le Hameau', 'Les Mares', 'La Croix', 'Le Bosq', 'Les Vignets', 'La Haie'], ['-Rault', '-Fouchet', ' du Bois', '-Garnier', ' Saint-Clair', '-Hubert']],
  russia: [['Krasn', 'Nov', 'Bereg', 'Sosn', 'Lip', 'Kamen', 'Zarech', 'Pod'], ['ovka', 'oye', 'ino', 'ka', 'evo', 'nyaya']],
  tibet: [['Dro', 'Lha', 'Nya', 'Tsa', 'Gyal', 'Dzong', 'Kye', 'Ri'], ['ling', 'gang', 'pa', 'sum', 'drak', 'tse']],
  aztec: [['Atl', 'Coyo', 'Ixta', 'Tepe', 'Xochi', 'Quauh', 'Mazatl', 'Tlal'], ['pan', 'can', 'tlan', 'huacan', 'milco', 'tepec']],
};
export function hamletName(id, rand, used) {
  const [a, b] = PARTS[id] || PARTS.west;
  for (let i = 0; i < 12; i++) { const n = a[Math.floor(rand() * a.length)] + b[Math.floor(rand() * b.length)]; if (!used.has(n)) { used.add(n); return n; } }
  return a[0] + b[0];
}
