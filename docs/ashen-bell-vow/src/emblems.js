// Procedural dark hand-drawn SVG emblems for Primary/Secondary Seal Medallions & all 8 Relics

export const SLOT_EMBLEMS = {
  primary: `<svg viewBox="0 0 28 28" class="seal-crest-svg primary" aria-hidden="true">
    <circle cx="14" cy="14" r="12" fill="rgba(245,158,11,0.16)" stroke="#fde047" stroke-width="1.5"/>
    <path d="M14 3 L15.8 7.5 L14 6.4 L12.2 7.5 Z M14 25 L15.8 20.5 L14 21.6 L12.2 20.5 Z M3 14 L7.5 12.2 L6.4 14 L7.5 15.8 Z M25 14 L20.5 12.2 L21.6 14 L20.5 15.8 Z" fill="#fde047"/>
    <path d="M10.5 10.5 Q14 7.5 17.5 10.5 L19.2 18.2 H8.8 Z" fill="#2a1d10" stroke="#fde047" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="14" cy="19.8" r="1.8" fill="#fde047"/>
  </svg>`,
  secondary: `<svg viewBox="0 0 28 28" class="seal-crest-svg secondary" aria-hidden="true">
    <circle cx="14" cy="14" r="12" fill="rgba(56,189,248,0.14)" stroke="#bae6fd" stroke-width="1.4" stroke-dasharray="3 2"/>
    <path d="M16.8 7.8 A6.6 6.6 0 1 0 16.8 20.2 A4.9 4.9 0 1 1 16.8 7.8 Z" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.1"/>
    <circle cx="18.2" cy="14" r="1.9" fill="#e0f2fe"/>
  </svg>`,
  empty: `<svg viewBox="0 0 32 32" class="relic-svg empty" aria-hidden="true">
    <circle cx="16" cy="16" r="12" fill="rgba(15,23,42,0.45)" stroke="rgba(216,207,184,0.34)" stroke-width="1.3" stroke-dasharray="3 3"/>
    <path d="M16 11 V21 M11 16 H21" stroke="rgba(216,207,184,0.45)" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
};

const RELIC_SVG_MAP = {
  thorn: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(127,29,29,0.28)" stroke="#f87171" stroke-width="1.4"/>
    <path d="M10 24 C10 14, 15 9, 25 11 C25 21, 20 26, 10 24 Z" fill="rgba(220,38,38,0.26)" stroke="#fca5a5" stroke-width="1.5"/>
    <path d="M9 26 L26 9 M14 14 L11 10 M21 15 L26 14 M15 21 L14 26 M21 21 L25 24" stroke="#f87171" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="18" cy="18" r="2.6" fill="#fef08a"/>
  </svg>`,
  mirror: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <polygon points="18,3 31,18 18,33 5,18" fill="rgba(245,158,11,0.16)" stroke="#fde047" stroke-width="1.4"/>
    <path d="M9 18 Q18 10 27 18 Q18 26 9 18 Z" fill="rgba(15,23,42,0.85)" stroke="#fef08a" stroke-width="1.4"/>
    <circle cx="18" cy="18" r="3.4" fill="#fde047"/>
    <path d="M13 8 L17 15 M23 28 L19 21 M25 11 L21 16" stroke="#bae6fd" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`,
  ember: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(180,83,9,0.22)" stroke="#f59e0b" stroke-width="1.4"/>
    <path d="M12 12 H24 L26 26 H10 Z" fill="rgba(15,20,30,0.8)" stroke="#d8cfb8" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M18 13 C22 17, 22 22, 18 24.5 C14 22, 14 17, 18 13 Z" fill="#fde047"/>
    <path d="M18 16.5 C19.8 18.8, 19.8 21.5, 18 23 C16.2 21.5, 16.2 18.8, 18 16.5 Z" fill="#dc2626"/>
    <path d="M15 9 H21 M18 6 V9" stroke="#f59e0b" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,
  bellthread: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(12,74,110,0.28)" stroke="#38bdf8" stroke-width="1.4"/>
    <path d="M7 27 Q14 16 29 9" fill="none" stroke="#bae6fd" stroke-width="1.6" stroke-dasharray="2.5 2"/>
    <path d="M14 11 H22 L25 24 H11 Z" fill="rgba(24,32,48,0.88)" stroke="#fde047" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="18" cy="26.5" r="2.2" fill="#38bdf8"/>
    <circle cx="27" cy="10" r="2.4" fill="#bae6fd"/>
  </svg>`,
  bellcore: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(245,158,11,0.24)" stroke="#fef08a" stroke-width="1.5"/>
    <circle cx="18" cy="18" r="10.5" fill="none" stroke="rgba(253,224,71,0.55)" stroke-width="1.1" stroke-dasharray="3 2"/>
    <polygon points="18,7 26,18 18,29 10,18" fill="#f59e0b" stroke="#fef9c3" stroke-width="1.5"/>
    <path d="M18 11 L16 18 L20 19 L17.5 25" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  clapper: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(14,116,144,0.24)" stroke="#38bdf8" stroke-width="1.4"/>
    <path d="M18 7 V20" stroke="#fde047" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="18" cy="23" r="4.2" fill="#fde047" stroke="#fff" stroke-width="1.2"/>
    <path d="M10 15 A10 10 0 0 0 10 25 M26 15 A10 10 0 0 1 26 25" fill="none" stroke="#bae6fd" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M6.8 12.5 A14 14 0 0 0 6.8 27.5 M29.2 12.5 A14 14 0 0 1 29.2 27.5" fill="none" stroke="rgba(56,189,248,0.55)" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
  ironheart: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(71,85,105,0.28)" stroke="#cbd5e1" stroke-width="1.4"/>
    <path d="M18 28 L9 18 C6.5 14, 9.5 9, 14 10 C16 10.5, 17.3 12, 18 13.5 C18.7 12, 20 10.5, 22 10 C26.5 9, 29.5 14, 27 18 Z" fill="#1e293b" stroke="#e2e8f0" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M18 13 L15.5 18 L20 20.5 L17.5 26.5" fill="none" stroke="#f59e0b" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`,
  shadecurtain: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(88,28,135,0.34)" stroke="#d8b4fe" stroke-width="1.4"/>
    <path d="M18 11 C13 9, 7 13, 6 20 C10 19, 13 21, 16 26 C17 21, 18 17, 18 11 Z" fill="rgba(168,85,247,0.52)" stroke="#e9d5ff" stroke-width="1.3"/>
    <path d="M18 11 C23 9, 29 13, 30 20 C26 19, 23 21, 20 26 C19 21, 18 17, 18 11 Z" fill="rgba(168,85,247,0.52)" stroke="#e9d5ff" stroke-width="1.3"/>
    <circle cx="18" cy="16" r="2.5" fill="#fef08a"/>
  </svg>`,
  galefather: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(14,74,110,0.32)" stroke="#7dd3fc" stroke-width="1.4"/>
    <path d="M9 26 Q14 14 27 8 Q24 19 13 26 Z" fill="rgba(186,230,253,0.36)" stroke="#e0f2fe" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9 26 Q17 17 26 9" fill="none" stroke="#bae6fd" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M18 19 H24 L25.5 26 H16.5 Z" fill="#3b2814" stroke="#fde047" stroke-width="1.3"/>
    <circle cx="21" cy="27.2" r="1.6" fill="#fde047"/>
  </svg>`,
  sporeseal: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(16,66,46,0.36)" stroke="#6ee7b7" stroke-width="1.4"/>
    <path d="M8 19 Q18 7 28 19 Q18 22 8 19 Z" fill="#11332c" stroke="#6ee7b7" stroke-width="1.5"/>
    <path d="M14 20 L12 28 M18 20 V29 M22 20 L24 28" stroke="#a7f3d0" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="14" cy="15" r="1.7" fill="#a7f3d0"/><circle cx="19.5" cy="13" r="2.0" fill="#4ade80"/><circle cx="23.5" cy="16" r="1.4" fill="#a7f3d0"/>
  </svg>`,
  frostcore: `<svg viewBox="0 0 36 36" class="relic-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(22,52,86,0.38)" stroke="#bae6fd" stroke-width="1.5"/>
    <polygon points="18,6 24,15 21,29 15,29 12,15" fill="rgba(125,211,252,0.42)" stroke="#e0f2fe" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M18 7 V28 M11 16 L25 16 M13 11 L23 22 M23 11 L13 22" stroke="#f0f9ff" stroke-width="1.15" stroke-linecap="round"/>
  </svg>`,
  locked: `<svg viewBox="0 0 36 36" class="relic-svg locked" aria-hidden="true">
    <circle cx="18" cy="18" r="15" fill="rgba(15,20,32,0.55)" stroke="rgba(148,163,184,0.35)" stroke-width="1.3" stroke-dasharray="3 3"/>
    <path d="M14 12 H22 L24.5 24 H11.5 Z" fill="rgba(30,41,59,0.7)" stroke="rgba(148,163,184,0.45)" stroke-width="1.4"/>
    <path d="M10 14 L26 23 M26 14 L10 23" stroke="rgba(148,163,184,0.42)" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`
};

export function getRelicEmblemSvg(id) {
  return RELIC_SVG_MAP[id] || RELIC_SVG_MAP.locked;
}

const BESTIARY_SVG_MAP = {
  sentinel: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(24,32,48,0.85)" stroke="rgba(216,207,184,0.45)" stroke-width="1.4"/>
    <path d="M13 33 L15 18 L20 7 L25 18 L27 33 Z" fill="#182030" stroke="#d8cfb8" stroke-width="1.5"/>
    <line x1="7" y1="24" x2="34" y2="17" stroke="#fde047" stroke-width="2.1" stroke-linecap="round"/>
    <polygon points="33,14.5 38,16 34,19.5" fill="#fde047"/>
    <rect x="19" y="15" width="4" height="2" fill="#f87171"/>
  </svg>`,
  wraith: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(16,26,42,0.88)" stroke="rgba(56,189,248,0.5)" stroke-width="1.4"/>
    <path d="M20 7 Q30 14 27 31 L23 27 L20 33 L17 27 L13 31 Q10 14 20 7 Z" fill="#121826" stroke="#bae6fd" stroke-width="1.5"/>
    <circle cx="17.5" cy="16" r="1.7" fill="#f87171"/><circle cx="22.5" cy="16" r="1.7" fill="#f87171"/>
    <circle cx="30" cy="21" r="3.5" fill="#fde047" stroke="#f59e0b" stroke-width="1.2"/>
  </svg>`,
  golem: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(34,26,18,0.88)" stroke="rgba(245,158,11,0.55)" stroke-width="1.4"/>
    <path d="M10 33 L11 16 Q20 7 29 16 L30 33 Z" fill="#1a2232" stroke="#d8cfb8" stroke-width="1.5"/>
    <path d="M22 14 H31 L33 27 L26.5 33 L20 27 Z" fill="#3b2b18" stroke="#fde047" stroke-width="1.6"/>
    <rect x="15" y="15" width="6" height="2.4" fill="#fde047"/>
  </svg>`,
  priest: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(29,22,38,0.88)" stroke="rgba(253,224,71,0.55)" stroke-width="1.4"/>
    <circle cx="20" cy="14" r="7.5" fill="none" stroke="#fde047" stroke-width="1.2" stroke-dasharray="2.5 2"/>
    <path d="M12 34 L15 17 L16 8 L20 12 L24 8 L25 17 L28 34 Z" fill="#1f182c" stroke="#d8cfb8" stroke-width="1.4"/>
    <line x1="30" y1="11" x2="30" y2="33" stroke="#fde047" stroke-width="1.8"/>
    <path d="M27 11 H33 L35 17 H25 Z" fill="#f59e0b"/>
  </svg>`,
  duelist: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(42,14,22,0.88)" stroke="rgba(248,113,113,0.58)" stroke-width="1.4"/>
    <polygon points="8,16 20,9 32,16" fill="#1e2434" stroke="#d8cfb8" stroke-width="1.4"/>
    <path d="M14 33 L16 18 H24 L26 33 Z" fill="#141824" stroke="#f87171" stroke-width="1.4"/>
    <path d="M9 28 Q20 22 33 19 M10 21 Q22 25 32 29" fill="none" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,
  leech: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(12,24,38,0.88)" stroke="rgba(56,189,248,0.55)" stroke-width="1.4"/>
    <ellipse cx="20" cy="18" rx="11" ry="9" fill="#0f1626" stroke="#38bdf8" stroke-width="1.6"/>
    <circle cx="16" cy="20" r="2" fill="#f87171"/><circle cx="24" cy="20" r="2" fill="#f87171"/><circle cx="20" cy="23" r="1.4" fill="#fde047"/>
    <path d="M14 27 Q13 32 16 34 M20 27 V34 M26 27 Q27 32 24 34" fill="none" stroke="#bae6fd" stroke-width="1.4"/>
  </svg>`,
  dummy: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(38,28,16,0.88)" stroke="rgba(253,224,71,0.65)" stroke-width="1.4"/>
    <path d="M14 14 Q20 7 26 14 L25 18 H15 Z" fill="#33271a" stroke="#fde047" stroke-width="1.5"/>
    <path d="M13 31 L15 19 H25 L27 31 Z" fill="#261e16" stroke="#d8cfb8" stroke-width="1.4"/>
    <line x1="25" y1="22" x2="36" y2="17" stroke="#fde047" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="10" y1="34" x2="30" y2="34" stroke="#f59e0b" stroke-width="2"/>
  </svg>`,
  boss: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(44,14,22,0.92)" stroke="#f87171" stroke-width="1.6"/>
    <line x1="11" y1="26" x2="7" y2="7" stroke="#9b7b56" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M7 9 L14 11 L12 18 L6 16 Z" fill="#6b1020" stroke="#f87171" stroke-width="0.9"/>
    <path d="M12 34 L13 20 L15 11 H26 L28 20 L31 24 L29 34 Z" fill="#181c26" stroke="#d8cfb8" stroke-width="1.4"/>
    <path d="M23 17 L34 15 L35 23 L26 25 Z" fill="#252a38" stroke="#fde047" stroke-width="1.2"/>
    <rect x="17" y="14.5" width="8" height="2.4" fill="#f87171"/>
    <path d="M8 31 L32 23 L35 27 L10 34 Z" fill="#2a303f" stroke="#fde047" stroke-width="1.1"/>
  </svg>`,
  boss2: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(44,22,10,0.94)" stroke="#fde047" stroke-width="1.6"/>
    <line x1="14" y1="3" x2="14" y2="11" stroke="#d8cfb8" stroke-width="1.4" stroke-dasharray="2 1.5"/>
    <line x1="26" y1="3" x2="26" y2="11" stroke="#d8cfb8" stroke-width="1.4" stroke-dasharray="2 1.5"/>
    <path d="M11 13 H29 L31 24 L26 32 H14 L9 24 Z" fill="#1b1412" stroke="#fde047" stroke-width="1.5"/>
    <rect x="15" y="18" width="10" height="9" fill="#fb923c" stroke="#18110e" stroke-width="1.2"/>
    <line x1="18.3" y1="18" x2="18.3" y2="27" stroke="#18110e" stroke-width="1.3"/><line x1="21.7" y1="18" x2="21.7" y2="27" stroke="#18110e" stroke-width="1.3"/>
    <path d="M9 17 L5 13 M31 17 L35 13 M10 26 L5 31 M30 26 L35 31" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,
  boss3: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(34,12,32,0.94)" stroke="#fef08a" stroke-width="1.7"/>
    <circle cx="20" cy="14" r="11" fill="none" stroke="rgba(253,224,71,0.72)" stroke-width="1.2" stroke-dasharray="4 3"/>
    <path d="M5 13 L12 18 L9 26 Z M35 13 L28 18 L31 26 Z" fill="#1b1624" stroke="#fde047" stroke-width="1.2"/>
    <path d="M20 7 Q25 10 24 16 L20 19 L16 16 Q15 10 20 7 Z" fill="#ded6c2" stroke="#090c12" stroke-width="1"/>
    <rect x="16" y="12" width="8" height="2.4" fill="#2e1042"/>
    <path d="M13 22 Q20 20 27 22 M14 26 Q20 24 26 26 M16 30 Q20 28 24 30" fill="none" stroke="#e6dec8" stroke-width="1.6" stroke-linecap="round"/>
    <polygon points="20,20 23.5,25 20,30 16.5,25" fill="#d8b4fe" stroke="#ffffff" stroke-width="1"/>
  </svg>`,
  falcon: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(12,34,54,0.88)" stroke="#7dd3fc" stroke-width="1.4"/>
    <path d="M7 18 Q15 8 24 14 L33 17 L25 22 Q16 25 9 29 Q13 21 7 18 Z" fill="#0f1d2e" stroke="#e0f2fe" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M14 14 Q18 6 26 9" fill="none" stroke="#bae6fd" stroke-width="1.5"/>
    <circle cx="25.5" cy="16.5" r="1.6" fill="#fde047"/>
    <path d="M19 25 H25 L26.5 31 H17.5 Z" fill="#c89b3c" stroke="#fde047" stroke-width="1.1"/>
  </svg>`,
  fungus: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(14,36,28,0.9)" stroke="#6ee7b7" stroke-width="1.4"/>
    <path d="M7 19 Q20 6 33 19 Q20 23 7 19 Z" fill="#112c22" stroke="#6ee7b7" stroke-width="1.5"/>
    <path d="M14 21 L13 33 H27 L26 21 Z" fill="#13201b" stroke="#a7f3d0" stroke-width="1.4"/>
    <circle cx="15" cy="14.5" r="1.9" fill="#6ee7b7"/><circle cx="21" cy="12" r="2.2" fill="#4ade80"/><circle cx="26" cy="15.5" r="1.6" fill="#6ee7b7"/>
    <rect x="17" y="23.5" width="3" height="2" fill="#4ade80"/><rect x="22" y="23.5" width="2.5" height="1.8" fill="#4ade80"/>
  </svg>`,
  frostguard: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(16,32,52,0.9)" stroke="#bae6fd" stroke-width="1.4"/>
    <path d="M13 34 L14 18 L12 10 L17 14 L20 7 L23 14 L28 10 L26 18 L27 34 Z" fill="#131d2c" stroke="#7dd3fc" stroke-width="1.4"/>
    <rect x="17" y="16" width="6" height="2.2" fill="#e0f2fe"/>
    <line x1="8" y1="31" x2="33" y2="11" stroke="#cbd5e1" stroke-width="2.0"/>
    <polygon points="29,9 36,9 32,17" fill="#bae6fd" stroke="#fff" stroke-width="1"/>
  </svg>`,
  warden_wind: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(12,42,64,0.92)" stroke="#38bdf8" stroke-width="1.6"/>
    <polygon points="6,16 20,7 34,16" fill="#17293c" stroke="#7dd3fc" stroke-width="1.5"/>
    <path d="M13 34 L15 17 H25 L27 34 Z" fill="#0f1c2b" stroke="#bae6fd" stroke-width="1.4"/>
    <path d="M7 27 Q20 21 34 17 M8 21 Q22 25 33 30" fill="none" stroke="#e0f2fe" stroke-width="1.9" stroke-linecap="round"/>
    <rect x="17" y="16.5" width="6" height="2.2" fill="#38bdf8"/>
  </svg>`,
  warden_forest: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(14,42,28,0.92)" stroke="#4ade80" stroke-width="1.6"/>
    <path d="M10 34 Q12 14 20 8 Q28 14 30 34 Z" fill="#131d17" stroke="#6ee7b7" stroke-width="1.6"/>
    <path d="M14 13 L8 7 M26 13 L32 7" stroke="#6ee7b7" stroke-width="2.0" stroke-linecap="round"/>
    <path d="M15 19 H25 L27 29 H13 Z" fill="#5c4620" stroke="#fde047" stroke-width="1.3"/>
    <circle cx="16.5" cy="14.5" r="1.8" fill="#4ade80"/><circle cx="23.5" cy="14.5" r="1.8" fill="#4ade80"/>
  </svg>`,
  warden_mountain: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(18,36,62,0.92)" stroke="#e0f2fe" stroke-width="1.6"/>
    <path d="M12 34 L13 18 L11 10 L17 14 L20 6 L23 14 L29 10 L27 18 L28 34 Z" fill="#111b2c" stroke="#bae6fd" stroke-width="1.5"/>
    <polygon points="8,29 31,12 35,14 12,32" fill="#bae6fd" stroke="#ffffff" stroke-width="1.1"/>
    <rect x="16" y="16.5" width="8" height="2.4" fill="#e0f2fe"/>
  </svg>`,
  boss4: `<svg viewBox="0 0 40 40" class="codex-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(12,16,28,0.96)" stroke="#fde047" stroke-width="1.8"/>
    <path d="M8 29 L32 10" stroke="#fde047" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M31 28 L9 11" stroke="#38bdf8" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
    <path d="M20 9 L14 14 L15 24 L20 27 Z" fill="#ede6d3" stroke="#090c12" stroke-width="1.1"/>
    <path d="M20 9 L26 14 L25 24 L20 27 Z" fill="#121521" stroke="#fde047" stroke-width="1.1"/>
    <rect x="21" y="16" width="3.5" height="2" fill="#fde047"/>
    <path d="M11 32 Q20 28 29 32" fill="none" stroke="#e6dec8" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,
  unknown: `<svg viewBox="0 0 40 40" class="codex-svg locked" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="rgba(12,16,26,0.72)" stroke="rgba(148,163,184,0.38)" stroke-width="1.3" stroke-dasharray="3 3"/>
    <text x="20" y="25" text-anchor="middle" fill="rgba(148,163,184,0.65)" font-size="16" font-weight="bold">?</text>
  </svg>`
};

