#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/';
const MODEL = process.env.MODELSCOPE_IMAGE_MODEL || 'Tongyi-MAI/Z-Image-Turbo';
const POLL_INTERVAL = Number(process.env.MODELSCOPE_POLL_INTERVAL || 5) * 1000;
const MAX_POLLS = Number(process.env.MODELSCOPE_MAX_POLLS || 60);
const TIMEOUT = Number(process.env.MODELSCOPE_TIMEOUT || 60) * 1000;
const RETRY_PREFIX = '(young woman, female, same face, same Claw Xiaoai appearance, highly realistic photo, East Asian ethnicity, do not change gender, keep same outfit and same scene)';
const OPENCLAW_CONFIG_PATH = resolve(process.env.HOME || homedir(), '.openclaw', 'openclaw.json');

function fail(msg, code = 1) { console.error(msg); process.exit(code); }
function parseArgs(argv) {
  const out = { json: false, retry: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--prompt') out.prompt = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--retry') out.retry = Number(argv[++i] || 1);
  }
  return out;
}
function readApiKeyFromOpenClawConfig() {
  try {
    if (!existsSync(OPENCLAW_CONFIG_PATH)) return undefined;
    const data = JSON.parse(readFileSync(OPENCLAW_CONFIG_PATH, 'utf8'));
    const entry = data?.skills?.entries?.['claw-xiaoai'];
    if (entry && typeof entry.apiKey === 'string' && entry.apiKey.trim()) return entry.apiKey.trim();
    if (entry?.env?.MODELSCOPE_API_KEY) return String(entry.env.MODELSCOPE_API_KEY).trim();
    if (entry?.env?.MODELSCOPE_TOKEN) return String(entry.env.MODELSCOPE_TOKEN).trim();
  } catch {}
  return undefined;
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
async function generate(prompt, apiKey) {
  const commonHeaders = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const submit = await fetchJson(`${BASE_URL}v1/images/generations`, {
    method: 'POST', headers: { ...commonHeaders, 'X-ModelScope-Async-Mode': 'true' }, body: JSON.stringify({ model: MODEL, prompt })
  });
  const taskId = submit.task_id;
  if (!taskId) throw new Error(`Missing task_id in response: ${JSON.stringify(submit)}`);
  let last, imageUrl;
  for (let i = 0; i < MAX_POLLS; i++) {
    last = await fetchJson(`${BASE_URL}v1/tasks/${taskId}`, { headers: { ...commonHeaders, 'X-ModelScope-Task-Type': 'image_generation' } });
    if (last.task_status === 'SUCCEED') {
      imageUrl = last.output_images?.[0];
      if (!imageUrl) throw new Error(`Task succeeded but no output_images: ${JSON.stringify(last)}`);
      return { taskId, imageUrl, last };
    }
    if (last.task_status === 'FAILED') throw new Error(`Image generation failed: ${JSON.stringify(last)}`);
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error(`Timed out waiting for task ${taskId}. Last response: ${JSON.stringify(last)}`);
}

const args = parseArgs(process.argv.slice(2));
if (!args.prompt) fail('Usage: generate-selfie.mjs --prompt <text> --out <file> [--json] [--retry N]');
const apiKey = process.env.MODELSCOPE_API_KEY || process.env.MODELSCOPE_TOKEN || readApiKeyFromOpenClawConfig();
if (!apiKey) fail('MODELSCOPE_API_KEY / MODELSCOPE_TOKEN is required, or save the skill API key in OpenClaw Skills so it is written to ~/.openclaw/openclaw.json.');
const outPath = resolve(args.out || './claw-xiaoai-selfie.jpg');
let err;
for (let attempt = 1; attempt <= Math.max(1, args.retry); attempt++) {
  const prompt = attempt === 1 ? args.prompt : `${RETRY_PREFIX}, ${args.prompt}`;
  try {
    const { taskId, imageUrl, last } = await generate(prompt, apiKey);
    const buf = await fetchBuffer(imageUrl);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, buf);
    const result = { ok: true, task_id: taskId, image_url: imageUrl, saved_path: outPath, model: MODEL, task_status: last.task_status, attempt };
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else console.log(outPath);
    process.exit(0);
  } catch (e) {
    err = e;
  }
}
fail(String(err?.message || err || 'unknown error'));
