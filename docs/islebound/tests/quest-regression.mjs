import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const game=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert(game,'game module not found');
execFileSync(process.execPath,['--check','--input-type=module'],{input:game});
for(const token of [
 'const QUEST_DEFS={','function acceptQuest(){','function finishQuest(){','function updateQuest(dt,time){',
 "if(state.mode==='flight'&&state.started&&!state.paused&&!panelOpen)",
 "if(e.code==='KeyQ')acceptQuest()",'id="questAccept"','id="questTracker"',
 "isl.postcard=!!stored[isl.id]?.postcard","postcard:isl.postcard",
 'postcard-art','updateQuest(ad,elapsed)','refreshQuestUI()',
 'const questMarkers={}','function setVisualTestView('
])assert(html.includes(token),'quest integration missing: '+token);
const q=game.slice(game.indexOf('const QUEST_DEFS={'),game.indexOf('let activeQuest=null'));
assert(q.includes('dx:31,dz:-70,alt:43,radius:25'),'dog bone arch waypoint must match landmark');
assert(q.includes('dx:-80,dz:21,alt:42,radius:25'),'cat fish market waypoint must match landmark');
assert(game.includes("if(!state.started||state.mode!=='ground'||!state.ground||panelOpen)return false"),
 'cannot accept quest while flying');
assert(game.includes('if(!isl||isl.postcard)return false'),'postcards can only be awarded once');
assert(game.includes("state.mode==='flight'"),'completions must require flight');
assert(game.includes('activeQuest=null;refreshQuestUI();'),'finishing quest hides quest tracker');
assert(game.includes('if(!visualQA)return false'),'fixed QA viewpoints gated behind URL query');
assert.equal((html.match(/id="questAccept"/g)||[]).length,1);
console.log('Quest integration passed: 2 island commissions, flight objectives, localStorage rewards, journal and QA hooks.');
