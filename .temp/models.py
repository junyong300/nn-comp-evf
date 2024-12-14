import json
import os
import shutil
from flask import Blueprint, jsonify, request, session, render_template
from auth import session_required

models = Blueprint('models', __name__)

@models.route('/')
@session_required
def root():
    return render_template('models.html')

# Load default model template files
@models.route('/load_template', methods=['GET'])
@session_required
def load_template():
    try:
        template_path = './edgeai/template/project/models/src'
        model_name = request.args.get('model_name')
        project_name = request.args.get('project_name')
        
        # Read each template file
        with open(f'{template_path}/config.yaml') as f:
            config = f.read()
        with open(f'{template_path}/meta.json') as f:
            meta = json.load(f)
        with open(f'{template_path}/model.py') as f:
            model_code = f.read()
        with open(f'{template_path}/callbacks.py') as f:
            callbacks_code = f.read()
        
        # Return templates as JSON
        return jsonify({
            "config": config,
            "meta": meta,
            "model": model_code,
            "callbacks": callbacks_code
        })
    except Exception as e:
        return jsonify({"error": str(e)})

# Save a new model configuration and code to the user's workspace
@models.route('/save', methods=['POST'])
@session_required
def save_model():
    try:
        data = request.json
        model_data = data['modelData']
        project_name = data['project_name']
        username = session['user']
        model_name = model_data['meta']['model_name']
        
        if not project_name:
            raise ValueError("Project name is missing.")

        # Define user model path
        base_path = f'./workspace/{username}/{project_name}/models/{model_name}'
        os.makedirs(base_path, exist_ok=True)

        # Save meta.json
        with open(f"{base_path}/meta.json", "w") as f:
            json.dump(model_data['meta'], f, indent=4)

        # Save config.yaml
        with open(f"{base_path}/config.yaml", "w") as f:
            f.write(model_data['config'])

        # Save model.py
        with open(f"{base_path}/model.py", "w") as f:
            f.write(model_data['model'])

        # Save callbacks.py
        with open(f"{base_path}/callbacks.py", "w") as f:
            f.write(model_data['callbacks'])

        # Save each additional module as a separate .py file
        for module_name, module_content in model_data['modules'].items():
            module_path = os.path.join(base_path, f"{module_name}.py")
            with open(module_path, 'w') as f:
                f.write(module_content)

        return jsonify({"message": "Model saved successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})

# List all models for the current user
@models.route('/list', methods=['POST'])
@session_required
def list_models():
    try:
        project_name = request.json.get("project_name")
        if not project_name:
            raise ValueError("Project name is missing.")

        user_path = f'./workspace/{session["user"]}/{project_name}/models'
        
        # Ensure the models directory exists
        if not os.path.exists(user_path):
            os.makedirs(user_path)

        # Retrieve model directories and load their meta information
        models = []
        for model_name in sorted(os.listdir(user_path)):
            meta_path = os.path.join(user_path, model_name, "meta.json")
            if os.path.isfile(meta_path):
                with open(meta_path) as f:
                    meta = json.load(f)
                    models.append(meta)

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
        shutil.rmtree(user_path)
        
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
        
        return jsonify({"message": f"All models for project '{project_name}' deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})
