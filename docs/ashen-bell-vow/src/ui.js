// UI System Facade (v35.0 modularized into uiShared, mapUi, hudCore, modalsUi, skillTreeUi, relicBoardUi, progressionUi)
import { uiHooks } from './ui/uiShared.js';
import { refreshTitleSaveUI, syncHUD } from './ui/hudCore.js';
import {
  renderSettingsModal, renderCodexModal,
  renderChroniclerModal, renderKeeperModal, renderScavengerModal, renderDummyModal, renderLoreModal
} from './ui/modalsUi.js';
import { renderSmithModal, updateAndRenderSkillPreview } from './ui/skillTreeUi.js';
import { renderAltarArmory, renderRelicChoices } from './ui/relicBoardUi.js';
import {
  startGame, startNewGamePlus, respawnAtActiveAltar, startEchoChallenge, startEndingCinematic
} from './ui/progressionUi.js';

// Register late-bound intra-UI callbacks once at module init (guarantees 0 circular dependencies)
Object.assign(uiHooks, {
  syncHUD,
  refreshTitleSaveUI,
  renderSettingsModal,
  renderRelicChoices,
  renderCodexModal,
  renderChroniclerModal,
  renderKeeperModal,
  renderScavengerModal,
  renderSmithModal,
  renderDummyModal,
  renderLoreModal,
  startGame,
  startNewGamePlus,
  respawnAtActiveAltar,
  startEchoChallenge,
  startEndingCinematic
});

export { HUD_DOM, hideAllOverlays, openModal, closeModal } from './ui/uiShared.js';
export { renderParchmentMap, initMapInteractions, openMapModal } from './ui/mapUi.js';
export { refreshTitleSaveUI, continueSavedGame, syncHUD } from './ui/hudCore.js';
export {
  openCodexModal, renderCodexModal,
  openNpcModal, openChroniclerModal, openKeeperModal, openScavengerModal, openSmithModal,
  openDummyModal, renderDummyModal, openLoreModal, openPauseModal,
  renderSettingsModal, openSettingsJournal
} from './ui/modalsUi.js';
export { renderSmithModal, updateAndRenderSkillPreview } from './ui/skillTreeUi.js';
export { renderAltarArmory, renderRelicChoices } from './ui/relicBoardUi.js';
export {
  returnToTitle, evaluateEchoGrade, setupEchoArena, startEchoChallenge,
  advanceSevenBellsNext, advanceEchoRushStage2, advanceEchoRushStage3,
  advanceWardenRushStage2, advanceWardenRushStage3,
  interactWithAltar, restAtAltar, respawnAtActiveAltar, resetToAltar,
  showDeath, showVictory, startGame, startNewGamePlus, continueIntoBellWell,
  openEndingChoice, startEndingCinematic, advanceEndingCinematic,
  refreshActiveModalI18n, updateAndRenderEndingCinematic
} from './ui/progressionUi.js';
