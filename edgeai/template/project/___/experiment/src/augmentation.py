import albumentations as A
from albumentations.pytorch import ToTensorV2
import numpy as np

def get_train_transforms(config):
    """Get training augmentations based on config
    
    Default setup for CIFAR100 with recommended augmentations
    """
    return A.Compose([
        # Spatial augmentations
        A.RandomCrop(
            height=config.get('image_size', 32),
            width=config.get('image_size', 32)
        ),
        A.HorizontalFlip(p=0.5),
        
        # Color augmentations
        A.OneOf([
            A.ColorJitter(
                brightness=0.2, 
                contrast=0.2, 
                saturation=0.2, 
                hue=0.1, 
                p=0.3
            ),
            A.HueSaturationValue(p=0.3),
            A.RandomBrightnessContrast(p=0.3),
        ], p=0.5),
        
        # Noise & Blur
        A.OneOf([
            A.GaussNoise(var_limit=(10.0, 50.0), p=0.3),
            A.GaussianBlur(blur_limit=(3, 7), p=0.3),
            A.MotionBlur(blur_limit=(3, 7), p=0.3),
        ], p=0.3),
        
        # Normalization
        A.Normalize(
            mean=config.get('mean', [0.4914, 0.4822, 0.4465]),
            std=config.get('std', [0.2023, 0.1994, 0.2010]),
        ),
        ToTensorV2(),
    ])

def get_val_transforms(config):
    """Get validation augmentations based on config"""
    return A.Compose([
        A.Normalize(
            mean=config.get('mean', [0.4914, 0.4822, 0.4465]),
            std=config.get('std', [0.2023, 0.1994, 0.2010]),
        ),
        ToTensorV2(),
    ])

def get_augmentation(config, is_training=True):
    """Get augmentation based on phase"""
    return get_train_transforms(config) if is_training else get_val_transforms(config)