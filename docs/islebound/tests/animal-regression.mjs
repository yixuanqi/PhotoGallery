import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert(main,'Islebound Three.js module not found');
execFileSync(process.execPath,['--input-type=module','--check'],{input:main});
const span=(start,end)=>main.slice(main.indexOf(start),main.indexOf(end,main.indexOf(start)));
const cat=span('function makeCat(p,x,z,','function makeDog(p,x,z,');
const dog=span('function makeDog(p,x,z,','// --- 二期景观');
assert(cat.includes("g.userData.animal='cat'"),'cat archetype tag');
assert(dog.includes("g.userData.animal='dog'"),'dog archetype tag');
assert(main.includes('const catOuterEarGeo=new THREE.ExtrudeGeometry'),'shared cat ear geometry');
assert(main.includes('const catInnerEarGeo=new THREE.ExtrudeGeometry'),'shared inner ear geometry');
assert(cat.includes('const ear=mesh(catOuterEarGeo'),'cat outer ears need a recognisable triangle');
assert(cat.includes('const pink=mesh(catInnerEarGeo'),'cat ears need visible color interiors');
assert(!dog.includes('catOuterEarGeo'),'dog should have floppy ears, unlike cat');
assert(dog.includes('ear.rotation.z=side*.40'),'dog ear flop silhouette');
assert(cat.includes('color===0x5d6665'),'dark cat needs separately lit facial palette');
assert(cat.includes('2.84,-1.11'),'cat pupils must sit in front of face');
assert(cat.includes('const tail=line(g,[[.74,1.16,.71],[1.43,1.12,1.02]'),
 'cat tail should start BEHIND torso');
assert(cat.includes('[1.85,2.26,1.14]'),'cat tail must curve outside body outline');
assert(!cat.includes('[1.3,2.35,-.15]'),'old through-face tail must not return');
for(const [kind,s] of [['cat',cat],['dog',dog]]){
 assert(s.includes("g.position.set(x,13.05,z)"),kind+' feet grounded to island baseline');
 assert(s.includes('blob(g,'),kind+' must have body/face geometry');
 assert(s.includes('g.userData.tail='),kind+' tail tracked');
}
const ground=[['cat forepaw',.25,.23],['cat hind paw',.23,.22],['dog front paw',.22,.22],['dog hind paw',.23,.24]];
for(const [name,center,radius] of ground)assert(center-radius<=.03,name+' must touch terrain (within 0.03 world unit)');
assert(main.includes('makeCat(p,-25,14,0xe6cfb1,1.56)'),'large cat scaled down for airplane proportions');
assert(main.includes('makeCat(p,13,-29,0x5d6665,1.38)'),'black cat scaled down');
assert(main.includes('function setAnimalPreview('),'front/back screenshot cameras');
assert(main.includes("if(!visualQA||!['cat','dog'].includes(kind)"),'portrait cameras only enabled in QA');
assert(html.includes('2026-11-17-animal-redesign-v1'),'release marker');
console.log('Animal regression passed: shared Q-style geometry, ear silhouettes, tails, ground contact, black-cat contrast, preview views.');
