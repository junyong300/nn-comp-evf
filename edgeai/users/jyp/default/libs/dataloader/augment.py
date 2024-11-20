import albumentations as A
from albumentations.pytorch import ToTensorV2
import numpy as np

def get_transforms(config, is_training=True):
    """Get transforms for training/validation
    
    For CIFAR100:
    - Training: Strong augmentations for regularization
    - Validation: Only normalize and convert to tensor
    """
    if is_training:
        return A.Compose([
            A.RandomCrop(32, 32),
            A.HorizontalFlip(p=0.5),
            A.OneOf([
                A.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1, p=0.3),
                A.HueSaturationValue(p=0.3),
                A.RandomBrightnessContrast(p=0.3),
            ], p=0.5),
            A.OneOf([
                A.GaussNoise(p=0.3),
                A.GaussianBlur(p=0.3),
                A.MotionBlur(p=0.3),
            ], p=0.3),
            A.Normalize(
                mean=[0.4914, 0.4822, 0.4465],  # CIFAR100 mean
                std=[0.2023, 0.1994, 0.2010],   # CIFAR100 std
            ),
            ToTensorV2(),
        ])
    else:
        return A.Compose([
            A.Normalize(
                mean=[0.4914, 0.4822, 0.4465],
                std=[0.2023, 0.1994, 0.2010],
            ),
            ToTensorV2(),
        ])