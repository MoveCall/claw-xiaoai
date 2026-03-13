#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

DEFAULT = {
    "selectedCharacter": "clawra",
    "defaultProvider": "fal",
    "proactiveSelfie": {
        "enabled": True,
        "probability": 0.1,
    },
    "providers": {
        "fal": {
            "apiKey": "${FAL_API_KEY}",
            "model": "fal-ai/grok-imagine",
        }
    },
    "selfieModes": {
        "mirror": {
            "keywords": ["wearing", "outfit", "clothes", "dress", "suit", "fashion", "full-body"]
        },
        "direct": {
            "keywords": ["cafe", "beach", "park", "city", "portrait", "face", "smile", "close-up"]
        }
    }
}


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("clawra-xiaoai.config.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(DEFAULT, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
