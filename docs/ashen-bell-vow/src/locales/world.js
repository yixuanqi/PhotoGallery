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
    '残钟地窖': 'Crypt of Shards'
  },

  rooms: {
    r01_sanctuary: { zoneName: 'Sunken Bell Cloister', name: 'Extinguished Altar' },
    r02_corridor:  { zoneName: 'Sunken Bell Cloister', name: 'Corridor of Withered Bones' },
    r03_chapel:    { zoneName: 'Sunken Bell Cloister', name: 'Chapel of the Broken Bell' },
    r04_bell_well: { zoneName: 'Abyssal Bell Well',    name: 'Abyssal Bell Well' },
    r05_foundry:   { zoneName: 'Abyssal Bell Well',    name: 'Abyssal Bell Foundry' },
    r06_crypt:     { zoneName: 'Sunken Bell Cloister', name: 'Crypt of Shards' },
    r07_ascent:    { zoneName: 'Spire of the First Bell', name: 'Ascent of the First Bell' },
    r08_heart:     { zoneName: 'Spire of the First Bell', name: 'Heart of the First Bell' }
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
    '初钟圣顶 · 初钟圣心': 'Spire of the First Bell · Heart of the First Bell'
  },

  altars: {
    altar_start:  { name: 'Sunken Bell Cloister · Extinguished Altar', shortName: 'Sanctuary · Extinguished Altar' },
    altar_chapel: { name: 'Chapel Forecourt · Severed-Cord Altar', shortName: 'Chapel · Severed-Cord Altar' },
    altar_well:   { name: 'Abyssal Bell Well · Suspended Well Altar', shortName: 'Well · Suspended Altar' },
    altar_ascent: { name: 'Spire of the First Bell · Base Altar', shortName: 'Ascent · Base Altar' },
    altar_summit: { name: 'Spire of the First Bell · Final Vow Altar', shortName: 'Spire · Final Vow Altar' }
  },

  npcs: {
    npc_smith:      { name: 'Li, the Blind Bell-Smith', shortName: 'Bell-Smith Li' },
    npc_chronicler: { name: 'Mochen, Wandering Chronicler', shortName: 'Chronicler Mochen' },
    npc_keeper:     { name: 'Xi, Keeper of the Old Vow', shortName: 'Keeper Xi' }
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
      desc: 'Max Vitality +20, Max Soulfire +25, and +120 Echoes!'
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
      desc: 'Max Lantern Oil +1, Vitality +15, and +160 Echoes!'
    },
    pickup_echo_crypt: {
      name: 'Vault Ancient Echo Coffer',
      desc: 'Grants abundant Echoes—return to Bell-Smith Li to temper your blade!'
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
      desc: 'Grants +260 Echoes—return to the anvil for final tempering!'
    }
  },

  puzzles: {
    puzzle_corridor: 'Bone Corridor · Three-Bell Resonance',
    puzzle_well: 'Abyssal Belfry · Three-Bell Resonance'
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
    '「前方 · 初钟圣心 · 最终决战 →」': '“Ahead · Heart of the First Bell · The Final Vigil →”'
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
    mountain:  'Frost-Bone Ridge'
  }
};
