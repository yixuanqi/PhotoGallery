import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
const testDir=path.dirname(fileURLToPath(import.meta.url));
const dir=path.join(testDir,'test-results','screenshots');
const baselineDir=path.join(testDir,'baselines');
const threeFile=fs.readFileSync(path.join(testDir,'../node_modules/three/build/three.module.js'));

async function openGame(page){
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Tests use the installed Three.js release, not a public CDN.
 await page.route(/https:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com)\/three@0\.170\.0\/build\/three\.module\.js/,route=>route.fulfill({
  status:200,contentType:'text/javascript',
  headers:{'access-control-allow-origin':'*'},body:threeFile
 }));
 await page.goto('/?visualTest=1',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>window.__ISLEBOUND_DEBUG?.isReady?.()===true),{timeout:45000}).toBe(true);
 await expect(page.locator('#error')).not.toBeVisible();
 if(errors.length)throw new Error(errors.join('\n'));
 return errors;
}
function imageHealth(buffer,label){
 const png=PNG.sync.read(buffer);
 const colors=new Set(),sample=[];
 let bright=0,n=0;
 for(let y=15;y<png.height;y+=13)for(let x=15;x<png.width;x+=13){
  const k=(y*png.width+x)*4,r=png.data[k],g=png.data[k+1],b=png.data[k+2];
  colors.add([r>>4,g>>4,b>>4].join(':'));
  if(r>242&&g>242&&b>242)bright++;
  n++;sample.push((r+g+b)/3);
 }
 const avg=sample.reduce((a,b)=>a+b,0)/sample.length;
 expect(colors.size,label+' has too few colors').toBeGreaterThan(25);
 expect(bright/n,label+' is almost blank white').toBeLessThan(.67);
 expect(avg,label+' is almost all black').toBeGreaterThan(20);
 return {uniqueColorBuckets:colors.size,whiteFraction:+(bright/n).toFixed(3),averageLuma:+avg.toFixed(1)};
}
function compareWithBaseline(buffer,name){
 const refFile=path.join(baselineDir,name);
 if(!fs.existsSync(refFile))return {status:'baseline-not-approved',meanAbsoluteRgbDifference:null};
 const prev=PNG.sync.read(fs.readFileSync(refFile)),now=PNG.sync.read(buffer);
 expect(now.width).toBe(prev.width);expect(now.height).toBe(prev.height);
 let sum=0,count=0;
 for(let y=0;y<now.height;y+=5)for(let x=0;x<now.width;x+=5){
  const i=(y*now.width+x)*4;
  for(let ch=0;ch<3;ch++){sum+=Math.abs(now.data[i+ch]-prev.data[i+ch]);count++}
 }
 const difference=sum/(count*255);
 expect(difference,name+' drifted significantly from approved baseline').toBeLessThan(.38);
 return {status:'compared',meanAbsoluteRgbDifference:+difference.toFixed(4)};
}
test('4 island viewpoints x clear / storm / fog: automatic visual captures',async({page})=>{
 await openGame(page);
 fs.mkdirSync(dir,{recursive:true});
 const report=[];
 for(const island of ['dog','cat','light','garden']){
  for(const weather of ['clear','storm','fog']){
   const ok=await page.evaluate(([a,b])=>window.__ISLEBOUND_DEBUG.setVisualTestView(a,b),[island,weather]);
   expect(ok).toBe(true);
   await page.waitForTimeout(350);
   const filename=island+'-'+weather+'.png';
   const buffer=await page.screenshot({animations:'disabled',caret:'hide',path:path.join(dir,filename)});
   const pixels=imageHealth(buffer,filename);
   const baseline=compareWithBaseline(buffer,filename);
   const draw=await page.evaluate(()=>window.__ISLEBOUND_DEBUG.renderer.info.render.calls);
   expect(draw).toBeGreaterThan(0);expect(draw).toBeLessThan(1300);
   report.push({island,weather,filename,drawCalls:draw,...pixels,...baseline});
  }
 }
 fs.writeFileSync(path.join(dir,'visual-report.json'),JSON.stringify(report,null,2));
 expect(report).toHaveLength(12);
});
test('dog and cat quests can be accepted, completed and restored as postcards',async({page})=>{
 await openGame(page);
 await page.locator('#startBtn').click();
 for(const id of ['dog','cat']){
  await page.evaluate(islandId=>{
   const game=window.__ISLEBOUND_DEBUG,isl=game.islands.find(x=>x.id===islandId);
   Object.assign(game.state,{x:isl.runwayWorld.x,y:55,z:isl.runwayWorld.z,
    speed:20,yaw:isl.runway.heading,pitch:0,mode:'flight',paused:false,started:true,ground:null});
  },id);
  await page.keyboard.press('e');
  await expect.poll(()=>page.evaluate(()=>window.__ISLEBOUND_DEBUG.state.mode),{timeout:17000}).toBe('ground');
  await expect(page.locator('#questPanel')).toBeVisible();
  await page.keyboard.press('q');
  await expect.poll(()=>page.evaluate(()=>window.__ISLEBOUND_DEBUG.getActiveQuest())).toBe(id);
  await page.keyboard.press('f');
  await expect.poll(()=>page.evaluate(()=>window.__ISLEBOUND_DEBUG.state.mode),{timeout:13000}).toBe('flight');
  await page.evaluate(islandId=>{
   const game=window.__ISLEBOUND_DEBUG,isl=game.islands.find(x=>x.id===islandId),target=game.questTarget(isl);
   Object.assign(game.state,{x:target.x,y:target.y,z:target.z,mode:'flight',paused:false});
  },id);
  await expect.poll(()=>page.evaluate(islandId=>window.__ISLEBOUND_DEBUG.islands.find(x=>x.id===islandId).postcard,id),{timeout:5000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.__ISLEBOUND_DEBUG.getActiveQuest())).toBe(null);
 }
 await page.locator('#journalBtn').click();
 await expect(page.locator('.postcard-art:not(.locked)')).toHaveCount(2);
 await expect(page.locator('#journalList')).toContainText('已收藏纪念明信片');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('islebound_exploration_v1')));
 expect(saved.dog.postcard).toBe(true);expect(saved.cat.postcard).toBe(true);
 await page.reload();
 await expect.poll(()=>page.evaluate(()=>window.__ISLEBOUND_DEBUG?.isReady?.()===true),{timeout:45000}).toBe(true);
 const loaded=await page.evaluate(()=>window.__ISLEBOUND_DEBUG.islands.filter(i=>i.postcard).map(i=>i.id).sort());
 expect(loaded).toEqual(['cat','dog']);
});
