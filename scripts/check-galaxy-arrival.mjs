import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { Script } from "node:vm";
const html = readFileSync("docs/galaxy/index.html", "utf8");
const catalog = JSON.parse(readFileSync("docs/projects.json", "utf8"));

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

// Project detail cards must not expose source-code links.
assert.doesNotMatch(html, /source:\s*view\.sourceUrl/, "galaxy project data must not carry source-link URLs");
assert.doesNotMatch(html, /查看源码/, "galaxy project cards must not render source-code links");

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
assert.match(html, /arrivalFovRad = THREE\.MathUtils\.degToRad\(54\)/, "arrival must inherit the rocket scene's 54-degree exit FOV");
assert.match(html, /camera\.fov = 54;/, "arrival camera must start at the source exit FOV");
assert.match(html, /fromFov: 54,/, "camera FOV must settle from the shared source FOV");
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

// Project metadata is sourced from docs/projects.json; the HTML must not duplicate it.
assert.match(html, /fetch\('\.\.\/projects\.json'/, "galaxy must load the canonical project catalog");
assert.match(html, /var PROJECTS = \[\];/, "galaxy must not embed a second project metadata list");
assert.match(html, /PROJECTS = records\.map\(function \(project\)/, "galaxy projects must be mapped from catalog records");
assert.match(html, /PLANET_BASE_COORDS = PROJECTS\.map\(function \(project\) \{ return project\.position; \}\)/, "planet coordinates must be derived from ID-keyed catalog presentation data");
assert.match(html, /PLANET_BASE_RADII = PROJECTS\.map\(function \(project\) \{ return project\.radius; \}\)/, "planet radii must be derived from catalog presentation data");
assert.match(html, /POSTS = BASE_POSTS\.concat\(PROJECTS\.filter\(function \(project\) \{ return !!project\.journal; \}\)/, "project journals must be derived from catalog records");
assert.match(html, /function boot\(\)[\s\S]*loadProjectCatalog\(\)/, "galaxy must wait for catalog loading before initialization");
assert.match(html, /var tmpCamUp = null;/, "Three.js vectors must not be constructed before the availability guard");
assert.match(html, /var tmpAnchor = null;/, "label anchor vector must be lazily initialized");
assert.match(html, /tmpCamUp = new THREE\.Vector3\(\);[\s\S]*tmpAnchor = new THREE\.Vector3\(\);/, "Three.js vectors must be initialized after the WebGL dependency check");

const projects = catalog.projects.filter(project => project.id !== "galaxy").sort((a,b) => a.sortOrder - b.sortOrder);
const projectIds = projects.map(project => project.id);
assert.ok(projectIds.length > 0, "at least one project must be registered");
assert.equal(new Set(projectIds).size, projectIds.length, "catalog project IDs must be unique");
assert.equal(new Set(projects.map(project => project.sortOrder)).size, projects.length, "project sort orders must be unique");
for (const project of projects) {
  const view = project.galaxy;
  assert.ok(view && typeof view === "object", project.id + " must have galaxy presentation data");
  assert.ok(Array.isArray(view.position) && view.position.length === 3 && view.position.every(Number.isFinite), project.id + " must have one 3D position");
  assert.ok(Number.isFinite(view.radius) && view.radius > 0, project.id + " must have a positive planet radius");
  assert.ok(Array.isArray(view.palette) && view.palette.length === 3, project.id + " must have a three-color palette");
  if (view.journal) {
    assert.equal(view.journal.id, project.id + "-note", project.id + " journal ID must be stable");
    assert.ok(Number.isInteger(view.journal.order) && view.journal.order > 0, project.id + " journal order must be positive");
  }
}
const journalIds = projects.filter(project => project.galaxy.journal).map(project => project.galaxy.journal.id);
const journalOrders = projects.filter(project => project.galaxy.journal).map(project => project.galaxy.journal.order);
assert.equal(new Set(journalIds).size, journalIds.length, "journal IDs must be unique");
assert.equal(new Set(journalOrders).size, journalOrders.length, "journal order values must be unique");
console.log("Galaxy arrival checks passed: shared portal clock, catalog-driven " + projectIds.length + " project planets, and " + journalIds.length + " project journal entries.");
