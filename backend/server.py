from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

INVITE_CODE = os.environ.get('INVITE_CODE', 'SWEAT2026')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============= Models =============
WorkoutType = Literal['Running', 'Weights', 'Yoga']


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LoginRequest(BaseModel):
    name: str
    invite_code: str


class LoginResponse(BaseModel):
    user: User
    invite_code_valid: bool = True


class Workout(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    type: WorkoutType
    duration_min: int
    calories: int
    note: Optional[str] = ""
    points: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WorkoutCreate(BaseModel):
    user_id: str
    type: WorkoutType
    duration_min: int
    calories: int
    note: Optional[str] = ""


class WorkoutUpdate(BaseModel):
    user_id: str
    type: WorkoutType
    duration_min: int
    calories: int
    note: Optional[str] = ""


class LeaderboardEntry(BaseModel):
    user_id: str
    name: str
    total_points: int
    workouts_count: int
    total_minutes: int
    total_calories: int


# ============= Helpers =============
def calc_points(duration_min: int, calories: int) -> int:
    """10 base + 1 pt/min + 5 bonus (>=45 min) + calories/10."""
    base = 10
    duration_pts = max(0, duration_min)
    bonus = 5 if duration_min >= 45 else 0
    calorie_pts = max(0, calories) // 10
    return base + duration_pts + bonus + calorie_pts


def since_for_timeframe(timeframe: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if timeframe == 'week':
        return now - timedelta(days=7)
    if timeframe == 'month':
        return now - timedelta(days=30)
    return None  # all-time


# ============= Routes =============
@api_router.get("/")
async def root():
    return {"message": "SweatBoard API"}


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    if payload.invite_code.strip().upper() != INVITE_CODE.upper():
        raise HTTPException(status_code=401, detail="Invalid invite code")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    # Find existing (case-insensitive) or create
    existing = await db.users.find_one({"name_lower": name.lower()}, {"_id": 0})
    if existing:
        user = User(**existing)
        return LoginResponse(user=user)

    user = User(name=name)
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['name_lower'] = name.lower()
    await db.users.insert_one(doc)
    return LoginResponse(user=user)


@api_router.post("/workouts", response_model=Workout)
async def create_workout(payload: WorkoutCreate):
    if payload.duration_min <= 0:
        raise HTTPException(status_code=400, detail="Duration must be > 0")
    if payload.calories < 0:
        raise HTTPException(status_code=400, detail="Calories must be >= 0")

    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    points = calc_points(payload.duration_min, payload.calories)
    workout = Workout(
        user_id=payload.user_id,
        user_name=user['name'],
        type=payload.type,
        duration_min=payload.duration_min,
        calories=payload.calories,
        note=payload.note or "",
        points=points,
    )
    doc = workout.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.workouts.insert_one(doc)
    return workout


@api_router.patch("/workouts/{workout_id}", response_model=Workout)
async def update_workout(workout_id: str, payload: WorkoutUpdate):
    if payload.duration_min <= 0:
        raise HTTPException(status_code=400, detail="Duration must be > 0")
    if payload.calories < 0:
        raise HTTPException(status_code=400, detail="Calories must be >= 0")

    existing = await db.workouts.find_one({"id": workout_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Workout not found")
    if existing['user_id'] != payload.user_id:
        raise HTTPException(status_code=403, detail="Not allowed to edit this workout")

    points = calc_points(payload.duration_min, payload.calories)
    update_doc = {
        "type": payload.type,
        "duration_min": payload.duration_min,
        "calories": payload.calories,
        "note": payload.note or "",
        "points": points,
    }
    await db.workouts.update_one({"id": workout_id}, {"$set": update_doc})
    merged = {**existing, **update_doc}
    if isinstance(merged.get('created_at'), str):
        merged['created_at'] = datetime.fromisoformat(merged['created_at'])
    return Workout(**merged)


@api_router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: str, user_id: str = Query(...)):
    existing = await db.workouts.find_one({"id": workout_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Workout not found")
    if existing['user_id'] != user_id:
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
                "name": {"$first": "$user_name"},
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
            total_points=row['total_points'],
            workouts_count=row['workouts_count'],
            total_minutes=row['total_minutes'],
            total_calories=row['total_calories'],
        ))
    return entries


@api_router.get("/users/{user_id}/stats")
async def user_stats(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pipeline = [
        {"$match": {"user_id": user_id}},
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
    return {"user": {"id": user['id'], "name": user['name']}, "stats": stats}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
