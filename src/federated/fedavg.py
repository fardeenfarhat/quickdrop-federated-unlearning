import random
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
    on_client_done: Optional[Callable] = None,
) -> list:
    history = []

    for round_num in range(1, num_rounds + 1):
        selected = random.sample(clients, min(clients_per_round, len(clients)))
        ids = [c.client_id for c in selected]
        print(f"[Round {round_num}/{num_rounds}] clients={ids}", flush=True)

        client_weights = []
        client_sizes   = []
        last_loss      = 0.0

        for idx, client in enumerate(selected):
            print(f"  C{client.client_id:02d} training…", flush=True)
            weights, train_loss = client.train(server.model, local_epochs, lr)
            client_weights.append(weights)
            client_sizes.append(client.num_samples)
            last_loss = train_loss
            print(f"  C{client.client_id:02d} done  loss={train_loss:.4f}", flush=True)
            if on_client_done:
                on_client_done({
                    "round": round_num, "client_id": client.client_id,
                    "done": idx + 1, "total": len(selected), "train_loss": train_loss,
                })

        server.aggregate(client_weights, client_sizes)

        acc, test_loss = server.evaluate(test_loader)
        record = {"round": round_num, "test_acc": acc, "test_loss": test_loss, "train_loss": last_loss}
        history.append(record)
        print(f"[Round {round_num}/{num_rounds}] acc={acc:.4f}  test_loss={test_loss:.4f}", flush=True)

        if on_round_end:
            on_round_end(record)

    return history
