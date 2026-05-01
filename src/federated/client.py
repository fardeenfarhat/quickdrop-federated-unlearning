import copy
import torch
import torch.nn as nn
from torch.utils.data import DataLoader


class FederatedClient:
    def __init__(self, client_id: int, loader: DataLoader, device: torch.device):
        self.client_id = client_id
        self.loader = loader
        self.device = device
        self.num_samples = len(loader.dataset)

    def train(self, global_model: nn.Module, epochs: int, lr: float,
              momentum: float = 0.9, weight_decay: float = 5e-4) -> dict:
        model = copy.deepcopy(global_model).to(self.device)
        model.train()
        optimizer = torch.optim.SGD(model.parameters(), lr=lr,
                                    momentum=momentum, weight_decay=weight_decay)
        criterion = nn.CrossEntropyLoss()

        for _ in range(epochs):
            for images, labels in self.loader:
                images, labels = images.to(self.device), labels.to(self.device)
                optimizer.zero_grad()
                loss = criterion(model(images), labels)
                loss.backward()
                optimizer.step()

        return {k: v.cpu().clone() for k, v in model.state_dict().items()}

    def evaluate(self, model: nn.Module) -> tuple[float, float]:
        model.eval()
        criterion = nn.CrossEntropyLoss()
        correct = total = 0
        total_loss = 0.0
        with torch.no_grad():
            for images, labels in self.loader:
                images, labels = images.to(self.device), labels.to(self.device)
                outputs = model(images)
                total_loss += criterion(outputs, labels).item() * labels.size(0)
                correct += (outputs.argmax(1) == labels).sum().item()
                total += labels.size(0)
        return correct / total, total_loss / total
