// Dark Hand-Drawn Ink Half-Body SVG Portraits for All 4 NPCs (v39.0, 0 external images)

const PORTRAITS = {
  smith: `<svg class="npc-portrait-svg" viewBox="0 0 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="pSmithBg" cx="50%" cy="62%" r="60%">
        <stop offset="0%" stop-color="#5c2d0c" stop-opacity="0.72"/>
        <stop offset="65%" stop-color="#181214" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#090b10"/>
      </radialGradient>
    </defs>
    <rect width="112" height="112" rx="8" fill="url(#pSmithBg)"/>
    <circle cx="22" cy="84" r="2.2" fill="#fde047" opacity="0.85"/>
    <circle cx="92" cy="72" r="1.8" fill="#f59e0b" opacity="0.8"/>
    <circle cx="84" cy="34" r="1.4" fill="#fde047" opacity="0.65"/>
    <path d="M 10 112 Q 16 74 36 66 L 76 66 Q 96 74 102 112 Z" fill="#171b24" stroke="#d8cfb8" stroke-width="1.8"/>
    <path d="M 24 112 L 32 72 L 56 82 L 80 72 L 88 112" fill="none" stroke="#f59e0b" stroke-width="1.4" opacity="0.7"/>
    <path d="M 78 68 L 96 34" stroke="#9b8359" stroke-width="4" stroke-linecap="round"/>
    <rect x="86" y="22" width="19" height="12" rx="2" transform="rotate(28 95 28)" fill="#2a241d" stroke="#fde047" stroke-width="1.5"/>
    <path d="M 40 34 Q 56 22 72 34 L 70 58 Q 56 72 42 58 Z" fill="#232732" stroke="#d8cfb8" stroke-width="1.7"/>
    <path d="M 42 55 Q 56 78 70 55 Q 64 68 56 71 Q 48 68 42 55 Z" fill="#cfc6b2" opacity="0.86"/>
    <path d="M 38 41 Q 56 37 74 41 L 73 49 Q 56 46 39 49 Z" fill="#e5ddc7" stroke="#0b0e14" stroke-width="1.3"/>
    <path d="M 73 44 Q 84 48 88 57" fill="none" stroke="#cfc6b2" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M 46 45 L 53 45 M 59 45 L 66 45" stroke="#f59e0b" stroke-width="1.5" opacity="0.8"/>
    <circle cx="56" cy="78" r="5.5" fill="#2d1f0e" stroke="#fde047" stroke-width="1.6"/>
  </svg>`,

  chronicler: `<svg class="npc-portrait-svg" viewBox="0 0 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="pChronBg" cx="56%" cy="54%" r="60%">
        <stop offset="0%" stop-color="#133d54" stop-opacity="0.72"/>
        <stop offset="65%" stop-color="#101521" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#080b10"/>
      </radialGradient>
    </defs>
    <rect width="112" height="112" rx="8" fill="url(#pChronBg)"/>
    <path d="M 22 30 L 42 78" stroke="#8c724c" stroke-width="8" stroke-linecap="round"/>
    <circle cx="22" cy="30" r="4.5" fill="#e5ddc7" stroke="#f59e0b" stroke-width="1.2"/>
    <circle cx="29" cy="26" r="4" fill="#d8cfb8" stroke="#38bdf8" stroke-width="1.1"/>
    <path d="M 14 112 Q 22 76 42 68 L 72 68 Q 92 76 98 112 Z" fill="#141c2b" stroke="#bae6fd" stroke-width="1.6"/>
    <path d="M 38 70 Q 56 86 74 70 L 70 94 Q 56 102 42 94 Z" fill="#1e293b" stroke="#fde047" stroke-width="1.2"/>
    <path d="M 43 44 L 69 44 L 66 64 Q 56 71 46 64 Z" fill="#181f2c" stroke="#d8cfb8" stroke-width="1.4"/>
    <circle cx="51" cy="54" r="1.8" fill="#38bdf8"/>
    <circle cx="61" cy="54" r="1.8" fill="#38bdf8"/>
    <path d="M 12 46 Q 56 14 100 46 Q 56 54 12 46 Z" fill="#2c2419" stroke="#e5ddc7" stroke-width="1.8"/>
    <path d="M 26 43 Q 56 26 86 43" fill="none" stroke="#f59e0b" stroke-width="1.2" opacity="0.65"/>
    <line x1="90" y1="48" x2="90" y2="112" stroke="#9b8359" stroke-width="2.6"/>
    <circle cx="90" cy="64" r="11" fill="#f59e0b" opacity="0.24"/>
    <rect x="85" y="57" width="10" height="13" rx="2" fill="#22190e" stroke="#fde047" stroke-width="1.4"/>
    <circle cx="90" cy="64" r="3" fill="#fef08a"/>
  </svg>`,

  keeper: `<svg class="npc-portrait-svg" viewBox="0 0 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="pKeepBg" cx="50%" cy="56%" r="62%">
        <stop offset="0%" stop-color="#174a66" stop-opacity="0.72"/>
        <stop offset="65%" stop-color="#101423" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#080a10"/>
      </radialGradient>
    </defs>
    <rect width="112" height="112" rx="8" fill="url(#pKeepBg)"/>
    <circle cx="56" cy="46" r="28" fill="none" stroke="#fde047" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.48"/>
    <path d="M 14 112 Q 24 68 40 58 L 72 58 Q 88 68 98 112 Z" fill="#151d2e" stroke="#38bdf8" stroke-width="1.6"/>
    <path d="M 35 58 Q 34 26 56 22 Q 78 26 77 58 Q 56 64 35 58 Z" fill="#1d263b" stroke="#e0f2fe" stroke-width="1.7"/>
    <ellipse cx="56" cy="46" rx="12" ry="14" fill="#121826" stroke="#bae6fd" stroke-width="1.2"/>
    <path d="M 48 44 Q 51 42 54 44 M 58 44 Q 61 42 64 44" stroke="#e0f2fe" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M 73 42 Q 90 56 94 82" fill="none" stroke="#e0f2fe" stroke-width="2.2" opacity="0.75" stroke-linecap="round"/>
    <circle cx="56" cy="84" r="18" fill="#38bdf8" opacity="0.22"/>
    <circle cx="56" cy="84" r="11" fill="#fde047" opacity="0.28"/>
    <rect x="48" y="74" width="16" height="20" rx="3" fill="#111827" stroke="#fde047" stroke-width="1.6"/>
    <circle cx="53" cy="84" r="3" fill="#38bdf8"/>
    <circle cx="59" cy="84" r="3" fill="#fef08a"/>
  </svg>`,

  scavenger: `<svg class="npc-portrait-svg" viewBox="0 0 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="pScavBg" cx="48%" cy="58%" r="60%">
        <stop offset="0%" stop-color="#3b3114" stop-opacity="0.75"/>
        <stop offset="65%" stop-color="#111722" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#080b10"/>
      </radialGradient>
    </defs>
    <rect width="112" height="112" rx="8" fill="url(#pScavBg)"/>
    <ellipse cx="32" cy="70" rx="22" ry="26" fill="#251e16" stroke="#f59e0b" stroke-width="1.7"/>
    <path d="M 22 52 L 42 52 M 18 68 L 46 68" stroke="#d8cfb8" stroke-width="1.2" opacity="0.5"/>
    <path d="M 24 112 Q 32 76 48 70 L 74 70 Q 88 78 94 112 Z" fill="#182232" stroke="#d8cfb8" stroke-width="1.6"/>
    <circle cx="60" cy="52" r="16" fill="#222b3d" stroke="#e5ddc7" stroke-width="1.7"/>
    <path d="M 46 41 L 52 33 L 58 38 L 65 31 L 72 40" fill="none" stroke="#e5ddc7" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="44" y="45" width="32" height="8" rx="3" fill="#e5ddc7" stroke="#0b0e14" stroke-width="1.2"/>
    <path d="M 55 60 Q 60 64 65 60" fill="none" stroke="#fde047" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="88" cy="72" r="14" fill="#fde047" opacity="0.22"/>
    <path d="M 83 66 L 93 66 L 97 78 L 79 78 Z" fill="#3a2810" stroke="#fde047" stroke-width="1.6"/>
    <circle cx="88" cy="79" r="2.6" fill="#fef08a"/>
  </svg>`
};

export function getNpcPortraitSvg(kind = 'smith') {
  return PORTRAITS[kind] || PORTRAITS.smith;
}
