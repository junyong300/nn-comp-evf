#expreiments.py
import json
import os
import shutil
from datetime import datetime
from flask import Blueprint, render_template, jsonify, request, session
from auth import login_required, session_required
import subprocess
import yaml

experiments = Blueprint('experiments', __name__)

def ensure_path_exists(path):
    """Helper function to ensure the directory path exists."""
    if not os.path.exists(path):
        os.makedirs(path)

def get_content(path):
    """Helper function to read file content."""
    with open(path, 'r') as f:
        return f.read()

@experiments.route('/')
@login_required
def root():
    """Render the experiments page"""
    return render_template('experiments.html')

@experiments.route('/get_codes', methods=['POST'])
@session_required
def get_codes():
    """Get experiment template or existing experiment codes"""
    msg = {
        'err': None,
        'res': {}
    }

    try:
        source = request.json.get('source')
        project_name = request.json.get('project_name')
        experiment_name = request.json.get('experiment_name')

        if source == "template":
            path = "./edgeai/template/project/experiments/"
            meta = {}
        else:
            if not project_name or not experiment_name:
                msg['err'] = "Project name and experiment name are required."
                return jsonify(msg), 400

            path = f"./workspace/{session['user']}/{project_name}/experiments/{experiment_name}"
            ensure_path_exists(path)
            meta_path = os.path.join(path, "meta.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r") as f:
                    meta = json.load(f)
            else:
                meta = {}

        msg['res'] = {
            'codes': {
                'config': get_content(os.path.join(path, 'config.yaml')),
                'augmentation': get_content(os.path.join(path, 'src/augmentation.py')),
                'preprocessing': get_content(os.path.join(path, 'src/preprocess.py')),
                'metric': get_content(os.path.join(path, 'src/metric.py')),
                'loss': get_content(os.path.join(path, 'src/loss.py')),
                'optimizer': get_content(os.path.join(path, 'src/optimizer.py')),
                'callbacks': get_content(os.path.join(path, 'src/callbacks.py')),
                'libs': sorted(os.listdir('./edgeai/template/project/libs'))
            },
            'meta': meta
        }

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)

