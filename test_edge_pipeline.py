"""Test and run the Image Pipeline on RS PRO C100 Edge Node (10.7.6.35).

Usage:
    python test_edge_pipeline.py
    python test_edge_pipeline.py --url http://10.7.6.35:8000 --image path/to/meal.jpg
"""

import argparse
import json
import os
import sys
import time
import requests


def parse_args():
    parser = argparse.ArgumentParser(description="Run NutriFit Image Pipeline on Edge Node")
    parser.add_argument(
        "--url",
        default="http://100.74.47.33:8000",
        help="Base URL of the edge device (default: http://100.74.47.33:8000)",
    )
    parser.add_argument(
        "--image",
        default="backend/static/visuals/stock-photo--medu-vada-a-popular-south-indian-food-served-with-sambar-green-coconut-chutney-vada-medu-1675667164.jpg",
        help="Path to meal image to process",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="Request timeout in seconds (default: 30s)",
    )
    return parser.parse_args()


def check_health(base_url: str):
    print(f"\n[1/3] Checking edge node health at {base_url}/health...")
    try:
        resp = requests.get(f"{base_url}/health", timeout=3.0)
        if resp.status_code == 200:
            health = resp.json()
            print("  [+] Edge node is ONLINE!")
            print(f"      Service:      {health.get('service', 'unknown')}")
            print(f"      GPU:          {health.get('gpu', health.get('device', 'unknown'))}")
            print(f"      RAM:          {health.get('ram_used_mb', '?')}MB / {health.get('ram_total_mb', '?')}MB")
            print(f"      Temperature:  {health.get('temperature_c', '?')} C")
            print(f"      Models Ready: {health.get('models_loaded', False)}")
            return True
        else:
            print(f"  [-] Unexpected response status: {resp.status_code}")
            return False
    except requests.exceptions.RequestException as err:
        print(f"  [-] Failed to reach edge node: {err}")
        return False


def run_pipeline(base_url: str, image_path: str, timeout: float):
    if not os.path.exists(image_path):
        print(f"[-] Image not found: {image_path}")
        return

    print(f"\n[2/3] Uploading meal image to edge device: {image_path}")
    print(f"      Image size: {os.path.getsize(image_path) / 1024:.1f} KB")

    endpoint = f"{base_url}/v1/portion/process"
    t0 = time.perf_counter()

    try:
        with open(image_path, "rb") as f:
            files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
            print(f"  --> Sending POST {endpoint} (timeout={timeout}s)...")
            resp = requests.post(endpoint, files=files, timeout=timeout)

        elapsed = (time.perf_counter() - t0) * 1000

        if resp.status_code == 200:
            result = resp.json()
            print(f"\n[3/3] Edge Pipeline Response received in {elapsed:.1f} ms:")
            print("=" * 60)
            print(f"  Execution Target: {result.get('execution_target')}")
            print(f"  Edge Duration:    {result.get('duration_ms')} ms")
            print(f"  Total Mass:       {result.get('total_mass_g')} g")
            print(f"  Scale Factor:     {result.get('scale_calibration', {}).get('pixels_per_cm', 'N/A')} px/cm")

            items = result.get("items", [])
            print(f"\n  Detected Items ({len(items)}):")
            for i, item in enumerate(items, 1):
                name = item.get("name") or item.get("label", "Unknown")
                mass = item.get("mass_g", 0)
                vol = item.get("estimated_volume_cm3", item.get("volume_cm3", 0))
                area = item.get("visible_area_cm2", 0)
                conf = item.get("confidence", 0)
                print(f"    {i}. {name}")
                print(f"       Mass:        {mass:.1f} g")
                print(f"       Volume:      {vol:.1f} cm3")
                print(f"       Area:        {area:.1f} cm2")
                print(f"       Confidence:  {conf:.2f}")

            print("=" * 60)
            print("[+] Image pipeline execution completed successfully!")
            return result
        else:
            print(f"[-] Edge pipeline error (HTTP {resp.status_code}): {resp.text}")
    except requests.exceptions.RequestException as err:
        print(f"[-] Network error during pipeline execution: {err}")


def main():
    args = parse_args()
    base_url = args.url.rstrip("/")

    is_online = check_health(base_url)
    if not is_online:
        print("\n" + "=" * 60)
        print("DIAGNOSTIC & TROUBLESHOOTING:")
        print(f"Could not reach edge node at {base_url}.")
        print("Please check the following:")
        print("  1. Is the Jetson Nano powered ON and connected to network?")
        print("  2. Did the IP address change? On the Jetson, check with: hostname -I")
        print("  3. Is the service running? Start it via SSH:")
        print("       ssh it-dept@<IP>")
        print("       cd ~/edge_node")
        print("       source ~/nutrifit_edge_venv/bin/activate")
        print("       uvicorn main:app --host 0.0.0.0 --port 8000")
        print("     Or systemd:")
        print("       sudo systemctl restart nutrifit-edge.service")
        print("=" * 60)
        sys.exit(1)

    run_pipeline(base_url, args.image, args.timeout)


if __name__ == "__main__":
    main()
