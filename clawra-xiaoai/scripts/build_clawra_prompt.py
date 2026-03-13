#!/usr/bin/env python3
import argparse
import json

VISUAL_ANCHOR = (
    "18-year-old K-pop-inspired girl, long dark brown hair, slim build, clear fair skin, "
    "expressive eyes, soft natural makeup, stylish casual Gen Z fashion, warm playful confident energy"
)

DIRECT_DEFAULT = (
    "direct selfie, close-up or chest-up portrait, natural expression, believable real-world setting, realistic photo"
)

MIRROR_DEFAULT = (
    "full-body mirror selfie, outfit-focused, relaxed confident pose, softly lit interior, realistic photo"
)


def infer_mode(text: str) -> str:
    t = text.lower()
    mirror_keywords = ["wear", "outfit", "clothes", "dress", "hoodie", "suit", "full-body", "mirror", "全身", "镜子", "穿"]
    for k in mirror_keywords:
        if k in t:
            return "mirror"
    return "direct"


def build_prompt(request: str, mode: str | None = None) -> str:
    mode = mode or infer_mode(request)
    mode_block = MIRROR_DEFAULT if mode == "mirror" else DIRECT_DEFAULT
    return f"Clawra, {VISUAL_ANCHOR}, {mode_block}, scene request: {request}"


def main():
    parser = argparse.ArgumentParser(description="Build a stable Clawra image prompt.")
    parser.add_argument("request", help="User selfie request or scene description")
    parser.add_argument("--mode", choices=["direct", "mirror"], help="Force selfie mode")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    mode = args.mode or infer_mode(args.request)
    prompt = build_prompt(args.request, mode)
    if args.json:
        print(json.dumps({"mode": mode, "prompt": prompt}, ensure_ascii=False, indent=2))
    else:
        print(prompt)


if __name__ == "__main__":
    main()
