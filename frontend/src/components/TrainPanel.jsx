import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { startTraining, getTrainingStatus, resetState } from "../api";

const DEFAULTS = { dataset: "cifar10", num_rounds: 20, clients_per_round: 5, num_clients: 10, local_epochs: 1, lr: 0.01 };

export default function TrainPanel() {
  const [cfg, setCfg]       = useState(DEFAULTS);
  const [status, setStatus] = useState({ status: "idle", current_round: 0, total_rounds: 0, history: [], message: "" });
  const pollRef = useRef(null);

  const poll = async () => {
    try {
      const { data } = await getTrainingStatus();
      setStatus(data);
      if (data.status !== "training") clearInterval(pollRef.current);
    } catch (_) {}
  };

  useEffect(() => { poll(); return () => clearInterval(pollRef.current); }, []);

  const handleStart = async () => {
    await startTraining(cfg);
    pollRef.current = setInterval(poll, 1500);
  };

  const handleReset = async () => {
    await resetState();
    setStatus({ status: "idle", current_round: 0, total_rounds: 0, history: [], message: "" });
  };

  const isRunning = status.status === "training";
  const progress  = status.total_rounds > 0 ? (status.current_round / status.total_rounds) * 100 : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Federated Training</h2>

      {/* Config */}
      <div className="grid grid-cols-3 gap-4 bg-gray-900 rounded-lg p-5 border border-gray-800">
        <Field label="Dataset">
          <select value={cfg.dataset} onChange={e => setCfg({ ...cfg, dataset: e.target.value })} className="input">
            <option value="cifar10">CIFAR-10</option>
            <option value="femnist">FEMNIST</option>
          </select>
        </Field>
        <Field label="Rounds"><input type="number" className="input" value={cfg.num_rounds}      onChange={e => setCfg({ ...cfg, num_rounds: +e.target.value })} /></Field>
        <Field label="Clients"><input type="number" className="input" value={cfg.num_clients}    onChange={e => setCfg({ ...cfg, num_clients: +e.target.value })} /></Field>
        <Field label="Clients/Round"><input type="number" className="input" value={cfg.clients_per_round} onChange={e => setCfg({ ...cfg, clients_per_round: +e.target.value })} /></Field>
        <Field label="Local Epochs"><input type="number" className="input" value={cfg.local_epochs} onChange={e => setCfg({ ...cfg, local_epochs: +e.target.value })} /></Field>
        <Field label="Learning Rate"><input type="number" className="input" step="0.001" value={cfg.lr} onChange={e => setCfg({ ...cfg, lr: +e.target.value })} /></Field>
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center">
        <button onClick={handleStart} disabled={isRunning} className="btn-primary">
          {isRunning ? "Training…" : "Start Training"}
        </button>
        <button onClick={handleReset} disabled={isRunning} className="btn-secondary">Reset</button>
        <span className="text-sm text-gray-400 ml-2">{status.message}</span>
      </div>

      {/* Progress bar */}
      {status.total_rounds > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Round {status.current_round} / {status.total_rounds}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Chart */}
      {status.history.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
          <p className="text-sm text-gray-400 mb-4">Test accuracy over rounds</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={status.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="round" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 1]} stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
              <Tooltip formatter={(v) => `${(v*100).toFixed(2)}%`} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }} />
              <Line type="monotone" dataKey="test_acc" stroke="#38bdf8" strokeWidth={2} dot={false} name="Test Acc" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status badge */}
      <StatusBadge status={status.status} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }) {
  const colors = { idle: "bg-gray-700 text-gray-300", training: "bg-yellow-600 text-yellow-100", ready: "bg-green-700 text-green-100", distilling: "bg-purple-700 text-purple-100", unlearning: "bg-orange-700 text-orange-100" };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium w-fit ${colors[status] ?? colors.idle}`}>{status}</span>;
}
