import copy
import time
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, ConcatDataset, TensorDataset
from typing import List, Optional, Callable


def unlearn_client(
    model: nn.Module,
    all_shards: List[TensorDataset],
    forget_client_id: int,
    finetune_epochs: int,
    finetune_lr: float,
    batch_size: int,
    device: torch.device,
    on_epoch_end: Optional[Callable] = None,
) -> tuple[nn.Module, float]:
    """
    Drop the forget client's shard and finetune on the remaining shards.
    Returns (unlearned_model, wall_clock_seconds).
    """
    remaining = [s for i, s in enumerate(all_shards) if i != forget_client_id]
    if not remaining:
        raise ValueError("No shards remain after dropping the forget client.")

    combined = ConcatDataset(remaining)
    loader = DataLoader(combined, batch_size=batch_size, shuffle=True, num_workers=0)

    unlearned_model = copy.deepcopy(model).to(device)
    unlearned_model.train()
    optimizer = torch.optim.SGD(unlearned_model.parameters(), lr=finetune_lr,
                                momentum=0.9, weight_decay=5e-4)
    criterion = nn.CrossEntropyLoss()

    start = time.perf_counter()

    for epoch in range(finetune_epochs):
        total_loss = correct = total = 0
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = unlearned_model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * labels.size(0)
            correct += (outputs.argmax(1) == labels).sum().item()
            total += labels.size(0)

        if on_epoch_end:
            on_epoch_end({
                "epoch": epoch + 1,
                "loss": total_loss / total,
                "acc": correct / total,
            })

    elapsed = time.perf_counter() - start
    return unlearned_model, elapsed


def retrain_from_scratch(
    model_factory,
    all_shards: List[TensorDataset],
    forget_client_id: int,
    epochs: int,
    lr: float,
    batch_size: int,
    device: torch.device,
) -> tuple[nn.Module, float]:
    """Retrain-from-scratch baseline for timing comparison."""
    remaining = [s for i, s in enumerate(all_shards) if i != forget_client_id]
    combined = ConcatDataset(remaining)
    loader = DataLoader(combined, batch_size=batch_size, shuffle=True, num_workers=0)

    model = model_factory().to(device)
    optimizer = torch.optim.SGD(model.parameters(), lr=lr, momentum=0.9, weight_decay=5e-4)
    criterion = nn.CrossEntropyLoss()

    start = time.perf_counter()
    model.train()
    for _ in range(epochs):
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            criterion(model(images), labels).backward()
            optimizer.step()

    elapsed = time.perf_counter() - start
    return model, elapsed
