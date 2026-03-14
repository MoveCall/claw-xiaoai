#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
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
  install [--workspace <dir>] [--managed]
  gen-config [output]
  build-prompt <request> [--mode direct|mirror]
  gen-caption <request text>
  gen-selfie --prompt <text> --out <file> [--json] [--retry N]

Defaults:
  install -> ${SKILL_ID} into OpenClaw Workspace Skills
  install --managed -> ${SKILL_ID} into OpenClaw Installed Skills`);
}

function resolveOpenClawHome() {
  const configuredHome = process.env.OPENCLAW_HOME?.trim();
  return configuredHome ? resolve(configuredHome) : resolve(homedir(), '.openclaw');
}

function resolveWorkspaceRoot(inputWorkspace) {
  if (inputWorkspace) return resolve(inputWorkspace);
  const openClawHome = resolveOpenClawHome();
  return resolve(openClawHome, 'workspace');
}

function resolveInstallPaths(options = {}) {
  const openClawHome = resolveOpenClawHome();
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceDir);

  if (options.managed) {
    return {
      mode: 'managed',
      modeLabel: 'Installed Skills',
      openClawHome,
      workspaceRoot,
      skillsDir: resolve(openClawHome, 'skills'),
      skillDestDir: resolve(openClawHome, 'skills', SKILL_ID),
      soulMdPath: resolve(workspaceRoot, 'SOUL.md')
    };
  }

  return {
    mode: 'workspace',
    modeLabel: 'Workspace Skills',
    openClawHome,
    workspaceRoot,
    skillsDir: resolve(workspaceRoot, 'skills'),
    skillDestDir: resolve(workspaceRoot, 'skills', SKILL_ID),
    soulMdPath: resolve(workspaceRoot, 'SOUL.md')
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

function parseInstallArgs(argv) {
  const options = {
    managed: false,
    workspaceDir: ''
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--managed' || arg === '--global') {
      options.managed = true;
      continue;
    }
    if (arg === '--workspace') {
      options.workspaceDir = argv[i + 1] || '';
      i += 1;
      continue;
    }
    throw new Error(`Unknown install option: ${arg}`);
  }

  if (!options.managed && options.workspaceDir && basename(options.workspaceDir) === 'skills') {
    options.workspaceDir = resolve(options.workspaceDir, '..');
  }

  return options;
}

function runInstaller(options = {}) {
  const paths = resolveInstallPaths(options);
  const skillSourceDir = resolve(root, 'skill');
  const soulTemplatePath = resolve(root, 'templates', 'soul-injection.md');

  logStep('1/4', `Preparing ${paths.modeLabel} under ${paths.skillsDir}`);
  mkdirSync(paths.skillsDir, { recursive: true });
  mkdirSync(dirname(paths.soulMdPath), { recursive: true });

  logStep('2/4', `Installing skill to ${paths.skillDestDir}`);
  cpSync(skillSourceDir, paths.skillDestDir, { recursive: true, force: true });

  logStep('3/4', `Updating ${paths.soulMdPath}`);
  const soulStatus = injectSoulSection(paths.soulMdPath, readText(soulTemplatePath));

  logStep('4/4', 'Done');
  console.log('');
  console.log(`Mode: ${paths.modeLabel}`);
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

if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
  usage();
  process.exit(0);
}

if (!cmd || cmd === 'install') {
  try {
    runInstaller(parseInstallArgs(args));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    usage();
    process.exit(1);
  }
  process.exit(0);
}

if (!map[cmd]) {
  usage();
  process.exit(1);
}

const result = spawnSync(process.execPath, [map[cmd], ...args], { stdio: 'inherit' });
process.exit(result.status ?? 1);
