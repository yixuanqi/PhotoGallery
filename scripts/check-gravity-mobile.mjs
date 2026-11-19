import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
const html = readFileSync("docs/gravity-lens/index.html", "utf8");
const checks = [
  ["telemetry drawer", /id="telemetry-panel"/],
  ["telemetry body", /id="telemetry-body"/],
  ["settings drawer", /id="control-panel"/],
  ["settings body", /id="panel-body"/],
  ["mobile data launcher", /id="mobile-telemetry-launcher"/],
  ["mobile settings launcher", /id="mobile-control-launcher"/],
  ["mobile backdrop", /id="mobile-panel-backdrop"[^>]*hidden/],
  ["responsive breakpoint", /@media \(max-width: 1023px\)/],
  ["hidden mobile drawer", /#telemetry-aside\[data-open="false"\], #control-aside\[data-open="false"\]/],
  ["viewport height cap", /max-height: calc\(100dvh - 78px/],
  ["safe-area insets", /safe-area-inset-top/],
  ["panel internal scroll", /overscroll-behavior: contain/],
  ["exclusive telemetry", /if \(small\.matches && telemetryOpen\) controlOpen = false;/],
  ["exclusive settings", /if \(small\.matches && controlOpen\) telemetryOpen = false;/],
  ["keyboard close", /event\.key !== 'Escape'/],
  ["resize crossing", /small\.addEventListener\('change', updateBreakpoint\)/],
  ["sparkline resize hook", /gravity:telemetry-visible/],
  ["FPS in compact launcher", /mobile-launcher-fps/],
  ["GPGPU system retained", /allocateGpgpuResources\(384\)/]
];
checks.forEach(([name,re])=>assert.match(html,re,name));
let parsed=0;
for(const [i,m] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries()){
  if(!m[2].trim()||/importmap|type="module"/.test(m[1]))continue;
  assert.doesNotThrow(()=>new Script(m[2]),"inline classic script "+i);
  parsed++;
}
assert.ok(parsed>=1);
console.log("Gravity mobile interface validated: "+checks.length+" contracts, "+parsed+" scripts.");
