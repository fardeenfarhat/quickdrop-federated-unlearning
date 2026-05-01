import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { getUnlearnStatus, getTrainingStatus } from "../api";

export default function MetricsPanel() {
  const [results, setResults]   = useState(null);
  const [history, setHistory]   = useState([]);

  useEffect(() => {
    getUnlearnStatus().then(({ data }) => setResults(data.results)).catch(() => {});
    getTrainingStatus().then(({ data }) => setHistory(data.history || [])).catch(() => {});
  }, []);

  if (!results) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-200">Metrics</h2>
        <p className="text-gray-500 text-sm">No unlearning results yet. Complete the Unlearn step first.</p>
        {history.length > 0 && <TrainingHistoryChart history={history} />}
      </div>
    );
  }

  const barData = [
    { name: "Forget Acc",   Before: +(results.forget_acc_before * 100).toFixed(1), After: +(results.forget_acc_after * 100).toFixed(1) },
    { name: "Retain Acc",   Before: +(results.retain_acc_before * 100).toFixed(1), After: +(results.retain_acc_after * 100).toFixed(1) },
    { name: "MIA AUC",      Before: +(results.mia_auc_before * 100).toFixed(1),    After: +(results.mia_auc_after * 100).toFixed(1) },
  ];

  const radarData = [
    { metric: "Retain Acc",       value: +(results.retain_acc_after * 100).toFixed(1),       ideal: 100 },
    { metric: "Forget ↓",         value: +(100 - results.forget_acc_after * 100).toFixed(1), ideal: 100 },
    { metric: "MIA ↓",            value: +(100 - (results.mia_auc_after - 0.5) * 200).toFixed(1), ideal: 100 },
    { metric: "Speed",            value: Math.min(100, (results.speedup || 1) * 10), ideal: 100 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Metrics</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card label="Forget accuracy (after)" value={`${(results.forget_acc_after * 100).toFixed(1)}%`} sub="lower = better" color="text-emerald-400" />
        <Card label="Retain accuracy (after)" value={`${(results.retain_acc_after * 100).toFixed(1)}%`} sub="higher = better" color="text-sky-400" />
        <Card label="MIA AUC (after)" value={results.mia_auc_after.toFixed(3)} sub="0.5 = random = ideal" color="text-purple-400" />
        <Card label="Speedup vs retrain" value={results.speedup ? `${results.speedup}x` : "N/A"} sub={results.retrain_time_s ? `retrain: ${results.retrain_time_s}s` : ""} color="text-orange-400" />
      </div>

      {/* Bar chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <p className="text-sm text-gray-400 mb-4">Before vs After Unlearning</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }} formatter={v => `${v}%`} />
            <Legend />
            <Bar dataKey="Before" fill="#6b7280" radius={[4, 4, 0, 0]} />
            <Bar dataKey="After"  fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <p className="text-sm text-gray-400 mb-4">Unlearning quality (higher = better on each axis)</p>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Radar name="After" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
            <Radar name="Ideal" dataKey="ideal" stroke="#22c55e" fill="none" strokeDasharray="4 4" />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {history.length > 0 && <TrainingHistoryChart history={history} />}
    </div>
  );
}

function Card({ label, value, sub, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function TrainingHistoryChart({ history }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <p className="text-sm text-gray-400 mb-4">Training history</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={history.slice(-30)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="round" stroke="#6b7280" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 1]} stroke="#6b7280" tick={{ fontSize: 10 }} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
          <Tooltip formatter={v => `${(v*100).toFixed(2)}%`} contentStyle={{ background: "#1f2937", border: "1px solid #374151" }} />
          <Bar dataKey="test_acc" fill="#6366f1" radius={[2,2,0,0]} name="Test Acc" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
