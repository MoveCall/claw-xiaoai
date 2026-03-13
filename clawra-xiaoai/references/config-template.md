# Clawra Xiaoai Config Template

Use this as a starting point when wiring Clawra into a companion/image-generation plugin.

```json
{
  "selectedCharacter": "clawra",
  "defaultProvider": "modelscope",
  "proactiveSelfie": {
    "enabled": true,
    "probability": 0.1
  },
  "providers": {
    "modelscope": {
      "apiKey": "${MODELSCOPE_API_KEY}",
      "model": "Tongyi-MAI/Z-Image-Turbo"
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
```

## Notes

- Keep API keys in environment variables or secret storage when possible.
- Use `proactiveSelfie.probability` conservatively; `0.1`–`0.3` is usually enough.
- If the host plugin supports multiple agents, prefer per-agent overrides instead of one global persona state.
