# Configuration for CIFAR100 dataset
import os
import yaml
import json
from torchvision import datasets, transforms
from torch.utils.data import Dataset

class CustomDatasetLoader(Dataset):
    def __init__(self, meta_path, config_path):
        """
        Custom Dataset Loader.

        Args:
            meta_path (str): Path to the meta file (meta.json).
            config_path (str): Path to the configuration file (config.yaml).
        """
        # Load meta and config
        with open(meta_path, 'r') as f:
            self.meta = json.load(f)
        
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Load basic parameters from meta.json
        self.dataset_name = self.meta.get('dataset_name', 'Unknown')
        self.dataset_path = self.meta.get('dataset_path', './data')
        self.task_type = self.meta.get('task_type', 'classification')
        self.mode = self.meta.get('mode', 'train').lower()
        
        # Load other configurations from config.yaml
        self.img_size = self.config.get('img_size', 32)
        self.augmentation_config = self.config.get('augmentation', {})
        self.normalize_mean = self.config.get('normalize', {}).get('mean', [0.5, 0.5, 0.5])
        self.normalize_std = self.config.get('normalize', {}).get('std', [0.5, 0.5, 0.5])

        # Set up transformations based on mode
        if self.mode == 'train':
            self.transform = self.get_train_transform()
        else:
            self.transform = self.get_test_transform()

        # Load the dataset based on task type and dataset name
        self.dataset = self.load_dataset()

    def get_train_transform(self):
        """Define training transformations."""
        train_transform = [
            transforms.Resize((self.img_size, self.img_size)),
            transforms.RandomCrop(self.img_size, padding=4) if self.augmentation_config.get('random_crop', False) else None,
            transforms.RandomHorizontalFlip() if self.augmentation_config.get('horizontal_flip', False) else None,
            transforms.ToTensor(),
            transforms.Normalize(mean=self.normalize_mean, std=self.normalize_std)
        ]
        return transforms.Compose([t for t in train_transform if t])

    def get_test_transform(self):
        """Define test/validation transformations."""
        return transforms.Compose([
            transforms.Resize((self.img_size, self.img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=self.normalize_mean, std=self.normalize_std)
        ])

    def load_dataset(self):
        """Load dataset based on task type and dataset name."""
        if self.task_type == 'classification' and self.dataset_name.lower() == 'cifar100':
            return datasets.CIFAR100(root=self.dataset_path, train=(self.mode == 'train'), 
                                     download=True, transform=self.transform)
        else:
            raise ValueError(f"Unsupported dataset or task type: {self.dataset_name}, {self.task_type}")

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, idx):
        return self.dataset[idx]

# Example usage for dataset loader
if __name__ == "__main__":
    dataset_loader = CustomDatasetLoader(meta_path='./meta.json', config_path='./config.yaml')
    print("Dataset loaded:", dataset_loader.dataset_name)
    print("Dataset length:", len(dataset_loader))
