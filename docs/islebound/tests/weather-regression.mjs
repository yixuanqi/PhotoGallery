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
console.log('Islebound weather regression passed: 5 presets, module parse, weather visuals, flight and landing hooks.');
