import {defineConfig} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const testDir=path.dirname(fileURLToPath(import.meta.url));
const repository=path.resolve(testDir,'../../..');
export default defineConfig({
 testDir,
 testMatch:'**/*.spec.mjs',
 workers:1,
 timeout:90000,
 expect:{timeout:20000},
 retries:process.env.CI?1:0,
 reporter:[['list'],['html',{outputFolder:path.join(testDir,'test-results','report'),open:'never'}]],
 outputDir:path.join(testDir,'test-results','artifacts'),
 use:{
  baseURL:'http://127.0.0.1:4179',browserName:'chromium',
  viewport:{width:1280,height:720},deviceScaleFactor:1,
  launchOptions:{args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']}
 },
 webServer:{
  command:'python3 -m http.server 4179 --bind 127.0.0.1 --directory docs/islebound',
  cwd:repository,url:'http://127.0.0.1:4179/',timeout:30000,
  reuseExistingServer:!process.env.CI
 }
});
