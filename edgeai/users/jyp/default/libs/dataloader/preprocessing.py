import torch
from torch.utils.data import Dataset
import numpy as np
from PIL import Image

class CIFAR100Dataset(Dataset):
    """Custom CIFAR100 dataset with albumentations augmentations"""
    def __init__(self, data, targets, transform=None):
        self.data = data
        self.targets = targets
        self.transform = transform

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        img = self.data[idx]
        target = self.targets[idx]

        if self.transform:
            img = self.transform(image=img)['image']

        return img, target

def prepare_data(config, data, targets, transform):
    """Prepare data for training/validation"""
    # Convert uint8 images to float32
    if isinstance(data, np.ndarray):
        data = data.astype(np.float32)
    
    # Create dataset with transforms
    dataset = CIFAR100Dataset(data, targets, transform)
    
    return dataset