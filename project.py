import os
import shutil

from flask import Blueprint, render_template, send_from_directory, jsonify, request, session
from auth import session_required
import re

project = Blueprint('project', __name__)


@project.route('/create', methods=['post'])
@session_required
def create():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        project_name = request.json['project_name']
        pattern = r"^[A-Za-z0-9_-]+$"
        pattern = re.compile(pattern)
        is_match = pattern.match(project_name)
        if is_match is None:
            msg['err'] = 'project name should be alphanumeric, underscore, or hyphen. ex) "my-project"'
            return jsonify(msg)

        # create project directory
        shutil.copytree('./edgeai/blank_project', f'./edgeai/users/{session["user"]}/{project_name}')

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@project.route('/delete', methods=['post'])
@session_required
def delete():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        project_name = request.json['project_name']
        shutil.rmtree(f'./edgeai/users/{session["user"]}/{project_name}')

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@project.route('/list', methods=['post'])
@session_required
def list():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        projects = sorted(os.listdir(f'./edgeai/users/{session["user"]}'))
        msg['res']['projects'] = projects

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@project.route('/current_project', methods=['post'])
@session_required
def current_project():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        project = request.json['project']
        session['project'] = project

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


