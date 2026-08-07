import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const verifyGate = (invite_code) =>
  api.post("/auth/gate", { invite_code }).then((r) => r.data);

export const createSession = (session_id) =>
  api
    .post("/auth/session", null, { headers: { "X-Session-ID": session_id } })
    .then((r) => r.data);

export const fetchMe = () => api.get("/auth/me").then((r) => r.data);

export const logout = () => api.post("/auth/logout").then((r) => r.data);

export const createWorkout = (payload) =>
  api.post("/workouts", payload).then((r) => r.data);

export const updateWorkout = (id, payload) =>
  api.patch(`/workouts/${id}`, payload).then((r) => r.data);

export const deleteWorkout = (id) =>
  api.delete(`/workouts/${id}`).then((r) => r.data);

export const listWorkouts = (params = {}) =>
  api.get("/workouts", { params }).then((r) => r.data);

export const getLeaderboard = (timeframe = "all") =>
  api.get("/leaderboard", { params: { timeframe } }).then((r) => r.data);

export const getMyStats = () =>
  api.get("/users/me/stats").then((r) => r.data);
