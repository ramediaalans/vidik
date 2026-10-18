# Local modifications — F40 locally accepted; public deployment pending

## Current accepted checkpoint
User accepted the full Russian CE/WASM f40-final build and selected it for future site integration: fixed logical1024x768,4:3, no resolution selector. The local direct entry is /fallout-ce-ru/index.html. Catalog fallout-full still points to BottleShip WGB; this routing is not the selected site runtime. No public deployment/upload is claimed.

Foreground input/gameplay/inventory/save-load and persistence evidence is recorded in the project F39b/F40 reports; user reported normalized sound and no obvious slowdown. Background callback lateness and full-campaign/long-combat coverage remain limitations, not reopened optimization instructions. Engine license and game-data distribution rights remain separate and require review before release.

Project authority: _test/FALLOUT_ACCEPTANCE_F40.md and docs/FALLOUT_INTEGRATION.md. These are project-relative references, not URLs guaranteed to be served with this distribution. Runtime identity: _test/fallout-alternatives/f40-final-identity.json.

## Historical development notes (superseded status, preserved evidence)

Pinned K1ngst0m/fallout1-ce-web b5a6b7b437654b81c026c30452f171f5202e04c6, Emscripten6.0.12 Release. Original engine license is preserved in LICENSE.md.

Local changes: exported IDBFS; unsigned font indexing for Cyrillic; respect hashing=0 with IDBFS profile; absolute pointer to GNW delta correction; diagnostics for save/load and main-loop phase; Russian loader with SHA256 data checks, separate persistent storage and output-only mute. See _test/fallout-alternatives/ce-local.patch and _test/FALLOUT38_CE_EVALUATION.md in the local project.

Save/load core smoke passed after hash fix. Later hidden-tab startup stopped responding. Final instrumented rebuild and DOM mouse/full combat/map/hide-show gate remain unverified. The launcher is an experimental local candidate; BottleShip remains the default. No public game upload or site changes.

Original game data rights are separate. Do not distribute this engine commercially without ensuring the Sustainable Use License permissions or separate authorization.

## F39 local candidate
Single-owner DOM mouse coordinates, queued button edges, capture/release handling and forced game-canvas cursor hiding; cooperative web movie/input waits; output-muted audio callback diagnostics. Compiled and unit-tested, but F39 actual-game mouse/audio acceptance is pending explicit user approval to reload the existing test tab. See _test/FALLOUT39_INPUT_AUDIO.md and fallout-alternatives/f39-staged-identity.json. Previous F38 conclusions are historical, not F39 runtime proof.


## F39b runtime checkpoint
Additional cooperative MVE sound-cursor and sync waits. Trusted DOM menu clicks, Russian new game/inventory/movement, slot02 save/load and post-page-reload load passed; six save file SHA256s preserved. Combat UI/turn processing responds but full combat/campaign is not certified. Background/minimized main-thread audio callback lateness remains observed, so this is not an ideal/production-approved engine. See _test/FALLOUT39B_RUNTIME.md. BottleShip remains catalog default. Engine license/game data rights unchanged.


## F40 fixed web display profile
Browser-only compiled1024x768/scale1 profile after saved INI parsing; migrate dedicated persistent display INI without altering saves/game preferences. Fixed4:3 canvas layout independent of SDL inline sizes. Compared1024/1280 UI readability;1024 selected. Functional focused-CDP QA is not a background-performance certificate. User reported F39b sound normalized/no obvious slowdown. Current source patch includes web_display_profile.h and web_mouse_state.h. See _test/FALLOUT40_RESOLUTION.md; historical640x480 notes above are superseded for CE only. License and public-distribution restrictions remain unchanged.
