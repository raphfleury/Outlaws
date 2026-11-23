# Changelog — Lone Hand

All notable changes to *Lone Hand* (the Claude version in this repository) are listed here,
newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Version numbers** have three parts, `MAJOR.MINOR.PATCH`:

- `PATCH` (1.0.**1**): a fix; nothing new to play.
- `MINOR` (1.**1**.0): something new or changed that a player will notice: a place, a
  character, a control, a mode.
- `MAJOR` (**2**.0.0): a new era of the game: a rebuilt world, or changes that make old
  habits or old links stop working.

Each version is a Git tag named `lone-hand-vX.Y.Z` and a
[release on GitHub](https://github.com/iago-swi/outlaws/releases) with these notes and the
game as one downloadable file. The number is also shown in the bottom right corner of the
title screen.

## [2.2.0] - 2026-11-23

### Added

- **Up to four players online.** The host creates the game and sends the link or the code;
  up to three others join. The Online screen lists who is in, and the host starts when
  everyone is there. Others may join between two games.
- **Two against two.** In the duels and in capture the flag the players form two sides: in
  the order they joined, the first and the third against the second and the fourth (with
  three players, two against one). A round ends when everyone on one side has fallen; in the
  timed game each fall scores for the other side; each side has its flag. Nothing fired on
  your side can hurt your team-mate, every team-mate's name and health show over his head,
  and the map, the places found and the marks are shared within a side.
- **Together, up to four** against the chapter's enemies; each counts his own kills, and the
  enemies go after whichever player is nearest.
- The end screen gives each side's score and, with more than two players, each player's kills.

### Changed

- **Games online go through a game server.** Each player connects to it as to a website, so
  a game now connects from any network. Before, the two browsers connected directly, and
  between some networks the game stayed on "Connecting…" for ever. If the server cannot be
  reached, the Online screen says so after twelve seconds at most, and it says why when a
  game cannot be joined (no such code, full, already started).
- **The voice chat goes through the server too**, in telephone quality, between all the
  players of a game; nothing is sent while you are silent.
- The *Two players online* button is now *Online*.

## [2.1.0] - 2026-11-23

### Added

- **Named places.** Every chapter's landmarks get their name on the map and the mini-map once
  you have been near them (Boot Hill, Kagemori Shrine, the Rütli, the Cave of the Nymphs,
  Revolution Square Station...), and the first time a name is announced on the screen. The
  hamlets of a large map have names of their own, in the chapter's language.
- **Together, the map is shared**: the ground your partner passes near is uncovered on your
  map too, and the places he finds are named for you as well.
- **Stalnogorsk (chapter VII) goes below ground and upstairs**: a metro station 10 m down,
  reached by the escalator hall of the pavilion, with marble columns, chandeliers, a train
  standing at the platform with its doors open, passengers and the Committee's men; a block
  with a stairwell up five floors and a furnished flat on every landing; and the church of
  St Nicholas, still open, with five onion domes, a bell tower, a screen of icons, an Orthodox
  priest and old women at prayer.
- **Voices.** Enemies shout when they see you, in their own language (English, Japanese,
  German, Greek, Norwegian, Russian, Chinese or Spanish) when your computer has a voice for it,
  and cry out when they fall; bystanders greet you, and chatter among themselves.
- **Bystanders at their work**: the smith hammers, the women at work scrub and churn, those who
  talk talk with their hands, those who sit take a drink now and then, some go for a stroll
  and come back.
- **A car** drives up the prospekt of Stalnogorsk to the checkpoint, turns and drives off again.
- **Buttons in every menu**: Resume, Sound settings, Graphics and Main menu in the pause; Try
  again, Another hero and Main menu after a death; Next chapter, Play this chapter again and
  Main menu at the end of a chapter; Main menu on the hero screen. `Esc` goes back to the main
  menu from the hero, death and end screens.

### Changed

- **One mark at a time**: a new mark replaces the one you had. Together, your partner sees
  your mark (in his game, in your colour, with your name) and hears a ping when you set it;
  his marks show in green in yours.
- **Shots and lines of sight stop at what is drawn**: roofs, rocks, carts, stalls, the sides of
  things, not only at walls; windows, paper screens, cloth and leaves still let them through.
  Enemies no longer see you through a roof.
- **Gunshots** are deeper and fuller, and every gun has its own: six-shooter, pistol, lever
  rifle, rifle, scoped rifle, submachine gun, machine gun, arquebus, cannon.
- **The sky**: clouds that billow and tear, lit from the sun's side, high thin cirrus, a haze
  over the horizon and a warm glow on the side of a low sun.
- **Textures**: finer wood, stone, plaster, roofs and ground, with stains, rain streaks, cracks
  and wear.

### Fixed

- **Jumping onto a roof** lands you on the roof, not in the loft under it.
- **Enemies walked through open or closed wooden doors and screens, and into rocks**: doors and
  wooden panels are now solid (and break like wooden walls), and rocks have something to bump
  into.
- The covered wagon of Dry Gulch has a canvas bonnet over its bows, as the wagons of the time
  had, instead of a sail.
- Hidden menu buttons no longer catch clicks meant for the screen in front.

## [2.0.0] - 2026-11-23

### Added

- **The enemies' wits**, chosen on the hero screen beside the number of enemies (and by the
  host in a game for two): *Low*, *Medium* or *Genius*.
  - *Low*: they fight back when they see you or are hurt, but hear nothing, never climb a
    ladder or crawl after you, and give up as soon as you are out of sight for a moment.
  - *Medium*: those with a gun or a bow take up places with a view and something to hide
    behind; they hear shots and fighting near them, go after you where they last saw or
    heard you, up ladders and crouching into hiding places, search a while, and give up if
    they find nothing or you got far away.
  - *Genius*: they hear from almost twice as far, tell each other where you are, fight from
    cover (crouched, rising to shoot), move to a new place after a few shots, come round
    the sides, creep up unseen, throw their bombs at a hiding player, keep their distance
    when badly hurt, and their marksmen take to the roofs.
