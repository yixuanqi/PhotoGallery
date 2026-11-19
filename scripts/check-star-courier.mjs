import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
const html = readFileSync("docs/star-courier/index.html","utf8");
const checks = [
 ["project title", /<title>星际小快递 · 引力弹弓<\/title>/],
 ["Three.js runtime", /three\.js\/r128\/three\.min\.js/],
 ["simulation engine", /class PhysicsWorld|PhysicsWorld/],
 ["RK4 integrator", /\bRK4\b|龙格-库塔/],
 ["touch controls", /data-touch="thrust"/],
 ["keyboard controls", /addEventListener\('keydown'/],
 ["view canvas", /id="canvas-container"/],
 ["game loop", /requestAnimationFrame\(animate\)/],
 ["startup", /initApp\(\)/]
];
for (const [label,regex] of checks) assert.match(html,regex,label);
for (const [i,match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
  if (match[1].trim()) assert.doesNotThrow(()=>new Script(match[1]),"inline script "+i);
}
const catalog=JSON.parse(readFileSync("docs/projects.json","utf8"));
const project=catalog.projects.find(p=>p.id==="star-courier");
assert.ok(project,"catalog must register courier");
assert.equal(project.sourcePath,"docs/star-courier/index.html");
assert.equal(project.primaryUrl,"https://yixuanqi.github.io/PhotoGallery/star-courier/");
console.log("Star Courier standalone entry and catalog registration verified.");
