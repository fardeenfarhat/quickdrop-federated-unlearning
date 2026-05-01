import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

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

    loader = state.client_loaders[client_id]
    images, labels = next(iter(loader))
    images = images[:n]
    labels = labels[:n].tolist()

    encoded = []
    for img in images:
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

    device = next(state.global_model.parameters()).device
    loader = state.client_loaders[client_id]
    result = evaluate(state.global_model, loader, device)
    return result
