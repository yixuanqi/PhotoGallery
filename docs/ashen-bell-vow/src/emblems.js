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
  locked: `<svg viewBox="0 0 36 36" class="relic-svg locked" aria-hidden="true">
    <circle cx="18" cy="18" r="15" fill="rgba(15,20,32,0.55)" stroke="rgba(148,163,184,0.35)" stroke-width="1.3" stroke-dasharray="3 3"/>
    <path d="M14 12 H22 L24.5 24 H11.5 Z" fill="rgba(30,41,59,0.7)" stroke="rgba(148,163,184,0.45)" stroke-width="1.4"/>
    <path d="M10 14 L26 23 M26 14 L10 23" stroke="rgba(148,163,184,0.42)" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`
};

export function getRelicEmblemSvg(id) {
  return RELIC_SVG_MAP[id] || RELIC_SVG_MAP.locked;
}
