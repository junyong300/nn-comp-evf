import torch
from torch.utils.data import Dataset, DataLoader
import numpy as np
from PIL import Image
import torchvision
import os

class CIFAR100Dataset(Dataset):
    """CIFAR100 dataset with albumentations transforms"""
    def __init__(self, root='./data', train=True, transform=None, download=True):
        # Load CIFAR100 using torchvision
        self.dataset = torchvision.datasets.CIFAR100(
            root=root,
            train=train,
            download=download
        )
        self.transform = transform
        
        # Convert to numpy arrays for albumentations
        self.images = self.dataset.data  # Already numpy array (50000, 32, 32, 3)
        self.labels = np.array(self.dataset.targets)

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        image = self.images[idx]
        label = self.labels[idx]
        
        # Apply albumentations transforms
        if self.transform:
            transformed = self.transform(image=image)
            image = transformed['image']
        
        return image, label

def get_cifar100_dataloaders(config):
    """Get CIFAR100 train and validation dataloaders with proper augmentations"""
    from .augmentation import get_train_transforms, get_val_transforms
    
    # Create datasets
    train_dataset = CIFAR100Dataset(
        root=config.get('data_dir', './data'),
        train=True,
        transform=get_train_transforms(config),
        download=True
    )
    
    val_dataset = CIFAR100Dataset(
        root=config.get('data_dir', './data'),
        train=False,
        transform=get_val_transforms(config),
        download=True
    )
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=config.get('batch_size', 128),
        shuffle=True,
        num_workers=config.get('num_workers', 4),
        pin_memory=config.get('pin_memory', True)
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=config.get('batch_size', 128),
        shuffle=False,
        num_workers=config.get('num_workers', 4),
        pin_memory=config.get('pin_memory', True)
    )
    
    return train_loader, val_loader

class CustomDataset(Dataset):
    """Generic dataset for custom data"""
    def __init__(self, images, labels, transform=None):
        self.images = images
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        image = self.images[idx]
        label = self.labels[idx]
        
        if self.transform:
            transformed = self.transform(image=image)
            image = transformed['image']
        
        return image, label

def prepare_dataloader(config, images, labels, transform, is_training=True):
    """Prepare DataLoader for custom data"""
    dataset = CustomDataset(images, labels, transform)
    
    return DataLoader(
        dataset,
        batch_size=config.get('batch_size', 128),
        shuffle=is_training,
        num_workers=config.get('num_workers', 4),
        pin_memory=config.get('pin_memory', True),
        drop_last=is_training
    )

def get_dataloaders(config):
    """Get dataloaders based on config
    
    Default: CIFAR100
    For custom datasets: Override this function in your task
    """
    dataset_name = config.get('dataset', 'cifar100').lower()
    
    if dataset_name == 'cifar100':
        return get_cifar100_dataloaders(config)
    else:
        raise ValueError(f"Dataset {dataset_name} not supported in default template. "
                       "Please implement custom data loading logic.")

def get_preprocessing_fn(config, is_training=True):
    """Returns preprocessing function based on config"""
    from .augmentation import get_augmentation
    
    transform = get_augmentation(config, is_training)
    
    def preprocess_fn(images, labels):
        return prepare_dataloader(config, images, labels, transform, is_training)
        
    return preprocess_fn

# Default configuration for CIFAR100
DEFAULT_CONFIG = {
    'dataset': 'cifar100',
    'data_dir': './data',
    'batch_size': 128,
    'num_workers': 4,
    'pin_memory': True,
    'image_size': 32,
    'num_classes': 100,
    'mean': [0.4914, 0.4822, 0.4465],
    'std': [0.2023, 0.1994, 0.2010],
}