- **Noise.** Gunshots are heard about 35 m away, bows, slings and throws about 10 m,
  running feet 11 m, walking feet 4 m; things breaking make those near look round. Blades,
  fists and the blowgun are silent, and so is sneaking or crouching.
- **The size of the map**, chosen on the hero screen (and by the host in a game for two):
  *Small* keeps only the heart of the chapter, from where you come in to where the boss
  stands, and ropes off the edge; *Medium* is the chapter as it was; *Large* makes it half
  as wide again, with outskirts in the chapter's own style: hamlets of houses you can walk
  into, furnished, with yards, fences, trees, people at work, horses and smoking chimneys,
  boats at anchor where the new ground is water, and more enemies (up to 45).
- **Every hero sets out with two weapons**: his own and a second one of the chapter (a
  cavalry sabre in Dry Gulch, a blowgun at Kagemori and in Tenochtitlan, a sword in Uri, a
  sling on Ithaca and at Che La, a seax at Jarnvik, a pistol or a rifle in chapters VI and
  VII), and some with things in the bag: big stones to throw in Uri and Jarnvik, Molotov
  cocktails in chapters VI and VII.
- **New weapons**: knife, sword, sabre and halberd in hand (left button strikes, silent, no
  ammunition); a sling; a blowgun with poisoned darts and a close view to aim like a
  sniper (silent); big stones to throw; Molotov cocktails, which burst into a pool of fire
  that burns for about seven seconds. Halberdiers, knights, swordsmen, rōnin and Red
  Guards leave their blade when they fall.
- **What you throw or shoot with a string can be picked up again**: arrows, bolts, stars,
  javelins, axes, darts, stones and big stones lie where they fell or stick where they
  struck, in a wall or in a body. You set out with fewer of them.
- **A special skill for every hero**, used with `E`, shown under the health bar and on the
  hero cards: Dash, Stand fast (wounds hurt five times less), Dead eye (every shot true and
  80% harder), Second wind (50 health back), Vanish (the enemies lose sight of you), Fury
  (blows twice as hard and quicker) or Eagle eye (every enemy within 90 m shown through
  walls). Each lasts a few seconds and comes back after half a minute or so.
- **Drop what you hold** with `G`: a weapon with the shots it has left, or one thing from the
  bag. In a game for two the other player sees it and can take it.
- **Two players online**: each player gives a name before playing; it shows in the scores
  and the messages, and, together against the enemy, over your partner's head with his
  distance and health, seen through walls and kept at the edge of the screen when he is out
  of view.

### Changed

- **Everything breaks except stone.** Small things (bottles, lamps, pots, ornaments) break at
  one shot or blow, furniture after two to four, wooden walls and doors after several;
  stone and plaster walls stand.
