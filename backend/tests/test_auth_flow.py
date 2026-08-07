"""Backend tests for two-step invite + Emergent OAuth session auth."""
import os
import uuid
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sweatboard.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


def _seed_user_session(prefix="TEST_AUTH"):
    uid = f"user_{prefix}_{uuid.uuid4().hex[:8]}"
    token = f"tok_{prefix}_{uuid.uuid4().hex}"
    db.users.insert_one({
        "user_id": uid,
        "email": f"{uid}@example.com",
        "name": f"{prefix} Athlete",
        "picture": "https://via.placeholder.com/150",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return uid, token


@pytest.fixture(scope="module")
def seeded_owner():
    uid, token = _seed_user_session("OWNER")
    yield uid, token
    db.workouts.delete_many({"user_id": uid})
    db.user_sessions.delete_many({"user_id": uid})
    db.users.delete_one({"user_id": uid})


@pytest.fixture(scope="module")
def seeded_other():
    uid, token = _seed_user_session("OTHER")
    yield uid, token
    db.workouts.delete_many({"user_id": uid})
    db.user_sessions.delete_many({"user_id": uid})
    db.users.delete_one({"user_id": uid})


# ---------- /api/auth/gate ----------
class TestGate:
    def test_gate_correct(self):
        r = requests.post(f"{API}/auth/gate", json={"invite_code": "SWEAT2026"})
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_gate_wrong(self):
        r = requests.post(f"{API}/auth/gate", json={"invite_code": "WRONG"})
        assert r.status_code == 401
        assert "invalid" in r.json().get("detail", "").lower()


# ---------- /api/auth/session ----------
class TestSession:
    def test_session_missing_header(self):
        r = requests.post(f"{API}/auth/session")
        assert r.status_code == 400
        assert "missing" in r.json().get("detail", "").lower()

    def test_session_bogus_id(self):
        r = requests.post(f"{API}/auth/session", headers={"X-Session-ID": "definitely-not-real-" + uuid.uuid4().hex})
        # Emergent should reject; backend maps to 401
        assert r.status_code in (401, 502), f"Got {r.status_code}: {r.text}"
        if r.status_code == 401:
            assert "invalid session_id" in r.json().get("detail", "").lower()


# ---------- /api/auth/me ----------
class TestMe:
    def test_me_no_cookie(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401
        assert "not authenticated" in r.json().get("detail", "").lower()

    def test_me_with_cookie(self, seeded_owner):
        uid, token = seeded_owner
        r = requests.get(f"{API}/auth/me", cookies={"session_token": token})
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["user_id"] == uid
        assert data["user"]["email"].endswith("@example.com")
        assert data["user"]["name"] == "OWNER Athlete"
        assert data["user"]["picture"] == "https://via.placeholder.com/150"

    def test_me_with_bearer_token(self, seeded_owner):
        uid, token = seeded_owner
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["user"]["user_id"] == uid


# ---------- workouts CRUD auth ----------
class TestWorkoutsAuth:
    def test_create_workout_requires_auth(self):
        r = requests.post(f"{API}/workouts", json={"type": "Running", "duration_min": 30, "calories": 200})
        assert r.status_code == 401

    def test_create_workout_success(self, seeded_owner):
        uid, token = seeded_owner
        r = requests.post(
            f"{API}/workouts",
            json={"type": "Running", "duration_min": 30, "calories": 200, "note": "morning"},
            cookies={"session_token": token},
        )
        assert r.status_code == 200, r.text
        wk = r.json()
        assert wk["user_id"] == uid
        assert wk["type"] == "Running"
        assert wk["points"] > 0
        # Verify leaderboard
        lb = requests.get(f"{API}/leaderboard").json()
        entry = next((e for e in lb if e["user_id"] == uid), None)
        assert entry is not None
        assert entry["workouts_count"] >= 1

    def test_patch_only_owner(self, seeded_owner, seeded_other):
        uid, token = seeded_owner
        other_uid, other_token = seeded_other
        # create workout by owner
        r = requests.post(
            f"{API}/workouts",
            json={"type": "Yoga", "duration_min": 20, "calories": 60},
            cookies={"session_token": token},
        )
        assert r.status_code == 200
        wid = r.json()["id"]
        # owner patch OK
        r2 = requests.patch(
            f"{API}/workouts/{wid}",
            json={"type": "Yoga", "duration_min": 25, "calories": 80},
            cookies={"session_token": token},
        )
        assert r2.status_code == 200
        assert r2.json()["duration_min"] == 25
        # other user patch -> 403
        r3 = requests.patch(
            f"{API}/workouts/{wid}",
            json={"type": "Yoga", "duration_min": 5, "calories": 5},
            cookies={"session_token": other_token},
        )
        assert r3.status_code == 403
        # unauthenticated -> 401
        r4 = requests.patch(f"{API}/workouts/{wid}", json={"type": "Yoga", "duration_min": 5, "calories": 5})
        assert r4.status_code == 401

    def test_delete_only_owner(self, seeded_owner, seeded_other):
        uid, token = seeded_owner
        _, other_token = seeded_other
        r = requests.post(
            f"{API}/workouts",
            json={"type": "Weights", "duration_min": 15, "calories": 50},
            cookies={"session_token": token},
        )
        wid = r.json()["id"]
        # non-owner delete -> 403
        r2 = requests.delete(f"{API}/workouts/{wid}", cookies={"session_token": other_token})
        assert r2.status_code == 403
        # unauth delete -> 401
        r3 = requests.delete(f"{API}/workouts/{wid}")
        assert r3.status_code == 401
        # owner delete OK
        r4 = requests.delete(f"{API}/workouts/{wid}", cookies={"session_token": token})
        assert r4.status_code == 200
        # then 404
        r5 = requests.delete(f"{API}/workouts/{wid}", cookies={"session_token": token})
        assert r5.status_code == 404


# ---------- logout ----------
class TestLogout:
    def test_logout_deletes_session(self):
        uid, token = _seed_user_session("LOGOUT")
        try:
            # Confirm session works
            r = requests.get(f"{API}/auth/me", cookies={"session_token": token})
            assert r.status_code == 200
            # Logout
            r2 = requests.post(f"{API}/auth/logout", cookies={"session_token": token})
            assert r2.status_code == 200
            assert r2.json() == {"ok": True}
            # Session row deleted
            assert db.user_sessions.find_one({"session_token": token}) is None
            # /me now 401
            r3 = requests.get(f"{API}/auth/me", cookies={"session_token": token})
            assert r3.status_code == 401
        finally:
            db.user_sessions.delete_many({"user_id": uid})
            db.users.delete_one({"user_id": uid})


# ---------- public endpoints ----------
class TestPublic:
    def test_leaderboard_public(self):
        r = requests.get(f"{API}/leaderboard")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_workouts_public(self):
        r = requests.get(f"{API}/workouts")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
