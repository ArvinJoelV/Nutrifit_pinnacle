import time
import pytest
from infrastructure.queue import AsyncJobQueue, cv_job_queue


def test_queue_initialization():
    """Verify AsyncJobQueue initializes with workers and status tracking."""
    assert cv_job_queue is not None
    stats = cv_job_queue.get_stats()
    assert "broker" in stats
    assert "jobs_total" in stats


def test_job_submission_latency_under_50ms():
    """Verify job submission is instantaneous (<50ms non-blocking dispatch)."""
    q = AsyncJobQueue()
    t0 = time.perf_counter()
    job_id = q.submit_job(image_path="test_mock_image.jpg")
    duration_ms = (time.perf_counter() - t0) * 1000

    assert job_id is not None
    assert job_id.startswith("cv-job-")
    assert duration_ms < 50.0, f"Expected <50ms dispatch, got {duration_ms:.2f}ms"

    job = q.get_job(job_id)
    assert job is not None
    assert job["id"] == job_id
    assert job["status"] in ("queued", "processing", "completed")


def test_job_execution_lifecycle_with_custom_processor():
    """Verify worker execution, stage tracking, and terminal completion."""
    q = AsyncJobQueue()
    stages_hit = []

    def mock_pipeline_processor(image_path, progress_callback=None):
        if progress_callback:
            progress_callback({"stage": 1, "name": "YOLO Detection", "duration_ms": 10.0})
            progress_callback({"stage": 2, "name": "SAM Segmentation", "duration_ms": 15.0})
        return {
            "items": [{"name": "Idli", "calories": 58, "protein": 2.1}],
            "totalCalories": 58,
            "total_mass_g": 50.0,
        }

    job_id = q.submit_job(
        image_path="sample.jpg",
        processor_fn=mock_pipeline_processor,
    )

    # Wait up to 3 seconds for background worker thread to process
    for _ in range(30):
        job = q.get_job(job_id)
        if job and job.get("status") == "completed":
            break
        time.sleep(0.1)

    completed_job = q.get_job(job_id)
    assert completed_job is not None
    assert completed_job["status"] == "completed"
    assert completed_job["result"]["totalCalories"] == 58
    assert completed_job["result"]["items"][0]["name"] == "Idli"


def test_job_error_handling():
    """Verify worker catches unhandled exceptions and flags job as failed."""
    q = AsyncJobQueue()

    def failing_processor(image_path, progress_callback=None):
        raise ValueError("Corrupt image bitstream simulation")

    job_id = q.submit_job(image_path="corrupt.jpg", processor_fn=failing_processor)

    for _ in range(30):
        job = q.get_job(job_id)
        if job and job.get("status") == "failed":
            break
        time.sleep(0.1)

    failed_job = q.get_job(job_id)
    assert failed_job is not None
    assert failed_job["status"] == "failed"
    assert "Corrupt image bitstream" in str(failed_job.get("error"))
