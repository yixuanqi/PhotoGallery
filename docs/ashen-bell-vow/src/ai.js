// Enemy & Boss AI Facade (v32.0 modularized into src/ai/enemiesAi.js, wardensAi.js, bossesAi.js)
import { getCombatScaling } from './state.js';
import {
  updateEnemyHitFeel, updateEnemyLaunchPhysics, applyEnemyBiomeCoupling, updateDummy, updatePriest, updateDuelist, updateLeech,
  updateWraith, updateSentinel, updateGolem, updateFalcon, updateFungus, updateFrostguard, updateDrowned, updateAnchorite,
  updateWeaver, updateCrawler, updateCantor
} from './ai/enemiesAi.js';
import {
  resetWardenState, updateWardenWind, updateWardenForest, updateWardenMountain
} from './ai/wardensAi.js';
import {
  updateBoss, updateBoss2
} from './ai/bossesAi.js';
import {
  updateBoss3, triggerBoss4UltimateReaction, updateBoss4
} from './ai/endgameBossesAi.js';

export function updateEnemy(e, dt) {
  if (!e.alive) return;
  if (updateEnemyHitFeel(e, dt)) return;
  if (e.kind === 'dummy') {
    updateDummy(e, dt);
    return;
  }
  if (updateEnemyLaunchPhysics(e, dt)) {
    applyEnemyBiomeCoupling(e, dt);
    return;
  }
  if (e.wardShield > 0) e.wardShield = Math.max(0, e.wardShield - dt);
  // Subtle aggression speed-up on NG+ and Fierce Foes vow (keeps parry timings fair!)
  const sc = getCombatScaling();
  const effDt = (e.state === 'recover' || e.state === 'chase' || e.state === 'idle' || e.state === 'hover') ? dt * sc.aggroMult : dt;
  if (e.bounceCd > 0) e.bounceCd = Math.max(0, e.bounceCd - dt);
  if (e.windLiftedTimer > 0) e.windLiftedTimer = Math.max(0, e.windLiftedTimer - dt);
  if (e.deaggroTimer > 0) e.deaggroTimer = Math.max(0, e.deaggroTimer - dt);
  if (e._stepJumpCd > 0) e._stepJumpCd = Math.max(0, e._stepJumpCd - dt);
  if (e._padBounceResetTimer > 0) {
    e._padBounceResetTimer = Math.max(0, e._padBounceResetTimer - dt);
    if (e._padBounceResetTimer <= 0) e._padBounceCount = 0;
  }

  if (e.kind === 'wraith') updateWraith(e, effDt);
  else if (e.kind === 'golem') updateGolem(e, effDt);
  else if (e.kind === 'priest') updatePriest(e, effDt);
  else if (e.kind === 'duelist') updateDuelist(e, effDt);
  else if (e.kind === 'leech') updateLeech(e, effDt);
  else if (e.kind === 'falcon') updateFalcon(e, effDt);
  else if (e.kind === 'fungus') updateFungus(e, effDt);
  else if (e.kind === 'frostguard') updateFrostguard(e, effDt);
  else if (e.kind === 'drowned') updateDrowned(e, effDt);
  else if (e.kind === 'anchorite') updateAnchorite(e, effDt);
  else if (e.kind === 'weaver') updateWeaver(e, effDt);
  else if (e.kind === 'crawler') updateCrawler(e, effDt);
  else if (e.kind === 'cantor') updateCantor(e, effDt);
  else if (e.kind === 'warden_wind') updateWardenWind(e, effDt);
  else if (e.kind === 'warden_forest') updateWardenForest(e, effDt);
  else if (e.kind === 'warden_mountain') updateWardenMountain(e, effDt);
  else updateSentinel(e, effDt);

  applyEnemyBiomeCoupling(e, dt);
}

export {
  updateEnemyHitFeel, updateDummy, updatePriest, updateDuelist, updateLeech,
  updateWraith, updateSentinel, updateGolem, updateFalcon, updateFungus, updateFrostguard, updateDrowned, updateAnchorite,
  updateWeaver, updateCrawler, updateCantor,
  resetWardenState, updateWardenWind, updateWardenForest, updateWardenMountain,
  updateBoss, updateBoss2, updateBoss3, triggerBoss4UltimateReaction, updateBoss4
};
