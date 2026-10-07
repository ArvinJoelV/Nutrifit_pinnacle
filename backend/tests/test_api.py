import json
import pytest
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_health(client):
    """Verify GET /api/health returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["ok"] is True
    assert "modelReady" in data


def test_api_food_nutrition_cache_hit(client):
    """Verify GET /api/food/nutrition returns sub-millisecond cached result."""
    response = client.get("/api/food/nutrition?query=biryani")
    assert response.status_code == 200
    data = response.get_json()
    assert data["query"] == "biryani"
    assert "data" in data
    assert data["data"]["calories"] == 290
    assert data["latency_ms"] < 20.0


def test_api_food_nutrition_missing_param(client):
    """Verify GET /api/food/nutrition handles missing query gracefully."""
    response = client.get("/api/food/nutrition")
    assert response.status_code == 400


def test_api_infra_stats(client):
    """Verify GET /api/infra/stats returns valid cache and queue metrics."""
    response = client.get("/api/infra/stats")
    assert response.status_code == 200
    data = response.get_json()
    assert "cache" in data
    assert "queue" in data
    assert "provider" in data["cache"]
    assert "broker" in data["queue"]


def test_api_jobs_not_found(client):
    """Verify GET /api/jobs/<invalid_id> returns 404."""
    response = client.get("/api/jobs/cv-job-unknown-99999")
    assert response.status_code == 404
