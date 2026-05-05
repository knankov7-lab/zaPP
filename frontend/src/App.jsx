import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:4000/api";

async function api(path, method = "GET", body, token) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null,
  );
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [simulations, setSimulations] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [message, setMessage] = useState("");
  const [decision, setDecision] = useState({
    marketingBudget: 15000,
    hiringCount: 1,
    productInvestment: 12000,
    pricingStrategy: "balanced",
    cashReserve: 10000,
  });
  const [newSim, setNewSim] = useState({ startupName: "", sector: "SaaS", maxRounds: 8 });
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({
    type: "",
    description: "",
    revenueMultiplier: 1,
    costMultiplier: 1,
    satisfactionDelta: 0,
    marketShareDelta: 0,
    isActive: true,
  });
  const [eventEdits, setEventEdits] = useState({});

  const activeSim = useMemo(() => details?.simulation, [details]);

  useEffect(() => {
    if (token) {
      loadData(token);
    }
  }, [token]);

  async function loadData(authToken = token) {
    const requests = [
      api("/simulations", "GET", undefined, authToken),
      api("/leaderboard", "GET", undefined, authToken),
    ];

    if (user?.role === "admin") {
      requests.push(api("/admin/events", "GET", undefined, authToken));
    }

    const responses = await Promise.all(requests);
    setSimulations(responses[0]);
    setLeaderboard(responses[1]);

    if (user?.role === "admin") {
      setEvents(responses[2]);
    }

    if (selected) {
      const detail = await api(`/simulations/${selected}`, "GET", undefined, authToken);
      setDetails(detail);
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      if (authMode === "register") {
        await api("/auth/register", "POST", authForm);
        setMessage("Registration successful. Please login.");
        setAuthMode("login");
        return;
      }

      const result = await api("/auth/login", "POST", {
        email: authForm.email,
        password: authForm.password,
      });
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setSimulations([]);
    setDetails(null);
    setSelected(null);
  }

  async function createSimulation(e) {
    e.preventDefault();
    setMessage("");
    try {
      const created = await api("/simulations", "POST", newSim, token);
      setNewSim({ startupName: "", sector: "SaaS", maxRounds: 8 });
      setSelected(created.id);
      await loadSimulation(created.id);
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadSimulation(id) {
    const detail = await api(`/simulations/${id}`, "GET", undefined, token);
    setSelected(id);
    setDetails(detail);
  }

  async function playRound(e) {
    e.preventDefault();
    setMessage("");
    try {
      const result = await api(`/simulations/${selected}/rounds`, "POST", decision, token);
      setMessage(`Round finished: ${result.event.description}`);
      await loadSimulation(selected);
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createEvent(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api("/admin/events", "POST", eventForm, token);
      setEventForm({
        type: "",
        description: "",
        revenueMultiplier: 1,
        costMultiplier: 1,
        satisfactionDelta: 0,
        marketShareDelta: 0,
        isActive: true,
      });
      await loadData();
      setMessage("Event created.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateEvent(eventId, payload) {
    setMessage("");
    try {
      await api(`/admin/events/${eventId}`, "PUT", payload, token);
      await loadData();
      setMessage("Event updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startEditEvent(event) {
    setEventEdits((prev) => ({
      ...prev,
      [event.id]: {
        description: event.description,
        revenueMultiplier: Number(event.revenue_multiplier),
        costMultiplier: Number(event.cost_multiplier),
        satisfactionDelta: Number(event.satisfaction_delta),
        marketShareDelta: Number(event.market_share_delta),
        isActive: !!event.is_active,
      },
    }));
  }

  function changeEventEdit(eventId, field, value) {
    setEventEdits((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value,
      },
    }));
  }

  function cancelEditEvent(eventId) {
    setEventEdits((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }

  async function saveEventEdit(eventId) {
    const draft = eventEdits[eventId];
    if (!draft) {
      return;
    }

    await updateEvent(eventId, {
      description: draft.description,
      revenueMultiplier: Number(draft.revenueMultiplier),
      costMultiplier: Number(draft.costMultiplier),
      satisfactionDelta: Number(draft.satisfactionDelta),
      marketShareDelta: Number(draft.marketShareDelta),
      isActive: !!draft.isActive,
    });

    cancelEditEvent(eventId);
  }

  if (!token) {
    return (
      <div className="page auth-page">
        <div className="glass-card">
          <h1>Startup Simulator</h1>
          <p>Build, invest, and survive the market.</p>
          <div className="tabs">
            <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Login</button>
            <button className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Register</button>
          </div>
          <form onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <input
                placeholder="Name"
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
              />
            )}
            <input
              placeholder="Email"
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            />
            <input
              placeholder="Password"
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
            <button type="submit">{authMode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          {message && <p className="message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard">
      <header>
        <div>
          <h1>Startup Simulator</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>New Simulation</h2>
          <form onSubmit={createSimulation} className="stack">
            <input
              placeholder="Startup name"
              value={newSim.startupName}
              onChange={(e) => setNewSim({ ...newSim, startupName: e.target.value })}
            />
            <input
              placeholder="Sector"
              value={newSim.sector}
              onChange={(e) => setNewSim({ ...newSim, sector: e.target.value })}
            />
            <input
              placeholder="Max rounds"
              type="number"
              min="3"
              max="20"
              value={newSim.maxRounds}
              onChange={(e) => setNewSim({ ...newSim, maxRounds: Number(e.target.value) })}
            />
            <button type="submit">Create</button>
          </form>

          <h2>Your Simulations</h2>
          <ul className="list">
            {simulations.map((sim) => (
              <li key={sim.id}>
                <button onClick={() => loadSimulation(sim.id)}>
                  {sim.startup_name} - Round {sim.current_round}/{sim.max_rounds} ({sim.status})
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Simulation Control</h2>
          {!activeSim && <p>Select a simulation to continue.</p>}
          {activeSim && (
            <>
              <div className="kpi-grid">
                <div><span>Cash</span><strong>${Number(activeSim.cash).toFixed(2)}</strong></div>
                <div><span>Market Share</span><strong>{Number(activeSim.market_share).toFixed(2)}%</strong></div>
                <div><span>Satisfaction</span><strong>{Number(activeSim.customer_satisfaction).toFixed(2)}</strong></div>
                <div><span>Status</span><strong>{activeSim.status}</strong></div>
              </div>
              {activeSim.status === "active" ? (
                <form onSubmit={playRound} className="stack">
                  <input
                    type="number"
                    value={decision.marketingBudget}
                    onChange={(e) => setDecision({ ...decision, marketingBudget: Number(e.target.value) })}
                    placeholder="Marketing budget"
                  />
                  <input
                    type="number"
                    value={decision.productInvestment}
                    onChange={(e) => setDecision({ ...decision, productInvestment: Number(e.target.value) })}
                    placeholder="Product investment"
                  />
                  <input
                    type="number"
                    value={decision.hiringCount}
                    onChange={(e) => setDecision({ ...decision, hiringCount: Number(e.target.value) })}
                    placeholder="Hiring count"
                  />
                  <select
                    value={decision.pricingStrategy}
                    onChange={(e) => setDecision({ ...decision, pricingStrategy: e.target.value })}
                  >
                    <option value="balanced">Balanced</option>
                    <option value="premium">Premium</option>
                    <option value="budget">Budget</option>
                  </select>
                  <input
                    type="number"
                    value={decision.cashReserve}
                    onChange={(e) => setDecision({ ...decision, cashReserve: Number(e.target.value) })}
                    placeholder="Cash reserve"
                  />
                  <button type="submit">Run Next Round</button>
                </form>
              ) : (
                <p>This simulation is completed.</p>
              )}

              <h3>Rounds History</h3>
              <ul className="history">
                {details?.rounds?.map((round) => (
                  <li key={round.id}>
                    <b>Round {round.round_number}</b>: {round.event_description}
                    <small>
                      Revenue ${Number(round.revenue).toFixed(0)} | Costs ${Number(round.costs).toFixed(0)} | Profit ${Number(round.profit).toFixed(0)}
                    </small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel">
          <h2>Leaderboard</h2>
          <ol className="leaderboard">
            {leaderboard.map((entry, index) => (
              <li key={`${entry.player}-${entry.created_at}-${index}`}>
                <span>{index + 1}. {entry.player}</span>
                <span>{entry.startup_name}</span>
                <strong>{Number(entry.final_score).toFixed(2)}</strong>
              </li>
            ))}
          </ol>
        </section>

        {user?.role === "admin" && (
          <section className="panel">
            <h2>Admin: Event Settings</h2>
            <form onSubmit={createEvent} className="stack">
              <input
                placeholder="Event type (unique)"
                value={eventForm.type}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
              />
              <input
                placeholder="Description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Revenue multiplier"
                value={eventForm.revenueMultiplier}
                onChange={(e) =>
                  setEventForm({ ...eventForm, revenueMultiplier: Number(e.target.value) })
                }
              />
              <input
                type="number"
                step="0.01"
                placeholder="Cost multiplier"
                value={eventForm.costMultiplier}
                onChange={(e) =>
                  setEventForm({ ...eventForm, costMultiplier: Number(e.target.value) })
                }
              />
              <input
                type="number"
                step="0.01"
                placeholder="Satisfaction delta"
                value={eventForm.satisfactionDelta}
                onChange={(e) =>
                  setEventForm({ ...eventForm, satisfactionDelta: Number(e.target.value) })
                }
              />
              <input
                type="number"
                step="0.01"
                placeholder="Market share delta"
                value={eventForm.marketShareDelta}
                onChange={(e) =>
                  setEventForm({ ...eventForm, marketShareDelta: Number(e.target.value) })
                }
              />
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={eventForm.isActive}
                  onChange={(e) => setEventForm({ ...eventForm, isActive: e.target.checked })}
                />
                Active
              </label>
              <button type="submit">Add Event</button>
            </form>

            <ul className="history">
              {events.map((event) => (
                <li key={event.id}>
                  {!eventEdits[event.id] && (
                    <>
                      <b>{event.type}</b>: {event.description}
                      <small>
                        Revenue x{Number(event.revenue_multiplier).toFixed(2)} | Cost x{Number(event.cost_multiplier).toFixed(2)} |
                        Satisfaction {Number(event.satisfaction_delta).toFixed(2)} | Share {Number(event.market_share_delta).toFixed(2)}
                      </small>
                      <div className="row-actions">
                        <button type="button" onClick={() => startEditEvent(event)}>Edit</button>
                        <button
                          type="button"
                          onClick={() =>
                            updateEvent(event.id, {
                              isActive: !event.is_active,
                            })
                          }
                        >
                          {event.is_active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </>
                  )}

                  {eventEdits[event.id] && (
                    <div className="event-edit-grid">
                      <strong>{event.type}</strong>
                      <input
                        value={eventEdits[event.id].description}
                        onChange={(e) => changeEventEdit(event.id, "description", e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={eventEdits[event.id].revenueMultiplier}
                        onChange={(e) => changeEventEdit(event.id, "revenueMultiplier", Number(e.target.value))}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={eventEdits[event.id].costMultiplier}
                        onChange={(e) => changeEventEdit(event.id, "costMultiplier", Number(e.target.value))}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={eventEdits[event.id].satisfactionDelta}
                        onChange={(e) => changeEventEdit(event.id, "satisfactionDelta", Number(e.target.value))}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={eventEdits[event.id].marketShareDelta}
                        onChange={(e) => changeEventEdit(event.id, "marketShareDelta", Number(e.target.value))}
                      />
                      <label className="inline-check">
                        <input
                          type="checkbox"
                          checked={eventEdits[event.id].isActive}
                          onChange={(e) => changeEventEdit(event.id, "isActive", e.target.checked)}
                        />
                        Active
                      </label>
                      <div className="row-actions">
                        <button type="button" onClick={() => saveEventEdit(event.id)}>Save</button>
                        <button type="button" onClick={() => cancelEditEvent(event.id)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {message && <div className="floating-message">{message}</div>}
    </div>
  );
}
