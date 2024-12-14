import os
import json
import shutil
from flask import Blueprint, jsonify, request, session, render_template
from auth import session_required

dataset = Blueprint('datasets', __name__, url_prefix='/datasets')

@dataset.route('/')
@session_required
def root():
    return render_template('datasets.html')

# Load default dataset template files
@dataset.route('/load_template', methods=['GET'])
@session_required
def load_template():
    try:
        template_path = './edgeai/template/project/datasets'
        
        # Read each template file
        with open(f'{template_path}/config.yaml') as f:
            config = f.read()
        with open(f'{template_path}/meta.json') as f:
            meta = json.load(f)
        with open(f'{template_path}/src/datasets.py') as f:
            dataset_code = f.read()
        with open(f'{template_path}/src/collate_fn.py') as f:
            collate_fn_code = f.read()
        
        # Return templates as JSON
        return jsonify({
            "config": config,
            "meta": meta,
            "dataset": dataset_code,
            "collate_fn": collate_fn_code
        })
    except Exception as e:
        return jsonify({"error": str(e)})

# Save a new dataset configuration and code to the user's workspace
@dataset.route('/save', methods=['POST'])
@session_required
def save_dataset():
    try:
        data = request.json
        dataset_name = data["meta"]["dataset_name"]
        project_name = data.get("project_name")
        
        if not project_name:
            raise ValueError("Project name is missing.")

        # Define user dataset path
        user_path = f'./workspace/{session["user"]}/{project_name}/datasets/{dataset_name}'
        os.makedirs(user_path, exist_ok=True)

        # Save meta.json
        with open(f"{user_path}/meta.json", "w") as f:
            json.dump(data["meta"], f, indent=4)

        # Save config.yaml
        with open(f"{user_path}/config.yaml", "w") as f:
            f.write(data["config"])

        # Save datasets.py
        with open(f"{user_path}/datasets.py", "w") as f:
            f.write(data["dataset"])

        # Save collate_fn.py
        with open(f"{user_path}/collate_fn.py", "w") as f:
            f.write(data["collate_fn"])

        return jsonify({"message": "Dataset saved successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})

# List all datasets for the current user
@dataset.route('/list', methods=['POST'])
@session_required
def list_datasets():
    try:
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = f'./workspace/{session["user"]}/{project_name}/datasets'
        
        # Ensure the datasets directory exists
        if not os.path.exists(user_path):
            os.makedirs(user_path)

        # Retrieve dataset directories and load their meta information
        datasets = []
        for dataset_name in sorted(os.listdir(user_path)):
            meta_path = os.path.join(user_path, dataset_name, "meta.json")
            if os.path.isfile(meta_path):
                with open(meta_path) as f:
                    meta = json.load(f)
                    datasets.append(meta)

        # Return the dataset metadata
        return jsonify({"datasets": datasets})
    except Exception as e:
        return jsonify({"error": str(e)})

# Delete a specific dataset
@dataset.route('/delete', methods=['POST'])
@session_required
def delete_dataset():
    try:
        dataset_name = request.json['name']
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = f'./workspace/{session["user"]}/{project_name}/datasets/{dataset_name}'
        
        # Remove the dataset directory
        shutil.rmtree(user_path)
        
        return jsonify({"message": f"Dataset '{dataset_name}' deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})

# Delete all datasets for a specific project
@dataset.route('/delete_all', methods=['POST'])
@session_required
def delete_all_datasets():
    try:
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = f'./workspace/{session["user"]}/{project_name}/datasets'
        
        # Remove all dataset directories for the project
        if os.path.exists(user_path):
            shutil.rmtree(user_path)
        
        return jsonify({"message": f"All datasets for project '{project_name}' deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})