- **The fists** reach and break things, and hit bystanders and enemies within reach.
- `G` drops what you hold during play; the graphics level is now changed with `G` in the
  pause screen only (or in the *Graphics* list of the title screen).
- The fists are the last of your weapons in the arsenal (no longer always `2`).
- The enemy list on the hero screen goes up to 45 on a large map.

## [1.9.0] - 2026-11-22

### Added

- **Capture the flag**, a new game for two players online: each player's flag stands at
  his end of the map; take the other's and bring it to yours while yours is there. First
  to three captures, or the most after seven minutes.
- **Together against the enemy**: two players online side by side against 3 to 24 of the
  chapter's enemies, with no harm between them; each counts his own kills, and the mission
  is over when the last enemy falls.
- **Enemies at new places every game**, and a different choice of them: those who walk the
  ground start at random free places (in a game for two, the same in both browsers).
- **Ammunition runs out for every weapon**, the hero's own included. Boxes of ammunition are
  found on the fallen and in crates, chests and barrels, which may also hold something
  that heals. With nothing left to fire, the fists come to hand.
- **Healing food and drink lie on tables, chests, market counters and shelves**, at other
  places each game, instead of floating in the open.
- **The map starts dark** and uncovers the ground the player passes near. Enemies show on it
  only where it is uncovered, and only while they move, after they have fired, or once
  they have seen the player.
- **Life around**: flocks of birds that take wing at shots and footsteps, gusts of dust or
  snow, dust devils on the dry plains, a train that comes and goes in chapter I and a
  tank that crosses the town in chapter VII.

### Changed

- Duels: first to **5** rounds (was 3); the timed duel lasts **7** minutes (was 5).
- The number of computer enemies in a game for two goes from 3 to 24 by threes (was 1 to 9).
- The title screen's button reads *Two players online*, and its screen offers the four games.
- The web site opens straight onto the game.

### Removed

- The duel with one life (replaced by capture the flag).
- The Gemini version (*Eight Horizons*) and the landing page that chose between the two.

## [1.8.0] - 2026-11-22

### Added

- **Bystanders come alive.** Shots, blasts and missiles landing near them frighten them:
  they cry out, run from the danger with their arms over their heads, crouch with their
  hands over their heads, and when all has been quiet for a while walk back and take up
  their work again. Stand near one for a moment without fighting and he turns to you and
  talks, waves, nods, shrugs or points; aim at him and he raises his hands. They can be
  hurt and killed; the end of the chapter counts the bystanders you killed.
- **Damage shows before things break.** Every hit dents and blackens a crate, a fence, a
  table or a cart where it struck, and the weaker it gets, the more it leans over, until it
  gives way.
- **Damage shows on people.** A wound marks the body where a shot went in, the figure is
  pushed back a little, and a small health bar shows over an enemy for a few seconds after
  each hit (over the other player of a duel while hurt). A badly hurt enemy limps and goes
  slower.
- **Fists**, always in the arsenal in second place (`2`): left button a quick jab with
  either hand, right button a heavier hook. No ammunition: they break things and can fell
  an enemy.
- **Aimed throws with the line of their flight.** With a thrown weapon (throwing stars,
  javelins, axes, darts, stones, dynamite, grenades, fire bombs) the right button aims, and
  a line of dots shows the flight to where it will land, with a ring on the spot; a bomb's
  line follows its bounces, and a red ring shows how far its blast reaches. The left button
  throws. The blade of chapters II, IV, V and IX (katana, sword, flail, club) moves to `F`.

### Changed

- **Better walks.** Legs now bend at the knee: the knee bends as the foot comes through,
  strides are longer and knees higher when running, the body leans forward and bobs, and the
  arms swing against the legs. Seated people sit with their shins hanging.

## [1.7.0] - 2026-11-22

### Added

- **Much more of the scenery breaks**: fences bay by bay, tables and chests (with whatever
  lay on them), sacks, carts, woodpiles, haystacks, market stalls and shelves, besides the
  crates, barrels and jars. Bigger things take more hits. Chips in the thing's colour fly
  off at every hit, so you can see what will give way; straw and grain burst in a cloud of
  their own colour.

### Removed

- **The compass at the top of the screen.** The map in the top-right corner shows where
  the enemies are. The count of enemies left and the boss's health stay where they were.

