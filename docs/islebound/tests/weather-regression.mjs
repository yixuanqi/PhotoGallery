// node docs/islebound/tests/weather-regression.mjs
// Zero-dependency regression guard for the inline Three.js module.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert(match,'main gameplay module exists');
execFileSync(process.execPath,['--check','--input-type=module'],{input:match[1]});
for(const [name,expectation] of Object.entries({
 'clear':'晴朗','cloudy':'多云','rain':'小雨','storm':'暴风雨','fog':'海雾'
})) assert(html.includes(name+":{label:'"+expectation+"'"),name+' preset');
for(const token of ['createWeatherSystem()','weather.update(ad,elapsed,state)','weather.applyWind(dt,state,elapsed)',
  'weather.gustRoll(elapsed)','seaMat.uniforms.uRain.value','sky.material.uniforms.uMist.value',
  'rainGeo.attributes.position.needsUpdate=true','weatherBtn','weatherPanel','weatherOptions',
  'weatherAuto','KeyT','uFlash','uStorm','islebound-build',
  'window.__ISLEBOUND_DEBUG={islands:ISLANDS,terrainHeight,renderer,scene,state,weather}']){
 assert(html.includes(token),'missing weather integration '+token);
}
assert(html.indexOf('weather.applyWind(dt,state,elapsed)')>html.indexOf("if(state.mode==='flight')"),'wind inside free flight');
assert(html.includes("}else if(state.mode==='landing'){"),'assisted approach retained');
assert(html.includes("}else if(state.mode==='takeoff'){"),'takeoff retained');
assert(html.includes("const turn=THREE.MathUtils.clamp((boolAny('KeyD','ArrowRight')?1:0)-(boolAny('KeyA','ArrowLeft')?1:0)"),'A/D steer direction retained');
assert.equal((html.match(/id="weatherBtn"/g)||[]).length,1,'one weather button');

// V2: Skies must be visibly different, not merely color-tinted static clouds.
for(const token of ['float valueNoise(vec2 p)','float threshold=mix(.81,.25,clamp(uCover,0.,1.))',
  'sky.material.uniforms.uTime.value=ws.age','cloudBanks=new THREE.InstancedMesh(sphereGeo,bankMat,216)',
  'cloudBanks.visible=values.cover>.14','sunDisc.material.opacity=Math.max(0,.99-values.cover*1.65',
  '2026-11-17-weather-v3-color-safe-fog']){
 assert(html.includes(token),'weather V2 missing: '+token);
}
function frac(x){return x-Math.floor(x);}
function mix(a,b,t){return a+(b-a)*t;}
function smooth(t){return t*t*(3-2*t);}
function hash(x,y){return frac(Math.sin(x*127.1+y*311.7)*43758.5453);}
function vnoise(x,y){const i=Math.floor(x),j=Math.floor(y),fx=smooth(frac(x)),fy=smooth(frac(y));return mix(mix(hash(i,j),hash(i+1,j),fx),mix(hash(i,j+1),hash(i+1,j+1),fx),fy);}
function clamp(x,a=0,b=1){return Math.min(b,Math.max(a,x));}
function smoothstep(a,b,x){return smooth(clamp((x-a)/(b-a)));}
function coverage(c){
 let tot=0,count=0;
 for(let i=0;i<100;i++)for(let j=0;j<80;j++){
  const theta=i/100*Math.PI*2,alt=.04+j/80*.83;
  const dx=Math.cos(theta)*Math.cos(alt),dz=Math.sin(theta)*Math.cos(alt),dy=Math.sin(alt);
  const x=dx*3+dy*1.6,y=dz*3+dy*.6;
  const n=vnoise(x*1.45,y*1.45)*.56+vnoise(x*3.4,y*3.4)*.30+vnoise(x*7.1,y*7.1)*.14;
  const thresh=mix(.81,.25,c);
  tot+=smoothstep(thresh-.105,thresh+.06,n);count++;
 }
 return tot/count;
}
const sunny=coverage(.05),overcast=coverage(.77),rainy=coverage(.91),stormy=coverage(.99);
assert(sunny<.1 && overcast>.7 && rainy>.85 && stormy>.9,
 'insufficient sky-coverage contrast: '+JSON.stringify({sunny,overcast,rainy,stormy}));
assert(overcast>sunny+.6 && stormy>overcast+.12,'weather conditions insufficiently distinct');
console.log('Cloud cover regression passed:', {sunny,overcast,rainy,stormy});


// V3: keep nearby island geometry legible in storms and dense sea fog.
assert(html.includes('new THREE.Fog(0xc7dfe1,850,2600)'), 'must use distance fog instead of exponential fog');
assert(!html.includes('new THREE.FogExp2('), 'FogExp2 can wash away nearby island colors');
assert(html.includes('scene.fog.near=Math.max(145,values.fogNear)'), 'fog minimum distance guard missing');
assert(html.includes('scene.fog.far=Math.max(scene.fog.near+450,values.fogFar)'), 'fog transition range guard missing');
const fogModes={};
for(const name of ['clear','cloudy','rain','storm','fog']){
 const entry=html.match(new RegExp(name+":\\{label:[^\\n]+fogNear:(\\d+),fogFar:(\\d+)\\}"));
 assert(entry,'missing weather-specific fog distance for '+name);
 fogModes[name]={near:+entry[1],far:+entry[2]};
 assert(fogModes[name].far-fogModes[name].near>=450, 'fog transition too abrupt: '+name);
}
const linearFog=(dist,{near,far})=>Math.min(1,Math.max(0,(dist-near)/(far-near)));
assert.equal(linearFog(300,fogModes.storm),0,'at 300 units the storm should preserve full island texture color');
assert(linearFog(500,fogModes.storm)<.3,'mid-distance island must retain >=70% base color in storm');
assert(linearFog(250,fogModes.fog)<.2,'sea fog should not remove nearby runway colors');
assert(linearFog(600,fogModes.fog)>.7,'sea fog still needs to conceal distant scenery');
assert.equal(linearFog(250,fogModes.rain),0,'rain should not desaturate nearby buildings');
assert.equal(linearFog(250,fogModes.cloudy),0,'overcast should not wash out local colors');
const oldStormDensity=.00076+.37*.006+1*.0018+1*.00038;
const oldStormFog=1-Math.exp(-Math.pow(oldStormDensity*300,2));
assert(oldStormFog>.90,'old storm fog sample should reproduce washed-out island symptom');
console.log('Distance-fog regression passed:', {fogModes,oldStormFog,storm500:linearFog(500,fogModes.storm),fog600:linearFog(600,fogModes.fog)});

console.log('Islebound weather regression passed: 5 presets, module parse, weather visuals, flight and landing hooks.');
