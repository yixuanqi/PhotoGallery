// Relics, Synergies, Smith Upgrades, Bell-Vows, Sparring Modes, Bestiary, Achievements & Bosses (en-US)

export const ENTITIES_EN = {
  relics: {
    thorn: {
      name: 'Pain-Drinker Thorn',
      tag: 'Rally Leech',
      effect: '2x Gray-HP Window · Strike Rally +65%',
      refinedEffect: 'Gray-HP 6.8s · Strike Rally +105% · Exec Heal 16%',
      shortEffect: '2x Gray-HP · Rally +65%',
      shortRefined: 'Gray 6.8s · Rally +105%',
      usage: 'After blocking chip damage, slash right back to reclaim Vitality.',
      desc: 'Doubles gray-HP duration; slashes strongly restore lost Vitality.'
    },
    mirror: {
      name: 'Shattered Mirror Eye',
      tag: 'Master Parry',
      effect: 'Parry Posture ×1.6 + 16 Reflect DMG (100ms window)',
      refinedEffect: 'Parry Posture ×1.85 + 26 Reflect DMG (112ms window)',
      shortEffect: 'Parry ×1.6 · 16 Reflect',
      shortRefined: 'Parry ×1.85 · 112ms/26 Ref',
      usage: 'Deflect golden glints with razor precision to shatter boss posture.',
      desc: 'Tightens parry window to 100ms; perfect parries reflect damage & deal 1.6x posture.'
    },
    ember: {
      name: 'Lone Lantern Ember',
      tag: 'Riposte Sustain',
      effect: 'Execution heals 35% + Full Soulfire (Oil -1)',
      refinedEffect: 'Execution heals 48% + Full Soul · Parry Posture ×1.28 / +10 Reflect',
      shortEffect: 'Exec +35% HP & Full Soul',
      shortRefined: 'Exec +48% HP · Parry ×1.28',
      usage: 'Break enemy posture and execute to sustain endless combat.',
      desc: '-1 Lantern Oil; executions restore 35% Vitality and refill Soulfire.'
    },
    bellthread: {
      name: 'Phantom-Thread Bell',
      tag: 'Grapple & Blade',
      effect: 'Grapple Recovery Halved · Resonant Blade Costs 22 Soul',
      refinedEffect: 'Grapple Recovery 0.20s · Resonant Blade 18 Soul · +20 Spell Posture',
      shortEffect: 'Hook CD 0.28s · Blade 22 Soul',
      shortRefined: 'Hook CD 0.20s · Blade 18',
      usage: 'Chain rapid grapples with ranged Resonant Blades to crush posture.',
      hint: 'High northwest of Sanctuary · Grapple up & break the secret wall',
      desc: '0.28s grapple recovery; Resonant Blade costs 22 Soul and deals bonus posture.'
    },
    bellcore: {
      name: 'Ancient Bell Core',
      tag: 'Apex Clash',
      effect: 'Max Seals 4 · Parry Heals 6 · Iai / Riposte +25%',
      refinedEffect: 'Max Seals 4 · Parry Heals 10 / +12 Reflect · Iai & Riposte +38%',
      shortEffect: '4 Seals · Parry +6HP · Iai +25%',
      shortRefined: '4 Seals · +10HP · Iai +38%',
      usage: 'Follow parries with Riposte or Iai Flash, then detonate 4 Ink Seals.',
      hint: 'Skyward Bell Loft above Sanctuary · Requires Ink-Wing Stride',
      desc: 'Max Ink Seals 4, perfect parry heals 6 Vitality, +25% Iai & Riposte DMG.'
    },
    clapper: {
      name: 'Echoing Clapper',
      tag: 'Soul Resonance',
      effect: 'Soul Gain +35% · Spell DMG +30% / AoE +25%',
      refinedEffect: 'Soul Gain +55% · Spell DMG +46% / AoE +38% · Quake Costs 26',
      shortEffect: 'Soul +35% · Spell +30%',
      shortRefined: 'Soul +55% · Spell +46%',
      usage: 'Cast W+Spell “Requiem Chime” to shatter shields & clear rooms.',
      hint: 'Corridor of Withered Bones · Ring all 3 bronze resonance bells in time',
      desc: '+35% Soulfire gain; +30% spell damage and +25% blast radius.'
    },
    ironheart: {
      name: 'Sundered Ironheart',
      tag: 'Swift Iai',
      effect: 'All Posture DMG +25% · Iai Charge Cut to 0.30s',
      refinedEffect: 'All Posture DMG +38% · Parry Posture ×1.36 · Iai Charge 0.25s',
      shortEffect: 'Posture +25% · Iai 0.30s',
      shortRefined: 'Posture +38% · Iai 0.25s',
      usage: 'Hold Attack for rapid Iai Flash to cleave straight through heavy shields.',
      hint: 'Upper Abyssal Bell Well · Ring all 3 bronze resonance bells in time',
      desc: '+25% posture damage across all moves; Iai Flash charges in 0.30s.'
    },
    shadecurtain: {
      name: 'Shroud of the Bell',
      tag: 'Shadow Strike',
      effect: 'Phase Recovery 0.95s · Burst +55% · Pass-Through Heals 8',
      refinedEffect: 'Phase Recovery 0.72s · Shadow Burst +85% · Pass-Through Heals 13',
      shortEffect: 'Phase 0.95s · Burst +55%',
      shortRefined: 'Phase 0.72s · Burst +85%',
      usage: 'Dash through foes to detonate Shadow Burst and reset dash.',
      hint: 'Behind western Ink-Blight Barrier in Sanctuary · Requires Shadow Phase',
      desc: '0.95s Shadow Phase recovery, +55% Shadow Burst DMG, heals 8 & resets dash on pass.'
    },
    galefather: {
      name: 'Gale Bell-Plume',
      tag: 'Aerial Gale',
      effect: 'Move Speed +12% · Aerial / Up-Cut / Pogo DMG +30%',
      refinedEffect: 'Move Speed +18% · Aerial / Up-Cut / Pogo DMG +45% · Parry ×1.15',
      shortEffect: 'Speed +12% · Air DMG +30%',
      shortRefined: 'Speed +18% · Air DMG +45%',
      usage: 'Ride updrafts, double-jumps, or grapples to overwhelm foes from above.',
      hint: 'Gale-Shattered Spire · Awarded upon defeating Shuo, Gale Spire Warden',
      desc: '+12% movement speed; +30% damage on airborne strikes, up-cuts, and pogo slashes.'
    },
    sporeseal: {
      name: 'Spore-Root Seal',
      tag: 'Spore Purge',
      effect: 'Toxic Spore Immune · Requiem Chime Purify +22 Soul & +8 HP',
      refinedEffect: 'Spore Immune · Purify +32 Soul & +14 HP · Strike Rally +35%',
      shortEffect: 'Spore Immune · Purify +22S/+8HP',
      shortRefined: 'Immune · Purify +32S/+14HP',
      usage: 'Stride through forest spores unscathed and cast Requiem Chime to harvest soulfire.',
      hint: 'Withered Ink Woods · Awarded upon defeating Ku, Root-Bound Bell Treant',
      desc: 'Full immunity to toxic spore clouds; purifying a cloud with Requiem Chime restores 22 Soul & 8 HP.'
    },
    frostcore: {
      name: 'Frost-Ridge Shard',
      tag: 'Glacial Break',
      effect: 'Frostbite Buildup -70% · Heavy / Iai / Riposte +18 Shatter Posture',
      refinedEffect: 'Frostbite Buildup -85% · Shatter Posture +28 · +12 Parry Reflect',
      shortEffect: 'Frost -70% · Heavy +18 Pos',
      shortRefined: 'Frost -85% · Heavy +28 Pos',
      usage: 'Shrug off ridge frostbite and detonate glacial shatters on heavy finishes.',
      hint: 'Frost-Bone Ridge · Awarded upon defeating Lin, Frost-Marquis of the Broken Blade',
      desc: '-70% incoming Frostbite buildup; heavy blows, Iai Flash & Riposte deal +18 bonus glacial posture.'
    },
    tidebell: {
      name: 'Ebbed Tide-Bell Seal',
      tag: 'Sluice Resonance',
      effect: 'Spell/Dive Radius +18% · Wet-Conduct +12 Soul · After Sluice Drained: +16% Spell DMG & -4 Cost',
      refinedEffect: 'Radius +26% · Wet-Conduct +18 Soul · After Sluice Drained: +24% Spell DMG & -6 Cost',
      shortEffect: 'Spell +18% Rad · Drained +16% DMG/-4',
      shortRefined: 'Spell +26% Rad · Drained +24% DMG/-6',
      usage: 'Drain the Abyssal Sluice to awaken sunken resonance, supercharging Requiem Chime & Bell Dive.',
      hint: 'Sunken Bell Cistern · Exposed in the drained riverbed of Broken Sluice Lock',
      desc: '+18% Spell & Bell Dive radius, +12 Soul on wet-conduct shock; once the Abyssal Sluice is drained, gain +16% Spell/Dive DMG and -4 Soul cost.'
    }
  },

  synergies: {
    grapple_quake: {
      name: 'Phantom Resonance',
      desc: 'Grappling into a foe triggers a free “Requiem Chime” burst, shattering shields and ringing nearby bells & lanterns.',
      shortDesc: 'Grapple hit triggers free Requiem Chime',
    },
    mirror_ember: {
      name: 'Mirror-Cinder Seal',
      desc: 'After 3 consecutive Perfect Parries, your next melee hit plants a free detonating Ink Seal talisman.',
      shortDesc: '3-parry streak arms free Ink Seal on next hit',
    },
    blood_iai: {
      name: 'Crimson-Iron Iai',
      desc: 'While holding Gray HP, Iai Flash charges 28% faster, unleashes a piercing Crimson Wave, and strongly rallies Vitality.',
      shortDesc: 'Gray-HP Iai 28% faster + Crimson Wave',
    },
    core_counter: {
      name: 'Heart-Shatter Toll',
      desc: 'Bell-Breaker Riposte deals 1.5x posture and instantly detonates stuck Ink Seals for 1.35x burst damage.',
      shortDesc: 'Riposte ×1.5 posture + instant 1.35x seal blast',
    },
    shade_thread: {
      name: 'Umbral Severance',
      desc: 'Shadow Phasing through a foe resets Grapple recovery; your next grapple strike within 2.2s deals 2x posture & bonus Soulfire.',
      shortDesc: 'Phase pass resets Hook · next Hook 2x posture',
    },
    gale_thread: {
      name: 'Gale-Thread Tempest',
      desc: 'Grappling or double-jumping arms a 2.6s Gale Surge; your next strike deals +30% DMG and +16 posture with a wind shockwave.',
      shortDesc: 'Hook/Air-jump next strike +30% DMG & wind break',
    },
    spore_clapper: {
      name: 'Spore-Purge Resonance',
      desc: 'Purifying toxic spore clouds via Requiem Chime or Soul Waves detonates an emerald nova dealing 38 AoE DMG & healing +10 HP.',
      shortDesc: 'Spore purge triggers 38 AoE nova + 10 HP',
    },
    frost_iron: {
      name: 'Glacial-Iron Sunder',
      desc: 'Iai Flash and heavy finishers unleash a frost-shatter wave dealing +35% glacial posture and shattering all shields & bark armor.',
      shortDesc: 'Iai/Heavy frost wave +35% posture & breaks all shields',
    },
    tide_clapper: {
      name: 'Abyssal Tide-Resonance',
      desc: 'Requiem Chime and Bell Dive always trigger full Wet-Conduct bonuses and launch twin shield-breaking tidal ground waves.',
      shortDesc: 'Chime/Dive always conduct + twin tidal waves',
    }
  },

  smithUpgrades: {
    blade: {
      name: 'Temper Broken Blade',
      desc: 'Permanently boosts melee blade damage by +10% per rank and sharpens its cold gleam.',
      bonus: (lv) => `Melee DMG +${lv * 10}%`
    },
    posture: {
      name: 'Reforge Bell-Weight',
      desc: 'Permanently boosts posture damage of all strikes & parries by +9% per rank.',
      bonus: (lv) => `Posture DMG +${lv * 9}%`
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
      desc: 'Oil flasks locked to 0; sustain via rally & executions · +25% Echoes'
    },
    doubleDmg: {
      name: 'Vow of Brittle Bone',
      short: 'Brittle',
      desc: 'All incoming damage raised to 180% · +30% Echoes'
    },
    noGrayBlock: {
      name: 'Vow of Flawless Steel',
      short: 'Flawless',
      desc: 'No gray-HP rally on block; 75% real chip damage · +30% Echoes'
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
    dormant:       { label: 'Still Target', tip: 'Stands still to track live DPS/Posture and test full combos' },
    biomeWind:     { label: 'Gale Sim · Wind Blades', tip: 'Fires parryable twin Gale Blades to practice projectile deflection' },
    biomeForest:   { label: 'Woods Sim · Bark & Spores', tip: 'Raises armor shield and vents toxic spore clouds to drill shield-breaks & purification' },
    biomeMountain: { label: 'Ridge Sim · Frost Halberd', tip: 'Performs Frostbite chains and Glacial Shards to drill rime parry cadence' }
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
    },
    falcon: {
      name: 'Bell-Claw Wind Falcon',
      title: 'Gale Hunter · Chiming Raptor',
      habitat: 'Gale-Shattered Spire · Frost-Bone Ridge',
      tactic: 'Chimes aloft before diving; a Perfect Parry on its golden dive glint crashes it downward for massive posture damage.',
      lore: 'A pale raptor with a cracked bronze bell still lashed to its talons, riding spire updrafts to hunt climbers.'
    },
    fungus: {
      name: 'Spore-Blighted Husk',
      title: 'Forest Parasite · Toxic Walker',
      habitat: 'Withered Ink Woods',
      tactic: 'Parry its heavy slams; disperse its toxic spore clouds and death-spores cleanly with [W+Spell] Requiem Chime.',
      lore: 'A former woodland sentinel consumed by luminous ink-fungi; every swing vents choking emerald spores.'
    },
    frostguard: {
      name: 'Frost-Halberd Revenant',
      title: 'Ridge Sentinel · Rime Polearm',
      habitat: 'Frost-Bone Ridge',
      tactic: 'Strikes inflict Frostbite buildup that triggers burst damage & chill at 100%; deflect standard sweeps and dodge crimson lunges.',
      lore: 'An oath-bound guard frozen solid atop the ridge, wielding a halberd edged in unmelting rime.'
    },
    drowned: {
      name: 'Drowned Bell-Lurker',
      title: 'Cistern Stalker · Ink Ambush',
      habitat: 'Sunken Bell Cistern',
      tactic: 'Submerges into ink puddles to ambush beside you and inflicts Wet status; parry its twin hooks or turn Wetness into amplified Requiem Chime shocks!',
      lore: 'A drowned cistern jailer encased in a cracked bronze diving bell, hunting trespassers with rusted gaff hooks.'
    },
    anchorite: {
      name: 'Rusted Anchor-Warden',
      title: 'Cistern Bruiser · Bell-Anchor',
      habitat: 'Sunken Bell Cistern',
      tactic: 'Parry its deliberate chain-drag sweeps for heavy posture damage; leap or dash over the ground wave unleashed by its crimson anchor smash.',
      lore: 'A hulking penitent who once dragged failed bronze castings into the flooded cells, still swinging a colossal rusted bell-anchor.'
    },
    weaver: {
      name: 'Ink-Silk Weaver',
      title: 'Woods Arachnid · Silk Snare',
      habitat: 'Withered Ink Woods',
      tactic: 'Deflect its twin mandible snaps and dodge crimson silk-drop dives; slash or parry its sticky ink-web orbs before they slow you.',
      lore: 'A six-legged ink-blighted arachnid housing a cracked temple bell as its abdomen, spinning snares beneath the mossy canopy.'
    },
    crawler: {
      name: 'Cinder-Bell Crawler',
      title: 'Vault Beast · Molten Crucible',
      habitat: 'Crypt of Shards / Bell Well',
      tactic: 'Perfect-Parry its blazing furnace roll to flip it helplessly onto its back! Step clear of its delayed crucible detonation on death—or use it to blast nearby foes.',
      lore: 'A hunched quadruped fused with a glowing bronze smelting bell, scuttling through dark vaults leaving trails of live embers.'
    },
    cantor: {
      name: 'Gilded Belfry Cantor',
      title: 'Spire Acolyte · Tri-Chime Halo',
      habitat: 'First Bell Ascent / Belfries',
      tactic: 'Deflect its 3-bolt golden chime volleys and watch for teleporting back-slashes when kiting; two rapid melee hits trigger a golden repel pulse followed by a clean opening.',
      lore: 'A tall, faceless legless acolyte drifting along the upper belfries, accompanied by three orbiting bronze bells that toll without hands.'
    },
    warden_wind: {
      name: 'Shuo, Gale Spire Warden',
      title: 'Wind Biome Warden · Twin Gale Blades',
      habitat: 'Gale-Shattered Spire',
      tactic: 'Leverage updrafts and grapple anchors; deflect his airborne wind-blade barrages right back and rhythm-parry his twin-blade chains.',
      lore: 'Lone sentinel of the crumbling wind tower who still severs all who dare climb against the gale.'
    },
    warden_forest: {
      name: 'Ku, Root-Bound Bell Treant',
      title: 'Woods Biome Warden · Ancient Bark Armor',
      habitat: 'Withered Ink Woods',
      tactic: 'Thick bark armor mitigates light cuts; shatter it with Iai Flash, heavy strikes, pogo slams, Perfect Parries, or Requiem Chime, and purify its spore clouds.',
      lore: 'A millennia-old treant that swallowed a fallen temple bell, its gnarled roots echoing with muffled chimes.'
    },
    warden_mountain: {
      name: 'Lin, Frost-Marquis of the Broken Blade',
      title: 'Ridge Biome Warden · Glacial Iai',
      habitat: 'Frost-Bone Ridge',
      tactic: 'Every cut builds Frostbite; master his 3-to-4-hit frost chains and Iai counter-timings, and watch for Phase II glacial waves and ice shards.',
      lore: 'Stern guardian of the frozen sword mounds whose broken greatsword once felled countless ember-thieves.'
    },
    boss4: {
      name: 'Zhu, Phantom of the First Founder',
      title: 'Secret Final Boss · Progenitor of Three Arms',
      habitat: 'Heart of the First Bell · Vow Echo',
      tactic: 'Cycles dynamically between Broken Blade, Bell-Maul, and Bell Staff; Perfect-Parry his homologous counter-orbs right back to shatter his posture!',
      lore: 'A lingering phantom of the First Founder that manifests once Yuan and all three Realm Wardens fall—the origin of every bell-arm.'
    }
  },

  achievements: {
    first_parry:         { name: 'First Ring of Steel',   desc: 'Land your first Perfect Parry and hear steel answer bronze.' },
    parry_streak_4:      { name: 'Fourfold Clash',        desc: 'Chain 4 or more Perfect Parries in a single exchange.' },
    first_exec:          { name: 'Vow-Severing Blow',     desc: 'Shatter an enemy’s posture and perform your first monochrome Execution.' },
    boss_hui:            { name: 'Broken Bell Silenced',  desc: 'Fell Hui, Knight of the Broken Bell in the Chapel.' },
    boss_ji:             { name: 'Foundry Extinguished',  desc: 'Fell Ji, Abyssal Bell-Founder in the Abyssal Bell Foundry.' },
    boss_yuan:           { name: 'End of the First Toll', desc: 'Fell the final boss, Yuan, Relic of the First Bell.' },
    all_tablets:         { name: 'Chronicler of the Abyss', desc: 'Find and inspect all 14 weathered steles across the Dim Abyss.' },
    all_relics:          { name: 'Twelve Seals Attuned',  desc: 'Discover and unlock all 12 Relics across the Dim Abyss and hidden biomes.' },
    synergy_awakened:    { name: 'Twin-Seal Resonance',   desc: 'Attune two paired relics at an Altar to awaken a hidden synergy.' },
    no_hit_echo:         { name: 'Unscathed Oath',        desc: 'Clear any Vow Echo without taking damage to earn an S+ rank.' },
    rush_clear:          { name: 'Master of Three Bells', desc: 'Clear the “Trial of Three Bells (Hui → Ji → Yuan)” Boss Rush.' },
    vow_or_ngplus:       { name: 'Cycle of Severe Vows',  desc: 'Enter NG+ Cycle of Vows or clear an Echo with all 4 Vows active.' },
    chronicler_complete: { name: 'Kindred Scribe',        desc: 'Help Mochen complete all three volumes of the Annals of the Dim Abyss.' },
    keeper_dawn_wick:    { name: 'Last Wick to Dawn',     desc: 'Bring the First Seal of Dawn to Keeper Xi at the Spire and claim her wick.' },
    three_weapons:       { name: 'Three-Bell Arsenal',    desc: 'Unlock all three weapons: Broken Blade, Abyssal Bell-Maul, and Soul-Calling Bell Staff.' },
    three_biomes:        { name: 'Wanderer of Three Realms', desc: 'Set foot in all three hidden biomes: Gale-Shattered Spire, Withered Ink Woods, and Frost-Bone Ridge.' },
    three_wardens:       { name: 'Bane of Three Wardens',    desc: 'Defeat all three hidden biome Wardens across Gale-Shattered Spire, Withered Ink Woods, and Frost-Bone Ridge.' },
    warden_rush_clear:   { name: 'Scourge of Three Realms',  desc: 'Clear the “Three Wardens Gauntlet (Shuo → Ku → Lin)” Vow Echo at any Altar.' },
    weapon_trait_forged: { name: 'Master-Forged Edge',       desc: 'Forge your first specialized weapon trait at Blind Bell-Smith Li’s anvil.' },
    weapon_ultimate_cast:{ name: 'Full-Seal Resonance',      desc: 'Fill all Ink Seals and unleash a weapon-specific Full-Seal Resonance Ultimate.' },
    boss_zhu:            { name: 'End of the First Founder', desc: 'Defeat the secret final boss, Zhu, Phantom of the First Founder, in Vow Echoes.' },
    seven_bells_clear:   { name: 'Sevenfold Silence',        desc: 'Clear the ultimate “Trial of Seven Bells (Hui → Ji → Shuo → Ku → Lin → Yuan → Zhu)” gauntlet.' }
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
    },
    warden_wind_boss: {
      name: 'Shuo, Gale Spire Warden',
      shortName: 'Shuo',
      phase1Title: 'Gale Vow · Twin Wind Blades',
      phase2Title: 'Gale Tempest · Shattered Spire Pursuit'
    },
    warden_forest_boss: {
      name: 'Ku, Root-Bound Bell Treant',
      shortName: 'Ku',
      phase1Title: 'Ancient Woods Vow · Bark Bell-Armor',
      phase2Title: 'Frenzied Spores · Ten Thousand Roots'
    },
    warden_mountain_boss: {
      name: 'Lin, Frost-Marquis of the Broken Blade',
      shortName: 'Lin',
      phase1Title: 'Frost Ridge Vow · Glacial Iai',
      phase2Title: 'Frost Silence · Rime Marrow Severance'
    },
    boss_zhu: {
      name: 'Zhu, Phantom of the First Founder',
      shortName: 'Zhu',
      phase1Title: 'Act I · First Ring of Three Arms',
      phase2Title: 'Act II · Twin Echoes of the Chime',
      phase3Title: 'Finale · Return to First Casting'
    }
  }
};
