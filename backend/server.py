from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

INVITE_CODE = os.environ.get('INVITE_CODE', 'SWEAT2026')
EMERGENT_AUTH_SESSION_URL = 'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data'
SESSION_COOKIE = 'session_token'
SESSION_DAYS = 7

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============= Models =============
WorkoutType = Literal['Running', 'Weights', 'Yoga']


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GateRequest(BaseModel):
    invite_code: str


class Workout(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    type: WorkoutType
    duration_min: int
    calories: int
    note: Optional[str] = ""
    points: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WorkoutInput(BaseModel):
    type: WorkoutType
    duration_min: int
    calories: int
    note: Optional[str] = ""
    created_at: Optional[datetime] = None


class LeaderboardEntry(BaseModel):
    user_id: str
    name: str
    picture: Optional[str] = None
    total_points: int
    workouts_count: int
    total_minutes: int
    total_calories: int


# ============= Helpers =============
def calc_points(duration_min: int, calories: int) -> int:
    base = 10
    duration_pts = max(0, duration_min)
    bonus = 5 if duration_min >= 45 else 0
    calorie_pts = max(0, calories) // 10
    return base + duration_pts + bonus + calorie_pts


def since_for_timeframe(timeframe: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if timeframe == 'week':
        # Monday 00:00 UTC of the current week (Mon-Sun inclusive)
        monday = now - timedelta(days=now.weekday())
        return monday.replace(hour=0, minute=0, second=0, microsecond=0)
    if timeframe == 'month':
        return now - timedelta(days=30)
    return None


async def _load_user_from_token(token: str) -> Optional[dict]:
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await _load_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


# ============= Routes =============
@api_router.get("/")
async def root():
    return {"message": "SweatBoard API"}


@api_router.post("/auth/gate")
async def gate(payload: GateRequest):
    if payload.invite_code.strip().upper() != INVITE_CODE.upper():
        raise HTTPException(status_code=401, detail="Invalid invite code")
    return {"ok": True}


@api_router.post("/auth/session")
async def create_session(response: Response, x_session_id: Optional[str] = Header(default=None)):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")

    async with httpx.AsyncClient(timeout=15.0) as http:
        try:
            r = await http.get(
                EMERGENT_AUTH_SESSION_URL,
                headers={"X-Session-ID": x_session_id},
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Auth provider unreachable: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data.get("email")
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not (email and session_token):
        raise HTTPException(status_code=502, detail="Malformed auth response")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        # Refresh name/picture from Google
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name or existing.get("name"), "picture": picture}},
        )
        # Also update denormalized name/picture on their workouts
        await db.workouts.update_many(
            {"user_id": user_id},
            {"$set": {"user_name": name or existing.get("name"), "user_picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name or email.split("@")[0],
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": User(**user_doc).model_dump(mode="json")}


@api_router.get("/auth/me")
async def me(current: dict = Depends(get_current_user)):
    return {"user": User(**current).model_dump(mode="json")}


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="none", secure=True)
    return {"ok": True}


@api_router.post("/workouts", response_model=Workout)
async def create_workout(payload: WorkoutInput, current: dict = Depends(get_current_user)):
    if payload.duration_min <= 0:
        raise HTTPException(status_code=400, detail="Duration must be > 0")
    if payload.calories < 0:
        raise HTTPException(status_code=400, detail="Calories must be >= 0")

    now = datetime.now(timezone.utc)
    created_at = payload.created_at or now
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if created_at > now + timedelta(minutes=5):
        raise HTTPException(status_code=400, detail="Date cannot be in the future")

    points = calc_points(payload.duration_min, payload.calories)
    workout = Workout(
        user_id=current["user_id"],
        user_name=current.get("name", "Athlete"),
        user_picture=current.get("picture"),
        type=payload.type,
        duration_min=payload.duration_min,
        calories=payload.calories,
        note=payload.note or "",
        points=points,
        created_at=created_at,
    )
    doc = workout.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.workouts.insert_one(doc)
    return workout


@api_router.patch("/workouts/{workout_id}", response_model=Workout)
async def update_workout(
    workout_id: str,
    payload: WorkoutInput,
    current: dict = Depends(get_current_user),
):
    if payload.duration_min <= 0:
        raise HTTPException(status_code=400, detail="Duration must be > 0")
    if payload.calories < 0:
        raise HTTPException(status_code=400, detail="Calories must be >= 0")

    existing = await db.workouts.find_one({"id": workout_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Workout not found")
    if existing['user_id'] != current["user_id"]:
        raise HTTPException(status_code=403, detail="Not allowed to edit this workout")

    points = calc_points(payload.duration_min, payload.calories)
    update_doc = {
        "type": payload.type,
        "duration_min": payload.duration_min,
        "calories": payload.calories,
        "note": payload.note or "",
        "points": points,
    }
    if payload.created_at is not None:
        ca = payload.created_at
        if ca.tzinfo is None:
            ca = ca.replace(tzinfo=timezone.utc)
        if ca > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise HTTPException(status_code=400, detail="Date cannot be in the future")
        update_doc["created_at"] = ca.isoformat()
    await db.workouts.update_one({"id": workout_id}, {"$set": update_doc})
    merged = {**existing, **update_doc}
    if isinstance(merged.get('created_at'), str):
        merged['created_at'] = datetime.fromisoformat(merged['created_at'])
    return Workout(**merged)


@api_router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: str, current: dict = Depends(get_current_user)):
    existing = await db.workouts.find_one({"id": workout_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Workout not found")
    if existing['user_id'] != current["user_id"]:
        raise HTTPException(status_code=403, detail="Not allowed to delete this workout")
    await db.workouts.delete_one({"id": workout_id})
    return {"deleted": True, "id": workout_id}


@api_router.get("/workouts", response_model=List[Workout])
async def list_workouts(user_id: Optional[str] = None, limit: int = 50):
    query = {}
    if user_id:
        query['user_id'] = user_id
    cursor = db.workouts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    for d in docs:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
        d.setdefault('user_picture', None)
    return [Workout(**d) for d in docs]


@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(timeframe: str = Query("all", pattern="^(week|month|all)$")):
    since = since_for_timeframe(timeframe)
    match_stage = {}
    if since:
        match_stage = {"created_at": {"$gte": since.isoformat()}}

    pipeline = []
    if match_stage:
        pipeline.append({"$match": match_stage})
    pipeline += [
        {
            "$group": {
                "_id": "$user_id",
                "name": {"$last": "$user_name"},
                "picture": {"$last": "$user_picture"},
                "total_points": {"$sum": "$points"},
                "workouts_count": {"$sum": 1},
                "total_minutes": {"$sum": "$duration_min"},
                "total_calories": {"$sum": "$calories"},
            }
        },
        {"$sort": {"total_points": -1}},
    ]

    entries: List[LeaderboardEntry] = []
    async for row in db.workouts.aggregate(pipeline):
        entries.append(LeaderboardEntry(
            user_id=row['_id'],
            name=row['name'],
            picture=row.get('picture'),
            total_points=row['total_points'],
            workouts_count=row['workouts_count'],
            total_minutes=row['total_minutes'],
            total_calories=row['total_calories'],
        ))
    return entries


@api_router.get("/users/me/stats")
async def user_stats(current: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": current["user_id"]}},
        {
            "$group": {
                "_id": "$user_id",
                "total_points": {"$sum": "$points"},
                "workouts_count": {"$sum": 1},
                "total_minutes": {"$sum": "$duration_min"},
                "total_calories": {"$sum": "$calories"},
            }
        },
    ]
    stats = {"total_points": 0, "workouts_count": 0, "total_minutes": 0, "total_calories": 0}
    async for row in db.workouts.aggregate(pipeline):
        stats = {k: row.get(k, 0) for k in stats.keys()}
    return {
        "user": {"user_id": current["user_id"], "name": current.get("name"), "picture": current.get("picture")},
        "stats": stats,
    }


@api_router.get("/users/{user_id}/history")
async def user_history(user_id: str, limit: int = 50):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    # Fall back to workout denormalized data if user record is missing (legacy)
    fallback_name = None
    fallback_picture = None
    if not user:
        sample = await db.workouts.find_one({"user_id": user_id}, {"_id": 0})
        if not sample:
            raise HTTPException(status_code=404, detail="User not found")
        fallback_name = sample.get("user_name")
        fallback_picture = sample.get("user_picture")

    cursor = db.workouts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    workouts = []
    personal_best = None
    per_type = {}
    total_points = 0
    total_minutes = 0
    total_calories = 0
    for d in docs:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
        d.setdefault('user_picture', None)
        w = Workout(**d)
        workouts.append(w)
        total_points += w.points
        total_minutes += w.duration_min
        total_calories += w.calories
        if not personal_best or w.points > personal_best.points:
            personal_best = w
        stats_for_type = per_type.setdefault(w.type, {"count": 0, "points": 0, "minutes": 0})
        stats_for_type["count"] += 1
        stats_for_type["points"] += w.points
        stats_for_type["minutes"] += w.duration_min

    return {
        "user": {
            "user_id": user_id,
            "name": (user or {}).get("name") or fallback_name or "Athlete",
            "picture": (user or {}).get("picture") or fallback_picture,
        },
        "stats": {
            "total_points": total_points,
            "workouts_count": len(workouts),
            "total_minutes": total_minutes,
            "total_calories": total_calories,
        },
        "per_type": per_type,
        "personal_best": personal_best.model_dump(mode="json") if personal_best else None,
        "workouts": [w.model_dump(mode="json") for w in workouts],
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
