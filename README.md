# Startup Simulator

Full-stack MVP built with Node.js (Express), React, and PostgreSQL.

## Features

- User registration and login with JWT auth
- Create and manage startup simulations
- Run weekly rounds with business decisions
- Random market events affecting KPIs
- Admin panel for managing simulation event formulas
- KPI tracking per round (revenue, costs, profit, burn rate, market share, satisfaction)
- Leaderboard with top final scores

## Tech Stack

- Backend: Express, pg, jsonwebtoken
- Frontend: React + Vite
- Database: PostgreSQL (Docker Compose)

## Project Structure

- `backend` - API server
- `frontend` - React client
- `db` - SQL initialization script

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose

## Setup

1. Install dependencies:
	```bash
	npm install
	```
2. Configure backend environment:
	```bash
	cp backend/.env.example backend/.env
	```
3. Start PostgreSQL:
	```bash
	npm run db:up
	```
4. Start backend and frontend:
	```bash
	npm run dev
	```

## URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Health endpoint: http://localhost:4000/api/health

## Main API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/simulations`
- `POST /api/simulations`
- `GET /api/simulations/:id`
- `POST /api/simulations/:id/rounds`
- `GET /api/leaderboard`
- `GET /api/admin/events` (admin)
- `POST /api/admin/events` (admin)
- `PUT /api/admin/events/:id` (admin)

## Notes

- MVP version intentionally keeps the simulation formula simple and readable.
- Leaderboard entries are created when a simulation is completed.
- To use the admin panel, set a user's `role` to `admin` in the database.