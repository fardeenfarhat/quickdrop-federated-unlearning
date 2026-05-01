"""Shadow-model membership inference attack (Yeom et al. 2018 baseline).

AUC close to 0.5 = model doesn't remember the samples (good unlearning).
AUC close to 1.0 = model still memorises them (unlearning failed).
"""
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import roc_auc_score


@torch.no_grad()
def _get_losses(model: nn.Module, loader: DataLoader, device: torch.device) -> np.ndarray:
    model.eval()
    criterion = nn.CrossEntropyLoss(reduction="none")
    losses = []
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        loss = criterion(model(images), labels)
        losses.extend(loss.cpu().numpy())
    return np.array(losses)


def membership_inference_auc(
    model: nn.Module,
    member_loader: DataLoader,
    non_member_loader: DataLoader,
    device: torch.device,
) -> float:
    """
    Loss-threshold MIA. Members (training data) tend to have lower loss.
    We label members=1, non-members=0 and use -loss as the score.
    """
    member_losses     = _get_losses(model, member_loader, device)
    non_member_losses = _get_losses(model, non_member_loader, device)

    scores = np.concatenate([-member_losses, -non_member_losses])
    labels = np.concatenate([np.ones(len(member_losses)), np.zeros(len(non_member_losses))])

    return float(roc_auc_score(labels, scores))
