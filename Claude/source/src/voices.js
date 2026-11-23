// Voices: enemies shout when they see the player (in their own language), cry out when they fall; bystanders greet the player
// when he stands near them, and chatter among themselves.
// Words are spoken by the browser's own speech synthesis (speechSynthesis), in the language of whoever speaks, when the computer
// has a voice for it; otherwise, and for every cry and every bit of chatter, a voice is synthesised in Web Audio: a buzzing tone
// shaped by the resonances of the mouth (see Sound.babble and Sound.cry). Nothing is recorded or sent anywhere.

/** What enemies shout on seeing the player: [language, phrases]. */
const SHOUTS = {
  west: [['en-US', 'en'], ['There he is!', 'Over there!', 'Get him, boys!', 'Shoot him!', 'It’s him!']],
  japan: [['ja-JP', 'ja'], ['そこだ！', '曲者だ！', '逃がすな！', '斬れ！']],
  swiss: [['de-DE', 'de'], ['Da ist er!', 'Packt ihn!', 'Zu den Waffen!', 'Dort drüben!']],
  greece: [['el-GR', 'el'], ['Εκεί είναι!', 'Πιάστε τον!', 'Προς τα όπλα!']],
  north: [['nb-NO', 'no', 'nb', 'nn', 'da', 'sv'], ['Der er han!', 'Ta ham!', 'Til våpen!']],
  war: [['de-DE', 'de'], ['Halt! Stehen bleiben!', 'Da drüben!', 'Alarm!', 'Feuer!']],
  russia: [['ru-RU', 'ru'], ['Стой!', 'Вот он!', 'Стоять!', 'Держи его!']],
  tibet: [['zh-CN', 'zh'], ['站住！', '在那里！', '抓住他！']],
  aztec: [['es-ES', 'es'], ['¡Allí está!', '¡A él!', '¡Santiago!', '¡Cuidado!']],
};
/** What bystanders say to the player who stands by them (none: they speak a language the computers have no voice for). */
const GREETS = {
  west: [['en-US', 'en'], ['Howdy, stranger.', 'Mornin’.', 'Watch yourself out there.', 'Them outlaws took the whole town.']],
  japan: [['ja-JP', 'ja'], ['こんにちは。', 'お気をつけて。', 'どうぞお通りください。']],
  swiss: [['de-CH', 'de'], ['Grüezi.', 'Gott behüte Euch.', 'Passt auf die Vogtsleute auf.']],
  greece: [['el-GR', 'el'], ['Χαίρε, ξένε.', 'Καλώς ήρθες.', 'Οι θεοί μαζί σου.']],
  north: [['nb-NO', 'no', 'nb', 'nn', 'da', 'sv'], ['Hei.', 'Vær forsiktig.', 'Velkommen hjem.']],
  war: [['fr-FR', 'fr'], ['Bonjour, monsieur.', 'Faites attention, ils sont partout.', 'Que Dieu vous garde.']],
  russia: [['ru-RU', 'ru'], ['Здравствуйте.', 'Осторожно.', 'Холодно сегодня.']],
  tibet: null, aztec: null,
};
const FEMALE = /Woman|nun|geisha|woman/;

export class Voices {
  constructor(game) {
    this.game = game; this.shoutT = 0; this.chatT = 3; this.voices = null;
    const S = window.speechSynthesis;
    if (S) { const load = () => { this.voices = S.getVoices(); }; load(); S.onvoiceschanged = load; }
  }
  /** A voice of the computer for one of these languages (exact first, then by prefix), or null. */
  voiceFor(langs) {
    const V = this.voices; if (!V || !V.length) return null;
    for (const l of langs) { const v = V.find((q) => q.lang === l || q.lang.replace('_', '-') === l); if (v) return v; }
    for (const l of langs) { const v = V.find((q) => q.lang.toLowerCase().startsWith(l.toLowerCase().slice(0, 2))); if (v) return v; }
    return null;
  }
  /** Where a sound at (x, z) comes from, for the stereo: -1 left, +1 right; and how far, 0..1 within reach metres. */
  place(x, z, reach) {
    const P = this.game.player, dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz) || 1;
    return { pan: Math.max(-1, Math.min(1, (dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d)), far: Math.min(1, d / reach), d };
  }
  /** Speak a line in a language, softer with distance; false if the computer has no voice for it. */
  say(spec, line, far, pitch, rate = 1) {
    const S = window.speechSynthesis, snd = this.game.sound; if (!S || !spec) return false;
    const v = this.voiceFor(spec[0]); if (!v) return false;
    const u = new SpeechSynthesisUtterance(line); u.voice = v; u.lang = v.lang; u.pitch = pitch; u.rate = rate;
    u.volume = Math.max(0, Math.min(1, (1 - far) * snd.set.voice * snd.set.master * 1.1)); if (u.volume < 0.03) return true;
    S.cancel(); S.speak(u); return true;
  }
  /** An enemy has seen the player and calls out. */
  shout(e) {
    const G = this.game; if (e.cfg.dog) { G.sound.bark(); return; }
    const { pan, far } = this.place(e.pos.x, e.pos.z, 70); if (far >= 1) return;
    if (G.time - this.shoutT < 2.2) { G.sound.babble({ far, pan, loud: true, n: 2 }); return; }      // several at once: only one says it in words
    this.shoutT = G.time;
    const spec = SHOUTS[G.def.id], line = spec && spec[1][Math.floor(Math.random() * spec[1].length)];
    if (!this.say(spec, line, far, 0.75 + Math.random() * 0.25, 1.15)) G.sound.babble({ far, pan, loud: true, n: 3 });
  }
  /** A fallen enemy's last cry (a man's; a dog whimpers). */
  cry(e) {
    const G = this.game, { pan, far } = this.place(e.pos.x, e.pos.z, 60); if (far >= 1) return;
    if (e.cfg.dog) G.sound.whimper(far, pan); else G.sound.cry({ far, pan, female: false });
  }
  /** A bystander who turns to the player says something to him. */
  greet(w) {
    const G = this.game, { pan, far } = this.place(w.px, w.pz, 25), female = FEMALE.test(w.look || '');
    const spec = GREETS[G.def.id], line = spec && spec[1][Math.floor(Math.random() * spec[1].length)];
    if (!this.say(spec, line, far, female ? 1.3 : 0.85, 0.95)) G.sound.babble({ far, pan, female, n: 4 + Math.floor(Math.random() * 4) });
  }
  /** Every few seconds one of the bystanders near the player says something to whoever is beside him. */
  update(dt) {
    const G = this.game; if (G.state !== 'play') return;
    this.chatT -= dt; if (this.chatT > 0) return;
    this.chatT = 2.5 + Math.random() * 4;
    const P = G.player, near = G.crowd.list.filter((w) => !w.dead && (w.state === 'idle' || w.state === 'greet') && Math.hypot(w.px - P.pos.x, w.pz - P.pos.z) < 18);
    if (!near.length) return;
    const w = near[Math.floor(Math.random() * near.length)], { pan, far } = this.place(w.px, w.pz, 20);
    G.sound.babble({ far: Math.min(1, far + 0.25), pan, female: FEMALE.test(w.look || ''), n: 2 + Math.floor(Math.random() * 5) });
  }
}
