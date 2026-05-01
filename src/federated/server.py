import torch
import torch.nn as nn
from typing import List


class FederatedServer:
    def __init__(self, global_model: nn.Module, device: torch.device):
        self.model = global_model
        self.device = device

    def aggregate(self, client_weights: List[dict], client_sizes: List[int]):
        total = sum(client_sizes)
        avg_weights = {}

        for key in client_weights[0]:
            avg_weights[key] = torch.zeros_like(client_weights[0][key], dtype=torch.float32)
            for weights, size in zip(client_weights, client_sizes):
                avg_weights[key] += weights[key].float() * (size / total)

        self.model.load_state_dict(avg_weights)

    def get_model(self) -> nn.Module:
        return self.model

    def evaluate(self, loader) -> tuple[float, float]:
        self.model.eval()
        criterion = nn.CrossEntropyLoss()
        correct = total = 0
        total_loss = 0.0
        with torch.no_grad():
            for images, labels in loader:
                images, labels = images.to(self.device), labels.to(self.device)
                outputs = self.model(images)
                total_loss += criterion(outputs, labels).item() * labels.size(0)
                correct += (outputs.argmax(1) == labels).sum().item()
                total += labels.size(0)
        return correct / total, total_loss / total
