import torch
import numpy as np
from typing import Dict, Any
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix

class Metrics:
    """Handles metric calculation and tracking"""
    def __init__(self, num_classes: int):
        self.num_classes = num_classes
        self.reset()
    
    def reset(self):
        """Reset metric counters"""
        self.correct = 0
        self.total = 0
        self.running_loss = 0.0
        self.batches = 0
        self.predictions = []
        self.targets = []
    
    def update(self, outputs: torch.Tensor, targets: torch.Tensor, loss: float):
        """Update metrics with batch results"""
        predictions = outputs.argmax(dim=1)
        self.correct += (predictions == targets).sum().item()
        self.total += targets.size(0)
        self.running_loss += loss
        self.batches += 1
        
        # Store for per-class metrics
        self.predictions.extend(predictions.cpu().numpy())
        self.targets.extend(targets.cpu().numpy())
    
    def compute(self) -> Dict[str, Any]:
        """Compute all metrics"""
        predictions = np.array(self.predictions)
        targets = np.array(self.targets)
        
        # Basic metrics
        accuracy = self.correct / self.total
        avg_loss = self.running_loss / self.batches
        
        # Per-class metrics
        precision, recall, f1, _ = precision_recall_fscore_support(
            targets, 
            predictions,
            labels=range(self.num_classes),
            average=None,
            zero_division=0
        )
        
        # Confusion matrix
        conf_matrix = confusion_matrix(
            targets,
            predictions,
            labels=range(self.num_classes)
        )
        
        return {
            'loss': avg_loss,
            'accuracy': accuracy,
            'per_class_precision': precision.tolist(),
            'per_class_recall': recall.tolist(),
            'per_class_f1': f1.tolist(),
            'confusion_matrix': conf_matrix.tolist()
        }

def get_metrics(config):
    """Returns metrics instance based on config"""
    return Metrics(num_classes=config.get('num_classes', 100))