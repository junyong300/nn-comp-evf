import os
import json
import shutil
from flask import Blueprint, jsonify, request, session, render_template
from auth import session_required

models = Blueprint('models', __name__, url_prefix='/models')

@models.route('/')
@session_required
def root():
    return render_template('models.html')

# Load default model template files
@models.route('/load_template', methods=['GET'])
@session_required
def load_template():
    try:
        template_path = './edgeai/template/project/models/'
        
        # Read each template file
        with open(f'{template_path}/src/config.yaml') as f:
            config = f.read()
        with open(f'{template_path}/src/model.py') as f:
            model_code = f.read()
        
        # Return templates as JSON
        return jsonify({
            "config": config,
            "model": model_code
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@models.route('/save', methods=['POST'])
@session_required
def save_model():
    try:
        data = request.json
        model_name = data["meta"]["model_name"]
        project_name = data.get("project_name")
        
        if not project_name:
            raise ValueError("Project name is missing.")

        # Define user model path
        user_path = f'./workspace/{session["user"]}/{project_name}/models/{model_name}'
        os.makedirs(user_path, exist_ok=True)

        # Save meta.json
        with open(f"{user_path}/meta.json", "w") as f:
            json.dump(data["meta"], f, indent=4)

        # Save config.yaml
        with open(f"{user_path}/config.yaml", "w") as f:
            f.write(data["config"])

        # Save model.py
        with open(f"{user_path}/model.py", "w") as f:
            f.write(data["model"])

        # Create __init__.py to make it a Python package
        init_content = f""" """
        with open(f"{user_path}/__init__.py", "w") as f:
            f.write(init_content)

        # Update project.json
        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)
        else:
            project_data = {
                "datasets": [], 
                "models": [], 
                "runs": [], 
                "optimizations": []
            }

        existing_models = project_data.get("models", [])
        model_meta = data["meta"].copy()
        model_meta["model_save_path"] = user_path

        # Check if model exists - if yes, update it
        model_exists = False
        for i, existing_model in enumerate(existing_models):
            if existing_model["model_name"] == model_name:
                existing_models[i] = model_meta
                model_exists = True
                break

        # If model doesn't exist, append it
        if not model_exists:
            existing_models.append(model_meta)

        project_data["models"] = existing_models

        # Save updated project.json
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)

        return jsonify({
            "error": None, 
            "message": f"Model '{model_name}' {'updated' if model_exists else 'created'} successfully"
        })

    except Exception as e:
        print(f"Error saving model: {str(e)}")  # Server-side logging
        return jsonify({"error": f"Failed to save model: {str(e)}"})

@models.route('/reorder', methods=['POST'])
@session_required
def reorder_models():
    try:
        project_name = request.json.get('project_name')
        new_order = request.json.get('order')
        
        if not project_name or not new_order:
            return jsonify({'error': 'Missing required parameters'})

        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        
        with open(project_json_path, 'r') as f:
            project_data = json.load(f)
        
        # Create a map of model names to their full data
        model_map = {m['model_name']: m for m in project_data['models']}
        
        # Reorder models according to new_order
        project_data['models'] = [model_map[name] for name in new_order]
        
        with open(project_json_path, 'w') as f:
            json.dump(project_data, f, indent=4)
        
        return jsonify({'error': None, 'message': 'Order updated successfully'})
    
    except Exception as e:
        return jsonify({'error': f'Failed to update order: {str(e)}'})

# List all models for the current user
@models.route('/list', methods=['POST'])
@session_required
def list_models():
    try:
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        
        # Load model information from project.json
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)
                models = project_data.get("models", [])
        else:
            models = []

        # Return the model metadata
        return jsonify({"models": models})
    except Exception as e:
        return jsonify({"error": str(e)})

# Delete a specific model
@models.route('/delete', methods=['POST'])
@session_required
def delete_model():
    try:
        model_name = request.json['name']
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = f'./workspace/{session["user"]}/{project_name}/models/{model_name}'
        
        # Remove the model directory
        if os.path.exists(user_path):
            shutil.rmtree(user_path)

        # Update project.json
        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)

            project_data["models"] = [m for m in project_data.get("models", []) if m["model_name"] != model_name]

            with open(project_json_path, 'w') as f:
                json.dump(project_data, f, indent=4)
        
        return jsonify({"message": f"Model '{model_name}' deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})

# Delete all models for a specific project
@models.route('/delete_all', methods=['POST'])
@session_required
def delete_all_models():
    try:
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = f'./workspace/{session["user"]}/{project_name}/models'
        
        # Remove all model directories for the project
        if os.path.exists(user_path):
            shutil.rmtree(user_path)

        # Update project.json
        project_json_path = f'./workspace/{session["user"]}/{project_name}/project.json'
        if os.path.exists(project_json_path):
            with open(project_json_path, 'r') as f:
                project_data = json.load(f)

            project_data["models"] = []

            with open(project_json_path, 'w') as f:
                json.dump(project_data, f, indent=4)
        
        return jsonify({"message": f"All models for project '{project_name}' deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})
