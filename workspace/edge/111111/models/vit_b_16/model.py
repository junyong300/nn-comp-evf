# model.py
import torch
import torch.nn as nn
from torchvision.models import vit_b_16, ViT_B_16_Weights
from typing import Optional, Union, List, Dict, Any

class CustomViT(nn.Module):
    """Custom Vision Transformer model based on ViT-B/16 architecture"""
    def __init__(self, 
                 num_classes: int = 100,
                 pretrained: bool = True,
                 dropout: float = 0.1,
                 fine_tune: bool = True):
        """
        Initialize the model.
        
        Args:
            num_classes (int): Number of output classes
            pretrained (bool): Whether to use pretrained weights
            dropout (float): Dropout rate for the final classifier
            fine_tune (bool): Whether to fine-tune the entire model or just the classifier
        """
        super().__init__()
        
        # Load the pretrained ViT model
        weights = ViT_B_16_Weights.DEFAULT if pretrained else None
        self.vit = vit_b_16(weights=weights)
        
        # Get the feature dimension
        self.hidden_dim = self.vit.heads.head.in_features
        
        # Replace the classification head
        self.vit.heads = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(self.hidden_dim, num_classes)
        )
        
        # Freeze/Unfreeze parameters based on fine_tune flag
        if not fine_tune:
            for param in self.vit.parameters():
                param.requires_grad = False
            # Always train the classification head
            for param in self.vit.heads.parameters():
                param.requires_grad = True

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass of the model"""
        return self.vit(x)

    def get_attention_maps(self, x: torch.Tensor) -> List[torch.Tensor]:
        """Get attention maps from the model for visualization"""
        with torch.no_grad():
            attention_maps = []
            
            # Register hook to get attention maps
            def get_attention(module, input, output):
                attention_maps.append(output.detach())
            
            hooks = []
            for block in self.vit.encoder.layers:
                hooks.append(block.self_attention.softmax.register_forward_hook(get_attention))
            
            # Forward pass
            _ = self.vit(x)
            
            # Remove hooks
            for hook in hooks:
                hook.remove()
            
            return attention_maps

def get_model_instance(config: Dict[str, Any]) -> nn.Module:
    """
    Creates and returns a model instance based on configuration.
    
    Args:
        config (dict): Configuration dictionary containing model parameters
        
    Returns:
        model (nn.Module): Initialized model
    """
    model_config = {
        'num_classes': config.get('num_classes', 100),
        'pretrained': config.get('pretrained', True),
        'dropout': config.get('dropout_rate', 0.1),
        'fine_tune': config.get('fine_tune', True)
    }
    
    return CustomViT(**model_config)

# Config validation function
def validate_config(config: Dict[str, Any]) -> bool:
    """
    Validates the model configuration.
    
    Args:
        config (dict): Configuration to validate
        
    Returns:
        bool: True if configuration is valid
    """
    required_fields = ['num_classes', 'pretrained', 'dropout_rate']
    return all(field in config for field in required_fields)

# Get model statistics
def get_model_stats(model: nn.Module) -> Dict[str, Any]:
    """
    Get model statistics including parameters and layers.
    
    Args:
        model (nn.Module): Model to analyze
        
    Returns:
        dict: Dictionary containing model statistics
    """
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    
    return {
        'total_parameters': total_params,
        'trainable_parameters': trainable_params,
        'frozen_parameters': total_params - trainable_params,
        'layers': len(list(model.modules())),
    }

if __name__ == "__main__":
    # Example usage
    config = {
        'num_classes': 100,
        'pretrained': True,
        'dropout_rate': 0.1,
        'fine_tune': True
    }
    
    model = get_model_instance(config)
    print(f"Model Architecture:\n{model}")
    
    stats = get_model_stats(model)
    print("\nModel Statistics:")
    for key, value in stats.items():
        print(f"{key}: {value:,}")