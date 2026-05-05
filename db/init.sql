CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  current_round INTEGER NOT NULL DEFAULT 0,
  max_rounds INTEGER NOT NULL DEFAULT 8,
  cash NUMERIC(12,2) NOT NULL DEFAULT 100000,
  market_share NUMERIC(6,2) NOT NULL DEFAULT 5,
  customer_satisfaction NUMERIC(5,2) NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  marketing_budget NUMERIC(12,2) NOT NULL,
  hiring_count INTEGER NOT NULL,
  product_investment NUMERIC(12,2) NOT NULL,
  pricing_strategy TEXT NOT NULL,
  cash_reserve NUMERIC(12,2) NOT NULL,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  revenue NUMERIC(12,2) NOT NULL,
  costs NUMERIC(12,2) NOT NULL,
  profit NUMERIC(12,2) NOT NULL,
  market_share NUMERIC(6,2) NOT NULL,
  customer_satisfaction NUMERIC(5,2) NOT NULL,
  burn_rate NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  final_score NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_events (
  id SERIAL PRIMARY KEY,
  type TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  revenue_multiplier NUMERIC(6,2) NOT NULL,
  cost_multiplier NUMERIC(6,2) NOT NULL,
  satisfaction_delta NUMERIC(6,2) NOT NULL,
  market_share_delta NUMERIC(6,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO simulation_events (
  type,
  description,
  revenue_multiplier,
  cost_multiplier,
  satisfaction_delta,
  market_share_delta,
  is_active
)
VALUES
  ('market_boom', 'Market demand increased unexpectedly.', 1.20, 1.00, 2.00, 1.00, TRUE),
  ('ad_platform_outage', 'Ad platform outage reduced your campaign reach.', 0.88, 1.00, -1.00, -0.50, TRUE),
  ('strong_competitor', 'A new competitor launched similar features.', 0.90, 1.02, -2.00, -1.50, TRUE),
  ('viral_feedback', 'Positive community feedback boosted traction.', 1.15, 1.00, 4.00, 1.20, TRUE),
  ('normal_week', 'Steady market conditions this round.', 1.00, 1.00, 0.00, 0.00, TRUE)
ON CONFLICT (type) DO NOTHING;
