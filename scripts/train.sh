#!/usr/bin/env bash
# Train a federated model. Pass args through to the Python module.
#
# Usage:
#   ./scripts/train.sh                          # defaults: cifar10, 100 rounds, 20 clients
#   ./scripts/train.sh --dataset femnist --rounds 50
source venv/bin/activate
python -m src.federated.fedavg "$@"