@experiments.route('/runs/list', methods=['POST'])
@session_required
def list_runs():
    """List all runs for the current project"""
    try:
        project_name = request.json.get('project_name')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400

        # Construct path to runs directory
        runs_path = os.path.join('workspace', session['user'], project_name, 'experiments')

        # Check if runs_path exists
        if not os.path.exists(runs_path):
            # Return an empty list of runs if the directory doesn't exist
            return jsonify({"runs": []})

        # Get list of runs
        runs = []
        for run_id in os.listdir(runs_path):
            run_dir = os.path.join(runs_path, run_id)
            if os.path.isdir(run_dir):
                try:
                    # Read run metadata
                    meta_path = os.path.join(run_dir, 'meta.json')
                    if os.path.exists(meta_path):
                        with open(meta_path, 'r') as f:
                            meta = json.load(f)
                    else:
                        meta = {}

                    # Read run status
                    status_path = os.path.join(run_dir, 'status.json')
                    if os.path.exists(status_path):
                        with open(status_path, 'r') as f:
                            status = json.load(f)
                    else:
                        status = {"current_status": "Unknown", "progress": 0}

                    runs.append({
                        "id": run_id,
                        "name": meta.get('name', 'Unnamed Run'),
                        "type": meta.get('type', 'Unknown'),
                        "model": meta.get('model_id', 'Not specified'),
                        "dataset": meta.get('dataset_id', 'Not specified'),
                        "status": status.get('current_status', 'Unknown'),
                        "progress": status.get('progress', 0),
                        "created_at": meta.get('created_at', datetime.now().isoformat())
                    })
                except Exception as e:
                    print(f"Error loading run {run_id}: {str(e)}")
                    continue

        # Sort runs by creation date (newest first)
        runs.sort(key=lambda x: x['created_at'], reverse=True)
        return jsonify({"runs": runs})

    except Exception as e:
        print(f"Error in list_runs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@experiments.route('/runs/create', methods=['POST'])
@session_required
def create_run():
    try:
        data = request.json
        project_name = data.get('project_name')
        run_id = data.get('run_id')
        config = data.get('config')

        if not all([project_name, run_id, config]):
            return jsonify({"error": "Missing required parameters"}), 400

        # Create the run directory structure
        run_dir = os.path.join(
            'workspace',
            session['user'],
            project_name,
            'experiments',
            run_id
        )
        os.makedirs(run_dir, exist_ok=True)

        # Save main files
        with open(os.path.join(run_dir, 'runs.py'), 'w') as f:
            f.write(config['files']['runs.py'])
            
        with open(os.path.join(run_dir, 'config.yaml'), 'w') as f:
            f.write(config['files']['config.yaml'])
            
        with open(os.path.join(run_dir, 'meta.json'), 'w') as f:
            json.dump(config['meta'], f, indent=2)

        # Save additional modules
        if config['files'].get('modules'):
            for module_name, module_content in config['files']['modules'].items():
                module_path = os.path.join(run_dir, f"{module_name}.py")
                with open(module_path, 'w') as f:
                    f.write(module_content)

        return jsonify({
            "message": "Run created successfully",
            "run_id": run_id
        })

    except Exception as e:
        print(f"Error creating run: {str(e)}")
        return jsonify({"error": str(e)}), 500

def generate_runs_py(run_dir, config):
    print("Config received in generate_runs_py:", config)
    print("config keys:", config.keys())
    print("config['model']:", config.get('model'))
    print("config['dataset']:", config.get('dataset'))
    try:
        model_module_name = config['model']['module']
        dataset_module_name = config['dataset']['module']
    except KeyError as e:
        error_message = f"Missing key in config: {e}"
        print("Error in generate_runs_py:", error_message)
        raise KeyError(error_message)

    runs_py_content = f"""
        import sys
        import os
        import json
        import yaml

        # Add necessary paths to sys.path
        sys.path.append(os.path.join(os.getcwd(), 'datasets', 'src'))
        sys.path.append(os.path.join(os.getcwd(), 'models', 'src'))
        sys.path.append(os.path.join(os.getcwd(), 'libs'))

        from trainer import Trainer
        import {model_module_name} as model_module
        import {dataset_module_name} as dataset_module

        def main():
            # Load configurations
            with open('config.yaml', 'r') as f:
                config = yaml.safe_load(f)

            # Initialize model and dataset
            model = model_module.Model()
            dataset = dataset_module.Dataset()

            # Initialize Trainer
            trainer = Trainer(
                model=model,
                dataset=dataset,
                config=config
            )

            # Start training
            trainer.train()

        if __name__ == '__main__':
            main()
        """
    with open(os.path.join(run_dir, 'runs.py'), 'w') as f:
        f.write(runs_py_content)

def generate_requirements_txt(run_dir, libs):
    requirements = '\n'.join(libs)
    with open(os.path.join(run_dir, 'requirements.txt'), 'w') as f:
        f.write(requirements)


@experiments.route('/load_template', methods=['POST'])
@session_required
def load_template():
    """Load experiment template files"""
    try:
        template_path = './edgeai/template/project/experiments'
        
        # Read template files
        with open(os.path.join(template_path, 'runs.py'), 'r') as f:
            runs_py = f.read()
            
        with open(os.path.join(template_path, 'config.yaml'), 'r') as f:
            config_yaml = f.read()
            
        return jsonify({
            'runs_py': runs_py,
            'config_yaml': config_yaml
        })
        
    except Exception as e:
        print(f"Error loading templates: {str(e)}")
        return jsonify({'err': str(e)}), 500

@experiments.route('/runs/stop', methods=['POST'])
@session_required
def stop_run():
    """Stop a running experiment"""
    try:
        project_name = request.json.get('project_name')
        run_id = request.json.get('run_id')

        if not project_name or not run_id:
            return jsonify({"error": "Missing required parameters"}), 400

        status_path = os.path.join(
            'workspace',
            session['user'],
            project_name,
            'runs',
            run_id,
            'status.json'
        )

        if os.path.exists(status_path):
            with open(status_path, 'r') as f:
                status = json.load(f)

            status['current_status'] = 'stopped'
            status['end_time'] = datetime.now().isoformat()

            with open(status_path, 'w') as f:
                json.dump(status, f, indent=2)

            return jsonify({"message": "Run stopped successfully"})
        else:
            return jsonify({"error": "Run not found"}), 404

    except Exception as e:
        print(f"Error in stop_run: {str(e)}")
        return jsonify({"error": str(e)}), 500

@experiments.route('/runs/get', methods=['POST'])
@session_required
def get_run():
    try:
        data = request.json
        project_name = data.get('project_name')
        run_id = data.get('run_id')

        if not all([project_name, run_id]):
            return jsonify({"error": "Missing required parameters"}), 400

        # Construct path to run directory
        run_dir = os.path.join(
            'workspace',
            session['user'],
            project_name,
            'experiments',
            run_id
        )

        if not os.path.exists(run_dir):
            return jsonify({"error": "Run not found"}), 404

        # Read all files
        with open(os.path.join(run_dir, 'meta.json'), 'r') as f:
            meta = json.load(f)
        
        with open(os.path.join(run_dir, 'runs.py'), 'r') as f:
            runs_py = f.read()
            
        with open(os.path.join(run_dir, 'config.yaml'), 'r') as f:
            config_yaml = f.read()

        # Get additional modules
        modules = {}
        for file in os.listdir(run_dir):
            if file.endswith('.py') and file != 'runs.py':
                with open(os.path.join(run_dir, file), 'r') as f:
                    modules[file[:-3]] = f.read()  # Remove .py extension

        return jsonify({
            "name": meta.get('name'),
            "type": meta.get('type'),
            "description": meta.get('description'),
            "model_id": meta.get('model_id'),
            "dataset_id": meta.get('dataset_id'),
            "files": {
                "runs.py": runs_py,
                "config.yaml": config_yaml,
                "modules": modules
            }
        })

    except Exception as e:
        print(f"Error getting run: {str(e)}")
        return jsonify({"error": str(e)}), 500


@experiments.route('/runs/delete', methods=['POST'])
@session_required
def delete_run():
    try:
        data = request.json
        project_name = data.get('project_name')
        run_id = data.get('run_id')

        if not all([project_name, run_id]):
            return jsonify({"error": "Missing required parameters"}), 400

        # Construct path to run directory
        run_dir = os.path.join(
            'workspace',
            session['user'],
            project_name,
            'experiments',
            run_id
        )

        if not os.path.exists(run_dir):
            return jsonify({"error": "Run not found"}), 404

        # Delete the run directory and all its contents
        shutil.rmtree(run_dir)

        return jsonify({"message": "Run deleted successfully"})

    except Exception as e:
        print(f"Error deleting run: {str(e)}")
        return jsonify({"error": str(e)}), 500


@experiments.route('/runs/update', methods=['POST'])
@session_required
def update_run():
    """Update run configuration"""
    try:
        project_name = request.json.get('project_name')
        run_id = request.json.get('run_id')
        update_data = request.json.get('update_data')

        if not all([project_name, run_id, update_data]):
            return jsonify({"error": "Missing required parameters"}), 400

        run_dir = os.path.join(
            'workspace',
            session['user'],
            project_name,
            'experiments',
            run_id
        )

        if not os.path.exists(run_dir):
            return jsonify({"error": "Run not found"}), 404

        # Update meta.json
        meta_path = os.path.join(run_dir, 'meta.json')
        with open(meta_path, 'r') as f:
            meta = json.load(f)

        meta.update({
            "name": update_data.get('name', 'Untitled'),
            "type": update_data.get('type'),
            "description": update_data.get('description'),
            "model_id": update_data['config']['model']['module'],
            "dataset_id": update_data['config']['dataset']['module'],
            "updated_at": datetime.now().isoformat()
        })

        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)

        # Update config.yaml
        config_path = os.path.join(run_dir, 'config.yaml')
        with open(config_path, 'w') as f:
            yaml.dump(update_data['config'], f, default_flow_style=False)

        return jsonify({"message": "Run updated successfully"})

    except Exception as e:
        print(f"Error in update_run: {str(e)}")
        return jsonify({"error": str(e)}), 500

