# QuickDrop — Federated Unlearning POC

Implementation of **QuickDrop: Efficient Federated Unlearning via Synthetic Data Generation** (Dhasade et al., Middleware 2024).

> Fardeen Farhat (22I-0638) · Mohammad Ahmed Khan Noorzai (22I-0469)  
> Responsible & Explainable AI — Semester 8

---

## What this is

Federated learning lets clients train a shared model without sharing raw data. QuickDrop solves the "right to be forgotten" problem in this setting: when a client wants their data removed, the server drops their distilled shard and runs a short finetune — no retraining from scratch, no calling the client back.

This repo is a full implementation with:
- The QuickDrop ML pipeline (FedAvg + dataset distillation + unlearning + MIA evaluation)
- A FastAPI backend serving the pipeline as a REST API
- A React dashboard where you can train a federation, pick a client to forget, watch the unlearning happen, and compare metrics

---

## Stack

| Layer | Tech |
|-------|------|
| ML pipeline | PyTorch, torchvision, scikit-learn |
| Backend | FastAPI + uvicorn |
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |

---

## Setup

### 1. Python environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Requires Python 3.10+ and a CUDA-capable GPU (CPU works but distillation will be slow).

### 2. Frontend

```bash
cd frontend
npm install
```

---

## Running

You need two terminals.

**Terminal 1 — backend:**
```bash
# from project root, with venv active
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Dashboard walkthrough

1. **Train tab** — pick a dataset (CIFAR-10 or FEMNIST), set rounds and client count, hit *Start Training*. Watch the accuracy curve build up.
2. **Clients tab** — browse the federated clients, click one to see sample images and per-client accuracy.
3. **Unlearn tab** — first run distillation (compresses each client's data into a small synthetic shard), then pick a client to forget and hit *Forget Client X*. The panel shows before/after metrics and timing vs. retrain-from-scratch.
4. **Metrics tab** — summary cards, a before/after bar chart, and a radar chart of unlearning quality.

---

## Project structure

```
├── src/
│   ├── data/           # FEMNIST and CIFAR-10 loaders with Dirichlet split
│   ├── models/         # ConvNet-3 backbone
│   ├── federated/      # FedAvg client, server, main loop
│   ├── quickdrop/      # Dataset distillation, training on shards, unlearning
│   └── eval/           # Accuracy, MIA (membership inference attack)
├── backend/
│   ├── main.py         # FastAPI app entry point
│   ├── state.py        # Global in-memory state
│   └── routes/         # /api/training, /api/clients, /api/unlearn
├── frontend/
│   └── src/
│       ├── components/ # TrainPanel, ClientsPanel, UnlearnPanel, MetricsPanel
│       └── api.js      # Axios wrappers
├── configs/            # femnist.yaml, cifar10.yaml
├── experiments/        # Standalone run scripts
├── PROPOSAL.tex        # Project proposal
└── PLAN.md             # Implementation plan
```

---

## Base paper

Akash Balasaheb Dhasade, Yaohong Ding, Song Guo, Anne-Marie Kermarrec, Martijn de Vos, Leijie Wu.  
*QuickDrop: Efficient Federated Unlearning via Synthetic Data Generation.*  
25th ACM/IFIP International Middleware Conference, 2024.  
DOI: [10.1145/3652892.3700764](https://doi.org/10.1145/3652892.3700764)
