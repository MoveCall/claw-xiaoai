---
name: claw-xiaoai
description: "Repository entry for the Claw Xiaoai skill. The publishable/runtime skill lives in skill/SKILL.md."
metadata:
  {
    "openclaw":
      {
        "emoji": "📸",
        "category": "image-generation",
      },
  }
---

# Claw Xiaoai Repository Entry

This repository contains both:

- the **runtime/publishable skill bundle** under `skill/`
- the **npm installer and packaging logic** in the repository root

## Canonical skill document

If you are updating behavior, metadata, usage examples, or publishable skill instructions, use:

- `skill/SKILL.md`

That file is the authoritative runtime skill definition used for:

- OpenClaw installation output
- ClawHub publishing
- bundled script usage guidance

## Repository-specific files

The repository root additionally contains:

- `README.md` — user-facing install and usage documentation
- `bin/claw-xiaoai.mjs` — npm installer / CLI entry
- `package.json` — npm package metadata
- `templates/soul-injection.md` — SOUL capability injection template

## Rule of thumb

- Change `skill/SKILL.md` when the skill itself changes
- Change `README.md` when the package/user documentation changes
- Change `bin/claw-xiaoai.mjs` when the installer or CLI behavior changes
