import threading
import torch
import yaml
from fastapi import APIRouter
from pydantic import BaseModel

from backend.state import state
from src.data.cifar10_dirichlet import get_cifar10_loaders
from src.data.femnist import get_femnist_loaders
from src.models.convnet import build_model, clone_model
from src.federated.client import FederatedClient
from src.federated.server import FederatedServer
from src.federated.fedavg import run_fedavg

router = APIRouter(prefix="/api/training", tags=["training"])


class TrainRequest(BaseModel):
    dataset: str = "cifar10"
    num_rounds: int = 20
    clients_per_round: int = 5
    num_clients: int = 10
    local_epochs: int = 1
    lr: float = 0.01


@router.post("/start")
def start_training(req: TrainRequest):
    if state.status in ("training", "distilling", "unlearning"):
        return {"error": "Already running."}

    state.status = "training"
    state.current_round = 0
    state.total_rounds = req.num_rounds
    state.training_history = []
    state.dataset = req.dataset
    state.shards = []
    state.unlearn_results = None

    thread = threading.Thread(target=_training_job, args=(req,), daemon=True)
    thread.start()
    return {"message": "Training started."}


def _training_job(req: TrainRequest):
    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        if req.dataset == "cifar10":
            client_loaders, test_loader = get_cifar10_loaders(req.num_clients, batch_size=64)
            in_ch, n_cls = 3, 10
        else:
            client_loaders, test_loader = get_femnist_loaders(req.num_clients, batch_size=32)
            in_ch, n_cls = 1, 62

        state.client_loaders = client_loaders
        state.test_loader = test_loader
        state.num_clients = req.num_clients

        global_model = build_model(in_ch, n_cls, device)
        server = FederatedServer(global_model, device)
        clients = [FederatedClient(i, loader, device) for i, loader in enumerate(client_loaders)]

        def on_round_end(record):
            state.current_round = record["round"]
            state.training_history.append(record)
            state.message = f"Round {record['round']}/{req.num_rounds} — acc: {record['test_acc']:.3f}"

        run_fedavg(server, clients, req.num_rounds, req.clients_per_round,
                   req.local_epochs, req.lr, test_loader, on_round_end=on_round_end)

        state.global_model = server.get_model()
        state.status = "ready"
        state.message = "Training complete."
    except Exception as e:
        state.status = "idle"
        state.message = f"Training failed: {e}"


@router.get("/status")
def get_status():
    return {
        "status": state.status,
        "current_round": state.current_round,
        "total_rounds": state.total_rounds,
        "message": state.message,
        "history": state.training_history[-50:],  # last 50 rounds
    }


@router.post("/reset")
def reset():
    if state.status in ("training", "unlearning"):
        return {"error": "Cannot reset while a job is running."}
    state.status = "idle"
    state.current_round = 0
    state.total_rounds = 0
    state.training_history = []
    state.global_model = None
    state.shards = []
    state.unlearn_results = None
    state.message = ""
    return {"message": "State reset."}
