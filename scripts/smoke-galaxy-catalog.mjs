import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
const catalog=JSON.parse(await readFile("docs/projects.json","utf8"));
const records=catalog.projects.filter(p=>p.id!=="galaxy");
const expectedPlanets=records.length, expectedPosts=2+records.filter(p=>p.galaxy?.journal).length;
const port=8795,origin="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1","--directory","docs"],{stdio:"ignore"});
let browser;
async function waitForServer(){for(let i=0;i<40;i++){try{if((await fetch(origin)).ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error("Local static server did not start");}
try{
 await waitForServer();await mkdir(resolve("screenshots"),{recursive:true});
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 const pageErrors=[],catalogResponses=[];
 page.on("pageerror",e=>pageErrors.push(e.message));
 page.on("console",m=>{if(m.type()==="error")pageErrors.push(m.text());});
 page.on("response",r=>{
  if(r.url().endsWith("/projects.json"))catalogResponses.push({status:r.status(),url:r.url()});
  if(r.status()>=400&&!new URL(r.url()).pathname.endsWith("/favicon.ico"))pageErrors.push("HTTP "+r.status()+" "+r.url());
 });
 await page.route("**/favicon.ico",r=>r.fulfill({status:204,body:""}));
 await page.route("**/three.min.js",r=>r.fulfill({status:200,contentType:"application/javascript",body:"window.THREE = undefined;"}));
 await page.goto(origin+"/galaxy/",{waitUntil:"domcontentloaded",timeout:45000});
 await page.waitForTimeout(1000);
 const hydration=await page.evaluate(()=>({
  entryCount:document.querySelectorAll("#index-items button").length,
  failVisible:document.getElementById("fail").classList.contains("show"),
  failReason:document.getElementById("reason").textContent,
  readyState:document.readyState
 }));
 if(hydration.entryCount!==expectedPlanets) throw new Error("Galaxy catalog hydration failed: "+JSON.stringify({hydration,catalogResponses,pageErrors}));
 assert.equal(catalogResponses.length,1,"galaxy must fetch catalog exactly once");
 assert.equal(catalogResponses[0].status,200,"canonical catalog must load");
 if(await page.locator("#fail-index").isVisible()) await page.locator("#fail-index").click();
 else await page.locator("#index").click();
 await page.waitForFunction(()=>document.getElementById("drawer").classList.contains("show"),null,{timeout:5000});
 assert.equal(await page.locator("#index-items button").count(),expectedPlanets,"catalog must populate all registered planets");
 assert.match(await page.locator("#index-items").innerText(),/灰钟残誓/,"new project must appear in index");
 await page.screenshot({path:resolve("screenshots/galaxy-catalog-index.png")});
 await page.locator("#drawer-close").click();await page.locator("#logs").click();
 await page.waitForFunction(()=>document.getElementById("journal").classList.contains("show"),null,{timeout:5000});
 assert.equal(await page.locator("#journal-content .post").count(),expectedPosts,"all base/project journal entries must load");
 assert.match(await page.locator("#journal-content").innerText(),/在沉钟回廊里/,"Ashen journal must appear");
 assert.deepEqual(pageErrors,[],"catalog hydration must not emit browser errors");
 console.log(`PASS Galaxy catalog hydration: ${expectedPlanets} planets, ${expectedPosts} journal entries`);
 await browser.close();
}finally{if(browser)await browser.close();server.kill("SIGTERM");}
