// Run from repository root: node docs/islebound/tests/label-regression.mjs
// Headless guards for island scene-label projection; no external dependencies.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert(script,'gameplay module missing');
new Function('return (async function(){\n'+script+'\n})');

const frame=script.slice(script.indexOf('function frame(){'),script.indexOf("addEventListener('resize'"));
const camIndex=frame.indexOf('updateCamera(Math.min(dt,.05));');
const labelIndex=frame.indexOf('updateSceneLabels(dt);');
const hudIndex=frame.indexOf('if(uiWait>.08)');
assert(camIndex>=0 && labelIndex>camIndex && hudIndex>labelIndex,
  'labels must update each rendered frame after the camera, outside throttled HUD');
assert(!script.includes('function updateLabels(){') && !frame.includes('drawMap();updateLabels();'),
  'legacy 12.5Hz label projection must be removed');
assert(script.includes('function updateAssistHint()') && frame.includes('drawMap();updateAssistHint();'),
  'runway assist remains on the low-frequency HUD path');
assert(/\.scene-label\{[^}]*will-change:transform,opacity/.test(html),'GPU-composited labels expected');
assert(/\.scene-label\{[^}]*transition:none/.test(html),'avoid double opacity interpolation');
assert(script.includes('const labelWorld=new THREE.Vector3()'),'reusable projection vector expected');

const begin=script.indexOf('function sceneLabelFade(t)');
const end=script.indexOf('function updateAssistHint()',begin);
assert(begin>=0&&end>begin,'label logic not found');
const src=script.slice(begin,end);
const THREE={MathUtils:{clamp:(v,a,b)=>Math.min(b,Math.max(a,v))}};
const ISLANDS=[{x:10,z:0,id:'dog'}];
const state={x:0,z:0,started:true,camera:0};
const label={style:{opacity:'0',transform:''}};
const sceneLabels=[label],labelAlphas=new Float32Array(1),camera={x:0};
const labelWorld={
 x:0,y:0,z:0,
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;},
 project(cam){this.x=(this.x-cam.x)/100;this.y=.2;this.z=.5;return this;}
};
const update=new Function('THREE','ISLANDS','state','sceneLabels','labelAlphas','labelWorld',
 'camera','innerWidth','innerHeight','panelOpen',src+';return updateSceneLabels;')(
 THREE,ISLANDS,state,sceneLabels,labelAlphas,labelWorld,camera,1000,600,false);
const positions=[],alphas=[];
for(let i=0;i<120;i++){
 camera.x=i/15;update(1/60);
 const p=label.style.transform.match(/translate3d\(([\d.]+)px/);
 assert(p,'label must use GPU transform');
 positions.push(Number(p[1]));alphas.push(Number(label.style.opacity));
}
assert(positions.slice(1).every((p,i)=>p<positions[i]&&positions[i]-p<1),
 '120 frames of camera movement must produce continuous subpixel label motion');
assert(alphas[0]>0&&alphas[0]<.2&&alphas[20]>alphas[0]&&alphas.at(-1)>.90,
 'labels must fade in smoothly rather than pop into view');
state.camera=2;for(let i=0;i<24;i++)update(1/60);
assert(Number(label.style.opacity)<.07,'close camera view fades labels out smoothly');
console.log('Islebound labels regression passed: per-frame projection, smooth fade, HUD isolation, camera-view changes.');
