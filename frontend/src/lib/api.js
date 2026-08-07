import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const login = (name, invite_code) =>
  api.post("/auth/login", { name, invite_code }).then((r) => r.data);

export const createWorkout = (payload) =>
  api.post("/workouts", payload).then((r) => r.data);

export const listWorkouts = (params = {}) =>
  api.get("/workouts", { params }).then((r) => r.data);

export const getLeaderboard = (timeframe = "all") =>
  api.get("/leaderboard", { params: { timeframe } }).then((r) => r.data);

export const getUserStats = (user_id) =>
  api.get(`/users/${user_id}/stats`).then((r) => r.data);
