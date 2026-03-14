# claw-xiaoai

Claw Xiaoai is an OpenClaw companion skill with persona-driven selfie generation, stable visual identity anchors, and a lightweight Node-based installer/CLI layout.

## Quick Start

```bash
npx @movecall/claw-xiaoai
```

The installer will:
- copy the skill into `~/.openclaw/workspace/skills/claw-xiaoai`
- inject the Claw Xiaoai capability block into `~/.openclaw/workspace/SOUL.md`
- remind you to open OpenClaw and save the ModelScope key in the skill's `API key` field

By default this follows the Workspace Skills model. If you want the shared Installed Skills location instead, run:

```bash
npx @movecall/claw-xiaoai install --managed
```

## Install in OpenClaw

1. Install the package/skill into OpenClaw.
2. Open the Skills page and find `claw-xiaoai`.
3. Paste your ModelScope token into the skill's `API key` field and save it.
4. OpenClaw will persist that key for the installed skill, and `skill/scripts/generate-selfie.mjs` will read it from `~/.openclaw/openclaw.json` when generating images.

If you are testing the scripts outside OpenClaw, you can still use `MODELSCOPE_API_KEY` or `MODELSCOPE_TOKEN` as CLI fallbacks.

## CLI

```bash
npx @movecall/claw-xiaoai install
npx @movecall/claw-xiaoai install --managed
npx @movecall/claw-xiaoai install --workspace /path/to/workspace
npx @movecall/claw-xiaoai build-prompt "来张咖啡店自拍"
npx @movecall/claw-xiaoai gen-caption "来张你穿卫衣的全身镜子自拍"
```

## Structure

```text
.
├── SKILL.md
├── package.json
├── bin/
├── skill/
└── templates/
```
