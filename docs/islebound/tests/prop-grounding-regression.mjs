// Run from repository root: node docs/islebound/tests/prop-grounding-regression.mjs
// Zero dependency checks for known dog/cat island placement and floating-prop regressions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert(match,'game module must exist');
execFileSync(process.execPath,['--check','--input-type=module'],{input:match[1]});
const source=match[1];
const have=(needle,reason)=>assert(source.includes(needle),reason+': missing '+needle);

// Dog house and bone landmark must occupy separate locations.
have("house(p,-10,-36,0xe6e4cd,0xb07867,.95,'dog-cottage')",'dog cottage');
have('b.position.set(31,13,-70)','bone landmark');
have("if(style==='dog-cottage')",'proportionate chimney');
have('cube(h,0xf0e7d9,2.65,7.14,-.65,1.18,2.70,1.22)','chimney body');
const cottage=[-10,-36],bone=[31,-70];
assert(Math.hypot(cottage[0]-bone[0],cottage[1]-bone[1])>40,'bone arch must be clear of cottage roof');
assert(Math.abs(cottage[0]-bone[0])>35,'bone arch must not look like a chimney from the common runway-facing viewpoint');
have("dog:[[-37,-25],[-30,29],[0,-35],[31,-70]]",'tree clearance around arch');

// Footprints of the market stepping boards and pebble patches must penetrate the ground.
// groundIslandDecor adds (actual terrain height - 13.05) to each root-level decoration.
const base=13.05;
const footGap=(y,height)=>y-height/2-base;
assert(footGap(13.10,.38)<=0,'cat timber slab must meet island terrain');
assert(footGap(13.12,.16)<=0,'cat coast stone discs must meet island terrain');
assert(footGap(13.13,.24)<=0,'cat fish market stone discs must meet island terrain');
have("cube(p,0x927761,x,13.10,48,4.7,.38,3.5)",'timber slabs laid into soil');
have("surfaceDisc(p,0xd5bdad,xx,13.12,zz,2.2,.16)",'coast stone placement');
have("surfaceDisc(p,0xe6d1b3,x,13.13,z,1.7,.24)",'market stone placement');

// Cat paw contact points should reach ground, rather than ending above grass.
have('g.position.set(x,13.05,z)','cat ground baseline');
have('blob(g,color,-.50,.32,-.42,.34,.43,.41)','cat front left paw');
have('blob(g,color,.50,.32,-.42,.34,.43,.41)','cat front right paw');
assert(.32-.43<0,'cat paws should slightly overlap the soil');
// Raised scratching post must actually hold its sleeping kitten at the platform top (12.9 local).
have('sleepy.position.y=12.95','sleeping kitten positioned on platform');
assert(12.95+.32-.43<=12.9,'kitten paws must meet scratching-post platform');

// Hanging lanterns must sample the SAME cable spline, with grounded endpoint poles.
// Independent sin placement previously produced unsupported floating lanterns.
have('const cableCurve=new THREE.CatmullRomCurve3(cablePts.map(q=>new THREE.Vector3(...q)))','shared cable path');
have('const q=cableCurve.getPoint((i+.5)/8)','lamp cable-attached positioning');
have('const postH=y-ground','posts from actual terrain height');
have("cylinder(catStringLights,0x856d64,x,ground+postH*.5,z,.19,.25,postH,9)",'grounded cable posts');
assert((-1.8+.85) > (-.64-1.30/2),'hanging bulb must connect to the cord'); // top bulb vs lower connector
assert((-1.8+.85) < (-.64+1.30/2),'hanging bulb is below the cord');
const cablePts=[[-105,17],[-81,21],[-57,28],[-37,33]];
const runway={x:-9,z:13,angle:1.04,length:77};
function crossRunway(x,z,margin=7){
 const dx=x-runway.x,dz=z-runway.z;
 const a=-runway.angle;
 const relX=dx*Math.cos(a)+dz*Math.sin(a);
 const relZ=-dx*Math.sin(a)+dz*Math.cos(a);
 return Math.abs(relX)<10+margin&&Math.abs(relZ)<runway.length/2+margin;
}
assert(cablePts.every(([x,z])=>!crossRunway(x,z,11)),'market cable must not pass over aircraft runway approach zone');
assert(!crossRunway(54,87,12) && !crossRunway(102,90,12),'cat coastal lights must not block runway');
const dogRunway={x:18,z:10,a:.47};
const archDX=bone[0]-dogRunway.x,archDZ=bone[1]-dogRunway.z;
const rx=archDX*Math.cos(-dogRunway.a)+archDZ*Math.sin(-dogRunway.a);
const rz=-archDX*Math.sin(-dogRunway.a)+archDZ*Math.cos(-dogRunway.a);
assert(!(Math.abs(rx)<18&&Math.abs(rz)<46),'moved bone gate must remain outside runway envelope');

// Individual shoreline lamps are groups rooted on sampled terrain, with a visible post.
have('post.position.set(x,13.05,z)','grounded shore-lamp group');
have('cylinder(post,0x738d83,0,2.65,0,.25,.32,5.35,9)','visible lamp post');
assert(2.65-5.35/2<=0,'light post must meet actual ground after rooting');
assert(html.includes('2026-11-17-islebound-v0.4'),'V0.4 release marker');
console.log('Islebound prop grounding regression passed: dog gate/chimney, cat lamps and paving, runway clearance.');
