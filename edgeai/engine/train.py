import os
import json
import time
import torch
from torch.utils.data import DataLoader
import logging

class JSONLogging:
    """Handles logging for GUI updates"""
    def __init__(self, working_path):
        self.working_path = working_path
        self.paths = {
            "log": os.path.join(self.working_path, "log.out"),
            "meta": os.path.join(self.working_path, "meta.json"),
            "progress": os.path.join(self.working_path, "progress.json"),
            "values": os.path.join(self.working_path, "values.json")
        }

    def update(self, target, updates):
        """Update progress or meta information"""
        with open(self.paths[target], "r") as f:
            struct = json.load(f)
        
        for key, value in updates.items():
            struct[key] = value

        with open(self.paths[target], "w") as f:
            json.dump(struct, f)

    def add(self, target, updates):
        """Add new values (e.g., loss, accuracy) to tracking"""
        with open(self.paths[target], "r") as f:
            struct = json.load(f)

        for key, value in updates.items():
            if key not in struct:
                struct[key] = []
            struct[key].append([len(struct[key]) + 1, value])

        with open(self.paths[target], "w") as f:
            json.dump(struct, f)

def get_default_ingredients(config, model):
    """Get default training components if not specified"""
    # Default optimizer (SGD)
    optimizer = torch.optim.SGD(
        model.parameters(),
        lr=config.get('learning_rate', 0.01),
        momentum=config.get('momentum', 0.9),
        weight_decay=config.get('weight_decay', 5e-4)
    )
    
    # Default scheduler
    scheduler = torch.optim.lr_scheduler.StepLR(
        optimizer,
        step_size=config.get('scheduler_step_size', 30),
        gamma=config.get('scheduler_gamma', 0.1)
    )
    
    # Default loss
    criterion = torch.nn.CrossEntropyLoss()
    
    return optimizer, scheduler, criterion

def train(
    config,
    model,
    train_loader,
    val_loader,
    job_dir,
    optimizer=None,
    scheduler=None,
    criterion=None,
    device=None
):
    """Main training loop with GUI progress tracking
    
    Args:
        config: Training configuration
        model: PyTorch model
        train_loader: Training data loader
        val_loader: Validation data loader
        job_dir: Directory for logging
        optimizer: Optional optimizer (default: SGD)
        scheduler: Optional scheduler (default: StepLR)
        criterion: Optional loss function (default: CrossEntropyLoss)
        device: Optional device (default: cuda if available)
    """
    # Setup logging
    logger = JSONLogging(job_dir)
    
    # Setup device
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Get default components if not provided
    if any(x is None for x in [optimizer, scheduler, criterion]):
        optimizer, scheduler, criterion = get_default_ingredients(config, model)
    
    # Move model to device
    model = model.to(device)
    
    # Training loop
    best_acc = 0
    num_epochs = config.get('epochs', 100)
    
    for epoch in range(num_epochs):
        # Training phase
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            # Calculate accuracy
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()
            
            # Update running loss
            running_loss += loss.item()
            
            # Update GUI progress
            if batch_idx % config.get('log_frequency', 10) == 0:
                progress = {
                    "progress": (epoch * len(train_loader) + batch_idx) / (num_epochs * len(train_loader)) * 100,
                    "epoch": epoch,
                    "message": f"Training... Epoch: {epoch}"
                }
                logger.update("progress", progress)
                
                metrics = {
                    "loss": running_loss / (batch_idx + 1),
                    "accuracy": 100. * correct / total
                }
                logger.add("values", metrics)
        
        # Validation phase
        model.eval()
        val_loss = 0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                total += targets.size(0)
                correct += predicted.eq(targets).sum().item()
        
        val_acc = 100. * correct / total
        
        # Update GUI with validation results
        metrics = {
            "val_loss": val_loss / len(val_loader),
            "val_accuracy": val_acc
        }
        logger.add("values", metrics)
        
        # Save best model
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), os.path.join(job_dir, 'best_model.pth'))
        
        # Step scheduler
        if scheduler is not None:
            scheduler.step()
    
    # Final update
    logger.update("progress", {
        "progress": 100.0,
        "message": "Training completed",
        "best_accuracy": best_acc
    })

    return model