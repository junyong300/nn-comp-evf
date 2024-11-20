import torch
import numpy as np
from sklearn.metrics import precision_recall_fscore_support

class MetricTracker:
    """Tracks multiple metrics during training"""
    def __init__(self):
        self.reset()

    def reset(self):
        self.val = 0
        self.avg = 0
        self.sum = 0
        self.count = 0

    def update(self, val, n=1):
        self.val = val
        self.sum += val * n
        self.count += n
        self.avg = self.sum / self.count

def calculate_metrics(outputs, targets, num_classes=100):
    """Calculate various metrics for multi-class classification
    
    Returns:
        dict: Dictionary containing various metrics
    """
    # Convert outputs to predictions
    _, preds = torch.max(outputs, 1)
    
    # Calculate accuracy
    correct = (preds == targets).float().sum()
    accuracy = correct / targets.size(0)
    
    # Convert to numpy for sklearn metrics
    preds = preds.cpu().numpy()
    targets = targets.cpu().numpy()
    
    # Calculate precision, recall, f1 (macro averaged)
    precision, recall, f1, _ = precision_recall_fscore_support(
        targets, preds, average='macro', zero_division=0
    )
    
    # Per-class accuracy
    per_class_acc = []
    for i in range(num_classes):
        mask = targets == i
        if mask.sum() > 0:
            acc_i = (preds[mask] == targets[mask]).mean()
            per_class_acc.append(acc_i)
    
    return {
        'accuracy': accuracy.item(),
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'per_class_accuracy': np.mean(per_class_acc)
    }

def get_metric_fn(config):
    """Returns metric calculation function based on config"""
    def metric_fn(outputs, targets):
        return calculate_metrics(
            outputs, targets, 
            num_classes=config.get('num_classes', 100)
        )
    return metric_fn