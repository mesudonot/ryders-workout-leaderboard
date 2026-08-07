# SweatBoard - Product Requirements

## Original Problem Statement
Workout leaderboard app to share with friends. Friends share their workouts and a scoring rubric (show-up, intensity/calories, duration) determines a leaderboard. Anyone with the link + invite code can log workouts and view the leaderboard.

## User Choices (locked)
- **Login**: Simple name + shared invite code (no passwords). Invite code = `SWEAT2026` (env `INVITE_CODE`).
- **Scoring**: `10 (show-up) + duration_min + (5 if duration >= 45 else 0) + floor(calories / 10)`.
- **Timeframes**: Week / Month / All-Time, toggleable.
- **Workout types**: Running, Weights, Yoga.
- **Access**: Anyone with link + code can view.

## Architecture
- **Backend**: FastAPI + Motor + MongoDB.
  - Collections: `users`, `workouts`.
  - Endpoints:
    - `POST /api/auth/login` — validates invite code, upserts user.
    - `POST /api/workouts` — logs workout, calculates points server-side.
    - `GET /api/workouts` — recent activity feed.
    - `GET /api/leaderboard?timeframe=week|month|all` — aggregated ranking.
    - `GET /api/users/{id}/stats` — personal totals.
- **Frontend**: React + Tailwind + Shadcn UI + Framer Motion + Phosphor Icons.
  - Routes: `/enter` (gate) and `/board` (dashboard).
  - Auth via `localStorage`.

## Design System
- Dark tactical / "Performance Pro" archetype (obsidian #0A0A0A + accent Volt #CCFF00).
- Barlow Condensed (display) + DM Sans (body).

## Implemented (v1, Feb 2026)
- [x] Invite-code gated entry with hero landing.
- [x] Dashboard: hero header, personal stat grid (points/sessions/minutes/calories).
- [x] Leaderboard with Week/Month/All-Time tabs, current-user highlight, animated rows.
- [x] Activity feed with per-type icons and time-ago labels.
- [x] Record workout dialog with type picker + live projected points.

## Prioritized Backlog
- **P1** Editable / deletable workouts.
- **P1** Per-user profile drawer showing recent history & personal bests.
- **P2** Streaks (consecutive workout days) + trophy badges.
- **P2** Shareable weekly summary card.
- **P2** Multiple invite circles / groups.
