# Промты: наклейки картриджей (30 штук)

## Как работать

- **По одному изображению за раз**, дожидаясь сохранения файла.
- **Формат 4:3** (1024×768). Точно под область наклейки на карточке.
- **Куда класть:** `assets_raw/games_art/<имя>.png`. Папку создать, если нет.
- Потом я запускаю `node tools/link-art.mjs` — пережмёт в WebP и привяжет к играм.
- **Надписи внутри картинки — можно.** Код уже поправлен: как только у игры есть арт, свою подпись с названием сайт больше не рисует — остаётся только строка «год · жанр» и подвал с приставкой.
- Модели путают буквы. Если надпись вышла кривой — просто назови файл `<имя>-notext.png`, и я верну собственную типографику поверх.

### Два стиля наклеек

**A — официальный западный (для Sega и SNES).** Глянцевая печать, аэрографная иллюстрация, крупный логотип сверху или снизу:

> `official Sega Mega Drive cartridge label, glossy print, airbrushed 1990s box art illustration, bold title lettering, saturated colors, dramatic lighting, slight print halftone texture, 4:3`

**B — пиратский постсоветский (для Dendy).** То, что реально лежало на ковре: грубая цветопередача, смещённые цвета, коллаж, дешёвая бумага:

> `bootleg 1990s Dendy famiclone cartridge label, cheap offset print with visible misregistration, oversaturated colors, crude cut-and-paste collage of game characters, glued paper texture with scuffed corners, russian pirate cartridge aesthetic, 4:3`

Если хочешь везде один стиль — бери A, будет аккуратнее. Стиль B атмосфернее, но шумнее.

---

## Dendy / NES — стиль B

### 1. `contra.png`
**Надпись:** `CONTRA` крупно сверху, мелко внизу `8 BIT`
Contra cartridge label: two muscular commandos — one in a red headband, one in blue — firing heavy machine guns while leaping through a neon-lit jungle at night, alien bio-mechanical fortress glowing behind them, tracer fire, explosions, palm silhouettes.

### 2. `contra-force.png`
**Надпись:** `CONTRA FORCE`
Contra Force cartridge label: four-man urban commando squad in tactical vests on a rain-slick harbour dock at night, helicopter searchlight cutting through smoke, muzzle flashes, container cranes and a freighter behind them, cold blue palette.

### 3. `chip-n-dale.png`
**Надпись:** `CHIP 'N DALE  RESCUE RANGERS`
Chip and Dale Rescue Rangers cartridge label: two cheerful cartoon chipmunks — one in a brown fedora and bomber jacket, one in a red hawaiian shirt — carrying a wooden crate together through a cluttered toy workshop, a fly in goggles and a mouse in a pink dress cheering nearby, warm cozy colors, classic Disney television animation style.

### 4. `chip-n-dale-2.png`
**Надпись:** `CHIP 'N DALE  RESCUE RANGERS 2`
Chip and Dale Rescue Rangers 2 cartridge label: the same two cartoon chipmunk heroes flying a small red airship over a clockwork museum full of giant brass gears and a dinosaur skeleton, a fat cat villain scowling from a balcony, bright adventurous palette.

---

## Sega Mega Drive — стиль A

### 5. `mortal-kombat-3.png`
**Надпись:** `MORTAL KOMBAT 3`
Mortal Kombat 3 cartridge label: three martial arts tournament fighters mid-combat — a cyborg ninja with a glowing eye, a woman in green, a shirtless brawler with a mohawk — on a neon-lit subway platform arena, lightning arcing, blood-orange dramatic lighting, digitized photo-realistic fighters.

### 6. `mortal-kombat-ii.png`
**Надпись:** `MORTAL KOMBAT II`
Mortal Kombat II cartridge label: two masked ninjas in blue and yellow clashing in an ancient stone temple arena, spiked pit below, rows of silhouetted monks watching from the dark, torchlight, ominous mood, digitized photo-realistic fighters.

### 7. `disney-s-aladdin.png`
**Надпись:** `ALADDIN`
Disney's Aladdin cartridge label: a young street thief in a purple vest and white baggy trousers swinging on a rope with a scimitar over a sunlit desert bazaar, golden domes and minarets, a magic carpet unrolling, a small monkey in a fez beside him, classic Disney animation style.

### 8. `lion-king-the.png`
**Надпись:** `THE LION KING`
The Lion King cartridge label: a lion cub standing proudly on a sunlit rock outcrop above an endless african savanna at sunrise, herds of antelope and zebra below, a wise mandrill with a staff at the edge of frame, warm orange sky, painterly Disney animation style.

