"""Global in-memory state shared across the backend."""
from dataclasses import dataclass, field
from typing import Any, Optional
import threading


@dataclass
class AppState:
    # Training state
    status: str = "idle"           # idle | training | distilling | ready | unlearning
    current_round: int = 0
    total_rounds: int = 0
    training_history: list = field(default_factory=list)
    message: str = ""

    # Models and shards (held in memory for the POC)
    global_model: Optional[Any] = None
    model_before_unlearn: Optional[Any] = None
    model_after_unlearn: Optional[Any] = None
    shards: list = field(default_factory=list)       # List[TensorDataset], one per client
    client_loaders: list = field(default_factory=list)
    test_loader: Optional[Any] = None
    num_clients: int = 0
    dataset: str = "cifar10"

    # Unlearning results
    forget_client_id: Optional[int] = None
    unlearn_results: Optional[dict] = None
    unlearn_time: Optional[float] = None
    retrain_time: Optional[float] = None

    # Lock for thread safety
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)


state = AppState()
