import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const port=8793, origin="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1","--directory","docs"],{stdio:"ignore"});
let browser;
async function ready(){
 for(let i=0;i<40;i++){
  try{if((await fetch(origin)).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error("Local server failed");
}
async function state(page){
 return page.evaluate(()=>{
  const tel=document.getElementById("telemetry-aside");
  const ctrl=document.getElementById("control-aside");
  const tb=document.getElementById("telemetry-body");
  const cb=document.getElementById("panel-body");
  const bar=document.getElementById("mobile-panel-launchers");
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom}};
  return {
   telemetry:tel.dataset.open,
   control:ctrl.dataset.open,
   telemetryHidden:tb.hidden,
   controlHidden:cb.hidden,
   barVisible:getComputedStyle(bar).display!=="none",
   backdropHidden:document.getElementById("mobile-panel-backdrop").hidden,
   telRect:rect(tel),ctrlRect:rect(ctrl),
   controlScroll:cb.scrollHeight>cb.clientHeight
  };
 });
}
try{
 await ready();
 await mkdir(resolve("screenshots/gravity"),{recursive:true});
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:740},{width:820,height:740}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  // Panel controls are classic scripts, so test responsive behavior without launching a heavy GPU workload.
  await page.route("**/esm.sh/**",r=>r.abort());
  await page.route("**/fonts.googleapis.com/**",r=>r.fulfill({status:200,contentType:"text/css",body:""}));
  await page.goto(origin+"/gravity-lens/",{waitUntil:"domcontentloaded",timeout:45000});
  let s=await state(page);
  assert.equal(s.telemetry,"false");assert.equal(s.control,"false");
  assert.equal(s.telemetryHidden,true);assert.equal(s.controlHidden,true);
  assert.equal(s.backdropHidden,true);assert.equal(s.barVisible,true);
  const left=await page.locator("#mobile-telemetry-launcher").boundingBox();
  const right=await page.locator("#mobile-control-launcher").boundingBox();
  assert.ok(left&&right&&left.height>=44&&right.height>=44,"Tap targets >=44px");
  assert.ok(left.x+left.width+5<=right.x&&right.x+right.width<=viewport.width+1,"Top launchers fit");
  if(viewport.width===390)await page.screenshot({path:resolve("screenshots/gravity/collapsed.png")});
  await page.locator("#mobile-telemetry-launcher").click();
  s=await state(page);
  assert.equal(s.telemetry,"true");assert.equal(s.control,"false");
  assert.equal(s.telemetryHidden,false);assert.equal(s.backdropHidden,false);
  assert.ok(s.telRect.x>=0&&s.telRect.right<=viewport.width+1&&s.telRect.bottom<=viewport.height+1,"Telemetry fits viewport");
  if(viewport.width===390)await page.screenshot({path:resolve("screenshots/gravity/telemetry.png")});
  await page.locator("#mobile-control-launcher").click();
  s=await state(page);
  assert.equal(s.telemetry,"false");assert.equal(s.control,"true");
  assert.equal(s.telemetryHidden,true);assert.equal(s.controlHidden,false);
  assert.ok(s.ctrlRect.x>=0&&s.ctrlRect.right<=viewport.width+1&&s.ctrlRect.bottom<=viewport.height+1,"Controls fit viewport");
  assert.ok(s.controlScroll,"Controls scroll within drawer");
  if(viewport.width===390)await page.screenshot({path:resolve("screenshots/gravity/controls.png")});
  await page.locator("#mobile-panel-backdrop").click({position:{x:viewport.width/2,y:viewport.height-4}});
  s=await state(page);
  assert.equal(s.telemetry,"false");assert.equal(s.control,"false");
  await page.locator("#mobile-telemetry-launcher").click();
  await page.keyboard.press("Escape");
  s=await state(page);
  assert.equal(s.telemetry,"false");
  console.log("PASS mobile",viewport.width+"x"+viewport.height);
  await page.close();
 }
 const desktop=await browser.newPage({viewport:{width:1365,height:900}});
 await desktop.route("**/esm.sh/**",r=>r.abort());
 await desktop.route("**/fonts.googleapis.com/**",r=>r.fulfill({status:200,contentType:"text/css",body:""}));
 await desktop.goto(origin+"/gravity-lens/",{waitUntil:"domcontentloaded",timeout:45000});
 let s=await state(desktop);
 assert.equal(s.telemetry,"true");assert.equal(s.control,"true");assert.equal(s.barVisible,false);
 await desktop.locator("#panel-toggle-btn").click();
 s=await state(desktop);
 assert.equal(s.control,"false");assert.equal(s.telemetry,"true");
 console.log("PASS desktop collapse regression");
 await desktop.close();
}finally{
 if(browser)await browser.close();
 server.kill("SIGTERM");
}
