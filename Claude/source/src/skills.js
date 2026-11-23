// Each hero has one special skill, used with E: it lasts a few seconds, then needs time to come back.
// The skill follows from the hero's strength (a fast hero dashes, a sturdy one stands fast...), unless the hero names one (skill: 'id').

export const SKILLS = {
  vanish: { name: 'Vanish', dur: 6, cool: 32, line: 'for 6 s the enemies lose sight of you', tint: 'rgba(90,140,200,.38)' },
  fury: { name: 'Fury', dur: 7, cool: 26, line: 'for 7 s blows strike twice as hard and quicker, and you move faster', tint: 'rgba(200,40,20,.38)' },
  dash: { name: 'Dash', dur: 3, cool: 16, line: 'a burst of speed for 3 s', tint: 'rgba(240,220,160,.3)' },
  shield: { name: 'Stand fast', dur: 5, cool: 28, line: 'for 5 s wounds hurt five times less', tint: 'rgba(200,170,90,.34)' },
  mend: { name: 'Second wind', dur: 4, cool: 36, line: 'recover 50 health in 4 s', tint: 'rgba(110,200,110,.3)' },
  deadeye: { name: 'Dead eye', dur: 6, cool: 28, line: 'for 6 s every shot flies true and hits 80% harder', tint: 'rgba(230,150,40,.32)' },
  eagle: { name: 'Eagle eye', dur: 9, cool: 30, line: 'for 9 s every enemy within 90 m shows, on the map and through walls', tint: 'rgba(160,200,230,.3)' },
};

/** The skill of a hero (or a villain): named, or from the strength his trait gives him. */
export function skillOf(h) {
  if (h.skill) return h.skill;
  const m = h.mods || {};
  if (m.stealth < 1) return 'vanish';
  if (m.reach > 0 || m.meleeDmg > 1 || m.melee < 1) return 'fury';
  if (m.speed > 1) return 'dash';
  if (m.armor < 1) return 'shield';
  if (m.hp > 100 || m.regen) return 'mend';
  if (m.fire < 1 || m.reload < 1 || m.gun > 1 || m.power > 1) return 'deadeye';
  return 'eagle';
}
