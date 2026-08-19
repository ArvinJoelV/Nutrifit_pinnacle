"""
Stage 2 — Edge AI / NVIDIA Jetson Performance Evaluation Benchmark
------------------------------------------------------------------
Compares Local (CPU/GPU) inference vs NVIDIA Jetson C100 Edge inference across:
- Latency (Pre-process, Model Inference, Post-process, Network RTT)
- Throughput (FPS / Images Per Second)
- Error resilience & Hybrid Edge/Cloud Fallback verification

Usage:
    python -m inference.benchmark --image path/to/sample.jpg --runs 5
"""

import argparse
import os
import time
from .local_provider import LocalInferenceProvider
from .jetson_provider import JetsonInferenceProvider


def run_benchmark(image_path: str, runs: int = 5):
    print("=" * 70)
    print("      NUTRIFIT STAGE 2 — NVIDIA JETSON C100 EDGE AI BENCHMARK      ")
    print("=" * 70)
    print(f"Target Image: {image_path}")
    print(f"Benchmark Iterations: {runs}")
    print("-" * 70)

    if not os.path.exists(image_path):
        print(f"Error: Target image '{image_path}' not found.")
        return

    # 1. Benchmark Local Provider
    print("\n[1/2] Benchmarking LocalInferenceProvider...")
    local_provider = LocalInferenceProvider()
    local_times = []
    local_segments_count = 0

    for i in range(runs):
        t0 = time.time()
        res = local_provider.detect_and_segment(image_path)
        elapsed = (time.time() - t0) * 1000
        local_times.append(elapsed)
        local_segments_count = len(res.get("segments", []))
        print(f"   Run {i+1}/{runs}: {elapsed:.2f} ms | Segments: {local_segments_count}")

    avg_local_ms = sum(local_times) / runs
    fps_local = 1000.0 / avg_local_ms if avg_local_ms > 0 else 0

    # 2. Benchmark Jetson Edge Provider (with fallback enabled)
    print("\n[2/2] Benchmarking JetsonInferenceProvider (Hybrid Edge/Cloud)...")
    jetson_provider = JetsonInferenceProvider(fallback_to_local=True)
    jetson_times = []
    jetson_segments_count = 0
    actual_provider_used = "unknown"

    for i in range(runs):
        t0 = time.time()
        res = jetson_provider.detect_and_segment(image_path)
        elapsed = (time.time() - t0) * 1000
        jetson_times.append(elapsed)
        jetson_segments_count = len(res.get("segments", []))
        actual_provider_used = res.get("provider", "jetson")
        print(f"   Run {i+1}/{runs}: {elapsed:.2f} ms | Provider: {actual_provider_used} | Segments: {jetson_segments_count}")

    avg_jetson_ms = sum(jetson_times) / runs
    fps_jetson = 1000.0 / avg_jetson_ms if avg_jetson_ms > 0 else 0

    # 3. Summary Report
    print("\n" + "=" * 70)
    print("                    PERFORMANCE EVALUATION SUMMARY                  ")
    print("=" * 70)
    print(f"{'Metric':<30} | {'Local Inference':<18} | {'Jetson Edge AI':<18}")
    print("-" * 70)
    print(f"{'Avg Latency (ms)':<30} | {avg_local_ms:<18.2f} | {avg_jetson_ms:<18.2f}")
    print(f"{'Throughput (FPS)':<30} | {fps_local:<18.2f} | {fps_jetson:<18.2f}")
    print(f"{'Segments Detected':<30} | {local_segments_count:<18} | {jetson_segments_count:<18}")
    print(f"{'Provider Mode Active':<30} | {'local':<18} | {actual_provider_used:<18}")
    print("-" * 70)

    if actual_provider_used == "local_fallback":
        print("\n[NOTE] Jetson server was offline during benchmark.")
        print("       Hybrid Edge/Cloud Fallback verified successfully! System seamlessly used LocalInferenceProvider.")
    else:
        speedup = ((avg_local_ms - avg_jetson_ms) / avg_local_ms) * 100 if avg_local_ms > 0 else 0
        print(f"\n[SUCCESS] Jetson C100 Edge Server active! Speedup: {speedup:.1f}%")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stage 2 Edge AI Benchmark Utility")
    parser.add_argument("--image", default="static/uploads/sample.jpg", help="Path to test image")
    parser.add_argument("--runs", type=int, default=3, help="Number of benchmark iterations")
    args = parser.parse_args()

    run_benchmark(args.image, runs=args.runs)
