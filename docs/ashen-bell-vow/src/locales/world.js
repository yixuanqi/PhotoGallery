// World, Room, Altar, Lore Tablet, Pickup, Puzzle, Wall Inscription & Biome Ambience translations (en-US)
// Chinese source strings live in data/rooms/*.json & src/audio.js; English lookup maps by stable ID or exact source string.

export const WORLD_EN = {
  worldTitle: 'Ashen Bell Vow · The Dim Abyss',
  defaultZone: 'The Dim Abyss',

  zones: {
    '沉钟回廊': 'Sunken Bell Cloister',
    '沉渊钟井': 'Abyssal Bell Well',
    '初钟圣顶': 'Spire of the First Bell',
    '晦渊': 'The Dim Abyss',
    '残钟地窖': 'Crypt of Shards',
    '绝风断塔': 'Gale-Shattered Spire',
    '枯墨古林': 'Withered Ink Woods',
    '霜骸圣脊': 'Frost-Bone Ridge',
    '沉钟水牢': 'Sunken Bell Cistern'
  },

  rooms: {
    r01_sanctuary: { zoneName: 'Sunken Bell Cloister', name: 'Extinguished Altar' },
    r02_corridor:  { zoneName: 'Sunken Bell Cloister', name: 'Corridor of Withered Bones' },
    r03_chapel:    { zoneName: 'Sunken Bell Cloister', name: 'Chapel of the Broken Bell' },
    r04_bell_well: { zoneName: 'Abyssal Bell Well',    name: 'Abyssal Bell Well' },
    r05_foundry:   { zoneName: 'Abyssal Bell Well',    name: 'Abyssal Bell Foundry' },
    r06_crypt:     { zoneName: 'Sunken Bell Cloister', name: 'Crypt of Shards' },
    r07_ascent:    { zoneName: 'Spire of the First Bell', name: 'Ascent of the First Bell' },
    r08_heart:       { zoneName: 'Spire of the First Bell', name: 'Heart of the First Bell' },
    r09_wind_spire:   { zoneName: 'Gale-Shattered Spire',    name: 'Gale Spire · Lower Thermal Shaft' },
    r10_ink_woods:    { zoneName: 'Withered Ink Woods',      name: 'Ink Woods · Seepage Canopy' },
    r11_frost_ridge:  { zoneName: 'Frost-Bone Ridge',        name: 'Frost Ridge · Snowmelt Pass' },
    r12_wind_bridge:  { zoneName: 'Gale-Shattered Spire',    name: 'Gale Spire · Thousand-Bell Bridge' },
    r13_wind_peak:    { zoneName: 'Gale-Shattered Spire',    name: 'Gale Spire · Cloud-Sea Summit' },
    r14_woods_cavern: { zoneName: 'Withered Ink Woods',      name: 'Ink Woods · Root-Tangled Cavern' },
    r15_woods_heart:  { zoneName: 'Withered Ink Woods',      name: 'Ink Woods · Hollow Bell-Tree' },
    r16_frost_tomb:   { zoneName: 'Frost-Bone Ridge',        name: 'Frost Ridge · Frozen Blade Mound' },
    r17_frost_summit: { zoneName: 'Frost-Bone Ridge',        name: 'Frost Ridge · Glacial Peak' },
    r18_rain_steps:     { zoneName: 'Sunken Bell Cloister',  name: 'Rain-Swept Tomb Steps' },
    r19_belfry_outer:   { zoneName: 'Sunken Bell Cloister',  name: 'Severed-Cord Outer Belfry' },
    r20_bell_galleries: { zoneName: 'Gale-Shattered Spire',  name: 'Suspended Bell Galleries' },
    r21_cistern_west:   { zoneName: 'Sunken Bell Cistern',   name: 'Cistern · Seeping Cell Gallery' },
    r22_cistern_nave:   { zoneName: 'Sunken Bell Cistern',   name: 'Cistern · Drowned Bell Nave' },
    r23_cistern_lock:   { zoneName: 'Sunken Bell Cistern',   name: 'Cistern · Broken Sluice Lock' },
    r24_frost_seep:     { zoneName: 'Frost-Bone Ridge',      name: 'Frost-Seep River Source' },
    r25_mirror_abyss:   { zoneName: 'Heart of the First Bell', name: 'Mirror Abyss · Sanctum of First Forging' }
  },

  subZones: {
    '沉钟回廊 · 苍穹残钟阁': 'Sunken Bell Cloister · Skyward Bell Loft',
    '沉钟回廊 · 熄灯祭坛': 'Sunken Bell Cloister · Extinguished Altar',
    '沉钟回廊 · 枯骨长廊': 'Sunken Bell Cloister · Corridor of Withered Bones',
    '沉钟回廊 · 礼拜堂前': 'Sunken Bell Cloister · Chapel Forecourt',
    '沉钟回廊 · 断钟礼拜堂': 'Sunken Bell Cloister · Chapel of the Broken Bell',
    '沉渊钟井 · 暗河深殿': 'Abyssal Bell Well · Sunless River Hall',
    '沉渊钟井 · 井中悬坛': 'Abyssal Bell Well · Suspended Well Altar',
    '沉渊钟井 · 钟摆石廊': 'Abyssal Bell Well · Pendulum Gallery',
    '沉渊钟井 · 上层钟阁': 'Abyssal Bell Well · Upper Belfry',
    '沉渊钟井 · 沉渊铸钟殿': 'Abyssal Bell Well · Abyssal Bell Foundry',
    '残钟地窖 · 东侧暗道': 'Crypt of Shards · Eastern Passage',
    '残钟地窖 · 墨蛭渊渠': 'Crypt of Shards · Ink-Leech Trench',
    '残钟地窖 · 铸匠秘库': 'Crypt of Shards · Bell-Smith Vault',
    '初钟圣顶 · 誓阶底坛': 'Spire of the First Bell · Base of the Vow-Stair',
    '初钟圣顶 · 破晓密室': 'Spire of the First Bell · Chamber of Dawn',
    '初钟圣顶 · 墨翼天梯': 'Spire of the First Bell · Ink-Wing Ascent',
    '初钟圣顶 · 终誓圣门': 'Spire of the First Bell · Gate of the Final Vow',
    '初钟圣顶 · 初钟圣心': 'Spire of the First Bell · Heart of the First Bell',
    '绝风断塔 · 西风廊桥': 'Gale-Shattered Spire · West Wind Bridge',
    '绝风断塔 · 悬风钟井': 'Gale-Shattered Spire · Updraft Shaft',
    '绝风断塔 · 绝风祈坛': 'Gale-Shattered Spire · Gale Altar',
    '枯墨古林 · 归坛古根井': 'Withered Ink Woods · Sanctuary Root Shaft',
    '枯墨古林 · 荧光孢伞林': 'Withered Ink Woods · Spore Canopy Grove',
    '枯墨古林 · 沉根幽窟': 'Withered Ink Woods · Sunken Root Cavern',
    '霜骸圣脊 · 寒崖冰廊': 'Frost-Bone Ridge · Glacial Cliff Gallery',
    '霜骸圣脊 · 风雪残刃冢': 'Frost-Bone Ridge · Snowbound Blade Mound',
    '绝风断塔 · 炉热排风井': 'Gale-Shattered Spire · Furnace Thermal Flue',
    '绝风断塔 · 悬风断桥': 'Gale-Shattered Spire · Broken Gale Bridge',
    '绝风断塔 · 西侧铃塔残垣': 'Gale-Shattered Spire · Western Belfry Ruins',
    '绝风断塔 · 千铃断桥': 'Gale-Shattered Spire · Thousand-Bell Span',
    '绝风断塔 · 云海风台': 'Gale-Shattered Spire · Cloud-Sea Terrace',
    '枯墨古林 · 暗河渗水廊': 'Withered Ink Woods · River Seepage Gallery',
    '枯墨古林 · 盘根深窟': 'Withered Ink Woods · Root-Tangled Deep',
    '枯墨古林 · 暗河渗池': 'Withered Ink Woods · Seepage Pool',
    '枯墨古林 · 千年古钟树窟': 'Withered Ink Woods · Ancient Bell-Tree Hollow',
    '霜骸圣脊 · 融雪冰廊': 'Frost-Bone Ridge · Snowmelt Gallery',
    '霜骸圣脊 · 东崖雪道': 'Frost-Bone Ridge · Eastern Snow Cliff',
    '霜骸圣脊 · 融雪瀑布底': 'Frost-Bone Ridge · Snowmelt Falls Base',
    '霜骸圣脊 · 冻剑墓阶': 'Frost-Bone Ridge · Frozen Sword Steps',
    '霜骸圣脊 · 绝巅雪门': 'Frost-Bone Ridge · Summit Snow Gate',
    '霜骸圣脊 · 绝脊孤峰': 'Frost-Bone Ridge · Lone Glacial Peak'
  },

  altars: {
    altar_start:  { name: 'Sunken Bell Cloister · Extinguished Altar', shortName: 'Sanctuary · Extinguished Altar' },
    altar_chapel: { name: 'Chapel Forecourt · Severed-Cord Altar', shortName: 'Chapel · Severed-Cord Altar' },
    altar_well:   { name: 'Abyssal Bell Well · Suspended Well Altar', shortName: 'Well · Suspended Altar' },
    altar_ascent: { name: 'Spire of the First Bell · Base Altar', shortName: 'Ascent · Base Altar' },
    altar_summit:   { name: 'Spire of the First Bell · Final Vow Altar', shortName: 'Spire · Final Vow Altar' },
    altar_wind:     { name: 'Gale-Shattered Spire · Gale Altar',         shortName: 'Spire · Gale Altar' },
    altar_forest:   { name: 'Withered Ink Woods · Root Cavern Altar',    shortName: 'Woods · Root Altar' },
    altar_mountain:   { name: 'Frost-Bone Ridge · Snowmelt Altar',       shortName: 'Ridge · Snowmelt Altar' },
    altar_frost_tomb: { name: 'Frost-Bone Ridge · Summit Snow Altar',    shortName: 'Ridge · Summit Altar' },
    altar_cistern:      { name: 'Sunken Bell Cistern · Drowned Bell Altar', shortName: 'Cistern · Drowned Altar' },
    altar_mirror_abyss: { name: 'Mirror Abyss · Obsidian Mirror Altar',     shortName: 'Mirror Abyss Altar' },
    altar_foundry_door: { name: 'Abyssal Bell Well · Furnace Gate Altar',   shortName: 'Well · Furnace Gate Altar' },
    altar_wind_bridge:  { name: 'Gale-Shattered Spire · Bridgehead Altar',  shortName: 'Spire · Bridgehead Altar' }
  },

  npcs: {
    npc_smith:      { name: 'Li, the Blind Bell-Smith', shortName: 'Bell-Smith Li' },
    npc_chronicler: { name: 'Mochen, Wandering Chronicler', shortName: 'Chronicler Mochen' },
    npc_keeper:     { name: 'Xi, Keeper of the Old Vow', shortName: 'Keeper Xi' },
    npc_scavenger:  { name: 'Ashbud, Blind Scavenger Child', shortName: 'Scavenger Ashbud' }
  },

  tablets: {
    lore_corridor: {
      title: 'Weathered Stele',
      sub: 'Corridor of Withered Bones · High Ledge Inscription',
      html: '“In ages past, no night fell upon the Dim Abyss; with every toll of the Great Bronze Bell, the ink-blight receded three leagues.<br>Until the Oath-Keeper severed the bell-cord by his own hand—choosing eternal silence for the sacred city over hearing the echo beneath the earth once more.<br><br>Lantern-bearing puppet, should you hear the dragging blade deep within the Chapel, remember:<br><strong>Golden flashes may be parried aside; crimson perils must be passed in ink-shadow. Only by shattering his posture shall the fractured vow end.</strong>”'
    },
    lore_well: {
      title: "Bell-Smith's Legacy Stele",
      sub: 'Abyssal Bell Well · Eastern Belfry',
      html: '“The Bell-Guard Ironclad bears a bronze tower shield that turns aside ordinary strikes.<br>Only an <strong>Iai Flash, heavy third cleave, Resonant Blade, or Perfect Parry</strong> can crack its guard.<br><br>Deep along the sunless river at the well’s floor lies the lost art of <strong>Ink-Wing Stride</strong>. Once mastered, warp back to the starting cloister—<br><strong>the Skyward Bell Loft hangs high above the first lantern, where the Ancient Bell Core still hums.</strong>”'
    },
    lore_void_barrier: {
      title: 'Notes on the Ink-Blight Barrier',
      sub: 'Abyssal Bell Well · Sunken Alcove',
      html: '“The Ink-Blight Barrier is a veil of abyssal ink spilled when the First Bell cracked; neither iron blade nor soulfire can cleave it.<br>Only by learning <strong>Shadow Phase</strong> in the <strong>Crypt of Shards</strong>—turning one’s own form to ink—can one step into the sealed vaults beyond.<br><br>At the bottom of the tablet, a hurried line is scratched:<br><strong>‘Forget not the depths of the Abyssal Bell Foundry—the Heart of the First Bell still waits in darkness for its final toll.’</strong>”'
    },
    lore_crypt: {
      title: "Bell-Smith's Secret Ledger",
      sub: 'Crypt of Shards · Vault Stele',
      html: '“Years ago I sealed my unfinished bronze echoes inside this crypt, and carved a one-way shaft up to the Chapel forecourt for the day the Oath-Keeper lost his mind.<br>Now the vaults are overrun by <strong>Bell-Tolling Priests</strong> and <strong>Oathbreaker Duelists</strong>.<br><br>Climb the western hidden shaft to surface right beside the <strong>Severed-Cord Altar</strong>; bring the vault’s echoes back to my anvil at the sanctuary, and I shall temper three inches of keener steel for you!”'
    },
    lore_ascent: {
      title: 'True Chronicle of the First Bell',
      sub: 'Spire of the First Bell · Gate of the Final Vow',
      html: '“The first Oath-Keeper never betrayed the sacred city—when he learned each toll of the First Bell burned the soulfire of countless slumbering dead beneath the stone as kindling, he severed the bell-cord himself.<br>Yet the Relic of the First Bell still tolls on its own within the eastern Heart, summoning lantern-bearing puppets generation after generation to feed its flame.<br><br>Once you enter the eastern hall and fell <strong>Yuan, Relic of the First Bell</strong>, the final choice awaits:<br><strong>Renew the Endless Toll</strong>, binding yourself to the eternal night—or bear the <strong>First Seal of Dawn</strong> hidden behind the ink-blight barrier below, and cleave the First Bell in two so morning may break over the Dim Abyss.”'
    },
    lore_wind: {
      title: 'Gale-Spire Inscription',
      sub: 'Gale-Shattered Spire · Central Ledge',
      html: '“Seven wind towers once stood above the foundry, drawing roaring gales to disperse molten bronze fumes and linking the Bell Well to the Spire Ascent.<br>Though the tower snapped when the First Bell cracked, eternal <strong>rising updrafts</strong> still bear any lantern-bearer aloft.<br><br>Ride the gusts eastward to reach the <strong>upper Spire Ascent</strong> directly—and seek the wind-purified core sealed at the tower’s crest.”'
    },
    lore_forest: {
      title: 'Root-Cavern Chronicle',
      sub: 'Withered Ink Woods · Great Tree Stele',
      html: '“The sacred city was built atop a thousand-fathom ancient forest. Though ink-blight drowned the roots, luminous <strong>spore bounce-caps</strong> still breathe faint spirit-qi to launch wanderers skyward.<br><br>Sever the tangled root barrier atop the western shaft to climb straight back into the <strong>Extinguished Altar Sanctuary</strong>—Bell-Smith Li’s anvil lies right overhead.”'
    },
    lore_mountain: {
      title: 'Frost-Bone Blade Epitaph',
      sub: 'Frost-Bone Ridge · High Blade Mound',
      html: '“Beneath the Heart of the First Bell, permafrost buries over a hundred lantern-bearers who fell short of silencing the final bell.<br>With their dying breath they drove their broken steel into the frozen ridge, raising a silent <strong>Snowbound Blade Mound</strong> for whoever comes next.<br><br>If you have gathered the <strong>Broken Blade, Abyssal Bell-Maul, and Soul-Calling Bell Staff</strong>, ascend the eastern cliff and claim the Frost-Bone Crystal!”'
    },
    lore_wind_furnace: {
      title: 'Broken-Bridge Wind Stele',
      sub: 'Gale-Shattered Spire · Thousand-Bell Bridge',
      html: '“The Abyssal Foundry below never cools; searing furnace air surges through the iron grates beneath us, driving eternal gales up all seven wind towers.<br>Seeing the Heart corrupted, Warden Shuo severed this span himself to bar all who ride the wind.<br><br>Beyond the summit bridge lies <strong>Frost-Bone Ridge</strong>—<br><strong>where furnace heat melts ancient snow into the cold ink-rain that feeds the Abyssal River below.</strong>”'
    },
    lore_woods_seepage: {
      title: 'Deserter’s Spore-Carved Stele',
      sub: 'Withered Ink Woods · Seepage Pool Bridge',
      html: '“The night the Chapel bell fell silent, we tunneled west from the Crypt—only to find ink-black river water seeping through the bedrock, turning this cavern into a glowing fungal grove.<br>Ash washed down from the cloister fed the tangled roots and birthed bouncing spore-caps.<br><br>Venture no further west into the <strong>Hollow Bell-Tree</strong>—<br><strong>the fallen bronze temple bell has been swallowed whole by the ancient treant within.</strong>”'
    },
    lore_frost_snowmelt: {
      title: 'Epitaph of the Frozen Keepers',
      sub: 'Frost-Bone Ridge · Frozen Sword Steps',
      html: '“The old Lantern Keepers once stood vigil atop these peaks to freeze the cracked First Bell shut; yet heat rising from the western Gale Spire melted the summit snows into endless <strong>ashen rain</strong>.<br>The meltwater cascades down these cliffs, washes the cloister, and seeps into the sunken woods.<br><br>Climb past our sword-mounds to the peak: <strong>Frost-Marquis Lin</strong> guards the western sky-bridge linking directly to the <strong>Gale Spire Summit</strong>.”'
    },
    lore_cistern_west: {
      title: 'Inscription of Failed Castings',
      sub: 'Sunken Bell Cistern · Seeping Cell Gallery',
      html: '“Every bronze bell cast with a flawed ring was cast down into this flooded cistern, forbidden to see the pale moon.<br>As abyssal ink seeped through the stone, the jailers became <strong>Drowned Bell-Lurkers</strong> and hulking <strong>Rusted Anchor-Wardens</strong>.<br><br>Remember: their strikes drench you in conductive ink—<strong>cast Requiem Chime while drenched to unleash amplified shockwaves!</strong>”'
    },
    lore_cistern_nave: {
      title: 'Chronicle of the Great Sluice',
      sub: 'Sunken Bell Cistern · Drowned Bell Nave',
      html: '“Long ago the Bell-Founder forged a bronze sluice wheel at the very floor of the <strong>Abyssal Bell Well</strong> to drain overflow away from the furnace.<br>Should any lantern-bearer turn that wheel again, the subterranean rivers shall recede across the realm—<br><br>exposing the sunken <strong>Ebbed Oil Core</strong> in this nave, and the ancient <strong>Ebbed Tide-Bell Seal</strong> resting beneath the eastern Sluice Lock.”'
    },
    lore_cistern_lock: {
      title: 'Stele of the Broken Lock',
      sub: 'Sunken Bell Cistern · Broken Sluice Lock',
      html: '“East of this lock lies the <strong>Frost-Seep River Source</strong>, where glacial snowmelt from Frost-Bone Ridge enters the subterranean loop.<br>Whoever attunes the <strong>Ebbed Tide-Bell Seal</strong> alongside the <strong>Resonant Clapper</strong> shall summon <strong>Abyssal Tide-Resonance</strong> even on dry stone—unleashing twin tidal waves that shatter every shield.”'
    }
  },

  pickups: {
    pickup_relic_bell: {
      name: 'Hidden Relic · Phantom-Thread Bell',
      desc: 'Unlocked! Attune it at any Altar.'
    },
    pickup_relic_core: {
      name: 'Skyward Relic · Ancient Bell Core',
      desc: 'Max Ink Seals +1, Parry heals Vitality, Iai & Riposte DMG +25%!'
    },
    pickup_relic_shade: {
      name: 'Vault Relic · Shroud of the Bell',
      desc: 'Unlocks Shadow Phase relic “Shroud of the Bell” for Altar attunement!'
    },
    pickup_flask_core: {
      name: 'Lantern Oil Wick',
      desc: 'Max Lantern Oil permanently +1!'
    },
    pickup_relic_clapper: {
      name: 'Resonant Relic · Echoing Clapper',
      desc: 'Unlocks spell relic “Echoing Clapper” and Max Soulfire +20!'
    },
    pickup_core_corridor: {
      name: 'Chapel Vault · Bell Soul-Crystal',
      desc: 'Max Vitality +20, Max Soulfire +25, and +70 Echoes!'
    },
    pickup_flask_core_well: {
      name: 'Deep-Well Oil Wick',
      desc: 'Max Lantern Oil permanently +1!'
    },
    pickup_ink_wings: {
      name: 'Art · Ink-Wing Stride',
      desc: 'Double jump unlocked! Press Space mid-air to soar and reach the Skyward Bell Loft.'
    },
    pickup_relic_ironheart: {
      name: 'Well Relic · Sundered Ironheart',
      desc: 'Unlocks posture-break relic “Sundered Ironheart” and Max Vitality +15!'
    },
    pickup_flask_abyss: {
      name: 'Abyssal Alcove · Sacred Oil Wick',
      desc: 'Max Lantern Oil +1, Vitality +15, and +90 Echoes!'
    },
    pickup_echo_crypt: {
      name: 'Vault Ancient Echo Coffer',
      desc: 'Grants abundant Echoes—return to Bell-Smith Li to temper your blade!'
    },
    pickup_weapon_bell: {
      name: 'Weapon · Soul-Calling Bell Staff',
      desc: 'Unlocked mid-range caster weapon! Fire piercing harmonic rings & 3-dart homing volleys; swap anytime with [3] or [X].'
    },
    pickup_shade_dash: {
      name: 'Art · Shadow Phase',
      desc: 'Dash evolved! Phase through Ink-Blight Barriers & foes to trigger Shadow Burst!'
    },
    pickup_dawn_sigil: {
      name: 'True Relic · First Seal of Dawn',
      desc: 'Slay Yuan while holding this seal to unlock True Ending “Dawn Over the Silenced Bell” (+15 Vit / +20 Soul).'
    },
    pickup_echo_ascent: {
      name: 'Spire Ancient Echo Coffer',
      desc: 'Grants +130 Echoes—return to the anvil for tempering or Relic Refinement!'
    },
    pickup_core_wind: {
      name: 'Spire Crest · Gale Soul Core',
      desc: 'Max Vitality +15, Max Soulfire +20, and +220 Echoes!'
    },
    pickup_echo_wind: {
      name: 'Gale-Spire Echo Coffer',
      desc: 'Grants +80 Echoes for tempering at the anvil!'
    },
    pickup_core_forest: {
      name: 'Ancient Woods · Luminous Spore Fruit',
      desc: 'Max Vitality +20, Max Soulfire +20, and +260 Echoes!'
    },
    pickup_echo_forest: {
      name: 'Root-Cavern Echo Coffer',
      desc: 'Recovered +85 Echoes behind the Ink-Blight Barrier!'
    },
    pickup_core_mountain: {
      name: 'Blade Mound · Frost-Bone Soul Crystal',
      desc: 'Max Vitality +25, Max Soulfire +25, and +360 Echoes!'
    },
    pickup_echo_mountain: {
      name: 'Frost-Cliff Echo Coffer',
      desc: 'Grants +105 Echoes for blade tempering!'
    },
    pickup_echo_wind_top: {
      name: 'Thermal-Draft Echo Seal',
      desc: 'Grants +90 molten-draft Echoes!'
    },
    pickup_echo_wind_bridge: {
      name: 'Thousand-Bell Bridge Echoes',
      desc: 'Grants +115 Echoes from the high wind bridge!'
    },
    pickup_echo_woods_canopy: {
      name: 'Canopy Spore Echoes',
      desc: 'Grants +95 Echoes from the glowing canopy!'
    },
    pickup_echo_woods_deep: {
      name: 'Seepage Pool Bell Echoes',
      desc: 'Grants +115 Echoes from the sunken seepage bridge!'
    },
    pickup_echo_frost_tomb: {
      name: 'Frozen Sword-Mound Echoes',
      desc: 'Grants +130 Echoes from the Keepers’ blade steps!'
    },
    pickup_seal_wind: {
      name: 'Gale Realm Seal · Gale Bell-Plume',
      desc: 'Unsealed upon defeating Shuo! Grants the Gale Realm Seal & Gale Bell-Plume relic.'
    },
    pickup_seal_forest: {
      name: 'Woods Realm Seal · Spore-Root Seal',
      desc: 'Unsealed upon defeating Ku! Grants the Woods Realm Seal & Spore-Root Seal relic.'
    },
    pickup_seal_mountain: {
      name: 'Frost Realm Seal · Frost-Ridge Shard',
      desc: 'Unsealed upon defeating Lin! Grants the Frost Realm Seal & Frost-Ridge Shard relic.'
    },
    pickup_bell_dive: { name: 'Art · Bell Dive', desc: 'Mid-air [S+Spell] invincible bronze-bell plunge that shatters glowing cracked floors & brittle ice!' },
    pickup_sunken_well: { name: 'Riverbed Core · Ebbed Soul Crystal', desc: 'Revealed after draining the Abyssal River (+10 Vitality · +15 Soulfire · +60 Echoes).' },
    pickup_sunken_woods: { name: 'Seepage Core · Dry Spore Marrow', desc: 'Revealed at the drained cavern pool (+15 Vitality · +10 Soulfire · +60 Echoes).' },
    pickup_frost_vault_core: { name: 'Glacial Vault · Frost-Heart Core', desc: 'Uncovered via Bell Dive beneath brittle ice (+15 Vitality · +15 Soulfire · +80 Echoes).' },
    pickup_echo_rain_steps: { name: 'Rain-Step Echoes', desc: 'Recovered +75 Echoes beneath the outer cloister eaves.' },
    pickup_core_belfry: { name: 'Belfry Core · Severed Crystal', desc: 'Max Vitality +15 · Max Soulfire +10 · +55 Echoes.' },
    pickup_echo_galleries: { name: 'Bell-Gallery Echoes', desc: 'Recovered +85 Echoes among the suspended chains.' },
    pickup_flask_cistern: { name: 'Drowned Wick · Ebbed Oil Core', desc: 'Uncovered after draining the cistern (+1 Max Lantern Oil · +75 Echoes).' },
    pickup_echo_cistern_lock: { name: 'Sluice-Lock Echoes', desc: 'Recovered +110 Echoes atop the bronze lock beams.' },
    pickup_echo_frost_seep: { name: 'Frost-Seep Echoes', desc: 'Recovered +120 pure Echoes at the frozen river source.' },
    pickup_zhu_crown: { name: 'First-Forged Crown · Twin-Mask', desc: 'Unsealed upon defeating Zhu! Vitality +25 · Soulfire +25 · +150 Echoes.' },
    pickup_grapple_hook: { name: 'Art · Silk Grapple', desc: 'Unsealed upon defeating Hui! Press [F/Mid-Click/I] to swing across bronze anchors & snap-cut foes.' },
    pickup_relic_tidebell: { name: 'Hidden Relic · Ebbed Tide-Bell Seal', desc: 'Exposed after draining the Abyssal Sluice! +18% Spell radius; once drained, +16% Spell DMG & -4 cost.' }
  },

  puzzles: {
    puzzle_corridor: 'Bone Corridor · Three-Bell Resonance',
    puzzle_well: 'Abyssal Belfry · Three-Bell Resonance',
    puzzle_forest: 'Withered Ink Woods · Three-Bell Resonance'
  },

  inscriptions: {
    '「苍穹残钟阁 · 非墨翼不可及」': '“Skyward Bell Loft · Only Ink-Wing Stride Can Reach”',
    '「盲眼老铸钟匠 · 以残响淬炼断刃」': '“Blind Bell-Smith Li · Temper Your Blade with Echoes”',
    '「暗蚀结界 · 非幽影穿身不可渡」': '“Ink-Blight Barrier · Only Shadow Phase Can Cross”',
    '「青铜锁链闸 · 须自东侧残碑台启锁」': '“Bronze Chain Gate · Unlatch from the Eastern Stele Ledge”',
    '「高台钟龛藏有灯油残芯」': '“A Lantern Oil Wick Rests in the High Bell Niche”',
    '「礼拜堂暗阁 · 需幽影穿身」': '“Chapel Secret Vault · Requires Shadow Phase”',
    '「沉渊钟井 · 循井壁与钩环深潜」': '“Abyssal Bell Well · Descend via Walls & Grapple Rings”',
    '「重盾铁卫 · 居合 / 灵刃 / 弹反可破盾」': '“Shielded Ironclad · Break Guard with Iai / Blade / Parry”',
    '「青铜钟摆 · 可闪避、下劈或精准弹反」': '“Bronze Pendulums · Evade, Pogo-Slash, or Perfect Parry”',
    '「墨蚀暗河 · 须借石台与悬灯渡越」': '“Corrosive Ink River · Cross via Ledges & Hanging Lanterns”',
    '「井底暗河尽头 · 封存墨翼神龛」': '“End of the Sunless River · Shrine of Ink-Wing Stride”',
    '「习得墨翼步 · 东侧铸钟殿封门自启」': '“Master Ink-Wing Stride · The Eastern Foundry Gate Will Open”',
    '「西壁墨隙 · 疑通残钟地窖」': '“Western Ink Fissure · Leads Toward the Crypt of Shards”',
    '「沉渊秘龛 · 需幽影穿身」': '“Abyssal Alcove · Requires Shadow Phase”',
    '「沉渊铸钟殿 · 借墨翼与钩环迎战铸钟师」': '“Abyssal Bell Foundry · Use Ink-Wings & Rings Against the Founder”',
    '「斩落铸钟师 · 东门直通初钟圣阶 →」': '“Fell the Bell-Founder · East Gate Opens to the Spire →”',
    '「残钟地窖 · 谨防穹顶倒挂墨蛭」': '“Crypt of Shards · Beware Ink-Leeches Clinging Overhead”',
    '「先以幽丝钩断高台祭司 · 再与武者打铁决胜」': '“Grapple the High-Ledge Priest First · Then Duel the Blade-Master”',
    '「暗梯直通礼拜堂前 · 断索祭坛 ↑」': '“Hidden Shaft Up to the Chapel · Severed-Cord Altar ↑”',
    '「习得幽影穿身 · Shift 穿破下方暗蚀结界」': '“Shadow Phase Learned · Dash Through the Barrier Below”',
    '「初钟圣阶 · 沿东侧天梯登临圣心」': '“Ascent of the First Bell · Climb East Toward the Heart”',
    '「破晓密室 · 幽影穿身可取真结局之印」': '“Chamber of Dawn · Phase Through to Claim the True Ending Seal”',
    '「前方 · 初钟圣心 · 最终决战 →」': '“Ahead · Heart of the First Bell · The Final Vigil →”',
    '「东壁风隙 · 疑通绝风断塔 →」': '“Eastern Wind Fissure · Leads Toward Gale-Shattered Spire →”',
    '「← 西入幽林 · 枯墨古林根窟」': '“← West Into Withered Ink Woods · Root Caverns”',
    '「寒霜暗壁 · 破冰踏入霜骸圣脊 →」': '“Frosted Secret Wall · Break Through to Frost-Bone Ridge →”',
    '「绝风断塔 · 踏入青白罡风即可御风浮升」': '“Gale-Shattered Spire · Ride Azure Updrafts Aloft”',
    '「东出断塔 · 直抵初钟圣阶上层捷径 →」': '“East Exit · High Shortcut to Upper Spire Ascent →”',
    '「枯墨古林 · 踩踏荧光孢伞可借势腾跃」': '“Withered Ink Woods · Bounce Off Luminous Spore Caps”',
    '「斩断上方枯根封壁 · 直返起点熄灯祭坛 ↑」': '“Sever Overhead Root Seal · Direct Shortcut to Sanctuary ↑”',
    '「霜骸圣脊 · 逆风寒崖，钟锤与摇铃可破严阵」': '“Frost-Bone Ridge · Howling Cliff—Bell-Maul & Staff Shine Here”',
    '「风雪残刃冢 · 历代提灯者折戟之所」': '“Snowbound Blade Mound · Resting Place of Fallen Keepers”',
    '脚下铁栅连通沉渊古炉 — 千年熔金热浪化作永续罡风，乘风直上可抵「千铃悬桥」': '“Iron grates below vent the Abyssal Foundry—ride the eternal thermal gale up to Thousand-Bell Bridge”',
    '东侧深根裂隙通往「盘根溶洞」— 沉渊暗河之水由此西渗滋养古林': '“Eastern root chasm leads to Root-Tangled Cavern—seeping river water feeds these ancient woods”',
    '东行攀登「冻剑冢」直上雪巅 — 峰顶融雪顺岩缝化为墨雨倾泻全境': '“Climb east through Frozen Blade Mound to the peak—melting snow pours down as ink-rain”',
    '东行踏入「断塔绝顶」— 截风巡塔使 · 朔仍在云海守誓': '“East lies Cloud-Sea Summit—Shuo, Gale Spire Warden still keeps his vigil”',
    '高空断桥直通「霜骸圣脊 · 绝脊霜台」': '“High sky-bridge links directly to Frost-Bone Ridge · Glacial Peak”',
    '西行步入「古钟树窟」— 破除盘根树铠后可由西侧孢伞直冲回廊': '“West enters Hollow Bell-Tree—bounce up the western spore-caps to return to the cloister”',
    '踏荧光巨孢伞连跃而上，可直返上层古林与起点圣所捷径': '“Bounce up the glowing spore-caps to ascend straight back to the upper woods and Sanctuary shortcut”',
    '西登「绝脊霜台」迎战断剑霜侯·凛 — 越过霜台即可高空连通绝风断塔': '“Ascend west to Glacial Peak to face Lin, Frost-Marquis—beyond lies the sky-link to Gale Spire”',
    '西越冰风断桥即达「绝风断塔 · 断塔绝顶」': '“Cross the icy wind-bridge west to reach Gale Spire · Cloud-Sea Summit”',
    '「裂石薄层 · 需以「镇岳下砸」垂直震破」': '“Glowing cracked slab · shatter with mid-air [S+Spell] Bell Dive”',
    '「暗河泄洪闸 · 启闸可排干全境墨渊暗河」': '“Abyssal Sluice Wheel · turn to drain ink rivers realm-wide”',
    '「换向风铃 · 击鸣可反转双井罡风侧向气流」': '“Wind Vane · strike to reverse dual-shaft crosswinds”',
    '「休眠巨孢 · 以「镇魂钟鸣」或引魂摇铃唤醒」': '“Dormant Giant Cap · awaken with Requiem Chime or Bell Staff”',
    '「悬冰巨棱 · 击落可砸敌并冻成冰桥」': '“Hanging Icicle · strike down to crush foes & freeze a bridge”',
    '「集齐三境铭印且斩落初钟圣骸 · 镜渊金风将贯通天穹」': '“Gather all Three Realm Seals & fell Yuan—a golden gale will ascend to the Mirror Abyss”',
    '「西行可达断索钟楼外廊 · 绕回熄灯祭坛穹顶」': '“Head west to the Outer Belfry · loops back above the Extinguished Altar”',
    '「击碎脚下封板 · 贯通回起点熄灯祭坛高阁」': '“Break the floor seal below · shortcut straight back to the Sanctuary loft”',
    '「东侧暗墙之后直通绝风断桥 · 无需绕行古炉」': '“Beyond the east secret wall lies the Thousand-Bell Wind Bridge”',
    '「沉钟水牢 · 昔日铸钟败品皆沉没于此渊底」': '“Sunken Bell Cistern · where failed bronze castings lie drowned”',
    '「若启钟井暗河泄洪闸 · 巨厅深池将现古灯残芯」': '“Turn the Abyssal Sluice in the Well to expose a sunken Oil Core below”',
    '「东行步入霜渊冰窖 · 暗河融雪之源」': '“Continue east to the Frost-Seep Source · origin of the subterranean rivers”',
    '「寒流风井直通霜骸圣脊 · 地下大环路至此闭环」': '“This freezing updraft ascends to Frost Ridge · completing the subterranean loop”',
    '「黑曜镜水之上 · 初铸残影静候三刃真主」': '“Upon obsidian mirror waters · Zhu awaits the Master of Three Arms”',
    '「断钟骑士遗留的幽丝残环 · 破敌后可习得飞索绝技」': '“A severed silk-ring left by Hui · defeat the knight to claim Silk Grapple”',
    '「启闸开启青铜活板 · 永久贯通回起点熄灯祭坛」': '“Pull lever to open the bronze hatch · permanent shortcut back to Sanctuary”',
    '「启闸开启古根活板 · 直通起点熄灯祭坛」': '“Pull lever to open the root hatch · links straight up to Sanctuary”',
    '「启闸开启绝风铁闸 · 贯通初钟圣阶与绝风断塔」': '“Pull lever to unseal the western iron gate · connects Ascent & Gale Spire”',
    '「启闸开启西侧铁闸 · 贯通回沉渊钟井上层」': '“Pull lever to open the western shortcut back to Upper Bell Well”',
    '「东侧绝风铁闸须自千铃断桥一侧启闸贯通」': '“East iron gate is sealed from the Thousand-Bell Bridge side”',
    '「启闸开启西侧水牢铁闸 · 贯通回枯墨古林深窟」': '“Pull lever to open the western lock · links Cistern back to Ink Woods”',
    '「启闸开启地窖活板 · 永久贯通回礼拜堂前祭坛」': '“Pull lever to open the crypt hatch · permanent shortcut up to Chapel Forecourt”'
  },

  biomes: {
    sanctuary: 'Cold Sanctuary Wind · Distant Bell',
    corridor:  'Ink-Rain Corridor · Dripping Eaves',
    chapel:    'Broken Chapel · Hollow Choir Drone',
    bell_well: 'Abyssal Well · Subterranean River Mist',
    foundry:   'Abyssal Foundry · Molten Furnace Roar',
    crypt:     'Crypt of Shards · Dripping Ink Vaults',
    ascent:    'First Bell Ascent · Gale & Rising Embers',
    heart:     'Heart of the First Bell · Sacred Resonance',
    wind:      'Gale-Shattered Spire · Howling Drafts',
    forest:    'Withered Ink Woods · Whispering Roots',
    mountain:  'Frost-Bone Ridge · Howling Blizzard'
  },

  roomThemes: {
    sanctuary: 'Cold Extinguished Sanctuary',
    corridor:  'Ink-Rain Cloister',
    chapel:    'Crimson-Ash Chapel',
    bell_well: 'Abyssal Tide Mist',
    foundry:   'Molten Bronze Furnace',
    crypt:     'Ink-Candle Crypt',
    ascent:    'First Bell Ascent',
    heart:     'Heart of the First Bell',
    wind:      'Gale-Shattered Spire',
    forest:    'Withered Ink Woods',
    mountain:  'Frost-Bone Ridge',
    cistern:   'Sunken Bell Cistern'
  }
};
