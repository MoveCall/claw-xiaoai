#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SKILL_ID = 'claw-xiaoai';
const SOUL_SECTION_BEGIN = '<!-- CLAW-XIAOAI:BEGIN -->';
const SOUL_SECTION_END = '<!-- CLAW-XIAOAI:END -->';

function usage() {
  console.log(`claw-xiaoai commands:
  install
  gen-config [output]
  build-prompt <request> [--mode direct|mirror]
  gen-caption <request text>
  gen-selfie --prompt <text> --out <file> [--json] [--retry N]`);
}

function resolveOpenClawPaths() {
  const configuredHome = process.env.OPENCLAW_HOME?.trim();
  const openClawHome = configuredHome ? resolve(configuredHome) : resolve(homedir(), '.openclaw');
  return {
    openClawHome,
    skillsDir: resolve(openClawHome, 'skills'),
    skillDestDir: resolve(openClawHome, 'skills', SKILL_ID),
    workspaceDir: resolve(openClawHome, 'workspace'),
    soulMdPath: resolve(openClawHome, 'workspace', 'SOUL.md')
  };
}

const map = {
  'gen-config': resolve(root, 'skill/scripts/generate-claw-xiaoai-config.mjs'),
  'build-prompt': resolve(root, 'skill/scripts/build-claw-xiaoai-prompt.mjs'),
  'gen-caption': resolve(root, 'skill/scripts/generate-caption.mjs'),
  'gen-selfie': resolve(root, 'skill/scripts/generate-selfie.mjs')
};

function logStep(step, message) {
  console.log(`[${step}] ${message}`);
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectSoulSection(soulMdPath, templateText) {
  const section = `${SOUL_SECTION_BEGIN}\n${templateText.trim()}\n${SOUL_SECTION_END}`;
  const pattern = new RegExp(`${escapeRegExp(SOUL_SECTION_BEGIN)}[\\s\\S]*?${escapeRegExp(SOUL_SECTION_END)}\\n?`, 'm');
  const existing = existsSync(soulMdPath) ? readText(soulMdPath) : '';

  if (!existing.trim()) {
    writeFileSync(soulMdPath, `${section}\n`, 'utf8');
    return 'created';
  }

  if (pattern.test(existing)) {
    const next = existing.replace(pattern, `${section}\n`);
    writeFileSync(soulMdPath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
    return 'updated';
  }

  const separator = existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
  writeFileSync(soulMdPath, `${existing}${separator}${section}\n`, 'utf8');
  return 'appended';
}

function runInstaller() {
  const paths = resolveOpenClawPaths();
  const skillSourceDir = resolve(root, 'skill');
  const soulTemplatePath = resolve(root, 'templates', 'soul-injection.md');

  logStep('1/4', `Preparing OpenClaw directories under ${paths.openClawHome}`);
  mkdirSync(paths.skillsDir, { recursive: true });
  mkdirSync(paths.workspaceDir, { recursive: true });

  logStep('2/4', `Installing skill to ${paths.skillDestDir}`);
  cpSync(skillSourceDir, paths.skillDestDir, { recursive: true, force: true });

  logStep('3/4', `Updating ${paths.soulMdPath}`);
  const soulStatus = injectSoulSection(paths.soulMdPath, readText(soulTemplatePath));

  logStep('4/4', 'Done');
  console.log('');
  console.log(`Installed ${SKILL_ID} to ${paths.skillDestDir}`);
  console.log(`SOUL.md ${soulStatus} at ${paths.soulMdPath}`);
  console.log('');
  console.log('Next:');
  console.log('1. Open OpenClaw');
  console.log('2. Go to Skills');
  console.log(`3. Find ${SKILL_ID}`);
  console.log('4. Paste your ModelScope token into the API key field');
}

const [cmd, ...args] = process.argv.slice(2);

if (!cmd || cmd === 'install') {
  runInstaller();
  process.exit(0);
}

if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
  usage();
  process.exit(0);
}

if (!map[cmd]) {
  usage();
  process.exit(1);
}

const result = spawnSync(process.execPath, [map[cmd], ...args], { stdio: 'inherit' });
process.exit(result.status ?? 1);
