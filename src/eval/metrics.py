import torch
import torch.nn as nn
from torch.utils.data import DataLoader


@torch.no_grad()
def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> dict:
    model.eval()
    criterion = nn.CrossEntropyLoss()
    correct = total = 0
    total_loss = 0.0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        total_loss += criterion(outputs, labels).item() * labels.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()
        total += labels.size(0)

    return {
        "accuracy": correct / total,
        "loss": total_loss / total,
        "correct": correct,
        "total": total,
    }


def compute_all_metrics(
    model_before: nn.Module,
    model_after: nn.Module,
    forget_loader: DataLoader,
    retain_loader: DataLoader,
    device: torch.device,
) -> dict:
    return {
        "forget_acc_before": evaluate(model_before, forget_loader, device)["accuracy"],
        "forget_acc_after":  evaluate(model_after,  forget_loader, device)["accuracy"],
        "retain_acc_before": evaluate(model_before, retain_loader, device)["accuracy"],
        "retain_acc_after":  evaluate(model_after,  retain_loader, device)["accuracy"],
    }
