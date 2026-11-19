import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { Script } from "node:vm";

const html = readFileSync("docs/galaxy/index.html", "utf8");

// Preserve the homepage-to-galaxy transition, including the direct-entry fallback.
assert.match(html, /cosmos-to-galaxy-v2/, "one-time arrival handshake must be supported");
assert.match(html, /sessionStorage\.removeItem\(key\)/, "handshake must be consumed");
assert.match(html, /id="cosmos-arrival-curtain"/, "arrival mask must exist");
assert.match(html, /cosmos-arrival-reveal/, "arrival animation must exist");
assert.match(html, /function renderScene\(\)\s*\{[\s\S]*cosmos-arrival-ready/, "galaxy must reveal after the first rendered frame");
assert.match(html, /window\.setTimeout\(function \(\) \{[\s\S]*cosmos-arrival-ready[\s\S]*8000/, "failed renderer must not trap navigation indefinitely");

// Compile every inline script without executing browser-dependent code.
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
for (const [index, match] of inlineScripts.entries()) {
  if (match[1].trim()) assert.doesNotThrow(() => new Script(match[1]), "inline script " + index + " must parse");
}

// Ensure the reference's spatial navigation and art direction remain present.
assert.match(html, /function createOrbitController\(cam, dom\)/, "damped orbit/pan/pinch camera controller must exist");
assert.match(html, /function buildOrganicPlanetCoords\(\)/, "organic planet constellation must exist");
assert.match(html, /var totalStars = mobile \? 13000 : 28000;/, "desktop/mobile star budget must remain bounded");
assert.match(html, /mobile \? planeDefs\.slice\(0, 2\) : planeDefs/, "mobile must use two nebula layers");
assert.match(html, /window\.devicePixelRatio \|\| 1, mobile \? 1\.5 : 1\.85/, "DPR must remain capped by device class");
assert.match(html, /for \(var iter = 0; iter < 4; iter\+\+\)/, "floating labels must retain collision avoidance");
assert.match(html, /function updateShootingStars\(dt\)/, "subtle shooting-star layer must exist");
assert.match(html, /prefers-reduced-motion: reduce/, "reduced-motion styling must be respected");
assert.match(html, /var speed = reduced \? 0 : 0\.7;/, "reduced-motion users must start with a still scene");
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

console.log("Galaxy scene checks passed: " + projectIds.length + " project planets, " + coordinateCount + " anchors, " + radiusCount + " radii.");