### 9. `comix-zone.png`
**Надпись:** `COMIX ZONE`
Comix Zone cartridge label: a muscular comic book artist with a ponytail punching a monster while standing inside hand-drawn comic panels, ink outlines and halftone dots, the page edge peeling and a giant pen hovering above, gritty mid-90s comic art style.

### 10. `earthworm-jim.png`
**Надпись:** `EARTHWORM JIM`
Earthworm Jim cartridge label: a cartoon earthworm wearing an oversized white robotic spacesuit, holding a ray gun in a goofy heroic pose, surreal alien junkyard of pipes and scrap behind him, wacky exaggerated western animation style, vivid greens and purples.

### 11. `earthworm-jim-2.png`
**Надпись:** `EARTHWORM JIM 2`
Earthworm Jim 2 cartridge label: the same cartoon worm in a robotic suit running with a bubble shield while cartoon puppies and anvils rain down around him, surreal candy-colored dimension, absurd humor, chaotic energetic composition.

### 12. `battletoads.png`
**Надпись:** `BATTLETOADS`
Battletoads cartridge label: three muscular anthropomorphic toad warriors in armored trunks — green, blue and yellow — one smashing forward with a comically enormous fist, dark metallic sci-fi corridor, green and purple lighting, aggressive 90s attitude.

### 13. `battletoads-and-double-dragon.png`
**Надпись:** `BATTLETOADS & DOUBLE DRAGON`
Battletoads and Double Dragon cartridge label: muscular anthropomorphic toad warriors teaming up with two martial artist brothers in tank tops and fingerless gloves, brawling on a neon city street at night, punk gang thugs with chains closing in, sparks and steam.

### 14. `contra-hard-corps.png`
**Надпись:** `CONTRA HARD CORPS`
Contra Hard Corps cartridge label: a futuristic commando team — a soldier with a heavy cannon, a cyborg with a blade arm, a combat robot — running from a massive explosion through a collapsing metal megacity, orange fire against dark steel.

### 15. `teenage-mutant-ninja-turtles-the-hyperstone-heist.png`
**Надпись:** `TEENAGE MUTANT NINJA TURTLES  THE HYPERSTONE HEIST`
TMNT Hyperstone Heist cartridge label: four anthropomorphic turtle warriors with red, blue, orange and purple bandanas and martial arts weapons leaping out of a manhole in a steamy night city street, pizza box on the pavement, neon reflections, comic book style.

### 16. `teenage-mutant-hero-turtles-tournament-fighters.png`
**Надпись:** `TMNT TOURNAMENT FIGHTERS`
TMNT Tournament Fighters cartridge label: two anthropomorphic turtle martial artists facing off in a glowing tournament arena, split versus composition, energy aura around their fists, crowd silhouettes, fighting game poster style.

### 17. `dune-the-battle-for-arrakis.png`
**Надпись:** `DUNE  THE BATTLE FOR ARRAKIS`
Dune The Battle for Arrakis cartridge label: a colossal sandworm erupting from an ochre desert dune beside an enormous tracked spice harvester, ornithopters overhead, distant fortress, epic science fiction war illustration, dusty amber palette.

### 18. `prince-of-persia.png`
**Надпись:** `PRINCE OF PERSIA`
Prince of Persia cartridge label: an agile swordsman in a white tunic leaping over a floor spike trap in a torch-lit palace dungeon, crumbling stone arches, a giant hourglass glowing behind him, arabian nights mystery, deep shadows.

### 19. `jurassic-park.png`
**Надпись:** `JURASSIC PARK`
Jurassic Park cartridge label: a velociraptor stalking toward a stalled jeep beside a sparking electric fence in a tropical island jungle during a thunderstorm, silhouette of a t-rex in the rain behind, dramatic lightning, dark green palette.

### 20. `robocop-versus-the-terminator.png`
**Надпись:** `ROBOCOP VERSUS THE TERMINATOR`
RoboCop versus The Terminator cartridge label: an armored cyborg police officer with a visored helmet firing a pistol point blank at a chrome skeletal war machine with glowing red eyes, ruined city at night, sparks and rubble, cold metallic palette.

### 21. `robocop-3.png`
**Надпись:** `ROBOCOP 3`
RoboCop 3 cartridge label: an armored cyborg police officer walking out of a burning industrial district at night with a jetpack on his back and a machine pistol raised, gritty near-future dystopia, orange fire and blue steel.

