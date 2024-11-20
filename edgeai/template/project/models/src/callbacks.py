import torch
import torch.nn as nn
import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

class ModelCallbacks:
    """Callback handler for model training and evaluation"""
    
    def __init__(self, save_dir: str, config: Dict[str, Any]):
        """
        Initialize callbacks
        
        Args:
            save_dir: Directory to save outputs
            config: Model configuration dictionary
        """
        self.save_dir = Path(save_dir)
        self.config = config
        self.best_metric = float('inf')
        self.patience_counter = 0
        
        # Initialize logging
        self._setup_logging()
        
    def _setup_logging(self):
        """Setup logging configuration"""
        self.logger = logging.getLogger('ModelTraining')
        self.logger.setLevel(logging.INFO)
        
        # Create handlers
        log_file = self.save_dir / 'training.log'
        file_handler = logging.FileHandler(log_file)
        console_handler = logging.StreamHandler()
        
        # Create formatters
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Add handlers
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def on_training_start(self, model: nn.Module):
        """Called when training starts"""
        self.logger.info("Starting training with configuration:")
        self.logger.info(json.dumps(self.config, indent=2))
        
        # Save model architecture summary
        self.logger.info(f"Model Architecture:\n{model}")

    def on_epoch_start(self, epoch: int):
        """Called at the start of each epoch"""
        self.logger.info(f"Starting epoch {epoch}")
        self.current_epoch = epoch

    def on_batch_end(self, batch: int, metrics: Dict[str, float]):
        """Called after each batch"""
        if batch % self.config['logging']['log_frequency'] == 0:
            metrics_str = ' '.join(f'{k}: {v:.4f}' for k, v in metrics.items())
            self.logger.info(f"Epoch {self.current_epoch} Batch {batch} - {metrics_str}")

    def on_epoch_end(self, epoch: int, metrics: Dict[str, float], model: nn.Module):
        """Called at the end of each epoch"""
        # Log metrics
        metrics_str = ' '.join(f'{k}: {v:.4f}' for k, v in metrics.items())
        self.logger.info(f"Epoch {epoch} finished - {metrics_str}")
        
        # Save metrics
        metrics_file = self.save_dir / 'metrics.json'
        if metrics_file.exists():
            with metrics_file.open('r') as f:
                all_metrics = json.load(f)
        else:
            all_metrics = []
        
        all_metrics.append({
            'epoch': epoch,
            **metrics
        })
        
        with metrics_file.open('w') as f:
            json.dump(all_metrics, f, indent=2)
        
        # Check for model saving
        current_metric = metrics.get('val_loss', float('inf'))
        
        if current_metric < self.best_metric:
            self.best_metric = current_metric
            self.patience_counter = 0
            
            # Save model
            if self.config['logging']['save_checkpoints']:
                self._save_checkpoint(model, epoch, metrics)
            
            self.logger.info(f"New best model saved with val_loss: {current_metric:.4f}")
        else:
            self.patience_counter += 1
        
        # Early stopping check
        patience = self.config['monitoring']['early_stopping']['patience']
        if self.patience_counter >= patience:
            self.logger.info(f"Early stopping triggered after {patience} epochs without improvement")
            return True
        
        return False

    def _save_checkpoint(self, model: nn.Module, epoch: int, metrics: Dict[str, float]):
        """Save model checkpoint"""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'metrics': metrics,
            'config': self.config
        }
        
        # Save checkpoint
        checkpoint_dir = self.save_dir / 'checkpoints'
        checkpoint_dir.mkdir(exist_ok=True)
        
        checkpoint_path = checkpoint_dir / f'model_epoch_{epoch}.pt'
        torch.save(checkpoint, checkpoint_path)
        
        # Manage checkpoint history
        checkpoints = sorted(checkpoint_dir.glob('*.pt'))
        keep_last_n = self.config['logging']['keep_last_n']
        
        if len(checkpoints) > keep_last_n:
            for checkpoint in checkpoints[:-keep_last_n]:
                checkpoint.unlink()

    def plot_attention_maps(self, attention_maps: torch.Tensor, image: torch.Tensor, 
                          layer_idx: Optional[int] = None):
        """Plot attention maps for visualization"""
        if not isinstance(attention_maps, torch.Tensor):
            attention_maps = attention_maps[0] if layer_idx is None else attention_maps[layer_idx]
        
        # Create attention visualization
        fig, axes = plt.subplots(2, 4, figsize=(15, 8))
        axes = axes.ravel()
        
        # Plot original image
        axes[0].imshow(image.permute(1, 2, 0))
        axes[0].set_title('Original Image')
        axes[0].axis('off')
        
        # Plot attention maps
        for idx, head_idx in enumerate(range(min(7, attention_maps.size(1)))):
            ax = axes[idx + 1]
            attention = attention_maps[0, head_idx].mean(0)
            
            sns.heatmap(attention.cpu().numpy(), ax=ax, cmap='viridis', square=True)
            ax.set_title(f'Head {head_idx + 1}')
            ax.axis('off')
        
        plt.tight_layout()
        
        # Save visualization
        viz_dir = self.save_dir / 'visualizations'
        viz_dir.mkdir(exist_ok=True)
        plt.savefig(viz_dir / f'attention_maps_epoch_{self.current_epoch}.png')
        plt.close()

def get_callbacks(config: Dict[str, Any], save_dir: str) -> ModelCallbacks:
    """Create and return callback instance"""
    return ModelCallbacks(save_dir, config)