import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { Script } from "node:vm";
const html = readFileSync("docs/galaxy/index.html", "utf8");

// Keep the homepage-to-galaxy handoff backward-compatible while preferring the
// synchronized v3 portal contract and its shared animation clock.
assert.match(html, /cosmos-to-galaxy-v3/, "v3 same-tab arrival handshake must be supported");
assert.match(html, /cosmos-to-galaxy-v2/, "legacy v2 handoff must remain supported");
assert.match(html, /sessionStorage\.removeItem\(keyV3\)/, "v3 handoff must be consumed exactly once");
assert.match(html, /sessionStorage\.removeItem\(keyV2\)/, "legacy handoff must be consumed exactly once");
assert.match(html, /--cosmos-arrival-delay/, "arrival animation must continue from the source page's elapsed time");
assert.match(html, /--cosmos-portal-x/, "arrival portal must reuse the projected source X coordinate");
assert.match(html, /--cosmos-portal-y/, "arrival portal must reuse the projected source Y coordinate");
assert.match(html, /function renderScene\(\)\s*\{[\s\S]*cosmos-arrival-ready/, "galaxy must reveal only after its first rendered frame");
assert.match(html, /window\.setTimeout\(function \(\) \{[\s\S]*cosmos-arrival-ready[\s\S]*8000/, "failed renderer must not trap navigation indefinitely");

// Compile every inline script without executing browser-dependent code.
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
for (const [index, match] of inlineScripts.entries()) {
  if (match[1].trim()) assert.doesNotThrow(() => new Script(match[1]), "inline script " + index + " must parse");
}

// The source and destination share one portal ring curve and a 2.8s transition clock.
assert.match(html, /cosmos-portal-ring var\(--cosmos-arrival-duration, 2800ms\)/, "arrival ring must use the shared source/destination duration");
assert.match(html, /cosmos-arrival-reveal var\(--cosmos-arrival-duration, 2800ms\)/, "arrival aperture must use the shared transition duration");
assert.match(html, /var arrivalData = window\.__COSMOS_ARRIVAL__ \|\| null;/, "camera flight must consume the handoff payload");
assert.match(html, /arrivalStartPos = new THREE\.Vector3\(0, mobile \? 125 : 110, mobile \? 300 : 260\)/, "camera must begin farther back for a continuous portal exit");
assert.match(html, /var portalX = arrivalData && arrivalData\.portal/, "arrival camera must use the source portal X coordinate");
assert.match(html, /var portalY = arrivalData && arrivalData\.portal/, "arrival camera must use the source portal Y coordinate");
assert.match(html, /var targetElevation = originElevation - \(portalY - 0\.5\) \* arrivalFovRad/, "camera pitch must align the galaxy center with the exact source portal Y");
assert.match(html, /arrivalTanHalfFov \* arrivalAspect/, "camera yaw must account for the viewport aspect ratio");
assert.match(html, /t: Math\.min\(1, Math\.max\(0, arrivalElapsedMs \/ arrivalDurationMs\)\)/, "camera flight must resume at the shared transition progress");
assert.match(html, /camera\.fov = flight\.fromFov \+ \(flight\.toFov - flight\.fromFov\) \* k/, "camera FOV must settle continuously during arrival");
assert.match(html, /Date\.now\(\) - arrivalData\.startedAt/, "camera flight must follow the source's absolute transition clock");
assert.match(html, /style\.setProperty\('--cosmos-arrival-delay', \(-elapsedMs\) \+ 'ms'\)/, "the portal reveal must catch up to the same clock after WebGL initialization");

// Preserve the actual 3D scene, interaction and responsive rendering contract.
assert.match(html, /function createOrbitController\(cam, dom\)/, "damped orbit/pan/pinch camera controller must exist");
assert.match(html, /function buildOrganicPlanetCoords\(\)/, "organic planet constellation must exist");
assert.match(html, /var totalStars = mobile \? 13000 : 28000;/, "desktop/mobile star budget must remain bounded");
assert.match(html, /mobile \? planeDefs\.slice\(0, 2\) : planeDefs/, "mobile must use two nebula layers");
assert.match(html, /window\.devicePixelRatio \|\| 1, mobile \? 1\.5 : 1\.85/, "DPR must remain capped by device class");
assert.match(html, /for \(var iter = 0; iter < 4; iter\+\+\)/, "floating labels must retain collision avoidance");
assert.match(html, /function updateShootingStars\(dt\)/, "subtle shooting-star layer must exist");
assert.match(html, /prefers-reduced-motion: reduce/, "reduced-motion styling must be respected");
assert.match(html, /target\.isContentEditable \|\| \/\^\(INPUT\|TEXTAREA\|SELECT\)\$\//, "keyboard navigation must not steal slider/form arrow keys");

// Every registered project needs one stable constellation anchor and one base radius.
const projectBlock = html.match(/var PROJECTS = \[([\s\S]*?)\n\];/);
const coordinateBlock = html.match(/var PLANET_BASE_COORDS = \[([\s\S]*?)\n\];/);
const radiusBlock = html.match(/var PLANET_BASE_RADII = \[([^\]]+)\]/);
assert.ok(projectBlock && coordinateBlock && radiusBlock, "project and planet layout data must exist");
const projectIds = [...projectBlock[1].matchAll(/\bid:\s*'([^']+)'/g)].map(match => match[1]);
const coordinateCount = [...coordinateBlock[1].matchAll(/^\s*\[\s*-?\d/mg)].length;
const radiusCount = radiusBlock[1].split(",").filter(value => value.trim()).length;
assert.ok(projectIds.length > 0, "at least one project planet must be registered");
assert.equal(new Set(projectIds).size, projectIds.length, "project planet IDs must be unique");
assert.equal(coordinateCount, projectIds.length, "every project must have exactly one constellation anchor");
assert.equal(radiusCount, projectIds.length, "every project must have exactly one base radius");

console.log("Galaxy arrival checks passed: shared portal position/clock, synchronized camera exit, and " + projectIds.length + " project planets.");
