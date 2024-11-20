import torch
import os
import json
from pathlib import Path
import logging
from typing import Dict, Any

class Callback:
    """Base callback class"""
    def on_train_begin(self, logs: Dict[str, Any] = None): pass
    def on_train_end(self, logs: Dict[str, Any] = None): pass
    def on_epoch_begin(self, epoch: int, logs: Dict[str, Any] = None): pass
    def on_epoch_end(self, epoch: int, logs: Dict[str, Any] = None): pass
    def on_batch_begin(self, batch: int, logs: Dict[str, Any] = None): pass
    def on_batch_end(self, batch: int, logs: Dict[str, Any] = None): pass

class MetricsLogger(Callback):
    """Logs metrics for GUI visualization"""
    def __init__(self, log_dir: str):
        self.log_dir = Path(log_dir)
        self.values_file = self.log_dir / 'values.json'
        self.progress_file = self.log_dir / 'progress.json'
        self.history = []
    
    def on_train_begin(self, logs: Dict[str, Any] = None):
        self.log_dir.mkdir(parents=True, exist_ok=True)
    
    def on_epoch_end(self, epoch: int, logs: Dict[str, Any] = None):
        if logs is None:
            return
            
        # Update values.json
        logs = logs.copy()
        logs['epoch'] = epoch
        self.history.append(logs)
        
        with self.values_file.open('w') as f:
            json.dump(self.history, f, indent=4)
        
        # Update progress.json
        total_epochs = logs.get('total_epochs', 100)
        progress = {
            'progress': (epoch + 1) / total_epochs * 100,
            'epoch': epoch + 1,
            'total_epochs': total_epochs,
            'message': f'Training epoch {epoch + 1}/{total_epochs}'
        }
        
        with self.progress_file.open('w') as f:
            json.dump(progress, f, indent=4)

class ModelCheckpoint(Callback):
    """Save model checkpoints"""
    def __init__(self, filepath: str, monitor: str = 'val_loss', save_best_only: bool = True):
        self.filepath = filepath
        self.monitor = monitor
        self.save_best_only = save_best_only
        self.best_value = float('inf')
        
    def on_epoch_end(self, epoch: int, logs: Dict[str, Any] = None):
        if logs is None or 'model' not in logs:
            return
            
        current = logs.get(self.monitor)
        if current is None:
            return
            
        if current < self.best_value:
            self.best_value = current
            if self.save_best_only:
                torch.save(logs['model'].state_dict(), self.filepath)

def get_callbacks(config: Dict[str, Any], job_dir: str) -> list:
    """Returns list of callbacks based on config"""
    callbacks = [
        MetricsLogger(job_dir),
        ModelCheckpoint(
            filepath=os.path.join(job_dir, 'best_model.pth'),
            monitor=config.get('monitor_metric', 'val_loss'),
            save_best_only=config.get('save_best_only', True)
        )
    ]
    return callbacks