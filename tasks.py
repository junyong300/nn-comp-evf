import json
import os
import shutil

from flask import Blueprint, render_template, send_from_directory, jsonify, request, session
from auth import login_required, session_required

tasks = Blueprint('tasks', __name__)


@tasks.route('/')
@login_required
def root():
    return render_template('tasks.html')


def get_content(path):
    with open(path, 'r') as f:
        content = f.read()
    return content


@tasks.route('/get_codes', methods=['post'])
@session_required
def get_codes():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        if request.json['source'] == "template":
            path = "./edgeai/template/project/tasks/task"
            meta = {}
        else:
            path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/tasks/{request.json['task_name']}"
            with open(os.path.join(path, "meta.json"), "r") as f:
                meta = json.load(f)

        msg['res'] = {
            'codes':{
                'config': get_content(path + '/config.yaml'),
                'augmentation': get_content(path + '/src/augmentation.py'),
                'preprocessing': get_content(path + '/src/preprocess.py'),
                'metric': get_content(path + '/src/metric.py'),
                'loss': get_content(path + '/src/loss.py'),
                'optimizer': get_content(path + '/src/optimizer.py'),
                'callbacks': get_content(path + '/src/callbacks.py'),
                'libs': sorted(os.listdir('./edgeai/template/project/libs'))
            },
            'meta':meta
        }

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@tasks.route('/edit', methods=['post'])
@session_required
def edit():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        print("edit task")
        # body = {
        # 'project_name': $.cookie("project"),
        # 'task_name': task_name,
        # 'training_count': training_count,
        # 'validation_count': validation_count,
        # 'config': ace.edit("editor1").getValue(),
        # 'augmentation': ace.edit("editor2").getValue(),
        # 'preprocessing': ace.edit("editor3").getValue(),
        # 'metric': ace.edit("editor4").getValue(),
        # 'loss': ace.edit("editor5").getValue(),
        # 'optimizer': ace.edit("editor6").getValue(),
        # 'libs': []
        # }

        # get task name
        # check if task name is duplicated
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/tasks/{request.json['task_name']}"
        if not os.path.exists(path):
            msg['err'] = 'task name does not exist'
            return jsonify(msg)

        # create config.yaml
        with open(path + '/config.yaml', 'w') as f:
            f.write(request.json['config'])

        # create meta.json
        meta = {
            "training_records": request.json['training_count'],
            "validation_records": request.json['validation_count'],
            "lib": request.json['libs']
        }
        with open(path + '/meta.json', 'w') as f:
            f.write(json.dumps(meta, indent=4))

        # create augmentation.py
        with open(path + '/src/augmentation.py', 'w') as f:
            f.write(request.json['augmentation'])

        # create preprocess.py
        with open(path + '/src/preprocess.py', 'w') as f:
            f.write(request.json['preprocessing'])

        # create metric.py
        with open(path + '/src/metric.py', 'w') as f:
            f.write(request.json['metric'])

        # create loss.py
        with open(path + '/src/loss.py', 'w') as f:
            f.write(request.json['loss'])

        # create optimizer.py
        with open(path + '/src/optimizer.py', 'w') as f:
            f.write(request.json['optimizer'])

        # create callbacks.py
        with open(path + '/src/callbacks.py', 'w') as f:
            f.write(request.json['callbacks'])


    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)



@tasks.route('/create', methods=['post'])
@session_required
def create():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        print("create task")
        # body = {
        # 'project_name': $.cookie("project"),
        # 'task_name': task_name,
        # 'training_count': training_count,
        # 'validation_count': validation_count,
        # 'config': ace.edit("editor1").getValue(),
        # 'augmentation': ace.edit("editor2").getValue(),
        # 'preprocessing': ace.edit("editor3").getValue(),
        # 'metric': ace.edit("editor4").getValue(),
        # 'loss': ace.edit("editor5").getValue(),
        # 'optimizer': ace.edit("editor6").getValue(),
        # 'libs': []
        # }

        # get task name
        # check if task name is duplicated
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/tasks/{request.json['task_name']}"
        if os.path.exists(path):
            msg['err'] = 'task name is duplicated'
            return jsonify(msg)

        # create task, src directory
        os.makedirs(path + '/src')

        # create config.yaml
        with open(path + '/config.yaml', 'w') as f:
            f.write(request.json['config'])

        # create meta.json
        meta = {
            "training_records": request.json['training_count'],
            "validation_records": request.json['validation_count'],
            "lib": request.json['libs']
        }
        with open(path + '/meta.json', 'w') as f:
            f.write(json.dumps(meta, indent=4))

        # create augmentation.py
        with open(path + '/src/augmentation.py', 'w') as f:
            f.write(request.json['augmentation'])

        # create preprocess.py
        with open(path + '/src/preprocess.py', 'w') as f:
            f.write(request.json['preprocessing'])

        # create metric.py
        with open(path + '/src/metric.py', 'w') as f:
            f.write(request.json['metric'])

        # create loss.py
        with open(path + '/src/loss.py', 'w') as f:
            f.write(request.json['loss'])

        # create optimizer.py
        with open(path + '/src/optimizer.py', 'w') as f:
            f.write(request.json['optimizer'])

        # create callbacks.py
        with open(path + '/src/callbacks.py', 'w') as f:
            f.write(request.json['callbacks'])


    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@tasks.route('/delete', methods=['post'])
@session_required
def delete():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/tasks/{request.json['task_name']}"
        shutil.rmtree(path)
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@tasks.route('/copy', methods=['post'])
@session_required
def copy():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        # project_name
        # task_name
        # copy_task_name
        src_path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/tasks/{request.json['task_name']}"
        dst_path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/tasks/{request.json['copy_task_name']}"

        if os.path.exists(dst_path):
            msg['err'] = 'task name is duplicated'
            return jsonify(msg)

        shutil.copytree(src_path, dst_path)
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@tasks.route('/list', methods=['post'])
@session_required
def list():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/tasks"
        task_names = sorted(os.listdir(path))

        # name, training_count, validation_count
        tasks = {}
        for task_name in task_names:
            with open(f"{path}/{task_name}/meta.json", 'r') as f:
                meta = json.loads(f.read())
            tasks[task_name] = {
                'training_count': meta['training_records'],
                'validation_count': meta['validation_records'],
            }

        msg['res']['tasks'] = tasks

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)
