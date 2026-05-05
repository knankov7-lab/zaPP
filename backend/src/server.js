import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import { runRound } from "./engine.js";
import { adminRequired } from "./middleware.admin.js";
import { authRequired } from "./middleware.auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users(name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role",
      [name, email, passwordHash],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/simulations", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM simulations WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/admin/events", authRequired, adminRequired, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, description, revenue_multiplier, cost_multiplier,
              satisfaction_delta, market_share_delta, is_active
       FROM simulation_events
       ORDER BY id ASC`,
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/admin/events", authRequired, adminRequired, async (req, res) => {
  try {
    const {
      type,
      description,
      revenueMultiplier,
      costMultiplier,
      satisfactionDelta,
      marketShareDelta,
      isActive,
    } = req.body;

    if (!type || !description) {
      return res.status(400).json({ message: "type and description are required" });
    }

    const result = await pool.query(
      `INSERT INTO simulation_events(
         type, description, revenue_multiplier, cost_multiplier,
         satisfaction_delta, market_share_delta, is_active, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, type, description, revenue_multiplier, cost_multiplier,
                 satisfaction_delta, market_share_delta, is_active`,
      [
        type,
        description,
        Number(revenueMultiplier ?? 1),
        Number(costMultiplier ?? 1),
        Number(satisfactionDelta ?? 0),
        Number(marketShareDelta ?? 0),
        isActive ?? true,
      ],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Event type already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/admin/events/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const {
      description,
      revenueMultiplier,
      costMultiplier,
      satisfactionDelta,
      marketShareDelta,
      isActive,
    } = req.body;

    const result = await pool.query(
      `UPDATE simulation_events
       SET description = COALESCE($1, description),
           revenue_multiplier = COALESCE($2, revenue_multiplier),
           cost_multiplier = COALESCE($3, cost_multiplier),
           satisfaction_delta = COALESCE($4, satisfaction_delta),
           market_share_delta = COALESCE($5, market_share_delta),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, type, description, revenue_multiplier, cost_multiplier,
                 satisfaction_delta, market_share_delta, is_active`,
      [
        description,
        revenueMultiplier == null ? null : Number(revenueMultiplier),
        costMultiplier == null ? null : Number(costMultiplier),
        satisfactionDelta == null ? null : Number(satisfactionDelta),
        marketShareDelta == null ? null : Number(marketShareDelta),
        typeof isActive === "boolean" ? isActive : null,
        eventId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/simulations", authRequired, async (req, res) => {
  try {
    const { startupName, sector, maxRounds } = req.body;
    if (!startupName || !sector) {
      return res.status(400).json({ message: "startupName and sector are required" });
    }

    const rounds = Number(maxRounds) > 0 ? Number(maxRounds) : 8;

    const result = await pool.query(
      `INSERT INTO simulations(user_id, startup_name, sector, max_rounds)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, startupName, sector, rounds],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/simulations/:id", authRequired, async (req, res) => {
  try {
    const simulationId = Number(req.params.id);

    const simulationResult = await pool.query(
      "SELECT * FROM simulations WHERE id = $1 AND user_id = $2",
      [simulationId, req.user.id],
    );

    if (simulationResult.rows.length === 0) {
      return res.status(404).json({ message: "Simulation not found" });
    }

    const roundsResult = await pool.query(
      "SELECT * FROM rounds WHERE simulation_id = $1 ORDER BY round_number ASC",
      [simulationId],
    );

    return res.json({ simulation: simulationResult.rows[0], rounds: roundsResult.rows });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/simulations/:id/rounds", authRequired, async (req, res) => {
  try {
    const simulationId = Number(req.params.id);
    const { marketingBudget, hiringCount, productInvestment, pricingStrategy, cashReserve } = req.body;

    const simulationResult = await pool.query(
      "SELECT * FROM simulations WHERE id = $1 AND user_id = $2",
      [simulationId, req.user.id],
    );

    if (simulationResult.rows.length === 0) {
      return res.status(404).json({ message: "Simulation not found" });
    }

    const simulation = simulationResult.rows[0];

    if (simulation.status === "completed") {
      return res.status(400).json({ message: "Simulation is already completed" });
    }

    const decision = {
      marketingBudget: Number(marketingBudget || 0),
      hiringCount: Number(hiringCount || 0),
      productInvestment: Number(productInvestment || 0),
      pricingStrategy: pricingStrategy || "balanced",
      cashReserve: Number(cashReserve || 0),
    };

    const eventsResult = await pool.query(
      `SELECT type, description, revenue_multiplier, cost_multiplier,
              satisfaction_delta, market_share_delta
       FROM simulation_events
       WHERE is_active = TRUE`,
    );

    const events = eventsResult.rows.map((event) => ({
      type: event.type,
      description: event.description,
      revenueMultiplier: Number(event.revenue_multiplier),
      costMultiplier: Number(event.cost_multiplier),
      satisfactionDelta: Number(event.satisfaction_delta),
      marketShareDelta: Number(event.market_share_delta),
    }));

    const run = runRound(simulation, decision, events);
    const nextRound = Number(simulation.current_round) + 1;
    const shouldComplete = nextRound >= Number(simulation.max_rounds) || Number(run.metrics.cash) < 0;

    await pool.query(
      `INSERT INTO rounds(
        simulation_id, round_number, marketing_budget, hiring_count, product_investment,
        pricing_strategy, cash_reserve, event_type, event_description, revenue, costs,
        profit, market_share, customer_satisfaction, burn_rate
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15
      )`,
      [
        simulationId,
        nextRound,
        decision.marketingBudget,
        decision.hiringCount,
        decision.productInvestment,
        decision.pricingStrategy,
        decision.cashReserve,
        run.event.type,
        run.event.description,
        run.metrics.revenue,
        run.metrics.costs,
        run.metrics.profit,
        run.metrics.marketShare,
        run.metrics.customerSatisfaction,
        run.metrics.burnRate,
      ],
    );

    const updateResult = await pool.query(
      `UPDATE simulations
       SET current_round = $1,
           cash = $2,
           market_share = $3,
           customer_satisfaction = $4,
           status = $5,
           completed_at = CASE WHEN $5 = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $6
       RETURNING *`,
      [
        nextRound,
        run.metrics.cash,
        run.metrics.marketShare,
        run.metrics.customerSatisfaction,
        shouldComplete ? "completed" : "active",
        simulationId,
      ],
    );

    if (shouldComplete) {
      await pool.query(
        "INSERT INTO leaderboard(user_id, simulation_id, final_score) VALUES ($1, $2, $3)",
        [req.user.id, simulationId, run.metrics.score],
      );
    }

    return res.status(201).json({
      simulation: updateResult.rows[0],
      event: run.event,
      metrics: run.metrics,
      completed: shouldComplete,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/leaderboard", authRequired, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.final_score, l.created_at, s.startup_name, s.sector, u.name AS player
       FROM leaderboard l
       JOIN simulations s ON s.id = l.simulation_id
       JOIN users u ON u.id = l.user_id
       ORDER BY l.final_score DESC
       LIMIT 20`,
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
