#!/usr/bin/env node
const VISUAL_ANCHOR = '18-year-old K-pop-inspired girl, long dark brown hair, slim build, clear fair skin, expressive eyes, soft natural makeup, stylish casual Gen Z fashion, warm playful confident energy';
const DIRECT_DEFAULT = 'direct selfie, close-up or chest-up portrait, natural expression, believable real-world setting, realistic photo';
const MIRROR_DEFAULT = 'full-body mirror selfie, outfit-focused, relaxed confident pose, softly lit interior, realistic photo';

function inferMode(text) {
  const t = text.toLowerCase();
  const mirrorKeywords = ['wear', 'outfit', 'clothes', 'dress', 'hoodie', 'suit', 'full-body', 'mirror', '全身', '镜子', '穿'];
  return mirrorKeywords.some(k => t.includes(k)) ? 'mirror' : 'direct';
}

function buildPrompt(request, mode) {
  const modeBlock = mode === 'mirror' ? MIRROR_DEFAULT : DIRECT_DEFAULT;
  return `Clawra, ${VISUAL_ANCHOR}, ${modeBlock}, scene request: ${request}`;
}

const argv = process.argv.slice(2);
let json = false;
let forcedMode;
const requestParts = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') json = true;
  else if (a === '--mode') forcedMode = argv[++i];
  else requestParts.push(a);
}
const request = requestParts.join(' ').trim();
if (!request) {
  console.error('Usage: build-clawra-prompt <request> [--mode direct|mirror] [--json]');
  process.exit(1);
}
const mode = forcedMode || inferMode(request);
const prompt = buildPrompt(request, mode);
if (json) console.log(JSON.stringify({ mode, prompt }, null, 2));
else console.log(prompt);
