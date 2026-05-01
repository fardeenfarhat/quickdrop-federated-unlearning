import torch
import torch.nn as nn
from torch.utils.data import DataLoader, ConcatDataset, TensorDataset
from typing import List, Optional, Callable


def train_on_shards(
    model: nn.Module,
    shards: List[TensorDataset],
    epochs: int,
    lr: float,
    batch_size: int,
    device: torch.device,
    on_epoch_end: Optional[Callable] = None,
) -> nn.Module:
    """Train the global model on the union of all clients' synthetic shards."""
    if not shards:
        raise ValueError("No shards provided.")

    combined = ConcatDataset(shards)
    loader = DataLoader(combined, batch_size=batch_size, shuffle=True, num_workers=0)

    model = model.to(device)
    model.train()
    optimizer = torch.optim.SGD(model.parameters(), lr=lr, momentum=0.9, weight_decay=5e-4)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(epochs):
        total_loss = correct = total = 0
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
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

    return model
