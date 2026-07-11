# AGENTS.md — HeroMath MMORPG

## Goal
Build a complete AAA-quality MMORPG portal system from school gate into a lobby with job selection, then a massive 10-zone fantasy continent (L1-100) with 3D terrain, zone-based level-gating, orbit camera, minimap teleport, Final Fantasy-style turn-based 3D battle system, item drops, equipment (weapon/armor/helmet), inventory, 3D cave dungeons with room exploration and encounters, and gathering activities (wheat field, copper mine, riverside fishing with cast→wait→bite→reel mechanic).

## Constraints & Preferences
- Portal at `x=0, z=-55` (school gate) replaced with glowing portal
- Lobby with 6 job classes (Warrior, Mage, Archer, Assassin, Paladin, Necromancer)
- 3D world map viewed from perspective orbit camera (same as school map: drag to orbit, wheel to zoom, follow behind hero)
- Hero model uses `makeMario` with job-specific material colours; same world hero is cloned into battle scenes
- Minimap click: admin teleport if `_adminTeleportMode` + admin user, else waypoint auto-navigate with level validation
- Terrain must be zone-based with elevation, biome-specific props, distinctive landmarks per zone
- Movement must be camera-relative (W = away from camera, S = toward camera, A/D = left/right)
- **Hero must spawn in Starter Kingdom and cannot enter any higher-level zone until reaching the required level**
- **Level-gating must be a hard block — hero position never updated when attempting entry to restricted zone**
- **Random encounters in Starter Kingdom: exactly one 6% roll per 6s window with 3s post-battle cooldown**
- **Battle system: turn-based (Final Fantasy style), 3D scene with hero + monster, Attack/Skill/Defend/Run actions**
- **Battle background must match zone theme (Starter Kingdom = forest/grassland)**
- **Monster models must match fantasy references (Slime, Goblin, Wolf, Bandit, Forest Ogre)**
- **Hero must use job-specific weapon visible on model in battle**
- **Monsters should drop equipment (weapon, armor, helmet) with stats**
- **Hero can equip weapon (senjata), armor (baju), helmet (helm) — each item has ATK/DEF/HP/MAG stats**
- **Fishing must use cast→wait→bite→reel flow (not click-bobber-instant-catch)**

## Done

### Portal & Lobby
- Replaced school gate with epic MMORPG portal: glowing rings, particles, lights, "⚔ MMORPG ⚔" sign, proximity-detected entry button
- Built job selection lobby overlay with 6 class cards, stat panels, star-particle background
- `closeLobby` + `mmoEngage` transition: hides lobby, shows HUD, spawns hero, initialises world

### Continent & Zones
- Complete continent redesign: 10 leveling zones, 90+ markers (cities, towns, villages, dungeons, raids, bosses, ports, resources, POIs)
- `MMORPG_ZONES` global object: 10 zone definitions with `minLv`, bounds, terrain color, icon, description
- `getZoneInfo(wx,wz)` global function: returns zone for any coordinate
- Zone-based terrain: `getBiomeColor` uses zone colors, elevation adjusted per zone
- Zone-specific decorations: probabilistic tree/rock/bush placement per biome
- Continental road network with King's Road spine, cross roads, beltways, port spurs
- Zone+type landmark builder `zoneBuilding(wx,wz,type,zone)` — different castle/building colors per zone
- Zone level-range labels at zone centers
- Rivers: Crystal River, highland streams, swamp drainage, frozen meltwater, volcanic lava
- Minimap updated with `getZoneInfo`, minimap click blocked during battle

### Level-Gating
- Hero starts at Lv.1 (`mmorpgState.heroLevel`)
- Movement loop checks `targetZone.minLv > heroLv` — **hard blocks by never assigning position**, only shows gate toast
- Gate toast notification: "🚫 ZONE TERKUNCI" overlay with zone name + required level, auto-dismisses after 2.3s
- HUD zone display: `#mmoZoneDisplay` shows current zone icon + name + level range
- Minimap click level validation: non-admin clicks on restricted zones show gate toast

### HUD
- Shows job name, level, XP bar (current XP / required), zone info, equipment stats bonus
- `#mmoLevelDisplay` + `#mmoXpBar` + `#mmoXpText` updated after each battle
- `#mmoEquipStatsDisplay` shows current equipped stat bonuses

### Battle System
- `MMORPG_MONSTERS`: 5 Starter Kingdom monsters (HP/ATK heavily buffed — Lv.1 hero cannot beat Lv.5 Wolf)
- `MMORPG_SKILLS`: 6 job classes × 3 skills each (16 total unique skills) with name, MP cost, power multiplier, element type, 3D FX tag
- `mmoBuildMonsterModel(data)`: upgraded fantasy-accurate 3D monster groups
- `mmoStartBattle(monsterData)`: separate Three.js scene, canvas, camera, lights, grass ground, zone-themed background, hero clone, monster model, HP/MP bars, action buttons
- `mmoProcessAction(type, idx)`: Attack (physical + equip ATK), Skill (MP cost, buff or elemental damage + equip ATK/MAG), Defend (reduce next damage), Run (escalating chance)
- `mmoPlaySkillEffect(fx, scene, startPos, endPos, callback)`: 15 distinct effects
- `mmoEnemyTurn()`: monster attacks reduced by equipment DEF
- `mmoEndBattle(result, xp, gold)`: victory = add XP, save drop to inventory, level-up toast; defeat = respawn at Capital City, lose 1 level; flee = return
- Battle-active guard in `mmoUpdate`: skips movement when `mmoBattle.active`
- Random encounter: 6% per step, 6s cooldown, 3s post-battle cooldown, Starter Kingdom only, monster ≤ hero level + 3
- XP curve: 80 XP per level, Level formula: `level = 1 + floor(totalXp / 80)`

