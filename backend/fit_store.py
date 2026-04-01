import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "nutrifit.db")


@contextmanager
def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS google_fit_tokens (
                user_id TEXT PRIMARY KEY,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                token_type TEXT,
                scope TEXT,
                expires_at INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS google_fit_daily_metrics (
                user_id TEXT NOT NULL,
                activity_date TEXT NOT NULL,
                timezone TEXT,
                bucket_start_utc TEXT,
                bucket_end_utc TEXT,
                bucket_start_local TEXT,
                bucket_end_local TEXT,
                data_source_ids TEXT,
                steps INTEGER NOT NULL DEFAULT 0,
                calories_burned REAL NOT NULL DEFAULT 0,
                distance_meters REAL NOT NULL DEFAULT 0,
                avg_heart_rate REAL,
                max_heart_rate REAL,
                min_heart_rate REAL,
                raw_payload TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, activity_date)
            )
            """
        )
        existing_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(google_fit_daily_metrics)").fetchall()
        }
        for column_name, column_type in (
            ("timezone", "TEXT"),
            ("bucket_start_utc", "TEXT"),
            ("bucket_end_utc", "TEXT"),
            ("bucket_start_local", "TEXT"),
            ("bucket_end_local", "TEXT"),
            ("data_source_ids", "TEXT"),
        ):
            if column_name not in existing_columns:
                connection.execute(f"ALTER TABLE google_fit_daily_metrics ADD COLUMN {column_name} {column_type}")


def _utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def save_tokens(user_id, token_payload):
    now = _utc_now_iso()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO google_fit_tokens (
                user_id, access_token, refresh_token, token_type, scope, expires_at, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                access_token=excluded.access_token,
                refresh_token=COALESCE(excluded.refresh_token, google_fit_tokens.refresh_token),
                token_type=excluded.token_type,
                scope=excluded.scope,
                expires_at=excluded.expires_at,
                updated_at=excluded.updated_at
            """
            ,
            (
                user_id,
                token_payload.get("access_token", ""),
                token_payload.get("refresh_token"),
                token_payload.get("token_type"),
                token_payload.get("scope"),
                token_payload.get("expires_at"),
                now,
                now,
            ),
        )


def get_tokens(user_id):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM google_fit_tokens WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def save_daily_metrics(user_id, daily_rows):
    now = _utc_now_iso()
    with get_connection() as connection:
        for row in daily_rows:
            connection.execute(
                """
                INSERT INTO google_fit_daily_metrics (
                    user_id,
                    activity_date,
                    timezone,
                    bucket_start_utc,
                    bucket_end_utc,
                    bucket_start_local,
                    bucket_end_local,
                    data_source_ids,
                    steps,
                    calories_burned,
                    distance_meters,
                    avg_heart_rate,
                    max_heart_rate,
                    min_heart_rate,
                    raw_payload,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, activity_date) DO UPDATE SET
                    timezone=excluded.timezone,
                    bucket_start_utc=excluded.bucket_start_utc,
                    bucket_end_utc=excluded.bucket_end_utc,
                    bucket_start_local=excluded.bucket_start_local,
                    bucket_end_local=excluded.bucket_end_local,
                    data_source_ids=excluded.data_source_ids,
                    steps=excluded.steps,
                    calories_burned=excluded.calories_burned,
                    distance_meters=excluded.distance_meters,
                    avg_heart_rate=excluded.avg_heart_rate,
                    max_heart_rate=excluded.max_heart_rate,
                    min_heart_rate=excluded.min_heart_rate,
                    raw_payload=excluded.raw_payload,
                    updated_at=excluded.updated_at
                """
                ,
                (
                    user_id,
                    row["activity_date"],
                    row.get("timezone"),
                    row.get("bucket_start_utc"),
                    row.get("bucket_end_utc"),
                    row.get("bucket_start_local"),
                    row.get("bucket_end_local"),
                    json.dumps(row.get("data_source_ids") or [], separators=(",", ":")),
                    int(row.get("steps", 0) or 0),
                    float(row.get("calories_burned", 0) or 0),
                    float(row.get("distance_meters", 0) or 0),
                    row.get("avg_heart_rate"),
                    row.get("max_heart_rate"),
                    row.get("min_heart_rate"),
                    json.dumps(row.get("raw_payload") or {}, separators=(",", ":")),
                    now,
                ),
            )


def get_daily_metrics(user_id, start_date=None, end_date=None):
    query = "SELECT * FROM google_fit_daily_metrics WHERE user_id = ?"
    params = [user_id]

    if start_date:
        query += " AND activity_date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND activity_date <= ?"
        params.append(end_date)

    query += " ORDER BY activity_date DESC"

    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()

    results = []
    for row in rows:
        payload = dict(row)
        payload["raw_payload"] = json.loads(payload["raw_payload"]) if payload.get("raw_payload") else {}
        payload["data_source_ids"] = json.loads(payload["data_source_ids"]) if payload.get("data_source_ids") else []
        results.append(payload)
    return results
