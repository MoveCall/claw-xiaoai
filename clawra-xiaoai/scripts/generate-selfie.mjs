#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/';
const MODEL = process.env.MODELSCOPE_IMAGE_MODEL || 'Tongyi-MAI/Z-Image-Turbo';
const POLL_INTERVAL = Number(process.env.MODELSCOPE_POLL_INTERVAL || 5) * 1000;
const MAX_POLLS = Number(process.env.MODELSCOPE_MAX_POLLS || 60);
const TIMEOUT = Number(process.env.MODELSCOPE_TIMEOUT || 60) * 1000;

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function parseArgs(argv) {
  const out = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--prompt') out.prompt = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
}

async function fetchBuffer(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

const args = parseArgs(process.argv.slice(2));
if (!args.prompt) fail('Usage: generate-selfie.mjs --prompt <text> --out <file> [--json]');
const apiKey = process.env.MODELSCOPE_API_KEY || process.env.MODELSCOPE_TOKEN;
if (!apiKey) fail('MODELSCOPE_API_KEY (or MODELSCOPE_TOKEN) is required in the environment.');
const outPath = resolve(args.out || './clawra-selfie.jpg');

const commonHeaders = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

const submit = await fetchJson(`${BASE_URL}v1/images/generations`, {
  method: 'POST',
  headers: { ...commonHeaders, 'X-ModelScope-Async-Mode': 'true' },
  body: JSON.stringify({ model: MODEL, prompt: args.prompt })
});
const taskId = submit.task_id;
if (!taskId) fail(`Missing task_id in response: ${JSON.stringify(submit)}`);

let last;
let imageUrl;
for (let i = 0; i < MAX_POLLS; i++) {
  last = await fetchJson(`${BASE_URL}v1/tasks/${taskId}`, {
    headers: { ...commonHeaders, 'X-ModelScope-Task-Type': 'image_generation' }
  });
  if (last.task_status === 'SUCCEED') {
    imageUrl = last.output_images?.[0];
    if (!imageUrl) fail(`Task succeeded but no output_images: ${JSON.stringify(last)}`);
    break;
  }
  if (last.task_status === 'FAILED') fail(`Image generation failed: ${JSON.stringify(last)}`);
  await new Promise(r => setTimeout(r, POLL_INTERVAL));
}
if (!imageUrl) fail(`Timed out waiting for task ${taskId}. Last response: ${JSON.stringify(last)}`);
const buf = await fetchBuffer(imageUrl);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buf);
const result = { ok: true, task_id: taskId, image_url: imageUrl, saved_path: outPath, model: MODEL, task_status: last.task_status };
if (args.json) console.log(JSON.stringify(result, null, 2));
else console.log(outPath);
