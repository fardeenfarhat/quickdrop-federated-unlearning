# Project Guide for Mohammad Ahmed Khan Noorzai

This document explains the full project from scratch so you can pick it up, run it, and contribute without needing to ask Fardeen about every file.

---

## What we built

We are reproducing **QuickDrop** — a paper from Middleware 2024 that solves the "right to be forgotten" problem in federated learning.

**The short version of the problem:**
Federated learning lets many devices (clients) train a shared model without sending their raw data to a server. This is good for privacy. But what happens when a client wants their data *removed* from the model? The obvious answer is to retrain from scratch, but that is expensive and requires calling every client back online. QuickDrop's answer: each client compresses their data into a tiny synthetic shard upfront, and when a deletion is requested the server just drops that shard and runs a short finetune. No retraining, no calling anyone back.

**What we built:**
- The full ML pipeline implementing QuickDrop
- A FastAPI backend that serves the pipeline as a REST API
- A React dashboard where you can train a federation, pick a client to forget, run unlearning, and see the metrics

---

## Setup (do this first)

You need Python 3.10+ and Node 18+.

```bash
# Clone the repo
git clone https://github.com/fardeenfarhat/quickdrop-federated-unlearning.git
cd quickdrop-federated-unlearning

# Linux / Mac / Git Bash
./scripts/setup.sh

# Windows CMD
scripts\setup.bat
```

This creates a Python virtual environment, installs all pip packages, and runs `npm install` in the frontend folder.

---

## Running the app

You need two terminals.

```bash
# Terminal 1 — backend API
source venv/bin/activate          # Windows: venv\Scripts\activate
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
# Windows CMD: set PYTHONPATH=. && uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Or use the convenience script which opens both at once:

```bash
./scripts/start.sh       # Linux/Mac/Git Bash
scripts\start.bat        # Windows CMD
```

Open `http://localhost:5173`. You should see the QuickDrop dashboard.

---

## Project structure

```
quickdrop-federated-unlearning/
│
├── src/                        ← all ML code, no web stuff here
│   ├── data/
│   │   ├── femnist.py          ← loads EMNIST, splits it per-writer (non-IID)
│   │   └── cifar10_dirichlet.py← loads CIFAR-10, splits with Dirichlet α=0.5
│   ├── models/
│   │   └── convnet.py          ← ConvNet-3 (3 conv blocks, InstanceNorm, AvgPool)
│   ├── federated/
│   │   ├── client.py           ← FederatedClient: trains locally, returns weights
│   │   ├── server.py           ← FederatedServer: aggregates weights (FedAvg)
│   │   └── fedavg.py           ← main training loop, calls client.train + server.aggregate
│   ├── quickdrop/
│   │   ├── distill.py          ← dataset distillation via gradient matching
│   │   ├── train.py            ← trains global model on distilled shards
│   │   └── unlearn.py          ← drops a shard, finetunes, times it
│   └── eval/
│       ├── metrics.py          ← accuracy and loss evaluation
│       └── mia.py              ← membership inference attack (shadow model)
│
├── backend/                    ← FastAPI app
│   ├── main.py                 ← creates the app, registers routers, adds CORS
│   ├── state.py                ← global in-memory state (models, shards, results)
│   └── routes/
│       ├── training.py         ← POST /api/training/start, GET /api/training/status
│       ├── clients.py          ← GET /api/clients, GET /api/clients/{id}/samples
│       └── unlearning.py       ← POST /api/unlearn/distill, POST /api/unlearn/run
│
├── frontend/                   ← React + Vite + Tailwind + Recharts
│   └── src/
│       ├── App.jsx             ← tab layout (Train / Clients / Unlearn / Metrics)
│       ├── api.js              ← all axios calls to the backend in one place
│       └── components/
│           ├── TrainPanel.jsx  ← config form, start button, live accuracy chart
│           ├── ClientsPanel.jsx← grid of clients, click to see images + accuracy
│           ├── UnlearnPanel.jsx← distill step, select client, run unlearning, see results
│           └── MetricsPanel.jsx← summary cards, bar chart, radar chart
│
├── configs/
│   ├── femnist.yaml            ← hyperparameters for FEMNIST experiments
│   └── cifar10.yaml            ← hyperparameters for CIFAR-10 experiments
│
├── scripts/                    ← shell scripts for common tasks
│   ├── setup.sh / setup.bat
│   ├── start.sh / start.bat
│   ├── train.sh
│   └── run_pipeline.sh / run_pipeline.bat
│
├── requirements.txt
├── README.md                   ← project overview and run instructions
├── PROPOSAL.tex                ← submitted proposal (LaTeX)
└── TEAMMATE_GUIDE.md           ← you are here
```

---

## Key concepts (read this before touching the code)

### Federated learning (FedAvg)