### Equipment System
- `MMORPG_DROPS` restructured: each monster drops 2-4 items with `type` (weapon/armor/helmet/material) and `stats` (atk/def/hp/mag)
- Rarity: Common (50%), Uncommon (30%), Rare (15%), Epic (5%)
- Stat generation per rarity tier
- `mmoGetEquipmentStats()` returns cumulative ATK/DEF/HP/MAG from all equipped items
- `mmoEquipItem(slot, item)`: equips item to slot, returns current item to inventory
- `mmoUnequipSlot(slot)`: moves equipped item back to inventory
- `mmoUpdateEquipDisplay()`: refreshes HUD stat bonus display
- Battle HP/MP/ATK/DEF formulas absorb equipment bonuses

### Dungeon System
- **Goblin Cave**: 9 rooms (entrance, corridors, goblin den, collapsed tunnel, mushroom grove, chief's lair, treasure vault, escape tunnel) with goblin-themed enemies
- **Wolf Den** (L3): 9 rooms (entrance, forest path, hunting grounds, wolf lair, alpha den, hidden clearing, pack trail, hollow log, forest exit) with wolf-themed enemies
- **Bandit Camp** (L5): 9 rooms (entrance, watchtower, supply tent, armory tent, captives tent, chief's tent, campfire, escape path, stash hide) with bandit-themed enemies
- 3D Three.js scene with room boxes in 3×3 grid, drag-to-orbit camera, raycast click movement
- Per-dungeon: background color, ground color, exit pillar color, boss name text, monster pool prefix
- Dungeon-specific monster pools (weak/normal/boss variants per dungeon)
- `DUNGEON_MONSTER_POOLS`: 9 pool definitions (base + wolf_ + bandit_ prefixes)
- Treasure rooms: 5-20 gold on discovery
- Boss rooms: signature encounter per dungeon
- Exit rooms: entrance + one more exit per layout
- Defeat respawns at entrance; flee returns to same room; victory clears room enemies
- Proximity-based entrance prompt (click or Enter key)

### Inventory
- `🎒 INV` button on HUD opens modal with:
  - Equipment slots section (weapon/armor/helmet) with current items and unequip button
  - Inventory list with equip button for equipment-type items
  - Material items shown without equip ability
- Stats displayed inline with item names (⚔ATK, 🛡DEF, ❤HP, 🔮MAG)

### Ranking Billboard Fix
- **Root cause**: `adminClearRanking()` (👑 admin panel button) was clearing `mariomath_rank_v1` (wrong localStorage key) — never touched the actual sifir ranking key `sifirSchoolRanking_v1`, never cleared Firebase
- Fixed to call `sifirClearAllRankings()` instead — same logic used by the rankOverlay clear button
- `sifirClearAllRankings()` saves `[]` to both Firebase and localStorage, sets `window._sifirForceEmpty = true`, nukes billboard canvas
- `_sifirForceEmpty` flag prevents 3D billboard from re-drawing ranking data after clear

### Paintball Spawn Obstacle Fix
- **Root cause**: Concrete blocks at (-23, -19.5) and (23, 19.5) placed directly adjacent to RED spawn (-22, -19) and BLUE spawn (22, 19). With random spawn offset (±0.75), players spawned inside the expanded AABB collision box (0.35 radius). Push-out logic (lines 33267-33278) couldn't resolve — hero stuck every frame.
- Removed concrete blocks at (-23, -19.5) and (23, 19.5)
- Removed containers at (-19, -15.5) and (19, 15.5) that were also near spawn points
- Removed cars at (-22, -17.5) and (22, 17.5) — car body BoxGeometry(2.2,0.25,1.05) overlaps spawn at (-23,-17) / (23,17) with offset
- **Fixed collision push-out bug**: Push-out was placing hero at `box.max.x` (raw box edge), but collision detection uses `box.expandByScalar(0.35)`. Hero's position was ALWAYS inside the expanded zone after push, so collision triggered every frame and hero could never escape. Fixed to push to `box.max.x + pr + 0.001` (past expanded boundary).

### Chess PvP Turn Sync Fix
- **Root cause**: `chessExecuteMove` calls `chessPvpPushBoard()` BEFORE `chessTurn = oppColor` (line 16077 vs 16086), so the pushed `turn` is the MOVER's color. The listener in `chessPvpStartSync` sets `chessTurn = d.turn` (mover's color), which makes the opponent think it's still the mover's turn. Opponent can't click because `chessTurn !== _chessMyColor`.
- **Fix**: In `chessPvpStartSync` (line 16502), invert the turn: `chessTurn = d.turn === 'w' ? 'b' : 'w'`. This ensures the receiver gets the NEXT player's turn.

### Game Invitation Block
- Added guard in all 7 invite listener functions (chess, dam, futsal, fol5v, paintball, PVP, MOBA): if any game is active (`_pbRunning`, `chessMode==='pvp'`, `_pvpActive`, `_fss.running`), the invitation toast is suppressed.
- Also added guard in `chessInviteOpen` to block opening the invite panel during active games.

### Kirito Skin (Replaced Goku)
- **Goku skin removed entirely** — user dissatisfied with hair after multiple redesigns; replaced with Kirito
- Kirito NPC model existed at `HeroMath.html:9112` (black coat `0x1a1a2e`, dark hair `0x0a0a14`, black boots, dual swords)
- Added `skin_kirito` to `SHOP_ITEMS` (50 Rare Coins, `⚔️`)
- `isKiritoSkinActive()`, `applyKiritoVisuals()` — black coat (`0x1a1a2e`), black pants (`0x0a0a1a`), black boots (`0x000008`), pale skin (`0xf0d5b0`), hides school uniform / other skin groups
- `_ensureKiritoHair()` — compact dark swept-back anime hair style (not wild Goku spikes)
- `makeKiritoSwordAuraMesh()` — 2 crossed `BoxGeometry` blades at ±45° with blue-white glow aura, rotating rings, core sphere
- `spawnKiritoSwordImpact()` — X-shaped slash burst with energy particles + `"⚔️ DUAL SWORD AURA!"` float text
- Dual Sword Aura replaces Kamehameha in `shoot()` and `updateBullets()`; works in Arena 3D (`_amShoot`) but NOT in MMORPG battles
- `applyNarutoSkin()` / `applyKafkaVisuals()` early-return when Kirito active
- `applyCostume()` toggles single `kiritoHairGrp` (no belt/wristband/emblem/boot groups needed)
- All Goku-specific code removed: `_ensureGokuBelt`, `_ensureGokuWristbands`, `_ensureGokuEmblem`, `_ensureGokuBoots`, `makeKamehamehaMesh`, `spawnKamehamehaImpact`, 5 group references in `applyCostume`

### Fishing Upgrade (Cast→Wait→Bite→Catch)
- Replaced click-bobber-instant-catch with proper cast→wait→bite→catch flow based on internet fishing game references
- **Cast phase**: Player clicks 🎣 CAST button (or water area) → 0.6s casting animation rod lift → bobber appears in water with fishing line from rod tip
- **Wait phase**: 3-12s random timer, bobber floats gently, rod idles with sway
- **Bite phase**: Bobber shakes vigorously (`Math.sin(t*20)*0.06`), rod tip trembles (`Math.sin(t*16)*0.012`), prompt "🐟 Gigit! Klik pelampung cepat!" — 2s window to click
- **Catch phase**: Click bobber → rod tip lifts (`_caughtEnd=1.5s`), toast + fish added to inventory, cast button reappears
- **Miss/Bite timeout**: Fish escapes after 2s → "Ikan lepas..." + bobber removed, cast button reappears
- **State machine**: 5 phases (`idle`/`casting`/`waiting`/`biting`/`caught`) with timer-based transitions in animation loop
- **3D fishing line**: `THREE.Line` from rod tip `(0.2, 0.32, 1.2)` to bobber position, removed on catch/timeout
- **Single dynamic bobber**: Replaces old 8-14 static bobbers — one bobber created per cast, destroyed after catch/escape
- **Total fish**: 5-10 per session (was 8-14) — appropriate for slower cast→wait flow
- **`mmoFishState` new fields**: `phase`, `_castEnd`, `_biteTime`, `_biteTimeout`, `_caughtEnd`, `dynamicBobber`, `line3D`, `fishIdx`, `castBtn`
- **New functions**: `mmoCastLine()` (creates bobber+line, picks random fish), `removeFishBobber()` (scene cleanup), `showFishPrompt()` (updates instruction text)
- **Cast button**: `#mmoFishCastBtn` with `stopPropagation()`, auto-hidden during active phases, shown when `phase==='idle'`
- **`mmoFishClick` refactored**: idle phase → calls `mmoCastLine()`; biting phase → raycasts against dynamic bobber; other phases → no-op

### Joystick Fix (Touch)
- Removed `ren.domElement.style.pointerEvents='none'` — canvas now receives touches and bubbles to `mmoWrap`
- Added `_mmoJoyCheck(e)` in `mmoWrap` touchstart that checks joyzone bounding rect first; orbit only proceeds if check returns false
- Simplified joyZone CSS: removed `env(safe-area-inset-bottom/left)` (fixed `bottom:14px; left:14px`)

### Battle White/Black Screen Fix
- Made battle renderer persistent via `window._mmoBattlePersistentRen` / `window._mmoBattlePersistentCanvas` — created once, reused across all battles
- `mmoEndBattle` no longer calls `dispose()` (only `setAnimationLoop(null)`)
- `mmoStartBattle` reuses `mmoBattleUI` container instead of creating new each battle
- `mmorpgClose` disposes persistent renderer on full world exit

### Menara Rare Coin Reward
- Added `d.owned.menaraRare` tracking array in `showWin` hook (level ≥1 && ≤10)
- Gives 10 `rare_coin` once per level, shown via toast "⭐ MENARA X CLEAR! +10 Rare Coin"
- Prevents re-rewarding same level

### Goku Skin with Kamehameha (50 Rare Coin)
- Added `skin_goku` to `SHOP_ITEMS` (50 Rare Coin, `🐉`)
- `isGokuSkinActive()`, `applyGokuVisuals()` — orange gi (`0xff6b1a`), blue navy pants (`0x1a2a6a`), dark boots (`0x0a0a2a`), tan skin (`0xf0b080`); hides hats, original hair, school uniform extras, other skin groups
- `_ensureGokuHairSpikes()` — 12 SSJ cone spikes (gold `0xddbb22`), 3 bangs, 2 sideburns
- `_ensureGokuBelt()` — blue torus sash hanging ends + red obi (`0xcc2244`)
- `makeKamehamehaMesh()` — blue-white core sphere (`0x44aaff` emissive), 3 rotating torus rings, translucent outer aura sphere, 8 orbiting particle spheres
- `spawnKamehamehaImpact(bx,by,bz)` — white flash, expanding ring, 50 blue particle burst, narrow beam cylinder, `"🔥 KAMEHAMEHA!"` float text; supports both 2D (Menara) and 3D (Arena) scenes
- Kamehameha integrates in `shoot()`, `updateBullets()`, `arenaShootPressed()`, Arena bullet update loop, all collision/impact handlers (Menara enemies, bosses, range; Arena walls, remote players)
- `applyCostume()` updated: `gokuOn` flag, `gokuHairGrp` + `gokuBeltGrp` visibility
- `applyNarutoSkin()` early-return for Goku
- All skin apply call sites (5 locations) call `applyGokuVisuals()`
- Arena player creation: Goku skin handling with `_ensureGokuHairSpikes` + `_ensureGokuBelt`
- Equip message: `'🐉 Skin dipakai! Hero kamu kini jadi Goku SSJ! Kamehameha aktif!'`

### PvP Battle System Fixes
- Minimap: `mmorpgUpdateMinimap` now draws green dots for ALL online players via `mmoPresenceReadAll()` using `_fbPresenceCacheMMO[uid].who` field (not `name`)
- PvP player list: `pvpRenderOnlineList` uses `p.who || p.name` for display name
- Opponent visuals: `applyJobColors()` helper + `pvpRefreshOpponentVisuals()` applied via listener on every state update; delayed `p2_job` data handled via `get(ref)` re-fetch before `pvpOpenScene`
- Spawn facing: heroes face each other correctly (`rotation.y = Math.PI/2` for p1, `-Math.PI/2` for p2) — matching monster battle convention
- Skill system: full job skills loaded via `pvpGetJobSkills()` from `MMORPG_SKILLS` + `MMORPG_JOB_TIERS` with proper power, MP cost, element type, 3D FX
- Skill menu: `pvpShowMainActions` + `pvpShowSkillMenu` with back button, MP-constrained skill buttons
- 3D effects: `pvpPlaySkillEffect` wrapper sets `mmoBattle.active=true` during animation (since `mmoPlaySkillEffect` checks this internally)
- Turn sync: removed `_pvpActive=true` from `pvpStartBattle` — listener fires first with full data, then `_pvpActive` is set inside listener; `pvpInviteAccept` uses `Promise.all` to await room writes before notifying challenger
- Action sync: both players store action/damage in Firebase; opponent's defense uses simplified formula since stats aren't stored per-player

### PvP Button Freeze Fix (Latest)
**Root cause**: `_pvpActionProcessed` set `true` at line 49474 but not reliably reset on all exit paths (death question, exceptions). Waiting player during death question had flag stuck `true`, preventing further actions even after phase returned to `playing`.

Fixed by:
- `_pvpActionProcessed=false` in `pvpUpdateTurn` "my turn" branch (line 49370)
- Both flags reset `_pvpActionProcessed=false;_pvpDeathQuestionActive=false` in `pvpShowMainActions` (line 49393)
- Both flags reset in listener's `playing` branch every time it fires (line 49131)
- Outer `try-catch` wrapping entire `pvpProcessAction` body ensures flag reset on any exception (line 49475-catch at line 49616)
- Fixed `myPos`/`oppPos` being local to `pvpOpenScene` but used as undefined fallbacks in `pvpProcessAction` — now computed from `isP1` inside `pvpProcessAction` (line 49482-49483)

## Next Steps
1. Test joystick on touch device — verify orbit vs joystick conflict resolved
2. Test battle multiple times — verify no white/black screen after battle ends
3. Test PvP battle end-to-end — verify buttons never freeze mid-fight
4. Test menara levels M1-M10 — verify 10 Rare Coin reward once per level
5. Buy Goku skin (50 Rare Coin) — test Kamehameha in Menara (platformer) and Arena Master
6. Test chess PvP — both players should now alternate turns correctly
7. Test invitations blocked during active game
8. Test paintball spawn — both teams should no longer get stuck at spawn
9. Test ranking clear from 👑 admin panel button
10. Test all 3 Starter Kingdom dungeons (Goblin Cave, Wolf Den, Bandit Camp)
11. Test equipment stats application in battle + item drops

## Session Log (Jul 7 2026)

### Minion Target System (Co-op Boss Battle)
- **Minion name mapping** (`BOSS_MINION_NAMES`): Per-boss minion names (3 each), defined after `MMORPG_BOSS_DROPS`
- **Minion generation**: Each boss battle creates 3 minions with 12% of boss max HP (min 30), written to Firebase `minions` array + local `_bossCoopMinionsData`
- **Target selection menu** (`mmoCoopShowTargetMenu`): Shows 👑 Boss + 🔸 alive minions after Attack/Skill click. Only boss shown when all minions dead
- **Damage routing** (`mmoCoopCheckAllAnswered`): Reads each player's `target` field — boss damage to `monsterHp`, minion damage updates individual minion HP in Firebase; dead minions set `alive: false`
- **Minion HP bars** (`mmoCoopRenderHuds`): Shown below boss HP bar with name + HP bar + HP numbers
- **Dead minion cleanup** (render loop): Minion meshes hidden when `alive===false`, synced via listener
- **Action reset**: `target` field cleared per round alongside action/damage/answer
- **Cleanup**: `_bossCoopMinionsData` reset on battle end

### Bug Fixes (Minion/Session)
- **Minion positions behind boss**: Changed `minionSpots` from `(2.2,-3.4),(3.0,-1.6),(5.6,-3.6)` to `(2.2,-1.8),(3.0,-1.8),(3.8,-1.8)` — now a horizontal line in front of boss (boss at z=-2.6)
- **Player upside down**: Changed `heroG.rotation.y=...` to `heroG.rotation.set(0,...,0)` — `rotation.set()` explicitly resets x/z axes to 0, preventing inherited rotation from world hero clone (`rotation.y=Math.PI`) from corrupting co-op battle hero orientation

### Go Kart Nitro Race v2.0 — Litar Bukit 3D (Jul 9 2026)
- **Complete rewrite** of the Go Kart system: v1.0 ran on the school map scene; v2.0 creates a dedicated `THREE.Scene()` for the race world, independent of the school map
- **3D track with elevation**: 16 waypoints in a counter-clockwise circuit (~100 m lap), crest at y=13m, hill climbs and descents across the circuit
- **Road construction**: Segments between waypoints with embankments under elevated sections, red/white barrier blocks along edges, dashed center lines every other segment
- **Terrain**: Flat green ground plane at y=-0.5, ambient/directional/hemisphere lighting, sky-blue background with fog
- **Scenery**: Start/finish banner (gold+white), grandstands with tiered seating rows, 16 cone+cylinder trees scattered around the track
- **Upgraded car model**: Aerodynamic chassis with nose cone, rear spoiler with support struts, blue-tinted windshield, front/rear bumpers, headlights (emissive white-yellow), taillights (emissive red), 4 detailed wheels with rim+tire, neon underglow, exhaust pipe, driver helmet
- **Audio**: Web Audio API sawtooth oscillator for engine hum (pitch tied to speed), countdown beeps (3→2→1→GO!), auto-stops on race end/exit
- **Exit button** (`🚪 EXIT`): Bottom-right HUD button that calls `gkEnd()` — stops audio, disposes race scene geometries/materials, restores hero visibility, resumes school map RAF
- **Countdown start**: 3‑second countdown overlay with beeps before the race begins
- **Lap detection**: Cross finish line (z=35, x=-35 to 5) from below with arm/disarm logic to prevent false positives
- **AI updated**: Follow 3D waypoints with `wpIdx` progression, interpolated height via `_gk3Height()`
- **Race camera**: Separate `PerspectiveCamera` in the race scene, follows behind player car with smooth lerp
- **Question system**, **P2 duo controls**, **nitro/turbo mechanics**, **HUD**, **race results** — all migrated from v1.0 with 3D height awareness
- **Swap/restore**: On `gkStart`, pause school map RAF, hide hero; on `gkEnd`, resume school map RAF, restore hero visibility

## ToyyibPay Payment Integration

### Overview
Rare Coin top-up via real money using ToyyibPay payment gateway (Touch 'n Go, FPX, kad kredit/debit).

### Files Created
| File | Purpose |
|------|---------|
| `HeroMath.html` (modified) | Shop UI topup section + order creation + API call + return check |
| `toyyibpay_config.php` | ToyyibPay + Firebase credentials config |
| `toyyibpay_create_bill.php` | Proxy endpoint — forwards bill creation to ToyyibPay API (secretKey dirahsiakan di server) |
| `toyyibpay_callback.php` | Webhook — ToyyibPay panggil selepas bayar; update `orders/{orderId}` + credit Rare Coin |
| `toyyibpay_webhook_cloudfunction.js` | Alternatif guna Firebase Cloud Function (lebih selamat, tanpa PHP) |

### Setup Steps
1. **Daftar akaun ToyyibPay** di https://toyyibpay.com/ (atau https://dev.toyyibpay.com/ utk sandbox)
2. **Dapatkan credential** dari dashboard ToyyibPay:
   - `Secret Key`: Profile → Secret Key
   - `Category Code`: Product → Category → Tambah kategori baru → dapatkan Code
3. **Isi credential** dalam `toyyibpay_config.php`:
   - `TOYYIBPAY_SECRET_KEY`
   - `TOYYIBPAY_CATEGORY_CODE`
   - `TOYYIBPAY_BASE_URL` (tukar ke `https://dev.toyyibpay.com` utk sandbox)
4. **Dapatkan Firebase Database Secret** dari Firebase Console:
   - Project Settings → Service Accounts → Database Secrets → Show
   - Isi `FIREBASE_SECRET` dalam `toyyibpay_config.php`
5. **Host PHP files** di server yang support PHP (webhosting murah rm5/bln pun boleh)
6. **Set callback URL** dalam ToyyibPay dashboard (jika ada):
   - Product → Category → Edit category → Callback URL = `https://your-server.com/toyyibpay_callback.php`
   - Jika tiada ruangan Callback URL (ToyyibPay update dashboard), takpe — `billCallbackUrl` dihantar terus dalam API createBill setiap kali bil dicipta, jadi callback tetap jalan.
7. **Update `TOYYIBPAY_CONFIG`** dalam `HeroMath.html`:
   - `secretKey`: Sama dengan `TOYYIBPAY_SECRET_KEY`
   - `categoryCode`: Sama dengan `TOYYIBPAY_CATEGORY_CODE`
   - `callbackUrl`: URL ke `toyyibpay_callback.php` di server anda

### Flow
```
User klik "💳 BELI RM X" di shop
  → shopBuyTopup() creates orders/{orderId} in Firebase {username, packageId, qty, status:'pending'}
  → mmoCallToyyibpayApi() fetch POST ke toyyibpay_create_bill.php (proxy)
  → Proxy forward ke ToyyibPay API createBill
  → ToyyibPay return BillCode
  → Browser redirect ke https://toyyibpay.com/{BillCode}
  → User bayar di ToyyibPay page
  → ToyyibPay callback POST ke toyyibpay_callback.php
    → Baca order dari Firebase
    → Jika status=1, update tracking/{USER}/shop/rare_coin (PUT)
    → Update order status → 'completed'
  → User redirect balik ke HeroMath.html?payment_return=1
    → mmoCheckPendingOrder() baca order status dari Firebase
    → Jika completed, panggil shopSyncRareCoinFromFirebase() → trigger UI update
    → _shopAttachRareCoinListener() akan detect perubahan & notify user
```

### Firebase Paths
| Path | Purpose |
|------|---------|
| `orders/{orderId}` | Order data: username, packageId, qty, amount, status, createdAt |
| `tracking/{USERNAME}/shop/rare_coin` | Rare Coin balance (dicredit oleh webhook) |

### Packages (RM → Rare Coin)
| Package | Rare Coin | Harga (RM) |
|---------|-----------|------------|
| topup_rare10 | 10 | RM2 |
| topup_rare30 | 30 | RM5 |
| topup_rare50 | 50 | RM8 |
| topup_rare100 | 100 | RM15 |
| topup_rare500 | 500 | RM65 |

### Key Functions (HeroMath.html)
| Function | Line | Purpose |
|----------|------|---------|
| `shopBuyTopup(itemId)` | ~12350 | Click handler: confirm → create Firebase order → call API → redirect |
| `mmoCallToyyibpayApi(orderId, item, username, shopData)` | ~12394 | POST to PHP proxy or direct ToyyibPay API (fallback) |
| `mmoCheckPendingOrder()` | ~12480 | Check order status on return from payment page |
| `mmoInitPaymentReturnCheck()` | ~12518 | Parse URL param `?payment_return=1`, trigger order check |

### Deployment Options

**Option A: PHP Hosting (Recommended untuk beginner)**
- Upload `toyyibpay_*.php` ke mana-mana webhosting (ex: Hostinger, Exabyte, etc.)
- Pastikan `HeroMath.html` juga diupload
- Pastikan `TOYYIBPAY_CONFIG` dalam `HeroMath.html`:
  - `backend: 'php'` (default)
  - `phpProxyUrl` dan `phpCallbackUrl` ikut domain anda
  - `secretKey` boleh dikosongkan (PHP proxy guna config sendiri)
- Callback URL di dashboard ToyyibPay optional — `billCallbackUrl` dihantar terus dalam API createBill

**Option B: Firebase Cloud Function (tanpa PHP)**
Guna Firebase Functions v1 (Spark percuma, tiada kos bulanan).

#### Step-by-step:

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login Firebase**
   ```bash
   firebase login
   ```
   Ini akan buka browser untuk login guna Google account yang sama dengan Firebase project `heromath-e4573`.

3. **Init functions dalam folder project**
   ```bash
   cd C:\Users\actio\Desktop\HERO
   firebase init functions
   ```
   - Pilih project `heromath-e4573` (tekan Space, Enter)
   - Pilih `JavaScript`
   - Jawab `Y` untuk ESLint (optional)
   - Jawab `N` untuk install dependencies dengan npm sekarang — kita akan guna manual nanti
   - Folder `functions/` akan tercipta

4. **Ganti functions/index.js dengan kod Cloud Function**
   Salin isi `toyyibpay_webhook_cloudfunction.js` ke `functions/index.js`.

5. **Edit credential dalam functions/index.js**
   ```javascript
   const TOYYIBPAY_SECRET_KEY    = 'dapatkan-dari-dashboard-toyyibpay';
   const TOYYIBPAY_CATEGORY_CODE = 'dapatkan-dari-dashboard-toyyibpay';
   const GAME_URL                = 'https://heromath-e4573.firebaseapp.com'; // URL game
   const CALLBACK_URL            = 'https://us-central1-heromath-e4573.cloudfunctions.net/toyyibpayWebhook';
   ```

6. **Install dependencies**
   ```bash
   cd functions
   npm install firebase-functions firebase-admin
   cd ..
   ```

7. **Deploy**
   ```bash
   firebase deploy --only functions
   ```
   Selepas deploy, terminal akan tunjuk URL setiap function:
   ```
   ✔ functions[toyyibpayCreateBill]: Successful create operation.
   Function URL (toyyibpayCreateBill): https://us-central1-heromath-e4573.cloudfunctions.net/toyyibpayCreateBill
   ✔ functions[toyyibpayWebhook]: Successful create operation.
   Function URL (toyyibpayWebhook): https://us-central1-heromath-e4573.cloudfunctions.net/toyyibpayWebhook
   ```

8. **Update HeroMath.html — tukar ke mode cloudfn**
   ```javascript
   const TOYYIBPAY_CONFIG = {
     backend: 'cloudfn',
     secretKey: '', // tak guna — selamat di server
     categoryCode: '', // dah hardcode di Cloud Function
     baseUrl: 'https://toyyibpay.com',
     cloudFunctionUrl: 'https://us-central1-heromath-e4573.cloudfunctions.net/toyyibpayCreateBill',
     returnUrl: window.location.href.split('?')[0] + '?payment_return=1',
   };
   ```

9. **Set Callback URL di dashboard ToyyibPay (jika ada)**
   - Log masuk ToyyibPay → Product → Category
   - Click category anda → Edit
   - Callback URL: `https://us-central1-heromath-e4573.cloudfunctions.net/toyyibpayWebhook`
   - Simpan
   - Jika tiada ruangan Callback URL (ToyyibPay update dashboard), takpe — `billCallbackUrl` dihantar terus dalam API createBill setiap kali bil dicipta, jadi callback tetap jalan.

#### Kelebihan Cloud Function vs PHP:
| Aspek | PHP | Cloud Function |
|-------|-----|----------------|
| Hosting | Perlukan webhosting | Serverless, zero setup |
| Harga | ~RM5/bln | Spark percuma (2j invocations/bln) |
| Security | SecretKey di server sendiri | SecretKey di Google Cloud |
| Maintenance | Perlu update PHP | Auto-scale, Google urus |
| Webhook | Callback URL statik | Callback URL tetap selamanya |

### Netlify Functions (Alternatif tanpa PHP)

#### Setup:

1. **Dapatkan Service Account** dari Firebase Console:
   - Firebase Console → Project Settings → Tab **Service Accounts**
   - Klik **Generate new private key** → muat turun fail JSON
   - Buka fail JSON, salin **seluruh content** (JSON string)

2. **Set Environment Variables** di Netlify Dashboard:
   - Site → Environment variables → Add:
     - `FIREBASE_SERVICE_ACCOUNT` = **paste seluruh JSON** dari Service Account private key
     - `FIREBASE_DATABASE_URL` = `https://heromath-e4573-default-rtdb.asia-southeast1.firebasedatabase.app`
     - `TOYYIBPAY_SECRET_KEY` = dapatkan dari dashboard ToyyibPay
     - `TOYYIBPAY_CATEGORY_CODE` = dapatkan dari Product → Category
     - `TOYYIBPAY_BASE_URL` = `https://toyyibpay.com` (atau `https://dev.toyyibpay.com` utk sandbox)
     - `GAME_URL` = URL site game (contoh: `https://heromath.netlify.app`) — untuk redirect balik lepas bayar
     - `PAYMENT_URL` = URL site payment functions (contoh: `https://heromathpay.netlify.app`) — untuk webhook

3. **Fail-fail yang diperlukan:**
   - `netlify/functions/toyyibpay-create-bill.js` — proxy create bill
   - `netlify/functions/toyyibpay-webhook.js` — webhook callback (guna Firebase REST API, zero dependencies)
   - `package.json` (root) — kosong, tak perlu dependency
   - `netlify.toml` — config functions path

4. **Update TOYYIBPAY_CONFIG** dalam HeroMath.html:
   ```javascript
   const TOYYIBPAY_CONFIG = {
     backend: 'netlify',
     secretKey: '',    // tak guna — selamat di server
     categoryCode: '', // tak guna
     baseUrl: 'https://toyyibpay.com',
     netlifyFunctionUrl: window.location.origin + '/.netlify/functions/toyyibpay-create-bill',
     returnUrl: window.location.href.split('?')[0] + '?payment_return=1',
   };
   ```

5. **Deploy ke Netlify:**
   - Upload semua fail ke Netlify (drag-drop folder atau push ke git)
   - Netlify akan detect `netlify/functions/` dan deploy sebagai serverless functions
   - `package.json` di root kosong (zero dependencies) — function guna `fetch` native

   > **Per-bill Callback URL**: Kita guna parameter `billCallbackUrl` dalam API createBill — jadi callback URL di-set secara automatik setiap kali bil dicipta. **Tak perlu setting apa-apa di dashboard ToyyibPay.** Walaupun ToyyibPay alih/dahului ruangan Callback URL di dashboard, sistem kita tetap jalan sebab callback URL dihantar terus dalam API request.

#### Cara Netlify Functions berfungsi:
```
HeroMath.html → shopBuyTopup() → create firebase order
  → POST ke /.netlify/functions/toyyibpay-create-bill
  → function call ToyyibPay API guna SecretKey dari env var
  → return { success, paymentUrl }
  → browser redirect ke ToyyibPay page

ToyyibPay → callback POST → /.netlify/functions/toyyibpay-webhook
   → function guna Firebase REST API (Service Account OAuth2) untuk baca order
   → credit Rare Coin (read-then-write)
  → update order status

User balik → ?payment_return=1 → mmoCheckPendingOrder() → sync Rare Coin
```

### Key Functions (HeroMath.html)
| Function | Line | Purpose |
|----------|------|---------|
| `shopBuyTopup(itemId)` | ~12383 | Click handler: confirm → create Firebase order → call API → redirect |
| `mmoCallToyyibpayApi(orderId, item, username, shopData)` | ~12405 | POST ke PHP/CloudFn/Netlify ikut `backend` config |
| `mmoCheckPendingOrder()` | ~12515 | Check order status on return from payment page |
| `mmoInitPaymentReturnCheck()` | ~12553 | Parse URL param `?payment_return=1`, trigger order check |

## Room System (Bilik Peribadi) — Jul 9 2026

### Overview
Persistent 3D room system: hero boleh jalan dalam bilik, letak/padam perabot, pasang TV besar dengan YouTube.

### Room System
- **Room dimensions**: `rs=14`, `rh=4.0`, `cellSize=2.0`, grid 5x5 (gx/gz -2..2)
- **Room scene**: Separate Three.js scene, rendered fullscreen with dedicated orbit camera
- **Orbit camera**: Drag to orbit (yaw/pitch), wheel to zoom (dist 2–5.5, pitch 0.05–0.85), camera clamped within room bounds (X/Z ±6.5, Y 0.5–3.2)
- **Hero clone** (`smHero`): WASD/Arrow movement with camera-relative direction, `rotation.set(0,Math.atan2(vx,vz),0)` to face movement
- **Room open/close**: `roomOpen()` hides tower game HUD (`#hud`,`#timerBar`,`#bossHud`,`#qpanel`), spawns hero clone, saves/restores hero world position; `roomClose()` restores HUD, disposes scene, resumes school map
- **Pasang/Padam**: Click katalog → select item → click grid → place; `🗑️ PADAM` mode → click furniture → delete
- **Furniture placement**: Grid position `(gx-2)*cs`; furniture outside -2..2 filtered at load/rebuild
- **Persistent save**: `_roomData` saved via `_roomUserRef.set()`; loaded from `users/{uid}/room` on room open
- **Visit friend**: `roomVisitFriend(username)` → notify via Firebase `room_invites/{target}` → confirm → load friend's room
- **Furniture rotation**: stored as `f.rot`, applied as `m.rotation.y`

### TV + YouTube (Jul 9 2026)
- **Flat-screen TV**: Replaced small 0.9×0.5 TV with 2.6×1.6 wall-mounted flat screen
- **Wall-mounted**: `_rGetTvWallPos(gx,gz)` finds nearest wall (within ±7 bounds) and positions TV flush against it with correct rotation
- **TV placement**: Both `roomBuildScene` and `_rRebuildF` use wall pos for `id==='tv'`
- **YouTube overlay**: `#roomYtOverlay` with URL input + PLAY button + iframe
- **URL parsing**: `roomPlayYt()` converts youtube.com/watch, youtu.be, playlist, live URLs to embed format with autoplay
- **TV click**: `_rClick` detects raycast hit on furniture with `itemId==='tv'` → opens YouTube overlay
- **Close**: `roomCloseYt()` removes overlay, clears iframe; `roomClose()` calls `roomCloseYt()`

### Achievement Board Back Wall (Jul 10 2026)
- **Back wall** (z=-7) replaced with canvas texture showing achievement board data
- **Canvas**: 1400×400 (3.5:1 ratio, matching wall's 14×4 dimensions exactly)
- **Game-style UI**: dark cyber grid background, neon borders, frosted-glass cards, skill gems
- **COL 1** — 📊 Menara Matematik + ⚔️ Hero Stats (HP/ATK/DEF/MAG)
- **COL 2** — ✖️ Sifir Mastery + 📚 Topik + 🏅 Ranking Sifir
- **COL 3** — 🪙 Ekonomi + ⚔️ MMORPG + 📝 Sesi Terkini
- **Auto-refresh**: `_roomRenderAchievementBoard()` every 15s, `_roomAchievementTexture.needsUpdate=true`
- **Wall color guard**: `roomSaveSettings` skips walls with `o.material.map`

### Poster Katalog (Jul 10 2026)
- **Separate catalog item**: `{ id:'poster', name:'Poster', wall:true, w:2, d:1.5 }` — boleh dipasang di **dinding kiri/kanan sahaja** (x=-7 dan x=7)
- **Dilarang di dinding depan** (z=7, cermin peta sekolah) dan **dinding belakang** (z=-7, achievement board)
- **Placement guard**: `if(sid==='poster'&&(wallSide==='back'||wallSide==='front'))return;` — blok peletakan + preview
- **3D model**: Frame kayu (`0x8B6B3A`) + kanvas warna neutral (`0x2a2a3e`) — **tiada kaitan dengan achievement board**
- **Upload gambar**: Klik poster → `#roomPosterOverlay` → `📷 UPLOAD GAMBAR` → simpan Data URL ke `f.customImg`
- **Padam gambar**: `🗑️ PADAM GAMBAR` padam custom image, kembali ke warna neutral
- **Saiz**: LEBAR (0.5–6) + TINGGI (0.5–4) + `✓` — disimpan sebagai `f.pw`/`f.ph` di Firebase
- **Data merge**: `Object.assign({},item,{customImg,pw,ph})` dalam 3 path: `roomBuildScene` (`var item` fix `:55050`), `_rRebuildF`, `_rAddSingleItem`

### MMORPG Go Kart — Empty Vehicle (Jul 11 2026)
- **Go kart spawned** near Capital City at `(8, 0, -94)` in the MMORPG world — empty, no driver
- **3D model**: Reuses `_gkBuildCar`-style builder (`_mmBuildGoKart`) — chassis, side pods, nose, bucket seat (empty), steering wheel (torus + column), roll bar (hoop + legs), engine block, exhaust, number plate, bumpers, headlight/taillight, 4 wheels with rims/spokes, neon underglow, floating 🏎️ sign
- **Green kart** (`0x22aa44`) with dark chassis, chrome bumpers, neon glow
- **Mount**: Walk within 5 units → "🏎️ GO KART — Tekan E untuk naik" prompt → press E → hero invisible, kart driving mode
- **Dismount**: Press E again → hero appears beside kart, prompt gone
- **Driving physics**: `GK_ACCEL=18`, `GK_BRAKE=22`, `GK_FRICTION=4`, `GK_MAX_SPD=25`, `GK_TURN=3.2` — physics-based with acceleration, braking, friction, speed-dependent steering
- **Wheel spin**: `wSpin` accumulates based on speed, applied to all 4 wheel meshes
- **Underglow pulse**: Neon glow intensity oscillates when speed > 1
- **Level-gating**: Go kart respects zone level requirements — bounces back with speed reversal + gate toast when entering restricted zone
- **Camera**: Follows behind kart using heading direction (not camera-relative yaw), auto-rotates behind kart when driving forward
- **State**: `mmorpgState._goKart = {mounted, mesh, speed, heading, wSpin}`
- **Cleanup**: `mmorpgClose()` disposes kart mesh from scene, resets state, hides prompt
- **Floating sign**: 🏎️ sprite above kart, hidden while driving, shown when parked