export function getBestiaryEmblemSvg(kind) {
  return BESTIARY_SVG_MAP[kind] || BESTIARY_SVG_MAP.unknown;
}

const WEAPON_SVG_MAP = {
  blade: `<svg viewBox="0 0 36 36" class="weapon-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(22,26,38,0.85)" stroke="rgba(230,222,200,0.65)" stroke-width="1.4"/>
    <path d="M8 27 Q16 18 28 8 Q25 16 14 27 Z" fill="#e6dec8" stroke="#090c12" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M7 28 L12 23" stroke="#9f1239" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M10.5 20.5 L15.5 25.5" stroke="#fde047" stroke-width="2.0" stroke-linecap="round"/>
    <path d="M13 11 Q21 9 27 14" fill="none" stroke="rgba(253,224,71,0.72)" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`,
  hammer: `<svg viewBox="0 0 36 36" class="weapon-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(42,22,10,0.88)" stroke="rgba(245,158,11,0.80)" stroke-width="1.4"/>
    <path d="M8 29 L21 16" stroke="#854d0e" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M9 28 L13 24" stroke="#9f1239" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M15 11 L23 7 L30 15 L25 23 L17 19 Z" fill="#291d12" stroke="#fde047" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M20 11 L23 15 L20 18 L24 20" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="24" cy="13" r="1.6" fill="#fef08a"/>
  </svg>`,
  locked: `<svg viewBox="0 0 36 36" class="weapon-svg locked" aria-hidden="true">
    <circle cx="18" cy="18" r="15" fill="rgba(14,18,28,0.65)" stroke="rgba(148,163,184,0.38)" stroke-width="1.3" stroke-dasharray="3 3"/>
    <text x="18" y="23.5" text-anchor="middle" fill="rgba(148,163,184,0.68)" font-size="15" font-weight="bold">?</text>
  </svg>`,
  bell: `<svg viewBox="0 0 36 36" class="weapon-svg" aria-hidden="true">
    <circle cx="18" cy="18" r="15.5" fill="rgba(12,30,48,0.85)" stroke="rgba(56,189,248,0.75)" stroke-width="1.4"/>
    <path d="M9 28 L22 14" stroke="#6b4c30" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M19 10 Q25 9 26 15" fill="none" stroke="#fde047" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M21 13 H27 L29 21 H19 Z" fill="#2a2016" stroke="#7dd3fc" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="24" cy="23.2" r="2.1" fill="#e0f2fe"/>
    <path d="M12 12 A9 9 0 0 1 17 8 M28 24 A9 9 0 0 1 22 29" fill="none" stroke="#38bdf8" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`
};

export function getWeaponEmblemSvg(id) {
  return WEAPON_SVG_MAP[id] || WEAPON_SVG_MAP.locked;
}
