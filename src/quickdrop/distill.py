import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
import copy
from typing import Optional, Callable


def gradient_matching(
    model: nn.Module,
    real_loader: DataLoader,
    num_classes: int,
    ipc: int,
    outer_steps: int,
    inner_steps: int,
    lr_img: float,
    lr_net: float,
    device: torch.device,
    on_step: Optional[Callable] = None,
) -> TensorDataset:
    """Distill a client's real data into a tiny synthetic dataset via gradient matching."""

    # Infer image shape from the first batch
    sample_imgs, _ = next(iter(real_loader))
    C, H, W = sample_imgs.shape[1:]

    # Initialise synthetic images as random noise, one per class per ipc
    syn_images = torch.randn(num_classes * ipc, C, H, W, device=device, requires_grad=True)
    syn_labels = torch.arange(num_classes, device=device).repeat_interleave(ipc)

    optimizer_img = torch.optim.SGD([syn_images], lr=lr_img, momentum=0.5)
    criterion = nn.CrossEntropyLoss()

    for outer in range(outer_steps):
        net = copy.deepcopy(model).to(device)
        net.train()
        optimizer_net = torch.optim.SGD(net.parameters(), lr=lr_net)

        # Compute real gradients on a batch from the real loader
        real_imgs, real_lbls = next(iter(real_loader))
        real_imgs, real_lbls = real_imgs.to(device), real_lbls.to(device)
        real_loss = criterion(net(real_imgs), real_lbls)
        real_grads = torch.autograd.grad(real_loss, net.parameters(), create_graph=False)
        real_grads = [g.detach() for g in real_grads]

        # Compute synthetic gradients
        syn_loss = criterion(net(syn_images), syn_labels)
        syn_grads = torch.autograd.grad(syn_loss, net.parameters(), create_graph=True)

        # Gradient matching loss: cosine distance per layer, summed
        match_loss = sum(
            1 - F.cosine_similarity(sg.flatten(), rg.flatten(), dim=0)
            for sg, rg in zip(syn_grads, real_grads)
        )

        optimizer_img.zero_grad()
        match_loss.backward()
        optimizer_img.step()

        # Clamp images to reasonable range
        with torch.no_grad():
            syn_images.clamp_(-1.0, 1.0)

        if on_step:
            on_step({"outer_step": outer + 1, "match_loss": match_loss.item()})

    syn_images_final = syn_images.detach().cpu()
    syn_labels_final = syn_labels.cpu()
    return TensorDataset(syn_images_final, syn_labels_final)


def build_distilled_shard(
    model: nn.Module,
    real_loader: DataLoader,
    cfg: dict,
    device: torch.device,
    on_step: Optional[Callable] = None,
) -> TensorDataset:
    return gradient_matching(
        model=model,
        real_loader=real_loader,
        num_classes=cfg["num_classes"],
        ipc=cfg["distillation"]["ipc"],
        outer_steps=cfg["distillation"]["outer_steps"],
        inner_steps=cfg["distillation"]["inner_steps"],
        lr_img=cfg["distillation"]["lr_img"],
        lr_net=cfg["distillation"]["lr_net"],
        device=device,
        on_step=on_step,
    )
