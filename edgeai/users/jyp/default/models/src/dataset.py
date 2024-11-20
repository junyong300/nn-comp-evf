from torchvision import transforms
import torch
from torch.utils.data import DataLoader
import torchvision.datasets as datasets

def get_data_transforms(is_training):
    """Get data transforms for training/validation"""
    if is_training:
        return transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
        ])
    else:
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
        ])

def get_dataloaders(config):
    """Returns training and validation dataloaders"""
    train_transform = get_data_transforms(is_training=True)
    val_transform = get_data_transforms(is_training=False)
    
    train_dataset = datasets.CIFAR100(
        root='./data', 
        train=True,
        download=True, 
        transform=train_transform
    )
    
    val_dataset = datasets.CIFAR100(
        root='./data', 
        train=False,
        download=True, 
        transform=val_transform
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['batch_size'],
        shuffle=True,
        num_workers=config['num_workers'],
        pin_memory=True
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=config['batch_size'],
        shuffle=False,
        num_workers=config['num_workers'],
        pin_memory=True
    )
    
    return train_loader, val_loader