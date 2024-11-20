import torch
import torch.nn as nn
import torch.nn.functional as F

class CustomLoss(nn.Module):
    """Example custom loss combining multiple loss functions"""
    def __init__(self, alpha=1.0, temperature=1.0):
        super().__init__()
        self.alpha = alpha
        self.temperature = temperature
        self.ce = nn.CrossEntropyLoss()
    
    def forward(self, outputs, targets):
        # Basic cross entropy
        ce_loss = self.ce(outputs, targets)
        
        # Label smoothing
        smooth_targets = F.one_hot(targets, outputs.size(-1)).float()
        smooth_targets = smooth_targets * (1 - self.alpha) + self.alpha / outputs.size(-1)
        smooth_loss = -(smooth_targets * F.log_softmax(outputs/self.temperature, dim=-1)).sum(dim=-1).mean()
        
        return ce_loss + smooth_loss

def get_loss(config):
    """Returns loss function based on config
    
    Supports:
    - 'ce': CrossEntropyLoss
    - 'bce': BCEWithLogitsLoss
    - 'custom': CustomLoss
    """
    loss_type = config.get('loss_type', 'ce')
    
    if loss_type == 'ce':
        return nn.CrossEntropyLoss()
    elif loss_type == 'bce':
        return nn.BCEWithLogitsLoss()
    elif loss_type == 'custom':
        return CustomLoss(
            alpha=config.get('label_smoothing', 0.1),
            temperature=config.get('temperature', 1.0)
        )
    else:
        raise ValueError(f"Unsupported loss type: {loss_type}")