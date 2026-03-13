#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function usage() {
  console.log(`clawra-xiaoai commands:
  gen-config [output]
  build-prompt <request> [--mode direct|mirror]
  gen-selfie --prompt <text> --out <file> [--json]`);
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  usage();
  process.exit(1);
}

const map = {
  'gen-config': resolve(root, 'scripts/generate-clawra-config.mjs'),
  'build-prompt': resolve(root, 'scripts/build-clawra-prompt.mjs'),
  'gen-selfie': resolve(root, 'scripts/generate-selfie.mjs')
};

if (!map[cmd]) {
  usage();
  process.exit(1);
}

const result = spawnSync(process.execPath, [map[cmd], ...args], { stdio: 'inherit' });
process.exit(result.status ?? 1);
