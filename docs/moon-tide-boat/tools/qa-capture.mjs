#!/usr/bin/env node
/**
 * 《月潮孤舟》零依赖本地 Chrome/Edge 真核一键视觉抓帧与金标对照工具
 * 用法（在 moon-tide-boat 目录下执行）：
 *   node tools/qa-capture.mjs                 -> 在 Chrome/Edge 无头真核下生成 6 宫格实机拼图 + 6 张单帧
 *   node tools/qa-capture.mjs --update-golden -> 将本次真核抓帧锁存为 tools/golden/ 金标基准
 *
 * 无需 npm install，自动探测 Windows 10 (Chrome/Edge)、macOS、Linux 系统浏览器！
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'qa-output');
const GOLDEN_DIR = path.join(__dirname, 'golden');
const UPDATE_GOLDEN = process.argv.includes('--update-golden');

const SHOTS = [
  '01_harbor_twilight',
  '02_biolum_turn',
  '03_clear_dive',
  '04_impact_boil',
  '05_murky_ash',
  '06_dawn_clear'
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml'
};

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('未找到本地 Chrome 或 Edge，请通过环境变量 CHROME_PATH 指定浏览器可执行文件路径。');
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cleanPath = (req.url || '/').split('?')[0];
      const rel = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
      const full = path.join(ROOT, rel);
      if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(full);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

function captureUrl(browser, url, outPng, width, height) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    '--virtual-time-budget=2000',
    `--screenshot=${outPng}`,
    url
  ];
  execFileSync(browser, args, { stdio: 'pipe' });
}

async function main() {
  const browser = findBrowser();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (UPDATE_GOLDEN) fs.mkdirSync(GOLDEN_DIR, { recursive: true });

  const { server, port } = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${port}/tools/qa-runner.html`;
  console.log(`[QA] 浏览器真核: ${browser}`);
  console.log(`[QA] 本地静态服务: http://127.0.0.1:${port}`);

  try {
    // 1. 抓取完整 6 宫格总览图（1920x784）
    const sheetOut = path.join(OUT_DIR, 'lv1-chrome-qa-sheet.png');
    captureUrl(browser, `${baseUrl}?mode=sheet`, sheetOut, 1920, 784);
    console.log(`[OK] 6 宫格总览图 -> ${sheetOut}`);

    // 2. 抓取 6 张单帧高清图（960x540）并对比金标字节/体积差异
    for (const id of SHOTS) {
      const shotOut = path.join(OUT_DIR, `${id}.png`);
      captureUrl(browser, `${baseUrl}?shot=${id}`, shotOut, 960, 540);

      const goldenPath = path.join(GOLDEN_DIR, `${id}.png`);
      if (UPDATE_GOLDEN) {
        fs.copyFileSync(shotOut, goldenPath);
        console.log(`[GOLDEN LOCKED] ${id}.png`);
      } else if (fs.existsSync(goldenPath)) {
        const curBuf = fs.readFileSync(shotOut);
        const refBuf = fs.readFileSync(goldenPath);
        const same = curBuf.equals(refBuf);
        console.log(`[CHECK] ${id}.png -> ${same ? 'PASS (与金标完全一致)' : `DIFF (大小 ${curBuf.length} vs 金标 ${refBuf.length})`}`);
      } else {
        console.log(`[CAPTURED] ${id}.png (尚未锁金标，可加 --update-golden 锁定)`);
      }
    }

    if (UPDATE_GOLDEN) {
      fs.copyFileSync(sheetOut, path.join(GOLDEN_DIR, 'lv1-chrome-golden-sheet.png'));
      console.log('\n[DONE] 第 1 关 Chrome 真核金标已锁定至 tools/golden/');
    } else {
      console.log('\n[DONE] 实机抓帧完成，打开 tools/qa-output/lv1-chrome-qa-sheet.png 即可一眼验收！');
    }
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('[QA ERROR]', err.message);
  process.exit(1);
});
