import json
import time
import pytest
from infrastructure.events import EventBroadcaster, broadcaster


def test_broadcaster_initialization():
    """Verify EventBroadcaster initializes correctly."""
    assert broadcaster is not None
    assert hasattr(broadcaster, "publish")
    assert hasattr(broadcaster, "sse_stream")


def test_pub_sub_subscription_and_message_delivery():
    """Verify subscriber queues receive published events."""
    eb = EventBroadcaster()
    channel = "test:channel:1"
    sub_q = eb.register_subscriber(channel)

    try:
        test_payload = {"stage": 2, "name": "SAM2 Instance Segmentation", "duration_ms": 45.2}
        eb.publish(channel, test_payload)

        # Retrieve from queue
        received = sub_q.get(timeout=2.0)
        assert received == test_payload
    finally:
        eb.unregister_subscriber(channel, sub_q)


def test_emit_stage_progress_structure():
    """Verify standard schema for 9-stage pipeline broadcasting."""
    eb = EventBroadcaster()
    job_id = "test-job-987"
    channel = f"task:{job_id}"
    sub_q = eb.register_subscriber(channel)

    try:
        eb.emit_stage_progress(
            job_id=job_id,
            stage=3,
            name="Metric Scale Calibration",
            details={"pixels_per_cm": 24.5},
            duration_ms=18.4,
        )

        msg = sub_q.get(timeout=2.0)
        assert msg["job_id"] == job_id
        assert msg["stage"] == 3
        assert msg["name"] == "Metric Scale Calibration"
        assert msg["status"] == "processing"
        assert msg["duration_ms"] == 18.4
        assert msg["details"]["pixels_per_cm"] == 24.5
        assert "timestamp" in msg
    finally:
        eb.unregister_subscriber(channel, sub_q)


def test_sse_stream_generator_format():
    """Verify that sse_stream produces valid Server-Sent Events text chunks."""
    eb = EventBroadcaster()
    job_id = "test-job-sse"
    stream_gen = eb.sse_stream(job_id, timeout_seconds=1.5)

    # First chunk is the connection handshake
    initial_chunk = next(stream_gen)
    assert ": connected to pipeline stream" in initial_chunk

    # Publish an event to the channel
    eb.emit_stage_progress(
        job_id=job_id,
        stage=1,
        name="YOLOv8 Object Detection",
        duration_ms=12.0,
    )

    stage_chunk = next(stream_gen)
    assert stage_chunk.startswith("event: stage\ndata: ")
    assert "YOLOv8 Object Detection" in stage_chunk
    assert stage_chunk.endswith("\n\n")
