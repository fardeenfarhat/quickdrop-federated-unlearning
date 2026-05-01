import threading
import copy
import torch
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.state import state
from src.quickdrop.distill import build_distilled_shard
from src.quickdrop.unlearn import unlearn_client, retrain_from_scratch
from src.eval.metrics import evaluate
from src.eval.mia import membership_inference_auc
from src.models.convnet import build_model, clone_model

router = APIRouter(prefix="/api/unlearn", tags=["unlearning"])


class DistillRequest(BaseModel):
    ipc: int = 10
    outer_steps: int = 5
    inner_steps: int = 500
    lr_img: float = 0.1
    lr_net: float = 0.01


class UnlearnRequest(BaseModel):
    client_id: int
    finetune_epochs: int = 5
    finetune_lr: float = 0.001
    run_retrain_baseline: bool = True


@router.post("/distill")
def start_distillation(req: DistillRequest):
    if state.global_model is None:
        raise HTTPException(400, "Train the federation first.")
    if state.status not in ("ready",):
        raise HTTPException(400, f"Cannot distill during status: {state.status}")

    state.status = "distilling"
    state.shards = []
    state.message = "Distilling client shards..."

    cfg = {
        "num_classes": 10 if state.dataset == "cifar10" else 62,
        "distillation": {
            "ipc": req.ipc,
            "outer_steps": req.outer_steps,
            "inner_steps": req.inner_steps,
            "lr_img": req.lr_img,
            "lr_net": req.lr_net,
        }
    }

    thread = threading.Thread(target=_distill_job, args=(cfg,), daemon=True)
    thread.start()
    return {"message": "Distillation started."}


def _distill_job(cfg):
    try:
        device = next(state.global_model.parameters()).device
        shards = []
        for i, loader in enumerate(state.client_loaders):
            state.message = f"Distilling client {i + 1}/{state.num_clients}..."
            shard = build_distilled_shard(state.global_model, loader, cfg, device)
            shards.append(shard)
        state.shards = shards
        state.status = "ready"
        state.message = f"Distillation complete. {len(shards)} shards ready."
    except Exception as e:
        state.status = "ready"
        state.message = f"Distillation failed: {e}"


@router.post("/run")
def run_unlearning(req: UnlearnRequest):
    if state.global_model is None:
        raise HTTPException(400, "Train the federation first.")
    if not state.shards:
        raise HTTPException(400, "Run distillation first.")
    if req.client_id >= state.num_clients:
        raise HTTPException(400, "Invalid client_id.")
    if state.status not in ("ready",):
        raise HTTPException(400, f"Cannot unlearn during status: {state.status}")

    state.status = "unlearning"
    state.forget_client_id = req.client_id
    state.model_before_unlearn = copy.deepcopy(state.global_model)
    state.unlearn_results = None
    state.message = f"Unlearning client {req.client_id}..."

    thread = threading.Thread(target=_unlearn_job, args=(req,), daemon=True)
    thread.start()
    return {"message": f"Unlearning client {req.client_id} started."}


def _unlearn_job(req: UnlearnRequest):
    try:
        device = next(state.global_model.parameters()).device
        batch_size = 64 if state.dataset == "cifar10" else 32

        model_after, unlearn_time = unlearn_client(
            model=state.global_model,
            all_shards=state.shards,
            forget_client_id=req.client_id,
            finetune_epochs=req.finetune_epochs,
            finetune_lr=req.finetune_lr,
            batch_size=batch_size,
            device=device,
        )
        state.model_after_unlearn = model_after
        state.unlearn_time = unlearn_time

        # Evaluate
        forget_loader = state.client_loaders[req.client_id]
        retain_loaders = [l for i, l in enumerate(state.client_loaders) if i != req.client_id]

        forget_acc_before = evaluate(state.model_before_unlearn, forget_loader, device)["accuracy"]
        forget_acc_after  = evaluate(model_after,                 forget_loader, device)["accuracy"]

        # Retain accuracy on test set (proxy for retain)
        retain_acc_before = evaluate(state.model_before_unlearn, state.test_loader, device)["accuracy"]
        retain_acc_after  = evaluate(model_after,                state.test_loader, device)["accuracy"]

        # MIA
        non_member_loader = retain_loaders[0]  # use another client as non-members
        mia_before = membership_inference_auc(state.model_before_unlearn, forget_loader, non_member_loader, device)
        mia_after  = membership_inference_auc(model_after,                forget_loader, non_member_loader, device)

        retrain_time = None
        if req.run_retrain_baseline:
            in_ch = 3 if state.dataset == "cifar10" else 1
            n_cls = 10 if state.dataset == "cifar10" else 62
            img_size = 28 if state.dataset == "femnist" else 32

            def model_factory():
                return build_model(in_ch, n_cls, device, img_size=img_size)

            _, retrain_time = retrain_from_scratch(
                model_factory, state.shards, req.client_id,
                epochs=req.finetune_epochs, lr=req.finetune_lr,
                batch_size=batch_size, device=device,
            )

        state.unlearn_results = {
            "forget_client_id": req.client_id,
            "forget_acc_before": round(forget_acc_before, 4),
            "forget_acc_after":  round(forget_acc_after,  4),
            "retain_acc_before": round(retain_acc_before, 4),
            "retain_acc_after":  round(retain_acc_after,  4),
            "mia_auc_before": round(mia_before, 4),
            "mia_auc_after":  round(mia_after,  4),
            "unlearn_time_s":  round(unlearn_time, 2),
            "retrain_time_s":  round(retrain_time, 2) if retrain_time else None,
            "speedup": round(retrain_time / unlearn_time, 1) if retrain_time else None,
        }
        state.status = "ready"
        state.message = f"Unlearning of client {req.client_id} complete."
    except Exception as e:
        state.status = "ready"
        state.message = f"Unlearning failed: {e}"


@router.get("/status")
def unlearn_status():
    return {
        "status": state.status,
        "message": state.message,
        "results": state.unlearn_results,
        "shards_ready": len(state.shards) > 0,
    }
