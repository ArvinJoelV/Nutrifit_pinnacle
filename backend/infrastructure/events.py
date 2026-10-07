import os
import json
import time
import queue
import logging
import threading
from typing import Any, Dict, Generator, List, Optional

logger = logging.getLogger("nutrifit.infrastructure.events")


class EventBroadcaster:
    """Enterprise Pub/Sub event broadcaster using Redis with thread-safe in-memory fallback.
    
    Streams real-time CV pipeline progress updates over WebSockets / Server-Sent Events (SSE).
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "").strip()
        self.redis_client = None
        self.is_connected = False
        
        # In-memory pubsub registry: channel_name -> list of subscriber queues
        self._subscribers: Dict[str, List[queue.Queue]] = {}
        self._lock = threading.Lock()
        self._history: Dict[str, List[Dict[str, Any]]] = {}

        if self.redis_url:
            self._initialize_connection()
        else:
            logger.info("REDIS_URL not configured. Operating with in-memory EventBus.")

    def _initialize_connection(self):
        try:
            import redis
            client = redis.from_url(
                self.redis_url,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
                decode_responses=True,
            )
            client.ping()
            self.redis_client = client
            self.is_connected = True
            logger.info("EventBroadcaster connected to Redis Pub/Sub at %s", self.redis_url)
        except Exception as exc:
            self.redis_client = None
            self.is_connected = False
            logger.info("Redis Pub/Sub not available (%s). Utilizing in-memory event bus.", exc)

    def publish(self, channel: str, message: Dict[str, Any]) -> int:
        """Publishes a structured event message to a channel."""
        serialized = json.dumps(message)
        receivers = 0

        # Save to short-lived event history for late-joining SSE streams
        with self._lock:
            if channel not in self._history:
                self._history[channel] = []
            self._history[channel].append(message)
            # keep last 20 events
            if len(self._history[channel]) > 20:
                self._history[channel].pop(0)

        # 1. Publish to Redis if connected
        if self.is_connected and self.redis_client:
            try:
                receivers = self.redis_client.publish(channel, serialized)
            except Exception as exc:
                logger.debug("Redis publish failed: %s", exc)

        # 2. Dispatch to local subscribers (handles single process or local dev without Redis)
        with self._lock:
            subs = list(self._subscribers.get(channel, []))
            for q in subs:
                try:
                    q.put_nowait(message)
                    receivers += 1
                except Exception:
                    pass

        return receivers

    def register_subscriber(self, channel: str) -> queue.Queue:
        """Registers a queue to receive events on a channel."""
        q = queue.Queue(maxsize=100)
        with self._lock:
            if channel not in self._subscribers:
                self._subscribers[channel] = []
            self._subscribers[channel].append(q)

            # Replay recent history to new subscriber so no initial state is lost
            past_events = self._history.get(channel, [])
            for evt in past_events:
                q.put_nowait(evt)

        return q

    def unregister_subscriber(self, channel: str, q: queue.Queue):
        """Unregisters a subscriber queue."""
        with self._lock:
            if channel in self._subscribers:
                self._subscribers[channel] = [s for s in self._subscribers[channel] if s is not q]
                if not self._subscribers[channel]:
                    del self._subscribers[channel]

    def emit_stage_progress(
        self,
        job_id: str,
        stage: int,
        name: str,
        details: Optional[Dict[str, Any]] = None,
        is_completed: bool = False,
        error: Optional[str] = None,
        duration_ms: Optional[float] = None,
    ):
        """Standardized helper for publishing 9-stage CV pipeline milestones."""
        channel = f"task:{job_id}"
        event = {
            "job_id": job_id,
            "stage": stage,
            "name": name,
            "status": "failed" if error else ("completed" if is_completed else "processing"),
            "timestamp": time.time(),
            "details": details or {},
            "duration_ms": duration_ms,
            "error": error,
            "broker": "Redis Pub/Sub" if self.is_connected else "Local EventBus",
        }
        self.publish(channel, event)

    def sse_stream(self, job_id: str, timeout_seconds: float = 120.0) -> Generator[str, None, None]:
        """Server-Sent Events (SSE) generator yielding text/event-stream chunks."""
        channel = f"task:{job_id}"
        q = self.register_subscriber(channel)
        start_time = time.time()

        try:
            # Send initial connection handshake comment
            yield f": connected to pipeline stream task:{job_id}\n\n"

            while time.time() - start_time < timeout_seconds:
                try:
                    event = q.get(timeout=2.0)
                    data_json = json.dumps(event)
                    event_type = "stage"
                    if event.get("status") == "completed" or event.get("stage") == 9:
                        event_type = "completed"
                    elif event.get("status") == "failed":
                        event_type = "error"

                    yield f"event: {event_type}\ndata: {data_json}\n\n"

                    # If this is the terminal event, close the stream gracefully
                    if event.get("status") in ("completed", "failed") and event.get("is_final", False):
                        break
                except queue.Empty:
                    # Send periodic keep-alive comment so browser doesn't drop SSE connection
                    yield ": ping\n\n"
        finally:
            self.unregister_subscriber(channel, q)


# Singleton instance
broadcaster = EventBroadcaster()