@experiments.route('/list', methods=['POST'])
@session_required
def list_experiments():
    """List all experiments for the current project"""
    msg = {
        'err': None,
        'res': {}
    }

    try:
        project_name = request.json.get('project_name')
        if not project_name:
            msg['err'] = "Project name is required."
            return jsonify(msg), 400

        path = f"./workspace/{session['user']}/{project_name}/experiments"
        ensure_path_exists(path)
        experiment_names = sorted(os.listdir(path))

        experiments_data = {}
        for experiment_name in experiment_names:
            meta_path = os.path.join(path, experiment_name, "meta.json")
            if os.path.exists(meta_path):
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                experiments_data[experiment_name] = {
                    'training_count': meta.get('training_records', 0),
                    'validation_count': meta.get('validation_records', 0),
                }

        msg['res']['experiments'] = experiments_data

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)

@experiments.route('/create', methods=['POST'])
@session_required
def create_experiment():
    """Create a new experiment"""
    msg = {
        'err': None,
        'res': {}
    }

    try:
        project_name = request.json.get('project_name')
        experiment_name = request.json.get('experiment_name')
        if not project_name or not experiment_name:
            msg['err'] = 'Project name and experiment name are required.'
            return jsonify(msg), 400

        path = f"./workspace/{session['user']}/{project_name}/experiments/{experiment_name}"
        if os.path.exists(path):
            msg['err'] = 'Experiment name is duplicated.'
            return jsonify(msg)

        # Create experiment and src directories
        ensure_path_exists(os.path.join(path, 'src'))

        # Write configuration files
        with open(os.path.join(path, 'config.yaml'), 'w') as f:
            f.write(request.json.get('config', ''))

        meta = {
            "training_records": request.json.get('training_count', 0),
            "validation_records": request.json.get('validation_count', 0),
            "lib": request.json.get('libs', [])
        }
        with open(os.path.join(path, 'meta.json'), 'w') as f:
            json.dump(meta, f, indent=4)

        # Write source files
        source_files = {
            'augmentation.py': request.json.get('augmentation', ''),
            'preprocess.py': request.json.get('preprocessing', ''),
            'metric.py': request.json.get('metric', ''),
            'loss.py': request.json.get('loss', ''),
            'optimizer.py': request.json.get('optimizer', ''),
            'callbacks.py': request.json.get('callbacks', '')
        }

        for filename, content in source_files.items():
            with open(os.path.join(path, 'src', filename), 'w') as f:
                f.write(content)

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)

