import io
import base64
import torch
import numpy as np
from fastapi import APIRouter, HTTPException
from PIL import Image

from backend.state import state
from src.eval.metrics import evaluate

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("")
def list_clients():
    if not state.client_loaders:
        return {"clients": []}

    clients = []
    for i, loader in enumerate(state.client_loaders):
        clients.append({
            "id": i,
            "num_samples": len(loader.dataset),
            "has_shard": i < len(state.shards),
        })
    return {"clients": clients}


@router.get("/{client_id}/samples")
def get_samples(client_id: int, n: int = 16):
    if client_id >= len(state.client_loaders):
        raise HTTPException(404, "Client not found.")

    dataset = state.client_loaders[client_id].dataset
    indices = list(range(min(n, len(dataset))))
    encoded = []
    labels  = []
    for i in indices:
        img, label = dataset[i]
        labels.append(int(label))
        arr = img.permute(1, 2, 0).numpy()
        arr = ((arr - arr.min()) / (arr.max() - arr.min() + 1e-8) * 255).astype(np.uint8)
        if arr.shape[2] == 1:
            arr = arr.squeeze(2)
        pil = Image.fromarray(arr)
        buf = io.BytesIO()
        pil.save(buf, format="PNG")
        encoded.append(base64.b64encode(buf.getvalue()).decode())

    return {"images": encoded, "labels": labels}


@router.get("/{client_id}/accuracy")
def get_client_accuracy(client_id: int):
    if state.global_model is None:
        raise HTTPException(400, "Model not trained yet.")
    if client_id >= len(state.client_loaders):
        raise HTTPException(404, "Client not found.")

    dataset = state.client_loaders[client_id].dataset
    batch_size = state.client_loaders[client_id].batch_size or 64
    # fresh DataLoader with no worker processes — safe to use from any thread
    loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, num_workers=0, shuffle=False)
    device = next(state.global_model.parameters()).device
    result = evaluate(state.global_model, loader, device)
    return result
