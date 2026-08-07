import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sweatboard.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
INVITE = "SWEAT2026"


def _login(name):
    r = requests.post(f"{API}/auth/login", json={"name": name, "invite_code": INVITE})
    assert r.status_code == 200, r.text
    return r.json()["user"]


@pytest.fixture(scope="module")
def owner():
    return _login("TEST_Owner_ED")


@pytest.fixture(scope="module")
def other():
    return _login("TEST_Other_ED")


def _create(user_id, wtype, dur, cal):
    r = requests.post(f"{API}/workouts", json={
        "user_id": user_id, "type": wtype, "duration_min": dur, "calories": cal
    })
    assert r.status_code == 200, r.text
    return r.json()


class TestPatchWorkout:
    def test_patch_owner_recalc_points(self, owner):
        w = _create(owner["id"], "Yoga", 20, 60)
        # 10 + 20 + 0 + 6 = 36
        assert w["points"] == 36

        r = requests.patch(f"{API}/workouts/{w['id']}", json={
            "user_id": owner["id"], "type": "Running", "duration_min": 45, "calories": 320
        })
        assert r.status_code == 200, r.text
        data = r.json()
        # 10 + 45 + 5 + 32 = 92
        assert data["points"] == 92
        assert data["type"] == "Running"
        assert data["duration_min"] == 45
        assert data["calories"] == 320

        # verify via GET list
        r2 = requests.get(f"{API}/workouts", params={"user_id": owner["id"]})
        assert r2.status_code == 200
        found = [x for x in r2.json() if x["id"] == w["id"]]
        assert found and found[0]["points"] == 92

    def test_patch_non_owner_403(self, owner, other):
        w = _create(owner["id"], "Yoga", 20, 60)
        r = requests.patch(f"{API}/workouts/{w['id']}", json={
            "user_id": other["id"], "type": "Running", "duration_min": 30, "calories": 100
        })
        assert r.status_code == 403
        assert "Not allowed" in r.json().get("detail", "")

    def test_patch_invalid_id_404(self, owner):
        r = requests.patch(f"{API}/workouts/does-not-exist", json={
            "user_id": owner["id"], "type": "Running", "duration_min": 30, "calories": 100
        })
        assert r.status_code == 404

    def test_patch_bad_duration_400(self, owner):
        w = _create(owner["id"], "Yoga", 20, 60)
        r = requests.patch(f"{API}/workouts/{w['id']}", json={
            "user_id": owner["id"], "type": "Yoga", "duration_min": 0, "calories": 60
        })
        assert r.status_code == 400


class TestDeleteWorkout:
    def test_delete_owner_ok_and_second_404(self, owner):
        w = _create(owner["id"], "Yoga", 20, 60)
        r = requests.delete(f"{API}/workouts/{w['id']}", params={"user_id": owner["id"]})
        assert r.status_code == 200
        assert r.json().get("deleted") is True

        r2 = requests.delete(f"{API}/workouts/{w['id']}", params={"user_id": owner["id"]})
        assert r2.status_code == 404

    def test_delete_non_owner_403(self, owner, other):
        w = _create(owner["id"], "Yoga", 20, 60)
        r = requests.delete(f"{API}/workouts/{w['id']}", params={"user_id": other["id"]})
        assert r.status_code == 403
