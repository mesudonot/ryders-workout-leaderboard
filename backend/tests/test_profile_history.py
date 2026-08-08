"""Tests for GET /api/users/{user_id}/history (Personal Profile Drawer)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sweatboard.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEEDED_USER_ID = "user_b9f04480cf4a"  # Sam Seed – 3 workouts totalling 260 pts

# We'll seed the second user + orphan directly via mongo shell in conftest fixture
SECOND_USER_ID = "user_test_profile_second"
ORPHAN_USER_ID = "user_test_profile_orphan"


@pytest.fixture(scope="module", autouse=True)
def seed_extra_data():
    import subprocess
    js = f"""
    use('test_database');
    db.users.updateOne(
      {{user_id: '{SECOND_USER_ID}'}},
      {{$set: {{user_id: '{SECOND_USER_ID}', email: 'second@sweatboard.test', name: 'Second Athlete', picture: null, created_at: new Date().toISOString()}}}},
      {{upsert: true}}
    );
    db.workouts.deleteMany({{user_id: '{SECOND_USER_ID}'}});
    db.workouts.insertMany([
      {{id: 'wk_sec_1', user_id: '{SECOND_USER_ID}', user_name: 'Second Athlete', user_picture: null, type: 'Running', duration_min: 20, calories: 200, note: '', points: 50, created_at: new Date(Date.now()-2000).toISOString()}},
      {{id: 'wk_sec_2', user_id: '{SECOND_USER_ID}', user_name: 'Second Athlete', user_picture: null, type: 'Weights', duration_min: 30, calories: 150, note: '', points: 55, created_at: new Date().toISOString()}}
    ]);
    // orphan: workout without user row
    db.users.deleteMany({{user_id: '{ORPHAN_USER_ID}'}});
    db.workouts.deleteMany({{user_id: '{ORPHAN_USER_ID}'}});
    db.workouts.insertOne({{id: 'wk_orphan_1', user_id: '{ORPHAN_USER_ID}', user_name: 'Ghost Runner', user_picture: 'https://x/orphan.png', type: 'Yoga', duration_min: 25, calories: 90, note: '', points: 44, created_at: new Date().toISOString()}});
    print('SEED_OK');
    """
    r = subprocess.run(["mongosh", "--quiet", "--eval", js], capture_output=True, text=True)
    assert "SEED_OK" in r.stdout, r.stdout + r.stderr
    yield
    cleanup = f"""
    use('test_database');
    db.users.deleteOne({{user_id: '{SECOND_USER_ID}'}});
    db.workouts.deleteMany({{user_id: '{SECOND_USER_ID}'}});
    db.workouts.deleteMany({{user_id: '{ORPHAN_USER_ID}'}});
    """
    subprocess.run(["mongosh", "--quiet", "--eval", cleanup], capture_output=True, text=True)


def test_history_public_no_cookie():
    r = requests.get(f"{API}/users/{SEEDED_USER_ID}/history")
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ("user", "stats", "per_type", "personal_best", "workouts"):
        assert key in data


def test_seeded_stats_and_personal_best():
    r = requests.get(f"{API}/users/{SEEDED_USER_ID}/history")
    assert r.status_code == 200
    data = r.json()
    # Sam Seed known totals
    assert data["user"]["user_id"] == SEEDED_USER_ID
    assert data["user"]["name"] == "Sam Seed"
    assert data["stats"]["total_points"] == 260
    assert data["stats"]["workouts_count"] == 3
    assert data["stats"]["total_minutes"] == 60 + 30 + 45
    assert data["stats"]["total_calories"] == 450 + 120 + 280
    # Per-type
    assert data["per_type"]["Running"] == {"count": 1, "points": 120, "minutes": 60}
    assert data["per_type"]["Yoga"] == {"count": 1, "points": 52, "minutes": 30}
    assert data["per_type"]["Weights"] == {"count": 1, "points": 88, "minutes": 45}
    # Personal best = Running 120
    pb = data["personal_best"]
    assert pb is not None
    assert pb["type"] == "Running"
    assert pb["points"] == 120
    assert pb["duration_min"] == 60
    # Workouts sorted by created_at desc
    ts = [w["created_at"] for w in data["workouts"]]
    assert ts == sorted(ts, reverse=True)


def test_history_totals_match_sum_of_workouts():
    r = requests.get(f"{API}/users/{SEEDED_USER_ID}/history")
    data = r.json()
    ws = data["workouts"]
    assert sum(w["points"] for w in ws) == data["stats"]["total_points"]
    assert sum(w["duration_min"] for w in ws) == data["stats"]["total_minutes"]
    assert sum(w["calories"] for w in ws) == data["stats"]["total_calories"]


def test_history_nonexistent_user_returns_404():
    r = requests.get(f"{API}/users/nonexistent_xyz_123/history")
    assert r.status_code == 404
    assert "not found" in r.json().get("detail", "").lower()


def test_history_orphan_workout_fallback():
    r = requests.get(f"{API}/users/{ORPHAN_USER_ID}/history")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["name"] == "Ghost Runner"
    assert data["user"]["picture"] == "https://x/orphan.png"
    assert data["stats"]["workouts_count"] == 1
    assert data["personal_best"]["points"] == 44


def test_second_user_history():
    r = requests.get(f"{API}/users/{SECOND_USER_ID}/history")
    assert r.status_code == 200
    data = r.json()
    assert data["stats"]["workouts_count"] == 2
    assert data["stats"]["total_points"] == 105
    assert data["personal_best"]["points"] == 55  # Weights 30/150 = 55
    assert data["personal_best"]["type"] == "Weights"


def test_response_has_no_mongo_id():
    r = requests.get(f"{API}/users/{SEEDED_USER_ID}/history")
    data = r.json()
    assert "_id" not in data
    for w in data["workouts"]:
        assert "_id" not in w
    if data.get("personal_best"):
        assert "_id" not in data["personal_best"]
