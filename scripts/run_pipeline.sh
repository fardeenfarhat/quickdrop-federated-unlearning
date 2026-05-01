#!/usr/bin/env bash
# Run the full QuickDrop pipeline end-to-end:
#   1. Train federation with FedAvg
#   2. Distill per-client shards
#   3. Unlearn a chosen client
#   4. Print metrics
#
# Usage:
#   ./scripts/run_pipeline.sh                   # cifar10, 20 rounds, 10 clients, forget client 0
#   ./scripts/run_pipeline.sh --rounds 50 --forget 3

set -e
source venv/bin/activate

DATASET=${DATASET:-cifar10}
ROUNDS=${ROUNDS:-20}
CLIENTS=${CLIENTS:-10}
FORGET=${FORGET:-0}
IPC=${IPC:-5}

echo "==> Dataset  : $DATASET"
echo "==> Rounds   : $ROUNDS"
echo "==> Clients  : $CLIENTS"
echo "==> Forget   : client $FORGET"
echo ""

# Parse any --key value overrides from args
while [[ $# -gt 0 ]]; do
  case $1 in
    --dataset) DATASET="$2"; shift 2 ;;
    --rounds)  ROUNDS="$2";  shift 2 ;;
    --clients) CLIENTS="$2"; shift 2 ;;
    --forget)  FORGET="$2";  shift 2 ;;
    --ipc)     IPC="$2";     shift 2 ;;
    *) shift ;;
  esac
done

python - <<EOF
import sys, os
sys.path.insert(0, os.getcwd())
import torch
from src.data.cifar10_dirichlet import get_cifar10_loaders
from src.data.femnist import get_femnist_loaders
from src.models.convnet import build_model
from src.federated.client import FederatedClient
from src.federated.server import FederatedServer
from src.federated.fedavg import run_fedavg
from src.quickdrop.distill import build_distilled_shard
from src.quickdrop.unlearn import unlearn_client
from src.eval.metrics import evaluate
from src.eval.mia import membership_inference_auc

dataset  = "$DATASET"
rounds   = $ROUNDS
n_clients= $CLIENTS
forget   = $FORGET
ipc      = $IPC
device   = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"Device: {device}")

if dataset == "cifar10":
    loaders, test_loader = get_cifar10_loaders(n_clients, 64)
    in_ch, n_cls, bs = 3, 10, 64
else:
    loaders, test_loader = get_femnist_loaders(n_clients, 32)
    in_ch, n_cls, bs = 1, 62, 32

# 1. Train
print("\n-- FedAvg Training --")
model  = build_model(in_ch, n_cls, device)
server = FederatedServer(model, device)
clients = [FederatedClient(i, l, device) for i, l in enumerate(loaders)]
run_fedavg(server, clients, rounds, max(1, n_clients//2), 1, 0.01, test_loader,
           on_round_end=lambda r: print(f"  round {r['round']:3d}  acc={r['test_acc']:.4f}"))

# 2. Distill
print("\n-- Distillation --")
cfg = {"num_classes": n_cls, "distillation": {"ipc": ipc, "outer_steps": 5, "inner_steps": 200, "lr_img": 0.1, "lr_net": 0.01}}
shards = []
for i, loader in enumerate(loaders):
    print(f"  client {i+1}/{n_clients}", end=" ", flush=True)
    shards.append(build_distilled_shard(server.model, loader, cfg, device))
    print("ok")

# 3. Unlearn
print(f"\n-- Unlearning client {forget} --")
forget_loader = loaders[forget]
non_mem_loader = loaders[(forget+1) % n_clients]
fa_b  = evaluate(server.model, forget_loader, device)["accuracy"]
ra_b  = evaluate(server.model, test_loader,   device)["accuracy"]
mia_b = membership_inference_auc(server.model, forget_loader, non_mem_loader, device)
unlearned, t = unlearn_client(server.model, shards, forget, 5, 0.001, bs, device)
fa_a  = evaluate(unlearned, forget_loader, device)["accuracy"]
ra_a  = evaluate(unlearned, test_loader,   device)["accuracy"]
mia_a = membership_inference_auc(unlearned, forget_loader, non_mem_loader, device)

# 4. Results
print(f"\n{'Metric':<20} {'Before':>8} {'After':>8} {'Delta':>8}")
print("-"*48)
print(f"{'Forget acc':<20} {fa_b:>8.4f} {fa_a:>8.4f} {fa_a-fa_b:>+8.4f}")
print(f"{'Retain acc':<20} {ra_b:>8.4f} {ra_a:>8.4f} {ra_a-ra_b:>+8.4f}")
print(f"{'MIA AUC':<20} {mia_b:>8.4f} {mia_a:>8.4f} {mia_a-mia_b:>+8.4f}")
print(f"\nUnlearning time: {t:.2f}s")
EOF
