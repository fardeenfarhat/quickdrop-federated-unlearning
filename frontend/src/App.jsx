import { useState, useEffect } from "react";
import TrainPanel from "./components/TrainPanel";
import ClientsPanel from "./components/ClientsPanel";
import UnlearnPanel from "./components/UnlearnPanel";
import MetricsPanel from "./components/MetricsPanel";
import { Icon, Pill, StatusDot } from "./ui";
import { getTrainingStatus, getUnlearnStatus } from "./api";

const TABS = [
  { id: "Train",   icon: "train",   label: "Train",   desc: "Federate" },
  { id: "Clients", icon: "clients", label: "Clients", desc: "Inspect"  },
  { id: "Unlearn", icon: "unlearn", label: "Unlearn", desc: "Forget"   },
  { id: "Metrics", icon: "metrics", label: "Metrics", desc: "Audit"    },
];

const EMPTY_TRAIN   = { status: "idle", current_round: 0, total_rounds: 0, history: [], message: "", dataset: "cifar10", num_clients: 10 };
const EMPTY_UNLEARN = { status: "idle", message: "", results: null, shards_ready: false };
const TRAIN_CFG_DEFAULT = { dataset: "cifar10", num_rounds: 20, num_clients: 10, clients_per_round: 5, local_epochs: 1, lr: 0.01 };
const RUN_ID = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");

export default function App() {
  const [tab, setTab]                   = useState("Train");
  const [trainState, setTrainState]     = useState(EMPTY_TRAIN);
  const [unlearnState, setUnlearnState] = useState(EMPTY_UNLEARN);
  const [unlearnPhase, setUnlearnPhase] = useState(0);
  // Persisted across tab switches so the config form doesn't reset
  const [trainCfg, setTrainCfg]         = useState(TRAIN_CFG_DEFAULT);

  useEffect(() => {
    let phaseInterval = null;
    let prevStatus = null;

    const poll = async () => {
      try {
        const [{ data: t }, { data: u }] = await Promise.all([
          getTrainingStatus(),
          getUnlearnStatus(),
        ]);
        setTrainState(t);
        setUnlearnState(u);

        const busy    = u.status === "distilling" || u.status === "unlearning";
        const wasBusy = prevStatus === "distilling" || prevStatus === "unlearning";

        if (busy && !wasBusy) {
          setUnlearnPhase(0);
          clearInterval(phaseInterval);
          phaseInterval = setInterval(() => {
            setUnlearnPhase(p => (p < 88 ? p + 2 : p));
          }, 200);
        }
        if (!busy && wasBusy) {
          clearInterval(phaseInterval);
          setUnlearnPhase(100);
          setTimeout(() => setUnlearnPhase(0), 1000);
        }
        prevStatus = u.status;
      } catch (_) {}
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => { clearInterval(id); clearInterval(phaseInterval); };
  }, []);

  const hasResults       = !!unlearnState.results;
  const distillDone      = hasResults || unlearnState.status === "unlearning" || !!unlearnState.shards_ready;
  const sidebarDistill   = unlearnState.status === "distilling" ? "distilling" : distillDone ? "ready" : "idle";
  const sidebarForget    = unlearnState.status === "unlearning" ? "unlearning" : hasResults ? "ready" : "idle";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", width: "100%" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        background: "var(--bg-1)", borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "22px 22px 18px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, var(--violet), var(--coral))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--bg-0)" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>QuickDrop</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-3)" }}>v0.1 · poc</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 12px 6px", fontFamily: "var(--mono)" }}>
            Pipeline
          </div>
          {TABS.map((t, i) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 8,
              background: tab === t.id ? "var(--bg-2)" : "transparent",
              color: tab === t.id ? "var(--fg-0)" : "var(--fg-2)",
              border: "1px solid",
              borderColor: tab === t.id ? "var(--line)" : "transparent",
              textAlign: "left", fontSize: 13, fontWeight: 500,
              transition: "all .12s", position: "relative", cursor: "pointer",
            }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: tab === t.id ? "var(--violet)" : "var(--fg-3)", width: 18 }}>
                0{i + 1}
              </span>
              <Icon name={t.icon} size={15} />
              <span style={{ flex: 1 }}>{t.label}</span>
              <span style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--mono)" }}>{t.desc}</span>
              {tab === t.id && (
                <div style={{ position: "absolute", left: -1, top: 6, bottom: 6, width: 2, background: "var(--violet)", borderRadius: 999 }} />
              )}
            </button>
          ))}
        </nav>

        {/* Run summary */}
        <div style={{ padding: 16, borderTop: "1px solid var(--line)", background: "var(--bg-0)" }}>
          <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: "var(--mono)" }}>
            Run state
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <RunRow label="Train"   status={trainState.status} />
            <RunRow label="Distill" status={sidebarDistill} />
            <RunRow label="Forget"  status={sidebarForget} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10.5, color: "var(--fg-3)" }}>RE-AI · S8</div>
          <Pill color="var(--fg-2)"><Icon name="lock" size={9} />&nbsp;local</Pill>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar trainState={trainState} />
        <main style={{ padding: "32px 40px", flex: 1 }}>
          {tab === "Train"   && <TrainPanel   trainState={trainState}   setTrainState={setTrainState} trainCfg={trainCfg} setTrainCfg={setTrainCfg} />}
          {tab === "Clients" && <ClientsPanel />}
          {tab === "Unlearn" && <UnlearnPanel unlearnState={unlearnState} unlearnPhase={unlearnPhase} />}
          {tab === "Metrics" && <MetricsPanel trainState={trainState}   unlearnState={unlearnState} />}
        </main>
      </div>
    </div>
  );
}

function RunRow({ label, status }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
      <span style={{ color: "var(--fg-2)" }}>{label}</span>
      <StatusDot status={status} />
    </div>
  );
}

function Topbar({ trainState }) {
  const dataset = trainState.dataset === "femnist" ? "FEMNIST" : "CIFAR-10";
  const clients = trainState.num_clients || 10;
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 40px", borderBottom: "1px solid var(--line)",
      background: "oklch(16% 0.005 280 / 0.85)", backdropFilter: "blur(12px)",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-2)" }}>
        <span style={{ color: "var(--fg-3)" }}>QuickDrop</span>
        <span style={{ color: "var(--fg-3)" }}>/</span>
        <span>Federated Unlearning</span>
        <span style={{ color: "var(--fg-3)" }}>/</span>
        <span style={{ color: "var(--fg-0)", fontWeight: 500 }}>{dataset} · {clients} clients</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-3)" }}>
          run <span style={{ color: "var(--fg-1)" }}>#{RUN_ID}</span>
        </div>
        <div style={{ width: 1, height: 18, background: "var(--line)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-2)" }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--violet), var(--coral))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 600, color: "var(--bg-0)",
          }}>FF</div>
          Fardeen
        </div>
      </div>
    </header>
  );
}
