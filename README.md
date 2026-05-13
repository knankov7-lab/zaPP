# Startup Simulator

Full-stack MVP built with Node.js (Express), React, and PostgreSQL.

## 🌐 Live Demo

- **Frontend:** https://za-pp.vercel.app
- **Backend API:** https://zapp-ej5l.onrender.com/api

---

## 📖 Ръководство за ползване

### 1. Регистрация и вход

1. Отвори приложението в браузъра.
2. Кликни на **Register** и попълни:
   - **Name** – твоето потребителско име
   - **Email** – валиден имейл адрес
   - **Password** – парола
3. След успешна регистрация, превключи на **Login** и влез с имейл и парола.

---

### 2. Създаване на симулация

След влизане ще видиш лявото поле **New Simulation**:

| Поле | Описание |
|------|----------|
| **Startup name** | Има на стартъпа ти |
| **Sector** | Сектор (по подразбиране `SaaS`, но може да е всичко) |
| **Max rounds** | Брой седмици за симулацията (3–20, препоръчано 8) |

Кликни **Create** за да стартираш.

---

### 3. Играе рунд (седмица)

В централния панел **Simulation Control** виждаш текущите KPI-та:

| KPI | Описание |
|-----|----------|
| **Cash** | Наличен паричен ресурс в $ |
| **Market Share** | Пазарен дял в % |
| **Satisfaction** | Удовлетвореност на клиентите (0–100) |
| **Status** | `active` или `completed` |

За всеки рунд взимаш **бизнес решения**:

| Поле | Описание | Съвет |
|------|----------|-------|
| **Marketing budget** | Харч за маркетинг тази седмица | По-висок = повече клиенти |
| **Product investment** | Инвестиция в продукта | Повишава satisfaction |
| **Hiring count** | Брой нови служители | Повишава costs |
| **Pricing strategy** | `balanced` / `premium` / `budget` | Premium = по-висок revenue, но риск от спад на satisfaction |
| **Cash reserve** | Резерв в кеш | Ако cash < reserve, симулацията может да фалира |

Кликни **Run Next Round** за да изпълниш седмицата.

След всеки рунд ще видиш **случайно пазарно събитие**, например:
- 📈 *"Market demand increased unexpectedly"* – бонус приходи
- 📉 *"A new competitor launched similar features"* – спад на пазарния дял
- 💬 *"Positive community feedback"* – растеж на удовлетвореността

---

### 4. История на рундовете

Под формата за решения се показват всички изминали седмици с:
- Събитие за тази седмица
- **Revenue**, **Costs**, **Profit** за всеки рунд

---

### 5. Leaderboard

Дясното поле показва **топ резултати** от всички завършени симулации:
- Играч
- Стартъп
- Финален резултат (изчислен от cash + market share + satisfaction)

Симулацията завършва когато изтекат всички рундове или паричните средства паднат до 0.

---

### 6. Admin панел

> Само потребители с роля `admin`.

За да дадеш admin права, изпълни директно в базата:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Admin панелът позволява:
- Преглед на всички **пазарни събития** и техните формули
- **Добавяне** на нови събития
- **Редактиране** на мултипликаторите (revenue, cost, satisfaction, market share)
- **Активиране/деактивиране** на конкретни събития

---

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