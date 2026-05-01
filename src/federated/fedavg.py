import random
import torch
from typing import List, Callable, Optional
from .client import FederatedClient
from .server import FederatedServer


def run_fedavg(
    server: FederatedServer,
    clients: List[FederatedClient],
    num_rounds: int,
    clients_per_round: int,
    local_epochs: int,
    lr: float,
    test_loader,
    on_round_end: Optional[Callable] = None,
) -> list:
    history = []

    for round_num in range(1, num_rounds + 1):
        selected = random.sample(clients, min(clients_per_round, len(clients)))

        client_weights = []
        client_sizes = []
        for client in selected:
            weights = client.train(server.model, local_epochs, lr)
            client_weights.append(weights)
            client_sizes.append(client.num_samples)

        server.aggregate(client_weights, client_sizes)

        acc, loss = server.evaluate(test_loader)
        record = {"round": round_num, "test_acc": acc, "test_loss": loss}
        history.append(record)

        if on_round_end:
            on_round_end(record)

    return history
