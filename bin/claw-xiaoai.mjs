#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function usage() {
  console.log(`claw-xiaoai commands:
  gen-config [output]
  build-prompt <request> [--mode direct|mirror]
  gen-caption <request text>
  gen-selfie --prompt <text> --out <file> [--json] [--retry N]`);
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  usage();
  process.exit(1);
}

const map = {
  'gen-config': resolve(root, 'skill/scripts/generate-claw-xiaoai-config.mjs'),
  'build-prompt': resolve(root, 'skill/scripts/build-claw-xiaoai-prompt.mjs'),
  'gen-caption': resolve(root, 'skill/scripts/generate-caption.mjs'),
  'gen-selfie': resolve(root, 'skill/scripts/generate-selfie.mjs')
};

if (!map[cmd]) {
  usage();
  process.exit(1);
}

const result = spawnSync(process.execPath, [map[cmd], ...args], { stdio: 'inherit' });
process.exit(result.status ?? 1);