@experiments.route('/edit', methods=['POST'])
@session_required
def edit_experiment():
    """Edit an existing experiment"""
    msg = {
        'err': None,
        'res': {}
    }

    try:
        project_name = request.json.get('project_name')
        experiment_name = request.json.get('experiment_name')
        if not project_name or not experiment_name:
            msg['err'] = 'Project name and experiment name are required.'
            return jsonify(msg), 400

        path = f"./workspace/{session['user']}/{project_name}/experiments/{experiment_name}"
        ensure_path_exists(path)
        ensure_path_exists(os.path.join(path, 'src'))

        # Update configuration files
        with open(os.path.join(path, 'config.yaml'), 'w') as f:
            f.write(request.json.get('config', ''))

        meta = {
            "training_records": request.json.get('training_count', 0),
            "validation_records": request.json.get('validation_count', 0),
            "lib": request.json.get('libs', [])
        }
        with open(os.path.join(path, 'meta.json'), 'w') as f:
            json.dump(meta, f, indent=4)

        # Update source files
        source_files = {
            'augmentation.py': request.json.get('augmentation', ''),
            'preprocess.py': request.json.get('preprocessing', ''),
            'metric.py': request.json.get('metric', ''),
            'loss.py': request.json.get('loss', ''),
            'optimizer.py': request.json.get('optimizer', ''),
            'callbacks.py': request.json.get('callbacks', '')
        }

        for filename, content in source_files.items():
            with open(os.path.join(path, 'src', filename), 'w') as f:
                f.write(content)

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)

@experiments.route('/delete', methods=['POST'])
@session_required
def delete_experiment():
    """Delete an experiment"""
    msg = {
        'err': None,
        'res': {}
    }

    try:
        project_name = request.json.get('project_name')
        experiment_name = request.json.get('experiment_name')
        if not project_name or not experiment_name:
            msg['err'] = 'Project name and experiment name are required.'
            return jsonify(msg), 400

        path = f"./workspace/{session['user']}/{project_name}/experiments/{experiment_name}"
        if os.path.exists(path):
            shutil.rmtree(path)

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)

@experiments.route('/copy', methods=['POST'])
@session_required
def copy_experiment():
    """Copy an experiment"""
    msg = {
        'err': None,
        'res': {}
    }

    try:
        project_name = request.json.get('project_name')
        experiment_name = request.json.get('experiment_name')
        copy_experiment_name = request.json.get('copy_experiment_name')

        if not project_name or not experiment_name or not copy_experiment_name:
            msg['err'] = 'Project name, source experiment name, and new experiment name are required.'
            return jsonify(msg), 400

        src_path = f"./workspace/{session['user']}/{project_name}/experiments/{experiment_name}"
        dst_path = f"./workspace/{session['user']}/{project_name}/experiments/{copy_experiment_name}"

        if os.path.exists(dst_path):
            msg['err'] = 'Experiment name is duplicated.'
            return jsonify(msg)

        shutil.copytree(src_path, dst_path)

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)

@experiments.route('/runs/start', methods=['POST'])
@session_required
def start_run():
    """Start a run (training process)"""
    try:
        project_name = request.json.get('project_name')
        run_id = request.json.get('run_id')

        if not project_name or not run_id:
            return jsonify({"error": "Missing required parameters"}), 400

        run_dir = os.path.join(
            'workspace',
            session['user'],
            project_name,
            'experiments',
            run_id
        )

        # Install requirements
        subprocess.run(['pip', 'install', '-r', os.path.join(run_dir, 'requirements.txt')])

        # Change working directory to the run directory
        os.chdir(run_dir)

        # Execute runs.py
        subprocess.Popen(['python', 'runs.py'])

        return jsonify({"message": "Run started successfully"})
    except Exception as e:
        print(f"Error in start_run: {str(e)}")
        return jsonify({"error": str(e)}), 500

