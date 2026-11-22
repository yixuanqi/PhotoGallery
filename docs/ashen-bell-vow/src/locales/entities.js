// Relics, Synergies, Smith Upgrades, Bell-Vows, Sparring Modes, Bestiary, Achievements & Bosses (en-US)

export const ENTITIES_EN = {
  relics: {
    thorn: {
      name: 'Pain-Drinker Thorn',
      tag: 'Rally Leech',
      effect: '2x Gray-HP Window · Strike Rally +65%',
      usage: 'After blocking chip damage, slash right back to reclaim Vitality.',
      desc: 'Doubles gray-HP duration; slashes strongly restore lost Vitality.'
    },
    mirror: {
      name: 'Shattered Mirror Eye',
      tag: 'Master Parry',
      effect: 'Parry Posture ×1.6 + 16 Reflect DMG (100ms window)',
      usage: 'Deflect golden glints with razor precision to shatter boss posture.',
      desc: 'Tightens parry window to 100ms; perfect parries reflect damage & deal 1.6x posture.'
    },
    ember: {
      name: 'Lone Lantern Ember',
      tag: 'Riposte Sustain',
      effect: 'Execution heals 35% + Full Soulfire (Oil -1)',
      usage: 'Break enemy posture and execute to sustain endless combat.',
      desc: '-1 Lantern Oil; executions restore 35% Vitality and refill Soulfire.'
    },
    bellthread: {
      name: 'Phantom-Thread Bell',
      tag: 'Grapple & Blade',
      effect: 'Grapple Recovery Halved · Resonant Blade Costs 22 Soul',
      usage: 'Chain rapid grapples with ranged Resonant Blades to crush posture.',
      hint: 'High northwest of Sanctuary · Grapple up & break the secret wall',
      desc: '0.28s grapple recovery; Resonant Blade costs 22 Soul and deals bonus posture.'
    },
    bellcore: {
      name: 'Ancient Bell Core',
      tag: 'Apex Clash',
      effect: 'Max Seals 4 · Parry Heals 6 · Iai / Riposte +25%',
      usage: 'Follow parries with Riposte or Iai Flash, then detonate 4 Ink Seals.',
      hint: 'Skyward Bell Loft above Sanctuary · Requires Ink-Wing Stride',
      desc: 'Max Ink Seals 4, perfect parry heals 6 Vitality, +25% Iai & Riposte DMG.'
    },
    clapper: {
      name: 'Echoing Clapper',
      tag: 'Soul Resonance',
      effect: 'Soul Gain +35% · Spell DMG +30% / AoE +25%',
      usage: 'Cast W+Spell “Requiem Chime” to shatter shields & clear rooms.',
      hint: 'Corridor of Withered Bones · Ring all 3 bronze resonance bells in time',
      desc: '+35% Soulfire gain; +30% spell damage and +25% blast radius.'
    },
    ironheart: {
      name: 'Sundered Ironheart',
      tag: 'Swift Iai',
      effect: 'All Posture DMG +25% · Iai Charge Cut to 0.30s',
      usage: 'Hold Attack for rapid Iai Flash to cleave straight through heavy shields.',
      hint: 'Upper Abyssal Bell Well · Ring all 3 bronze resonance bells in time',
      desc: '+25% posture damage across all moves; Iai Flash charges in 0.30s.'
    },
    shadecurtain: {
      name: 'Shroud of the Bell',
      tag: 'Shadow Strike',
      effect: 'Phase Recovery 0.95s · Burst +55% · Pass-Through Heals 8',
      usage: 'Dash through foes to detonate Shadow Burst and reset dash.',
      hint: 'Behind western Ink-Blight Barrier in Sanctuary · Requires Shadow Phase',
      desc: '0.95s Shadow Phase recovery, +55% Shadow Burst DMG, heals 8 & resets dash on pass.'
    }
  },

  synergies: {
    grapple_quake: {
      name: 'Phantom Resonance',
      desc: 'Grappling into a foe triggers a free “Requiem Chime” burst, shattering shields and ringing nearby bells & lanterns.'
    },
    mirror_ember: {
      name: 'Mirror-Cinder Seal',
      desc: 'After 3 consecutive Perfect Parries, your next melee hit plants a free detonating Ink Seal talisman.'
    },
    blood_iai: {
      name: 'Crimson-Iron Iai',
      desc: 'While holding Gray HP, Iai Flash charges 28% faster, unleashes a piercing Crimson Wave, and strongly rallies Vitality.'
    },
    core_counter: {
      name: 'Heart-Shatter Toll',
      desc: 'Bell-Breaker Riposte deals 1.5x posture and instantly detonates stuck Ink Seals for 1.35x burst damage.'
    },
    shade_thread: {
      name: 'Umbral Severance',
      desc: 'Shadow Phasing through a foe resets Grapple recovery; your next grapple strike within 2.2s deals 2x posture & bonus Soulfire.'
    }
  },

  smithUpgrades: {
    blade: {
      name: 'Temper Broken Blade',
      desc: 'Permanently boosts melee blade damage by +14% per rank and sharpens its cold gleam.',
      bonus: (lv) => `Melee DMG +${lv * 14}%`
    },
    posture: {
      name: 'Reforge Bell-Weight',
      desc: 'Permanently boosts posture damage of all strikes & parries by +12% per rank.',
      bonus: (lv) => `Posture DMG +${lv * 12}%`
    },
    forge: {
      name: 'Kindle Soul Furnace',
      desc: 'Permanently increases Max Vitality by +15 and Max Soulfire by +15 per rank.',
      bonus: (lv) => `Vit/Soul +${lv * 15}`
    }
  },

  vows: {
    noFlasks: {
      name: 'Vow of Dry Oil',
      short: 'No Oil',
      desc: 'Seals all Lantern Oil flasks (max locked to 0); sustain only via rally & executions · Echoes +25%'
    },
    doubleDmg: {
      name: 'Vow of Brittle Bone',
      short: 'Brittle',
      desc: 'All enemy and boss damage taken is raised to 180% · Echoes +30%'
    },
    noGrayBlock: {
      name: 'Vow of Flawless Steel',
      short: 'Flawless',
      desc: 'Imperfect blocks no longer leave recoverable Gray HP—they deal 75% real chip damage · Echoes +30%'
    },
    fierceFoes: {
      name: 'Vow of Frenzied Chimes',
      short: 'Frenzied',
      desc: 'Foes & bosses gain +30% posture and 18% faster recovery & pressure · Echoes +25%'
    }
  },

  dummyModes: {
    cycle:     { label: 'Full Drill Cycle', tip: 'Cycles: Golden Slash → Fast-Delayed Combo → Crimson Peril → Heavy Shield' },
    parryOnly: { label: 'Parry Practice', tip: 'Repeats golden single slash & fast-delayed combo for parry & riposte drills' },
    redOnly:   { label: 'Peril Evade Drill', tip: 'Repeats crimson peril lunges to practice Shadow Dash evasion' },
    dormant:   { label: 'Still Target', tip: 'Stands still to test relic synergies, Iai Flash, and spell combos' }
  },

  mapPins: {
    wall:    { label: 'Wall',    hint: 'Mark breakable ink walls or hidden paths' },
    barrier: { label: 'Barrier', hint: 'Mark Ink-Blight Barriers awaiting Shadow Phase' },
    foe:     { label: 'Foe',     hint: 'Mark fierce foes, bosses, or backtrack targets' }
  },

  bestiary: {
    sentinel: {
      name: 'Spear-Bearing Bone Sentinel',
      title: 'Sunken Bell Cloister · Night-Watch Husk',
      habitat: 'Corridor of Withered Bones · Abyssal Bell Well',
      tactic: 'Parry golden horizontal thrusts into Bell-Breaker Riposte; evade crimson peril lunges with Dash.',
      lore: 'Even long after the lamps went dark, shattered armor still marches to the memory of old tolls.'
    },
    wraith: {
      name: 'Lantern Wraith',
      title: 'Wandering Flame · Soulfire Vessel',
      habitat: 'Bone Corridor · Abyssal Bell Well · First Bell Ascent',
      tactic: 'Perfect-parry its fire orb to deflect it back for lethal damage, or grapple to interrupt its charge.',
      lore: 'Lingering regret of fallen lamp-keepers, drifting beneath high vaults with bleeding brass lanterns.'
    },
    golem: {
      name: 'Bell-Guard Ironclad',
      title: 'Bronze Greatshield Sentinel',
      habitat: 'Abyssal Bell Well · First Bell Ascent',
      tactic: 'Light frontal hits rebound off its tower shield; break guard with Iai Flash, 3rd heavy cleave, spells, or parry.',
      lore: 'A living gate cast by the Bell-Founder from solid bell-bronze; only heavy blows or resonance can crack it.'
    },
    priest: {
      name: 'Bell-Tolling Priest',
      title: 'Chime-Warding Canticle',
      habitat: 'Abyssal Bell Well · Crypt of Shards · First Bell Ascent',
      tactic: 'Grants golden wards to allies while chanting; grapple straight in or cast Resonant Blade to interrupt for 1.5x posture.',
      lore: 'Withered cantor upon the high ledges, shaking a cracked handbell to summon a mercy long dead.'
    },
    duelist: {
      name: 'Oathbreaker Duelist',
      title: 'Twin-Blade Ronin',
      habitat: 'Abyssal Bell Well · Crypt of Shards · First Bell Ascent',
      tactic: 'Signature 3-hit combo follows a “fast–fast–delayed” cadence; chain three perfect parries to shatter its posture.',
      lore: 'Once fought beside the first Oath-Keeper; hollowed of mind, only razor muscle memory remains.'
    },
    leech: {
      name: 'Hanging Ink-Leech',
      title: 'Vault Ceiling Ambusher',
      habitat: 'Bone Corridor · Crypt of Shards · First Bell Ascent',
      tactic: 'Clings under ledges and drops straight down after trembling; intercept with W+Slash up-cut for +45% DMG.',
      lore: 'Soft-bodied fiend born from dripping abyssal ink, lurking in every crevice beyond lantern light.'
    },
    dummy: {
      name: 'Bronze Sparring Automaton',
      title: "Bell-Smith Li's Practice Rig",
      habitat: 'Sanctuary · Extinguished Altar Courtyard',
      tactic: 'Strike to awaken; press [E] to cycle Full / Parry / Peril / Still modes and practice with zero penalty.',
      lore: 'Hand-forged by Blind Bell-Smith Li to hone the blade-heart of every newly awakened lantern-bearer.'
    },
    boss: {
      name: 'Hui, Knight of the Broken Bell',
      title: 'Act I Boss · Silent Oath-Keeper',
      habitat: 'Chapel of the Broken Bell',
      tactic: 'In Phase 2, stay aloft via grapple rings during the Crimson Ink Tide, or strike either hanging lantern to quell it.',
      lore: 'Armored knight standing eternal watch before the chapel gate, sealing the well beneath unbroken silence.'
    },
    boss2: {
      name: 'Ji, Abyssal Bell-Founder',
      title: 'Act II Boss · Chorus of Silenced Bells',
      habitat: 'Abyssal Bell Foundry',
      tactic: 'Use Ink-Wing Stride & ceiling anchors for vertical combat; parry his Shield Charge to shatter it, and strike lanterns to cancel Resonance Nova.',
      lore: 'Ancient founder dwelling at the bottom of the furnace, seeking to recast the voice of the abyss with intruders’ soulfire.'
    },
    boss3: {
      name: 'Yuan, Relic of the First Bell',
      title: 'Final Boss · Primeval Silence',
      habitat: 'Heart of the First Bell',
      tactic: 'A 3-act parry symphony: read the delayed beats in his 3-hit and 5-hit chains, and ring the arena lanterns to break Eclipse Tide.',
      lore: 'A sacred husk condensed from generations of Oath-Keepers’ soulfire—both cage of endless night and final echo of the old vow.'
    }
  },

  achievements: {
    first_parry:         { name: 'First Ring of Steel',   desc: 'Land your first Perfect Parry and hear steel answer bronze.' },
    parry_streak_4:      { name: 'Fourfold Clash',        desc: 'Chain 4 or more Perfect Parries in a single exchange.' },
    first_exec:          { name: 'Vow-Severing Blow',     desc: 'Shatter an enemy’s posture and perform your first monochrome Execution.' },
    boss_hui:            { name: 'Broken Bell Silenced',  desc: 'Fell Hui, Knight of the Broken Bell in the Chapel.' },
    boss_ji:             { name: 'Foundry Extinguished',  desc: 'Fell Ji, Abyssal Bell-Founder in the Abyssal Bell Foundry.' },
    boss_yuan:           { name: 'End of the First Toll', desc: 'Fell the final boss, Yuan, Relic of the First Bell.' },
    all_tablets:         { name: 'Chronicler of the Abyss', desc: 'Find and inspect all 8 weathered steles across the Dim Abyss.' },
    all_relics:          { name: 'Eight Seals Attuned',   desc: 'Discover and unlock all 8 Relics of the Dim Abyss.' },
    synergy_awakened:    { name: 'Twin-Seal Resonance',   desc: 'Attune two paired relics at an Altar to awaken a hidden synergy.' },
    no_hit_echo:         { name: 'Unscathed Oath',        desc: 'Clear any Vow Echo without taking damage to earn an S+ rank.' },
    rush_clear:          { name: 'Master of Three Bells', desc: 'Clear the “Trial of Three Bells (Hui → Ji → Yuan)” Boss Rush.' },
    vow_or_ngplus:       { name: 'Cycle of Severe Vows',  desc: 'Enter NG+ Cycle of Vows or clear an Echo with all 4 Vows active.' },
    chronicler_complete: { name: 'Kindred Scribe',        desc: 'Help Mochen complete all three volumes of the Annals of the Dim Abyss.' },
    keeper_dawn_wick:    { name: 'Last Wick to Dawn',     desc: 'Bring the First Seal of Dawn to Keeper Xi at the Spire and claim her wick.' },
    three_weapons:       { name: 'Three-Bell Arsenal',    desc: 'Unlock all three weapons: Broken Blade, Abyssal Bell-Maul, and Soul-Calling Bell Staff.' },
    three_biomes:        { name: 'Wanderer of Three Realms', desc: 'Set foot in all three hidden biomes: Gale-Shattered Spire, Withered Ink Woods, and Frost-Bone Ridge.' }
  },

  bosses: {
    boss_hui: {
      name: 'Hui, Knight of the Broken Bell',
      shortName: 'Hui',
      phase1Title: 'Act I · Silent Vigil',
      phase2Title: 'Act II · Long Toll of Ink'
    },
    boss_ji: {
      name: 'Ji, Abyssal Bell-Founder',
      shortName: 'Ji',
      phase1Title: 'Act I · Threads of Soul-Casting',
      phase2Title: 'Act II · Chorus of Silenced Bells'
    },
    boss_yuan: {
      name: 'Yuan, Relic of the First Bell',
      shortName: 'Yuan',
      phase1Title: 'Act I · First Bell Awakened',
      phase2Title: 'Act II · Twin Shadows of the Shard',
      phase3Title: 'Finale · Primeval Silence'
    }
  }
};