## [1.6.0] - 2026-11-22

Weapons taken from the enemy, a bag, a map of every chapter, places you can mark, things
that break and kegs that blow up, a silent walk, and in a duel the voices of the two
players.

### Added

- **Things that break.** Crates, barrels and jars break under shots, blows, thrown
  weapons and blasts, in splinters or shards and a puff of dust; whatever stood on them
  comes down with them, and the enemies' routes open up where they stood. Enemy fire
  breaks your cover too.
- **Powder kegs.** In the chapters where there is gunpowder or fuel (I, II, VI, VII, VIII
  and IX) one barrel in three is a red keg with a pale lid. Shot or caught in a blast, it
  explodes: it hurts everyone near it, you included, less through a wall, and sets off the
  kegs around it.
- **Weapons taken from the enemy.** A fallen gunman, archer, crossbowman, javelin thrower,
  axeman or ninja leaves his weapon on the ground. Walk over it to take it, with a number
  of shots; another of the same kind adds to them. Up to six weapons are carried, the
  hero's own first. A taken weapon runs out and then leaves the arsenal; the hero's own
  never does.
- **The bag.** The chapter's healing food or drink (tonic, rice cake, alp cheese...) now
  goes into the bag instead of being used at once, up to nine of each. Some enemies also
  leave one, and in chapters I, II, VI, VII and VIII some leave a bomb: dynamite, a clay
  fire bomb or a grenade. Take the item in hand like a weapon and press the left button
  to drink, eat or throw it; `H` uses a healing item without taking it in hand. A bomb
  bounces, rolls, and goes off about two seconds after the throw.
- **Changing weapons.** The mouse wheel goes through the arsenal and the bag; the number
  keys `1` to `9` take a place directly. The list shows on the right above the weapon's
  name, with the shots left.
- **A map.** A round mini-map in the top-right corner turns with you; hold `Tab` for the
  whole chapter. It is drawn from the world itself: terrain, water, walls, houses, fences,
  rocks and trees. Enemies show on it while they move about, but not one who stands still
  or creeps up unseen; in a duel the same holds for the other player.
- **Marked places.** Press the mouse wheel (the middle button) to mark the place the
  cross-hair points at, and press it again on a mark to take it away. Up to nine marks,
  numbered, show on both maps and as pins in the world with their distance.
- **Sneaking.** `X` switches a silent walk on and off: half speed, no footsteps, noticed
  later and only from closer, and not shown on the other player's map. Running ends it for
  as long as you run. It goes with crouching. Enemies closing in on you unseen sneak too,
  and running feet are now heard through walls by enemies close by.
- **Voice chat in a duel.** The two players speak to each other through microphone and
  speakers, directly from browser to browser. The microphone can be always on (`T` mutes
  it), push to talk (hold `T`) or off. Two small lights at the top left show when you
  transmit and when the other player speaks.
