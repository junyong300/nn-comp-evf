import os
import sys
import json
import shutil
import time
import contextlib
import torch
from torch.nn.parallel import DistributedDataParallel
import torch.distributed as dist

from engine_utils import check_dir
from training_engine import TrainingEngine
from model_optimizer import ModelOptimizer
from model_profiler import ModelProfiler

class RunningContext(object):
    def __init__(self, root_path, user_path, project_name, mode, identifier):
        self.root_path = root_path
        self.user_path = user_path 
        self.project_name = project_name
        self.project_dir = os.path.join(user_path, project_name)
        self.mode = mode
        self.identifier = identifier
        self.job_dir = os.path.join(self.project_dir, "jobs", self.identifier)

        # Load configs
        with open(os.path.join(self.job_dir, "meta.json"), "r") as f:
            self.meta = json.load(f)

        with open(os.path.join(self.job_dir, "config.yaml"), 'r') as f:
            self.config = yaml.safe_load(f)

    def train(self):
        """Handle model training"""
        # Initialize training engine
        engine = TrainingEngine(self.config, self.job_dir)
        
        # Load model and datasets
        model = self._load_model()
        train_dataset, val_dataset = self._load_datasets()
        
        # Run training
        engine.train(model, train_dataset, val_dataset)
        
        # Save trained model
        new_dir = check_dir(self.user_path, self.project_name, 
                           self.meta["model_name"], self.mode, self.meta["tag"])
        if new_dir is None:
            raise ValueError("Duplicate model name and tag")
            
        shutil.copy(
            os.path.join(self.job_dir, "best.pth"),
            os.path.join(new_dir, "model.pth")
        )

    def optimize(self):
        """Handle model optimization"""
        optimizer = ModelOptimizer(self.config, self.job_dir)
        
        # Load model and calibration data
        model = self._load_model()
        calibration_data = self._load_calibration_data()
        
        # Run optimization
        optimized_model = optimizer.optimize_model(model, calibration_data)
        
        # Save optimized model
        new_dir = check_dir(self.user_path, self.project_name,
                           self.meta["model_name"], self.mode, 
                           self.meta["tag"], self.meta["method"])
        if new_dir is None:
            raise ValueError("Duplicate model name and tag")
            
        torch.save(optimized_model.state_dict(),
                  os.path.join(new_dir, "model.pth"))

    def profile(self):
        """Handle model profiling"""
        profiler = ModelProfiler(self.job_dir)
        
        # Load model and sample input
        model = self._load_model() 
        sample_input = self._get_sample_input()
        
        # Run profiling
        results = profiler.profile_model(model, sample_input)
        
        # Update model metadata with profiling results
        model_dir = os.path.join(self.project_dir, "models", self.meta["model_name"])
        with open(os.path.join(model_dir, "meta.json"), "r") as f:
            meta = json.load(f)
            
        meta.update({
            "inference_time": results["avg_inference_time"],
            "parameters": results["parameters"],
            "flops": results["flops"]
        })
        
        with open(os.path.join(model_dir, "meta.json"), "w") as f:
            json.dump(meta, f, indent=4)

    def _load_model(self):
        """Load PyTorch model"""
        model_path = os.path.join(self.project_dir, "models", 
                                 self.meta["model_name"], "model.pth")
        
        # Import model definition
        sys.path.append(os.path.dirname(model_path))
        from model import get_model_instance
        
        # Create model instance and load weights if they exist
        model = get_model_instance(self.config)
        if os.path.exists(model_path):
            model.load_state_dict(torch.load(model_path))
            
        return model

    def execute(self):
        """Execute requested operation"""
        if self.mode == "train":
            self.train()
        elif self.mode == "optimize":
            self.optimize()
        elif self.mode == "profile":
            self.profile()
        else:
            raise ValueError(f"Unsupported mode: {self.mode}")