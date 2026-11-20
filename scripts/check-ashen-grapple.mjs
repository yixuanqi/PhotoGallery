import assert from 'node:assert/strict';
import { SOLIDS } from '../docs/ashen-bell-vow/src/config.js';
import { G } from '../docs/ashen-bell-vow/src/state.js';
import { hasLineOfSight } from '../docs/ashen-bell-vow/src/physics.js';

// Regression guard for v15.3: grapple targeting must respect solid world geometry.
// This test avoids browser-only audio/rendering modules so it can run in CI on Node.
const originalSolids = SOLIDS.slice();
const originalWorldState = G.worldState;
try {
  SOLIDS.length = 0;
  G.worldState = null;
  assert.equal(hasLineOfSight(0, 0, 200, 0), true, 'open path is grapple-visible');

  SOLIDS.push({ x: 90, y: -20, w: 20, h: 40, type: 'pillar' });
  assert.equal(hasLineOfSight(0, 0, 200, 0), false, 'solid pillar blocks grapple');
  assert.equal(hasLineOfSight(0, 50, 200, 50), true, 'unobstructed line remains visible');
  SOLIDS.length = 0;

  SOLIDS.push({ x: 90, y: -20, w: 20, h: 40, type: 'ground' });
  assert.equal(hasLineOfSight(0, 0, 200, 0), false, 'solid ground blocks grapple');
  SOLIDS.length = 0;

  SOLIDS.push({ x: 90, y: -20, w: 20, h: 40, type: 'platform' });
  assert.equal(hasLineOfSight(0, 0, 200, 0), true, 'one-way platform stays grapple-transparent');
  SOLIDS.length = 0;

  const secretWall = { x: 90, y: -20, w: 20, h: 40, broken: false };
  G.worldState = {
    shortcutOpen: true,
    bossDefeated: true,
    abilities: { doubleJump: true },
    secretWalls: [secretWall]
  };
  assert.equal(hasLineOfSight(0, 0, 200, 0), false, 'unbroken secret wall blocks grapple');
  secretWall.broken = true;
  assert.equal(hasLineOfSight(0, 0, 200, 0), true, 'broken wall clears grapple path');
  console.log('PASS Ashen Bell Vow v15.3 grapple line-of-sight: 7 checks');
} finally {
  SOLIDS.splice(0, SOLIDS.length, ...originalSolids);
  G.worldState = originalWorldState;
}
