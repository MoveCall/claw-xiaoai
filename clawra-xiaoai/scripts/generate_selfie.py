#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

BASE_URL = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn/")
MODEL = os.getenv("MODELSCOPE_IMAGE_MODEL", "Tongyi-MAI/Z-Image-Turbo")
POLL_INTERVAL = float(os.getenv("MODELSCOPE_POLL_INTERVAL", "5"))
MAX_POLLS = int(os.getenv("MODELSCOPE_MAX_POLLS", "60"))
TIMEOUT = int(os.getenv("MODELSCOPE_TIMEOUT", "60"))


def fail(msg: str, code: int = 1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def build_headers(api_key: str):
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def submit_task(api_key: str, prompt: str):
    headers = {**build_headers(api_key), "X-ModelScope-Async-Mode": "true"}
    payload = {
        "model": MODEL,
        "prompt": prompt,
    }
    resp = requests.post(
        f"{BASE_URL}v1/images/generations",
        headers=headers,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    task_id = data.get("task_id")
    if not task_id:
        fail(f"Missing task_id in response: {data}")
    return task_id


def poll_task(api_key: str, task_id: str):
    headers = {**build_headers(api_key), "X-ModelScope-Task-Type": "image_generation"}
    last = None
    for _ in range(MAX_POLLS):
        resp = requests.get(
            f"{BASE_URL}v1/tasks/{task_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        last = data
        status = data.get("task_status")
        if status == "SUCCEED":
            images = data.get("output_images") or []
            if not images:
                fail(f"Task succeeded but output_images is empty: {data}")
            return images[0], data
        if status == "FAILED":
            fail(f"Image generation failed: {json.dumps(data, ensure_ascii=False)}")
        time.sleep(POLL_INTERVAL)
    fail(f"Timed out waiting for task {task_id}. Last response: {json.dumps(last, ensure_ascii=False)}")


def download_image(url: str, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    resp = requests.get(url, timeout=TIMEOUT)
    resp.raise_for_status()
    out_path.write_bytes(resp.content)
    return out_path


def main():
    parser = argparse.ArgumentParser(description="Generate a Clawra selfie via ModelScope image generation.")
    parser.add_argument("--prompt", required=True, help="Prompt for image generation")
    parser.add_argument("--out", default="./clawra-selfie.jpg", help="Output image path")
    parser.add_argument("--json", action="store_true", help="Print JSON result")
    args = parser.parse_args()

    api_key = os.getenv("MODELSCOPE_API_KEY") or os.getenv("MODELSCOPE_TOKEN")
    if not api_key:
        fail("MODELSCOPE_API_KEY (or MODELSCOPE_TOKEN) is required in the environment.")

    out_path = Path(args.out).expanduser().resolve()

    try:
        task_id = submit_task(api_key, args.prompt)
        image_url, task_data = poll_task(api_key, task_id)
        saved = download_image(image_url, out_path)
    except requests.RequestException as e:
        fail(f"Network/API error: {e}")

    if args.json:
        print(json.dumps({
            "ok": True,
            "task_id": task_id,
            "image_url": image_url,
            "saved_path": str(saved),
            "model": MODEL,
            "task_status": task_data.get("task_status"),
        }, ensure_ascii=False, indent=2))
    else:
        print(str(saved))


if __name__ == "__main__":
    main()
