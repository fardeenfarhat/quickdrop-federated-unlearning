# Scripts

Convenience shell scripts for setting up and running the project.
All scripts assume you are in the **project root** when you run them.

---

## Setup (run once)

| Script | Platform | What it does |
|--------|----------|--------------|
| `setup.sh` | Linux / Mac / Git Bash | Creates `venv`, installs Python deps, runs `npm install` |
| `setup.bat` | Windows CMD | Same as above for native Windows |

```bash
# Linux / Mac / Git Bash
chmod +x scripts/setup.sh
./scripts/setup.sh

# Windows CMD
scripts\setup.bat
```

---

## Starting the app

| Script | Platform | What it does |
|--------|----------|--------------|
| `start.sh` | Linux / Mac / Git Bash | Starts backend (port 8000) and frontend (port 5173) in parallel |
| `start.bat` | Windows CMD | Opens two separate terminal windows for backend and frontend |

```bash
# Linux / Mac / Git Bash
./scripts/start.sh

# Windows CMD
scripts\start.bat
```

Then open `http://localhost:5173` in your browser.

---

## Running the ML pipeline standalone (no dashboard)

### Training only

```bash
source venv/bin/activate        # or: venv\Scripts\activate on Windows
python -c "
import torch
from src.data.cifar10_dirichlet import get_cifar10_loaders
from src.models.convnet import build_model
from src.federated.client import FederatedClient
from src.federated.server import FederatedServer
from src.federated.fedavg import run_fedavg

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
loaders, test = get_cifar10_loaders(10, 64)
model = build_model(3, 10, device)
server = FederatedServer(model, device)
clients = [FederatedClient(i, l, device) for i, l in enumerate(loaders)]
run_fedavg(server, clients, 20, 5, 1, 0.01, test,
           on_round_end=lambda r: print(r))
"
```

### Full pipeline (train → distill → unlearn → metrics)

```bash
# Linux / Mac / Git Bash
./scripts/run_pipeline.sh

# With options
ROUNDS=50 FORGET=3 ./scripts/run_pipeline.sh

# Windows CMD
scripts\run_pipeline.bat cifar10 20 10 3
#                         dataset rounds clients forget-id
```

---

## Notes

- Scripts ending in `.sh` are for bash (Linux, Mac, Git Bash, WSL).
- Scripts ending in `.bat` are for Windows Command Prompt.
- The `.sh` scripts use `source venv/bin/activate` — if your venv is elsewhere, edit that line.
- The backend must be running before the frontend can fetch data.
