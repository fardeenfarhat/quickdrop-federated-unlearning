import torch
import torch.nn as nn
import copy


class ConvBlock(nn.Module):
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.InstanceNorm2d(out_ch, affine=True),
            nn.ReLU(inplace=True),
            nn.AvgPool2d(2),
        )

    def forward(self, x):
        return self.block(x)


class ConvNet(nn.Module):
    """ConvNet-3: standard backbone from the dataset distillation literature.
    Works for both FEMNIST (1ch, 28x28→62 classes) and CIFAR-10 (3ch, 32x32→10 classes)."""

    def __init__(self, in_channels: int, num_classes: int, width: int = 128):
        super().__init__()
        self.features = nn.Sequential(
            ConvBlock(in_channels, width),
            ConvBlock(width, width),
            ConvBlock(width, width),
        )
        self.classifier = nn.LazyLinear(num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = x.flatten(1)
        return self.classifier(x)

    def get_flat_params(self) -> torch.Tensor:
        return torch.cat([p.data.view(-1) for p in self.parameters()])

    def set_flat_params(self, flat: torch.Tensor):
        offset = 0
        for p in self.parameters():
            n = p.numel()
            p.data.copy_(flat[offset:offset + n].view_as(p))
            offset += n


def build_model(in_channels: int, num_classes: int, device: torch.device, img_size: int = 32) -> ConvNet:
    model = ConvNet(in_channels, num_classes).to(device)
    dummy = torch.zeros(2, in_channels, img_size, img_size).to(device)
    model(dummy)  # trigger LazyLinear init
    return model


def clone_model(model: ConvNet) -> ConvNet:
    return copy.deepcopy(model)
