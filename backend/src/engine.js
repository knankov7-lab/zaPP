function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const defaultEvents = [
  {
    type: "market_boom",
    description: "Market demand increased unexpectedly.",
    revenueMultiplier: 1.2,
    costMultiplier: 1.0,
    satisfactionDelta: 2,
    marketShareDelta: 1,
  },
  {
    type: "ad_platform_outage",
    description: "Ad platform outage reduced your campaign reach.",
    revenueMultiplier: 0.88,
    costMultiplier: 1.0,
    satisfactionDelta: -1,
    marketShareDelta: -0.5,
  },
  {
    type: "strong_competitor",
    description: "A new competitor launched similar features.",
    revenueMultiplier: 0.9,
    costMultiplier: 1.02,
    satisfactionDelta: -2,
    marketShareDelta: -1.5,
  },
  {
    type: "viral_feedback",
    description: "Positive community feedback boosted traction.",
    revenueMultiplier: 1.15,
    costMultiplier: 1.0,
    satisfactionDelta: 4,
    marketShareDelta: 1.2,
  },
  {
    type: "normal_week",
    description: "Steady market conditions this round.",
    revenueMultiplier: 1.0,
    costMultiplier: 1.0,
    satisfactionDelta: 0,
    marketShareDelta: 0,
  },
];

function pickEvent(events) {
  return events[Math.floor(Math.random() * events.length)];
}

export function runRound(currentState, decision, eventsFromDb = []) {
  const events = eventsFromDb.length > 0 ? eventsFromDb : defaultEvents;
  const event = pickEvent(events);

  const pricingMultiplier =
    decision.pricingStrategy === "premium"
      ? 1.1
      : decision.pricingStrategy === "budget"
      ? 0.9
      : 1.0;

  const productFactor = 1 + Number(decision.productInvestment) / 200000;
  const marketingFactor = 1 + Number(decision.marketingBudget) / 250000;
  const hiringFactor = 1 + Number(decision.hiringCount) * 0.015;

  const baseRevenue =
    30000 * pricingMultiplier * productFactor * marketingFactor * hiringFactor;
  const revenue = baseRevenue * event.revenueMultiplier;

  const staffCosts = 3500 * Number(decision.hiringCount);
  const costs =
    (Number(decision.marketingBudget) +
      Number(decision.productInvestment) +
      staffCosts +
      12000) *
    event.costMultiplier;

  const profit = revenue - costs;
  const burnRate = costs - revenue > 0 ? costs - revenue : 0;

  const newCash = Number(currentState.cash) + profit;
  const newMarketShare = clamp(
    Number(currentState.market_share) +
      event.marketShareDelta +
      Number(decision.marketingBudget) / 40000 +
      Number(decision.productInvestment) / 100000,
    0,
    100,
  );

  const satisfactionChange =
    event.satisfactionDelta +
    Number(decision.productInvestment) / 20000 -
    (decision.pricingStrategy === "premium" ? 2 : 0) +
    (decision.pricingStrategy === "budget" ? 1 : 0);

  const newSatisfaction = clamp(
    Number(currentState.customer_satisfaction) + satisfactionChange,
    0,
    100,
  );

  const score =
    newCash * 0.001 + newMarketShare * 12 + newSatisfaction * 8 - burnRate * 0.0005;

  return {
    event,
    metrics: {
      revenue: revenue.toFixed(2),
      costs: costs.toFixed(2),
      profit: profit.toFixed(2),
      burnRate: burnRate.toFixed(2),
      cash: newCash.toFixed(2),
      marketShare: newMarketShare.toFixed(2),
      customerSatisfaction: newSatisfaction.toFixed(2),
      score: score.toFixed(2),
    },
  };
}