- **Sound settings.** A panel with four volumes, General, Effects, Voices (the enemies'
  shouts and the other player's voice) and Music, with music on or off and the
  microphone. It opens from the title screen, the pause screen (`O`) and the duel screen,
  and the settings are remembered.
- **A safeguard against closing the game by accident.** While a chapter or a duel is on,
  closing the tab or the browser (for example `Ctrl`+`W` or `Ctrl`+`Q`) first asks whether
  to leave the page.

### Changed

- `M` now switches the music only, no longer every sound.
- Healing items are kept in the bag rather than used on contact.

### Fixed

- After joining a duel with the Join button, pressing `Enter` to choose the hero pressed
  Join again and started a new connection.

## [1.5.0] - 2026-11-22

All nine chapters have been enlarged and filled with life: more of each world to walk
through, more buildings you can enter, more ways round the enemy, and people who are
simply there.

### Added

- **People who take no part in the fight, in every chapter**, about 130 in all and half of
  them women, each at some work of the place and time. They breathe, shift their weight and
  look about; they are solid, and nobody shoots at them on purpose. Among them:
  - I, Dry Gulch: the woman who keeps the bar, the pianist, a deputy locked in his own
    cell, the telegraph operator, a woman hanging out washing.
  - II, Kagemori: a woman at the well, planters in the rice paddies, an angler, a weaver,
    a pilgrim (beside the flute monks and geisha who were there already).
  - III, Uri: the Senn and the dairywoman, a woman spinning, the miller's wife, a boatman,
    and three men raising their hands for the oath on the Rütli meadow.
  - IV, Ithaca: women at the well, Penelope at her loom, the swineherd Eumaeus, the old dog
    Argos by the door, a potter, a bard, a priestess.
  - V, Jarnvik: Norse women at the loom, the cauldron and the cod racks, a skald, a boat
    builder, a shepherd, and two captives at a post in the raiders' yard.
  - VI, Sainte-Aubine: the baker and his wife, the schoolmistress, the curé, a railwayman,
    a man of the Resistance, a wounded glider pilot by the wreck.
  - VII, Stalnogorsk: people waiting outside the shop, chess players, a librarian, market
    women, an ice fisherman, two prisoners in the Committee's cells.
  - VIII, Che La: Khampa herders, nuns at the prayer wheels, women in striped aprons at the
    loom and the tea churn, Nepalese traders with their bales.
  - IX, Tenochtitlan: market women, a woman at the grinding stone, a drummer at the great
    drum on the temple, people in canoes on the lake.
- **Larger worlds, with second and third ways to the enemy:**
  - I: a railroad with depot, loading dock and boxcar; a silver mine; a stage station; a
    dry wash that leads unseen towards Boot Hill; back doors and back lots behind both rows
    of the street.
  - II: rice paddies with a path round the ambush; a charcoal burners' camp; a second stair
    and a ladder onto the shrine terrace; a back door and an inner sanctuary behind the
    main hall.
  - III: a landing on the lake with a boat and a goods store; a mill; a masons' yard with a
    crane; a sunken lane to the keep; a gap under the camp's palisade.
  - IV: a goat path up the back of the temple hill; the Cave of the Nymphs; a vineyard; a
    swineherd's farm; a quarry; a sandbar to an islet with a shrine.
  - V: a shipyard; a beacon crag; a byre with sheep and ponies; a charcoal clearing behind
    the hall and a back door into it; a hole under the palisade; ice floes to the jetty.
  - VI: fourteen holes to crawl through the hedgerows and a sunken lane; a trench to a
    lookout on the cliff; a railway halt with two wagons; a cider farm; a churchyard.
  - VII: three more ways into the Committee building (a side wing, a service door, a
    drain); a block of flats you can walk through; a goods siding; a market; a boiler
    house; a church closed and used as a store.
  - VIII: a gully as a covered way to the monastery hill; barley terraces with a barn; a
    pilgrims' path with prayer wheels; an army checkpoint; side and back doors and a
    gallery in the great hall.
  - IX: the island round the temple precinct is now a city, with a palace, a market, a
    canal with bridges, a ball court and a row of house roofs to cross; two new ways to
    the shore beside the causeway, over the garden plots and along an aqueduct; a village
    at the landing.
- **Buildings that were closed are open**, among them the hotel, the barber's and the
  doctor's in Dry Gulch and the saloon's upper floor; the keep and the bailiff's pavilion
  in Uri; the round temple, the beacon tower and the tents in Ithaca; the church tower and
  both gun casemates in Normandy; the army tents and the fort in Tibet; the temple of the
  wind god in Tenochtitlan; the second storey of the pagoda in Kagemori.
- **Rooms are furnished** for what they are: a trade in every house of Ithaca, Jarnvik and
  the Tibetan village; a café, a bakery, a school and a forge in Sainte-Aubine; a flat with
  a samovar in Stalnogorsk; market stalls, looms, hearths, beds, chests, jars and sacks.
- **More to climb and to crawl under.** There are 58 ladders now (roofs, lofts, towers,
  scaffolds, rocks) and many low places only a crouching player gets through or under: wagons, railway cars, a ship on the stocks, drains, holes in hedges and
  palisades, raised floors, upturned boats.

### Changed

- **A chapter never holds more than 30 enemies.** The **Enemies** list on the hero screen
  now offers 5, 10, 15, 20, 25 or 30, and starts at 15. Whatever the number, the boss is
  there and every kind of enemy is kept as long as the number allows; the others are
  thinned where they stood thickest, so that those left are spread over the whole map.
- Enemies have been moved into the new places, so the fight no longer runs along one road.
- In Tenochtitlan the gunner on the Great Temple now stands on a terrace; the top belongs
  to the drummer. In Jarnvik the two bowmen at the gate stand on a new fighting step
  behind the palisade.
- The game is one file of 1.93 MB (was 1.71 MB).

### For those who build or test

- Three more switches in the address: `&check` writes into the page whether every enemy
  can walk to where the player starts (and, with `&reach=x,z;x,z`, whether given places
  can be reached on foot); `&cam=x,y,z,yaw,pitch,fov` shows a still picture from any place;
  `&kit` sets every shared piece of furniture and every bystander beside the start.

## [1.4.0] - 2026-11-21

### Added

- **A Graphics setting**, at the bottom left of the title screen: Automatic, High, Medium
  or Low. During a chapter, `G` steps through the four (also while paused).
  - High is the picture as it was. Medium draws three quarters of the resolution. Low draws
    half of it, with fewer grass tufts and far trees, shorter shadows and no glow.
  - Automatic, the default, starts on High and steps down by itself while the game runs
    below about 42 frames a second. If a step brings nothing, it is taken back.
  - Your choice is remembered for the next visit.
  - Measured on a laptop graphics chip at 3840 × 2160, in the heaviest chapter (IX): 19
    frames a second on High, 30 on Medium, 78 on Low.
- A frame counter for reporting how the game runs on your machine: add `?fps` to the
  address.

### Changed

- The key hints show `W` `A` `S` `D` again. The arrow keys still move you in the same way.
- **The code of a duel is easier to read and to type.** It is shown in plain upright
  letters instead of the chapter's display type, and no longer contains characters that
  are easily taken for one another (no 0, O or Q; no 1 or I; no 2 or Z; no 5 or S; no 8 or
  B; no G; neither U nor V). A code may be typed in small letters or with spaces.
- The lists on the Duel screen and the hero screen (chapter, rules, number of enemies) use a
  plain typeface, so that a 5 or a 9 reads clearly.

### Removed

- The backup way of connecting a duel with copy-paste codes. The invite link and its code
  have proved reliable, and the Duel screen is simpler without it.

## [1.3.0] - 2026-11-21

### Added

- **Chapter IX, Tenochtitlan.** The evening of 30 June 1520: the Spaniards slip out of the
  city over the western causeway, loaded with the gold of the temples, and you must stop
  them before they reach the shore.
  - The place: the Great Temple, climbable by its stair to two shrines heaped with gold; the
    skull rack; jungle round the precinct and along the shores; the causeway over the lake,
    cut by three canals; a volcano smoking on the horizon.
  - Three heroes, each with their own weapon and the obsidian-edged club: Cuauhtémoc with a
    **poisoned dart-thrower** (a dart wounds, then goes on hurting for five seconds),
    Tzilacatzin with heavy stones, Nezahualcóyotl with the bow.
  - Thirty-six enemies: swordsmen, crossbowmen, arquebusiers, **horsemen**, a **cannon** with
    its gunner, and the captain of the rear guard.
  - Three villains for Duel mode: Hernán Cortés, Pedro de Alvarado, Nuño de Guzmán.
  - Its own music (drums, a clay flute, a conch) and evening sounds.
- Horned animal skulls at the temple of the old gods and over the hall door in Jarnvik.
- The title screen shows nine chapters, in three rows of three.

### Changed

- Anyone who ends up on the bed of a lake or the sea, the player or an enemy, in any chapter,
  is put back on dry ground after a moment instead of staying stuck there.

## [1.2.0] - 2026-11-21

### Changed

- **The Vikings of Jarnvik swing a flail instead of a sword** (right mouse button): a wooden
  haft with two spiked iron balls on chains. It is whirled once, then swept across. A swing
  takes twice as long as the sword's, but it hits harder and strikes everyone in a wide arc in
  front of you. The throwing axes are unchanged. The Minotaur, who carries the same axes in
  Duel mode, has the flail too.
- **The Vikings wear animal skins:** shaggy fur over the shoulders, paws down the chest, a
  ragged pelt on the back and a fur kilt, in five colours of fur; many carry the beast's head
  on a shoulder. This goes for every enemy in Jarnvik, its three heroes, and the duel villains
  Erik Bloodaxe and Ivar the Boneless.
- **The throwing stars are real stars:** eight sharp points and a hole in the middle, dark
  steel with bright ground edges. The enemy ninja throw the same ones.

## [1.1.0] - 2026-11-21

### Changed

- **Kagemori is fought with throwing stars (shuriken) instead of the bow.** Each throw sends
  three stars in a narrow fan, about two throws a second: deadly close up, where all three
  strike, and weak far off, where only one does. The katana stays on the right mouse button.
- Tomoe Gozen's strength is now *Swift hands*: she throws her stars almost twice as fast.
- The three villains of Kagemori in Duel mode throw stars too.
- The bow remains in the game with Songtsen Gampo (chapter VIII) and the duel villains Xerxes
  and Langdarma.

## [1.0.1] - 2026-11-21

### Fixed

- Aiming with the six-shooter (and with the pistols of chapters VI to VIII) no longer hides
  the target: the gun now stays under the crosshair, as the Sten gun already did. The carbine,
  which sat only just under the crosshair, is lowered the same way. Shots land exactly where
  they did before. Thanks to the player who reported it.

## [1.0.0] - 2026-11-21

The first numbered version: the game as it stands after the rounds published so far. Eight
chapters, twenty-four heroes, most buildings open, ladders, hides and dens, and an online
Duel mode for two players with twenty-seven villains.

### Added

- The version number on the title screen (bottom right), taken from `package.json` when the
  game is built.
- This changelog, and numbered releases on GitHub.

## Before 1.0.0

The rounds published before versions were numbered, by date.

### 2026-11-21

#### Added

- An **Enemies** list on the hero screen: all of the chapter's enemies, or any number from
  10 to 30. The boss always stays.
- Ladders, climbed with no extra key: face one and walk into it. They stand against the
  flat roofs of Dry Gulch, the garages of Stalnogorsk and every raised hide.
- Crouching (`C`): half speed, harder to see, fits through low doors.
- A raised hide and a den with a crawl-in door in every chapter; Lookout Butte in Dry Gulch,
  climbed by a zigzag of rock steps.
- The church of Dry Gulch can be entered, with a stair inside the tower up to the belfry.
- In Uri, a great natural boulder with a summit cross, reached by a leaning ladder; a
  waterfall with a path behind it.
- Four longships to board at Jarnvik; more buildings to enter in Stalnogorsk and Che La;
  flute monks and geisha in Kagemori; golden Buddhas, the hammer and sickle.
- Greek villains for Duel mode: the Minotaur and Xerxes join the Cyclops, Medusa and
  Antinous.
- In Duel mode the host chooses how many computer enemies stay in the world: none, or one
  to nine.

#### Changed

- The arrow keys move exactly like `W` `A` `S` `D` (left and right sidestep; the mouse turns
  the view) and are the keys shown on screen.
- The two players of a duel stay connected between duels; no new link for a rematch.
- The stair of the temple of Ithaca is longer and can be climbed.

#### Fixed

- Crossbow bolts lodged in the air above fences on sloping ground; fences, cows, yaks and
  horses have collision shapes that fit them.
- The bridge of Kagemori was hard to cross; enemies could land on roofs on the first frame.

#### Removed

- Crates to jump on (ladders replace them); `Caps Lock` as a second crouch key; the villain
  Circe.

### 2026-11-20

#### Added

- The first three chapters: Dry Gulch, Kagemori and Uri.
- A choice of three heroes per chapter, each with their own look and one strength.
- Chapters IV and V (Ithaca, Jarnvik), and practice mode.
- Chapter VI, Sainte-Aubine (Normandy, 6 June 1944).
- Chapters VII and VIII (Stalnogorsk, Che La); buildings that can be entered; solid walls
  and bodies; enemies that find their way round walls and through doors.
- Duel mode for two players online, with twenty-five villains to play, and a new title
  screen.

[1.5.0]: https://github.com/iago-swi/outlaws/releases/tag/lone-hand-v1.5.0
[1.4.0]: https://github.com/iago-swi/outlaws/releases/tag/lone-hand-v1.4.0
[1.3.0]: https://github.com/iago-swi/outlaws/releases/tag/lone-hand-v1.3.0
[1.2.0]: https://github.com/iago-swi/outlaws/releases/tag/lone-hand-v1.2.0
[1.1.0]: https://github.com/iago-swi/outlaws/releases/tag/lone-hand-v1.1.0
[1.0.1]: https://github.com/iago-swi/outlaws/releases/tag/lone-hand-v1.0.1
[1.0.0]: https://github.com/iago-swi/outlaws/releases/tag/lone-hand-v1.0.0
