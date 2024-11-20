import os
import shutil
import re
from flask import Blueprint, render_template, send_from_directory, jsonify, request, session
from auth import session_required

project = Blueprint('project', __name__)

# Regex pattern for valid project names (alphanumeric, underscore, or hyphen)
VALID_PROJECT_NAME_PATTERN = r"^[A-Za-z0-9_-]+$"


@project.route('/create', methods=['POST'])
@session_required
def create_project():
    msg = {'err': None, 'res': {}}

    try:
        project_name = request.json.get('project_name', '')
        if not re.match(VALID_PROJECT_NAME_PATTERN, project_name):
            msg['err'] = 'Project name should be alphanumeric, underscore, or hyphen. Example: "my-project"'
            return jsonify(msg)

        # Define the project directory based on session user and project name
        user_workspace = f'./workspace/{session["user"]}'
        project_directory = os.path.join(user_workspace, project_name)

        # Check if project already exists
        if os.path.exists(project_directory):
            msg['err'] = 'Project with this name already exists.'
            return jsonify(msg)

        # Copy the blank project template
        shutil.copytree('./edgeai/template/blank_project/', project_directory)
        msg['res'] = f'Project "{project_name}" created successfully.'

    except Exception as e:
        msg['err'] = f'Failed to create project: {str(e)}'

    return jsonify(msg)


@project.route('/delete', methods=['POST'])
@session_required
def delete_project():
    msg = {'err': None, 'res': {}}

    try:
        project_name = request.json.get('project_name', '')
        project_directory = f'./workspace/{session["user"]}/{project_name}'

        # Check if project directory exists
        if not os.path.exists(project_directory):
            msg['err'] = 'Project does not exist.'
            return jsonify(msg)

        # Remove the project directory
        shutil.rmtree(project_directory)
        msg['res'] = f'Project "{project_name}" deleted successfully.'

    except Exception as e:
        msg['err'] = f'Failed to delete project: {str(e)}'

    return jsonify(msg)


@project.route('/list', methods=['POST'])
@session_required
def list_projects():
    msg = {'err': None, 'res': {}}

    try:
        user_workspace = f'./workspace/{session["user"]}'
        if os.path.exists(user_workspace):
            projects = sorted(os.listdir(user_workspace))
        else:
            projects = []
        msg['res']['projects'] = projects

    except Exception as e:
        msg['err'] = f'Failed to list projects: {str(e)}'

    return jsonify(msg)


@project.route('/current_project', methods=['POST'])
@session_required
def set_current_project():
    msg = {'err': None, 'res': {}}

    try:
        project = request.json.get('project', '')
        if project:
            session['project'] = project
            msg['res'] = f'Current project set to "{project}".'
        else:
            msg['err'] = 'No project specified.'

    except Exception as e:
        msg['err'] = f'Failed to set current project: {str(e)}'

    return jsonify(msg)
