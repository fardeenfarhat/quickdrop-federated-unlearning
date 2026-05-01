import { useState } from "react";
import TrainPanel from "./components/TrainPanel";
import ClientsPanel from "./components/ClientsPanel";
import UnlearnPanel from "./components/UnlearnPanel";
import MetricsPanel from "./components/MetricsPanel";

const TABS = ["Train", "Clients", "Unlearn", "Metrics"];

export default function App() {
  const [tab, setTab] = useState("Train");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-8 py-4 flex items-center gap-6">
        <div>
          <h1 className="text-xl font-bold text-sky-400 tracking-tight">QuickDrop</h1>
          <p className="text-xs text-gray-500">Federated Unlearning Dashboard</p>
        </div>
        <nav className="flex gap-1 ml-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-sky-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-8 max-w-6xl w-full mx-auto">
        {tab === "Train"   && <TrainPanel />}
        {tab === "Clients" && <ClientsPanel />}
        {tab === "Unlearn" && <UnlearnPanel />}
        {tab === "Metrics" && <MetricsPanel />}
      </main>

      <footer className="border-t border-gray-800 px-8 py-3 text-xs text-gray-600 text-center">
        QuickDrop — Responsible &amp; Explainable AI, Semester 8 &nbsp;|&nbsp;
        Fardeen Farhat &amp; Mohammad Ahmed Khan Noorzai
      </footer>
    </div>
  );
}
