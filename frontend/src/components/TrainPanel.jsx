import { useEffect, useRef } from "react";
import { startTraining, resetState } from "../api";
import { Button, Card, Field, Input, Select, Mini, EmptyChart, ProgressBar, PageHeader, StatusDot } from "../ui";
import { LineChart } from "../charts";

export default function TrainPanel({ trainState, setTrainState, trainCfg: cfg, setTrainCfg: setCfg }) {
  const pollRef = useRef(null);

  // Stop fine-grained poll when training finishes
  useEffect(() => {
    if (trainState.status !== "training") clearInterval(pollRef.current);
  }, [trainState.status]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleStart = async () => {
    try {
      await startTraining(cfg);
      // App-level 2s poll will pick up state; we set a 1.5s poll for faster chart updates
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await (await import("../api")).getTrainingStatus();
          setTrainState(data);
          if (data.status !== "training") clearInterval(pollRef.current);
        } catch (_) {}
      }, 1500);
    } catch (_) {}
  };

  const handleReset = async () => {
    try {
      await resetState();
      setTrainState({ status: "idle", current_round: 0, total_rounds: 0, history: [], message: "" });
    } catch (_) {}
  };

  const isRunning = trainState.status === "training";
  const latest    = trainState.history?.[trainState.history.length - 1];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        eyebrow="Stage 01 · Federated training"
        title="Train the global model"
        subtitle="Coordinate FedAvg rounds across distributed clients without centralizing raw data."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: 20 }}>
        {/* Config card */}
        <Card title="Configuration" subtitle="Hyperparameters for this run">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Dataset">
              <Select value={cfg.dataset} onChange={e => setCfg({ ...cfg, dataset: e.target.value })}
                options={[{ value: "cifar10", label: "CIFAR-10" }, { value: "femnist", label: "FEMNIST" }]} />
            </Field>
            <Field label="Rounds">
              <Input type="number" value={cfg.num_rounds} onChange={e => setCfg({ ...cfg, num_rounds: +e.target.value })} />
            </Field>
            <Field label="Clients">
              <Input type="number" value={cfg.num_clients} onChange={e => setCfg({ ...cfg, num_clients: +e.target.value })} />
            </Field>
            <Field label="Sampled / round">
              <Input type="number" value={cfg.clients_per_round} onChange={e => setCfg({ ...cfg, clients_per_round: +e.target.value })} />
            </Field>
            <Field label="Local epochs">
              <Input type="number" value={cfg.local_epochs} onChange={e => setCfg({ ...cfg, local_epochs: +e.target.value })} />
            </Field>
            <Field label="Learning rate">
              <Input type="number" step="0.001" value={cfg.lr} onChange={e => setCfg({ ...cfg, lr: +e.target.value })} />
            </Field>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <Button kind="primary" icon={isRunning ? "pause" : "play"} onClick={handleStart} disabled={isRunning}>
              {isRunning ? "Training…" : "Start training"}
            </Button>
            <Button kind="secondary" icon="reset" onClick={handleReset} disabled={isRunning}>Reset</Button>
          </div>
        </Card>

        {/* Live status */}
        <Card
          title="Live progress"
          subtitle={
            trainState.message ||
            (trainState.status === "training" ? "Round in progress — CPU training can take several minutes per round" : "Idle — configure and start a run")
          }
          action={<StatusDot status={trainState.status} />}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
            <Mini label="Round"          value={`${trainState.current_round || 0}/${trainState.total_rounds || cfg.num_rounds || "?"}`} />
            <Mini label="Test acc"       value={latest ? `${(latest.test_acc * 100).toFixed(1)}%` : "—"} accent={latest ? "var(--mint)" : undefined} />
            <Mini label="Train loss"     value={latest ? latest.train_loss?.toFixed(3) ?? "—" : "—"} />
            <Mini label="Active clients" value={isRunning ? cfg.clients_per_round : 0} />
          </div>
          <ProgressBar value={trainState.current_round || 0} max={trainState.total_rounds || cfg.num_rounds} />
          <div style={{ marginTop: 22 }}>
            {trainState.history?.length > 0 ? (
              <LineChart data={trainState.history} accessor={d => d.test_acc} />
            ) : (
              <EmptyChart label="Test accuracy will appear here once training starts" />
            )}
          </div>
        </Card>
      </div>

      {/* Client activity strip */}
      <ActivityStrip numClients={cfg.num_clients} isRunning={isRunning} round={trainState.current_round || 0} />
    </div>
  );
}

function ActivityStrip({ numClients, isRunning, round }) {
  const cols = Math.min(numClients, 10);
  return (
    <Card title="Federation activity" subtitle="Per-client participation this run" padding={0}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }, (_, i) => {
          const active = isRunning && (i + round) % 2 === 0;
          return (
            <div key={i} style={{
              padding: "16px 14px",
              borderRight: i < cols - 1 ? "1px solid var(--line)" : "none",
              background: active ? "oklch(35% 0.06 290 / 0.18)" : "transparent",
              transition: "background .3s",
            }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-3)" }}>
                C{String(i).padStart(2, "0")}
              </div>
              <MiniBars active={active} seed={i} />
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: active ? "var(--violet)" : "var(--fg-3)", marginTop: 6 }}>
                {active ? "● live" : "idle"}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MiniBars({ active, seed }) {
  const bars = Array.from({ length: 10 }, (_, k) => {
    const h = 0.15 + ((seed * 7 + k * 13) % 17) / 20;
    return h;
  });
  const max = Math.max(...bars);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 28, marginTop: 8 }}>
      {bars.map((v, i) => (
        <div key={i} style={{
          flex: 1, height: `${(v / max) * 100}%`, minHeight: 2,
          background: active ? "var(--violet)" : "var(--fg-3)",
          opacity: 0.4 + (v / max) * 0.6,
          borderRadius: "1px 1px 0 0",
          transition: "background .3s",
        }} />
      ))}
    </div>
  );
}
