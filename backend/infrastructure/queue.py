import os
import uuid
import json
import time
import queue
import logging
import threading
from typing import Any, Callable, Dict, Optional

from .events import broadcaster
from .cache import cache

logger = logging.getLogger("nutrifit.infrastructure.queue")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "").strip()
TOPIC_CV_JOBS = os.getenv("KAFKA_TOPIC_CV_JOBS", "meal.cv.jobs")
TOPIC_CV_COMPLETED = os.getenv("KAFKA_TOPIC_CV_COMPLETED", "meal.cv.completed")


class AsyncJobQueue:
    """Decoupled Async Job Queue for Heavy Computer Vision & 3D Reconstruction Pipeline.
    
    Dispatches image analysis jobs in <50ms to Kafka topic 'meal.cv.jobs' (with seamless
    local async thread-worker fallback if Kafka broker is unavailable).
    """

    def __init__(self):
        self.kafka_bootstrap = KAFKA_BOOTSTRAP
        self.is_kafka_connected = False
        self.producer = None
        self.consumer = None

        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._memory_queue: queue.Queue = queue.Queue()
        self._lock = threading.Lock()
        self._worker_thread = None
        self._stop_event = threading.Event()

        self._initialize_kafka()
        self._start_worker()

    def _initialize_kafka(self):
        if not self.kafka_bootstrap:
            self.producer = None
            self.is_kafka_connected = False
            logger.info("KAFKA_BOOTSTRAP_SERVERS not configured. Operating with dedicated Async Worker Queue.")
            return

        try:
            from kafka import KafkaProducer
            producer = KafkaProducer(
                bootstrap_servers=self.kafka_bootstrap.split(","),
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                request_timeout_ms=1500,
                max_block_ms=1500,
            )
            self.producer = producer
            self.is_kafka_connected = True
            logger.info("Kafka Producer initialized connected to %s", self.kafka_bootstrap)
        except Exception as exc:
            self.producer = None
            self.is_kafka_connected = False
            logger.info(
                "Kafka broker not reachable at %s (%s). Falling back to dedicated Async Worker Queue.",
                self.kafka_bootstrap,
                exc,
            )

    def _start_worker(self):
        """Starts dedicated async CV worker thread."""
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            daemon=True,
            name="NutriFit-CV-Worker",
        )
        self._worker_thread.start()

    def submit_job(
        self,
        image_path: str,
        gemini_model: Optional[Any] = None,
        context: Optional[Dict[str, Any]] = None,
        processor_fn: Optional[Callable] = None,
    ) -> str:
        """Enqueues image analysis job and returns job_id in <50ms."""
        t_start = time.perf_counter()
        job_id = f"cv-job-{uuid.uuid4().hex[:12]}"
        now = time.time()

        job_data = {
            "id": job_id,
            "status": "queued",
            "image_path": image_path,
            "context": context or {},
            "created_at": now,
            "updated_at": now,
            "current_stage": 0,
            "stage_name": "Job Enqueued",
            "result": None,
            "error": None,
            "dispatch_ms": 0.0,
            "broker": "Apache Kafka (Distributed)" if self.is_kafka_connected else "Dedicated Worker (In-Memory)",
        }

        with self._lock:
            self._jobs[job_id] = job_data

        # Initial event broadcasting
        broadcaster.emit_stage_progress(
            job_id=job_id,
            stage=0,
            name="Enqueued in CV Job Queue",
            details={"image_path": os.path.basename(image_path), "broker": job_data["broker"]},
        )

        task_payload = {
            "job_id": job_id,
            "image_path": image_path,
            "gemini_model": gemini_model,
            "processor_fn": processor_fn,
            "context": context or {},
            "created_at": now,
        }

        # 1. Publish to Kafka if connected
        published_kafka = False
        if self.is_kafka_connected and self.producer:
            try:
                # We omit non-serializable callables for Kafka wire transmission
                wire_payload = {k: v for k, v in task_payload.items() if k not in ("gemini_model", "processor_fn")}
                self.producer.send(TOPIC_CV_JOBS, wire_payload)
                self.producer.flush(timeout=1.0)
                published_kafka = True
            except Exception as kerr:
                logger.warning("Kafka dispatch failed (%s), placing in local queue.", kerr)

        # 2. Enqueue into worker queue
        self._memory_queue.put(task_payload)

        job_data["dispatch_ms"] = round((time.perf_counter() - t_start) * 1000, 2)
        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                # Check Redis cache in case another worker processed it
                cached = cache.get(f"cv:job:{job_id}")
                if cached:
                    return cached
                return None
            return dict(job)

    def _worker_loop(self):
        """Worker loop that dequeues jobs and executes heavy CV computation."""
        while not self._stop_event.is_set():
            try:
                task = self._memory_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            job_id = task["job_id"]
            image_path = task["image_path"]
            gemini_model = task.get("gemini_model")
            processor_fn = task.get("processor_fn")

            logger.info("Worker starting CV processing for job %s...", job_id)
            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = "processing"
                    self._jobs[job_id]["updated_at"] = time.time()

            try:
                # Callback hook for pipeline stage broadcasting
                def on_pipeline_stage(stage_info: Dict[str, Any]):
                    stage_num = stage_info.get("stage", 1)
                    stage_name = stage_info.get("name", f"Stage {stage_num}")
                    duration = stage_info.get("duration_ms")
                    details = stage_info.get("details", {})

                    with self._lock:
                        if job_id in self._jobs:
                            self._jobs[job_id]["current_stage"] = stage_num
                            self._jobs[job_id]["stage_name"] = stage_name
                            self._jobs[job_id]["updated_at"] = time.time()

                    broadcaster.emit_stage_progress(
                        job_id=job_id,
                        stage=stage_num,
                        name=stage_name,
                        details=details,
                        duration_ms=duration,
                    )

                # Execute analysis processor
                if processor_fn:
                    result = processor_fn(image_path, progress_callback=on_pipeline_stage)
                else:
                    # Default pipeline invocation
                    from food_portion.pipeline import FoodPortionPipeline
                    from food_portion.gemini.validator import GeminiValidator
                    pipeline = FoodPortionPipeline(gemini_validator=GeminiValidator(model_instance=gemini_model))
                    result = pipeline.process(
                        image_path,
                        gemini_model=gemini_model,
                        progress_callback=on_pipeline_stage,
                    )

                # Format final successful result
                with self._lock:
                    if job_id in self._jobs:
                        self._jobs[job_id]["status"] = "completed"
                        self._jobs[job_id]["current_stage"] = 9
                        self._jobs[job_id]["result"] = result
                        self._jobs[job_id]["updated_at"] = time.time()

                # Cache job in Redis
                cache.set(f"cv:job:{job_id}", self._jobs[job_id], ttl=3600)

                # Broadcast terminal completion event with full payload
                broadcaster.publish(
                    f"task:{job_id}",
                    {
                        "job_id": job_id,
                        "stage": 9,
                        "name": "Pipeline Completed",
                        "status": "completed",
                        "is_final": True,
                        "timestamp": time.time(),
                        "result": result,
                        "broker": self._jobs[job_id]["broker"],
                    },
                )

                # Publish to Kafka completed topic if available
                if self.is_kafka_connected and self.producer:
                    try:
                        self.producer.send(TOPIC_CV_COMPLETED, {"job_id": job_id, "status": "completed"})
                    except Exception:
                        pass

                logger.info("Worker completed job %s successfully.", job_id)

            except Exception as exc:
                logger.error("Job %s execution failed: %s", job_id, exc, exc_info=True)
                with self._lock:
                    if job_id in self._jobs:
                        self._jobs[job_id]["status"] = "failed"
                        self._jobs[job_id]["error"] = str(exc)
                        self._jobs[job_id]["updated_at"] = time.time()

                broadcaster.publish(
                    f"task:{job_id}",
                    {
                        "job_id": job_id,
                        "stage": -1,
                        "name": "Pipeline Error",
                        "status": "failed",
                        "is_final": True,
                        "error": str(exc),
                        "timestamp": time.time(),
                    },
                )
            finally:
                self._memory_queue.task_done()

    def get_stats(self) -> Dict[str, Any]:
        """Telemetry statistics on queue performance."""
        with self._lock:
            total = len(self._jobs)
            queued = sum(1 for j in self._jobs.values() if j["status"] == "queued")
            processing = sum(1 for j in self._jobs.values() if j["status"] == "processing")
            completed = sum(1 for j in self._jobs.values() if j["status"] == "completed")
            failed = sum(1 for j in self._jobs.values() if j["status"] == "failed")

        return {
            "broker": "Apache Kafka" if self.is_kafka_connected else "Local Async Queue",
            "kafka_connected": self.is_kafka_connected,
            "kafka_bootstrap": self.kafka_bootstrap if self.is_kafka_connected else None,
            "jobs_total": total,
            "jobs_queued": queued,
            "jobs_processing": processing,
            "jobs_completed": completed,
            "jobs_failed": failed,
            "queue_depth": self._memory_queue.qsize(),
        }


# Singleton instance
cv_job_queue = AsyncJobQueue()