Each round:
1. The server sends the current global model to a subset of clients.
2. Each client trains locally on their private data for a few epochs.
3. Clients send back their updated weights.
4. The server averages the weights (weighted by dataset size) — this is FedAvg.

Code: `src/federated/fedavg.py` runs the loop. `FederatedClient.train()` does the local step. `FederatedServer.aggregate()` does the averaging.

### Dataset distillation (the core of QuickDrop)

The goal is to compress a large dataset into a tiny synthetic one such that training on the synthetic data gives similar results to training on the real data.

We use **gradient matching**: we optimise the synthetic images so that the gradient of the loss on them matches the gradient of the loss on the real data, for the same model at the same point in training.

Code: `src/quickdrop/distill.py`. The outer loop optimises the synthetic images. The inner loss is cosine distance between real and synthetic gradients per layer.

This is the most compute-heavy step. With `ipc=10` (10 synthetic images per class) and `outer_steps=10`, it takes a few minutes per client on GPU.

### Unlearning

When client `k` requests deletion:
1. Drop `shards[k]` from the list.
2. Finetune the global model on the remaining shards for a few epochs.
3. Measure forget accuracy (should drop), retain accuracy (should stay), MIA AUC (should approach 0.5).

Code: `src/quickdrop/unlearn.py`. `unlearn_client()` does steps 1 and 2 and times them. `retrain_from_scratch()` is the baseline.

### Membership Inference Attack (MIA)

We use the simplest version (Yeom et al. 2018): the model tends to have lower loss on samples it was trained on (members) than on samples it never saw (non-members). We use `-loss` as a score and compute ROC AUC.

- AUC = 0.5 means the model cannot distinguish — good, the data is forgotten.
- AUC > 0.5 means the model still "remembers" the deleted client's data.

Code: `src/eval/mia.py`.

---

## How the backend works

FastAPI runs the ML pipeline in background threads (so HTTP calls return immediately). The global `state` object in `backend/state.py` holds everything — the model, the shards, training history, and unlearning results.

The frontend polls `/api/training/status` and `/api/unlearn/status` every 1-2 seconds to get updates.

**API routes at a glance:**

| Method | Route | Does |
|--------|-------|------|
| POST | `/api/training/start` | Kick off FedAvg in a background thread |
| GET  | `/api/training/status` | Training progress + history |
| POST | `/api/training/reset` | Clear all state |
| GET  | `/api/clients` | List clients and their sample counts |
| GET  | `/api/clients/{id}/samples` | Base64-encoded sample images |
| GET  | `/api/clients/{id}/accuracy` | Per-client accuracy from the global model |
| POST | `/api/unlearn/distill` | Run distillation for all clients |
| POST | `/api/unlearn/run` | Unlearn a specific client |
| GET  | `/api/unlearn/status` | Unlearning progress + results |

You can explore all routes interactively at `http://localhost:8000/docs` once the backend is running.

---

## How the frontend works

`App.jsx` is just a tab switcher — four tabs, four panels. Each panel talks to the backend through `api.js`.

`TrainPanel`: has a config form. On submit it calls `POST /api/training/start`, then polls `GET /api/training/status` every 1.5 seconds and streams the accuracy chart live.

`ClientsPanel`: loads the client list, click a client to fetch its sample images and accuracy.

`UnlearnPanel`: two-step UI. Step 1 runs distillation. Step 2 lets you pick a client and run unlearning. Results (forget acc, retain acc, MIA AUC, timing) appear below.

`MetricsPanel`: reads the same results and draws them as cards, a before/after bar chart, and a radar chart.

---

## How to add something

**New backend route:**
1. Add a function in the relevant `backend/routes/*.py`.
2. Decorate it with `@router.get(...)` or `@router.post(...)`.
3. It is automatically registered — no changes to `main.py` needed unless you add a whole new router file.

**New frontend panel:**
1. Create `frontend/src/components/YourPanel.jsx`.
2. Add an axios call in `api.js`.
3. Add the tab name to the `TABS` array in `App.jsx` and render `<YourPanel />` in the conditional.

**New ML module:**
1. Add a file under `src/` in the appropriate subfolder.
2. Import and call it from the backend route that needs it.

---

## Common issues

**`ModuleNotFoundError: No module named 'src'`**
You are not running from the project root, or the venv is not active. Always run from the project root with the venv active.

**Backend starts but frontend shows "Network Error"**
The backend is not running, or CORS is blocking it. Check that `uvicorn` started cleanly on port 8000. The allowed origins in `backend/main.py` are `localhost:5173` and `127.0.0.1:5173`.

**Training is very slow**
Check that PyTorch is using your GPU: `python -c "import torch; print(torch.cuda.is_available())"`. If it prints `False`, install the CUDA version of torch matching your driver.

**Distillation takes forever**
Reduce `outer_steps` to 3 and `ipc` to 5 in the dashboard for a quick test run.

---

## Contact

Fardeen Farhat — 22I-0638