### 22. `batman.png`
**Надпись:** `BATMAN`
Batman cartridge label: a caped vigilante in a dark cowl crouched on a gothic cathedral gargoyle above a rain-soaked art deco city, searchlight beam sweeping the clouds, deep blue and black palette, brooding mood.

### 23. `batman-forever.png`
**Надпись:** `BATMAN FOREVER`
Batman Forever cartridge label: a caped hero and his young acrobatic sidekick in red leaping through a garish neon city of green and purple light, question-mark motifs glowing behind them, digitized live-action photo look typical of mid-90s games.

### 24. `doom-troopers-the-mutant-chronicles.png`
**Надпись:** `DOOM TROOPERS`
Doom Troopers cartridge label: two heavily armored space marines with oversized guns blasting grotesque mutants in a dark industrial corridor on a red planet, gore and sparks, grim science fiction horror palette.

### 25. `flintstones-the.png`
**Надпись:** `THE FLINTSTONES`
The Flintstones cartridge label: a stone age cartoon man in an orange spotted tunic beside a log-and-stone car, his family waving, a friendly brontosaurus working as a construction crane in a prehistoric town, bright cheerful Hanna-Barbera animation style.

### 26. `tiny-toon-adventures.png`
**Надпись:** `TINY TOON ADVENTURES`
Tiny Toon Adventures cartridge label: young cartoon animal students — a blue rabbit in red shorts, a pink rabbit in a purple dress, a green duck — running cheerfully through a wacky cartoon schoolyard with impossible architecture, bright primary colors, Warner Bros television animation style.

### 27. `tom-and-jerry-frantic-antics.png`
**Надпись:** `TOM & JERRY  FRANTIC ANTICS`
Tom and Jerry cartridge label: a grey cartoon cat skidding across a checkered kitchen floor chasing a small brown cartoon mouse, flying plates, a cheese wedge and a mousehole in the skirting board, classic slapstick animation style.

### 28. `wwf-wrestlemania-arcade.png`
**Надпись:** `WWF WRESTLEMANIA  THE ARCADE GAME`
WWF WrestleMania The Arcade Game cartridge label: two exaggerated muscular wrestlers in bright costumes colliding mid-air in a spotlit ring with pyrotechnic flames and a roaring crowd, digitized live-action photo look, arcade poster energy.

---

## Super Nintendo — стиль A

### 29. `battletoads-double-dragon-the-ultimate-team.png`
**Надпись:** `BATTLETOADS / DOUBLE DRAGON  THE ULTIMATE TEAM`
Battletoads Double Dragon The Ultimate Team cartridge label: muscular anthropomorphic toad warriors and two martial artist brothers posing back to back in a chrome spaceship hangar, crisp bright 16-bit era airbrush art, cleaner and more colorful than the mega drive version.

### 30. `battletoads-in-battlemaniacs.png`
**Надпись:** `BATTLETOADS IN BATTLEMANIACS`
Battletoads in Battlemaniacs cartridge label: two anthropomorphic toad warriors racing hover bikes down a glowing wireframe tunnel inside a digital world, speed streaks, cyan and magenta neon grid, sense of extreme velocity.

---

## Сводка имён файлов

```
contra.png
contra-force.png
chip-n-dale.png
chip-n-dale-2.png
mortal-kombat-3.png
mortal-kombat-ii.png
disney-s-aladdin.png
lion-king-the.png
comix-zone.png
earthworm-jim.png
earthworm-jim-2.png
battletoads.png
battletoads-and-double-dragon.png
contra-hard-corps.png
teenage-mutant-ninja-turtles-the-hyperstone-heist.png
teenage-mutant-hero-turtles-tournament-fighters.png
dune-the-battle-for-arrakis.png
prince-of-persia.png
jurassic-park.png
robocop-versus-the-terminator.png
robocop-3.png
batman.png
batman-forever.png
doom-troopers-the-mutant-chronicles.png
flintstones-the.png
tiny-toon-adventures.png
tom-and-jerry-frantic-antics.png
wwf-wrestlemania-arcade.png
battletoads-double-dragon-the-ultimate-team.png
battletoads-in-battlemaniacs.png
```

## Одна оговорка

Промты описывают собственную иллюстрацию по мотивам игры, а не копию издательской обложки. Названия и персонажи — товарные знаки своих владельцев (Konami, Sega, Disney, Rare, Midway, Warner и пр.). Для локального прототипа это неважно; если сайт пойдёт в публику с трафиком, этот блок — самая уязвимая его часть вместе с самими ROM’ами.
