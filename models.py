import json
import os
import shutil
import subprocess
import sys
import time
import yaml
import conv_graph
from random import random

from flask import Blueprint, render_template, send_from_directory, jsonify, request, session
from auth import login_required, session_required
# from edgeai.engine.engine_utils import check_dir

import re

models = Blueprint('models', __name__)

cwd = os.path.dirname(os.path.abspath(__file__))
print('cwd', cwd)


@models.route('/')
@login_required
def root():
    return render_template('models.html')


def get_content(path):
    with open(path, 'r') as f:
        content = f.read()
    return content


@models.route('/get_codes', methods=['post'])
@session_required
def get_codes():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        # get task names
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/tasks"
        task_names = sorted(os.listdir(path))

        # get method names
        path_temp = f"./edgeai/template/methods"
        method_names = sorted(os.listdir(path_temp))

        if request.json['source'] == 'template':
            # get model source codes
            path = "./edgeai/template/project/models/model"
            meta = {}
        else:
            # get model source codes
            path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/models/{request.json['model_name']}"
            with open(os.path.join(path, "meta.json"), "r") as f:
                meta = json.load(f)

        msg['res'] = {
                'codes':{
                'task_names': task_names,
                'method_names': method_names,
                'model': get_content(path + '/src/model.py'),
                'preprocess': get_content(path + '/src/preprocess.py'),
                'callbacks': get_content(path + '/src/callbacks.py'),
                'libs': sorted(os.listdir('./edgeai/template/project/libs')),
                'config': {
                    'train': get_content("./edgeai/template/project/jobs/job_train/config.yaml"),
                    'profile': get_content("./edgeai/template/project/jobs/job_profile/config.yaml"),
                    'query': get_content("./edgeai/template/project/jobs/job_query/config.yaml"),
                    'eval': get_content("./edgeai/template/project/jobs/job_eval/config.yaml")
                },
                'methods': {},
                'targets': open('./edgeai/template/targets.txt', 'r').readlines()
                },
            'meta': meta
        }
        for method_name in method_names:
            msg['res']["codes"]['methods'][method_name] = get_content(f"./edgeai/template/methods/{method_name}/config.yaml")

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/edit', methods=['post'])
@session_required
def edit():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        print("edit model")
        # body = {
        #     'project_name': sessionStorage.getItem("project_name"),
        #     'model_name': model_name,
        #     'model_path': model_path,
        #     'task_name': task_name,
        #     'model': ace.edit("editor1").getValue(),
        #     'preprocess': ace.edit("editor2").getValue(),
        #     'callbacks': ace.edit("editor3").getValue(),
        #     'libs': []
        # }

        # check if model name is duplicated
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/models/{request.json['model_name']}"
        if not os.path.exists(path):
            msg['err'] = 'model name not exist'
            return jsonify(msg)

        with open(os.path.join(path, "meta.json"), "r") as f:
            meta_ = json.load(f)

        # create meta.json
        meta = {
            "inference_time": meta_["inference_time"], # only updated by profile
            "accuracy": meta_["accuracy"], # only updated by profile
            "num_parameters": meta_["num_parameters"], # only updated by profile
            "status": "edited",
            "model_path": request.json['model_path'],
            "task_name": request.json['task_name'],
            "lib": request.json['libs']
        }

        with open(path + '/meta.json', 'w') as f:
            f.write(json.dumps(meta, indent=4))

        # create preprocess.py
        with open(path + '/src/preprocess.py', 'w') as f:
            f.write(request.json['preprocess'])

        # create callbacks.py
        with open(path + '/src/callbacks.py', 'w') as f:
            f.write(request.json['callbacks'])

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/create', methods=['post'])
@session_required
def create():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        print("create model")
        # body = {
        #     'project_name': sessionStorage.getItem("project_name"),
        #     'model_name': model_name,
        #     'model_path': model_path,
        #     'task_name': task_name,
        #     'model': ace.edit("editor1").getValue(),
        #     'preprocess': ace.edit("editor2").getValue(),
        #     'callbacks': ace.edit("editor3").getValue(),
        #     'libs': []
        # }

        # check if model name is duplicated
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/models/{request.json['model_name']}"
        if os.path.exists(path):
            msg['err'] = 'model name is duplicated'
            return jsonify(msg)

        # create model, src directory
        os.makedirs(path + '/src')

        # create meta.json
        meta = {
            "inference_time": 0,
            "accuracy": 0,
            "num_parameters": 0,
            "status": "created",
            "model_path": request.json['model_path'],
            "task_name": request.json['task_name'],
            "lib": request.json['libs']
        }

        with open(path + '/meta.json', 'w') as f:
            f.write(json.dumps(meta, indent=4))

        # create preprocess.py
        with open(path + '/src/preprocess.py', 'w') as f:
            f.write(request.json['preprocess'])

        # create callbacks.py
        with open(path + '/src/callbacks.py', 'w') as f:
            f.write(request.json['callbacks'])

        # create model.py
        with open(path + '/src/model.py', 'w') as f:
            f.write(request.json['model'])


    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/delete', methods=['post'])
@session_required
def delete():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/models/{request.json['model_name']}"
        shutil.rmtree(path)
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/list', methods=['post'])
@session_required
def list():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/models"
        dirs = sorted(os.listdir(path))
        for dir_ in dirs:
            with open(f"{path}/{dir_}/meta.json", 'r') as f:
                msg['res'][dir_] = json.loads(f.read())

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


def run_process(data, cmd, status):

    # sanity check
    conf = data['conf']

    try:
        conf = yaml.safe_load(data['conf'])
    except yaml.YAMLError as exc:
        print(exc)
        print("yaml error")
        sys.exit(1)

    user_path = f"./edgeai/users/{session['user']}"
    project_name = data["project_name"]
    model_name = data["meta"]["model_name"]
    mode = cmd
    tag = data["meta"]["tag"] if "tag" in data["meta"] else None
    method = data["meta"]["method"] if "method" in data["meta"] else None
    overwrite = conf["overwrite"] if "overwrite" in conf else False
    # dir_ = check_dir(user_path, project_name, model_name, mode, tag, method, overwrite=overwrite)
    dir_ = None
    if dir_ is None:
        raise ValueError("duplicate dir error")    

    # 1 create job number
    ms = int(time.time() * 1000000)

    # 2 create job directory with job number
    job_path = f"./edgeai/users/{session['user']}/{data['project_name']}/jobs/{ms}"
    os.makedirs(job_path)

    # 3 create config.yaml
    with open(job_path + '/config.yaml', 'w') as f:
        f.write(data['conf'])

    # 4 create meta.json
    with open(job_path + '/meta.json', 'w') as f:
        f.write(json.dumps(data['meta'], indent=4))

    model_path = f"./edgeai/users/{session['user']}/{data['project_name']}/models/{data['meta']['model_name']}"
    task_path = f"./edgeai/users/{session['user']}/{data['project_name']}/tasks/{data['meta']['task']}"
    shutil.copytree(model_path, job_path+"/model")
    shutil.copytree(task_path, job_path+"/task")

    # 5 update status in /models/{name}/meta.json
    path = f"./edgeai/users/{session['user']}/{data['project_name']}/models/{data['meta']['model_name']}/meta.json"
    with open(path, 'r') as f:
        meta = json.loads(f.read())
        meta['status'] = status
    with open(path, 'w') as f:
        f.write(json.dumps(meta, indent=4))
    model_meta = meta

    # task meta
    path = f"./edgeai/users/{session['user']}/{data['project_name']}/tasks/{data['meta']['task']}/meta.json"
    with open(path, 'r') as f:
        task_meta = json.loads(f.read())

    # add libs
    for lib in task_meta["lib"] + model_meta["lib"]:
        lib_path = f"./edgeai/template/project/libs/{lib}"
        if not os.path.exists(os.path.join(job_path, lib)):
            shutil.copytree(lib_path, os.path.join(job_path, lib))

    # 6 temp: progress.json
    temp = {
        "progress": 0.0,
        "accuracy": 0.0,
        "message": "none",
    }

    path = f"./edgeai/users/{session['user']}/{data['project_name']}/jobs/{ms}"
    with open(path + '/progress.json', 'w') as f:
        f.write(json.dumps(temp, indent=4))

    # 7 temp: values.json
    temp = {
        "metric_1": [(1, 0.9), (2, 0.8), (3, 0.7), (4, 0.6), (5, 0.5), (6, 0.4), (7, 0.3), (8, 0.2), (9, 0.1), (10, 0.0)],
        "metric_2": [(1, 0.9), (2, 0.7), (3, 0.6), (4, 0.5), (5, 0.4), (6, 0.6), (7, 0.5), (8, 0.3), (9, 0.2), (10, 0.1)],
    }
    path = f"./edgeai/users/{session['user']}/{data['project_name']}/jobs/{ms}"
    with open(path + '/values.json', 'w') as f:
        f.write(json.dumps(temp, indent=4))

    # 8 temp: log.json
    temp = {
        "log1": "log_message1",
        "log2": "log_message2",
        "log3": "log_message3",
        "log4": "log_message4",
        "log5": "log_message5",
        "msg":"None"
    }
    path = f"./edgeai/users/{session['user']}/{data['project_name']}/jobs/{ms}"
    with open(path + '/log.json', 'w') as f:
        f.write(json.dumps(temp, indent=4))

    # 9 create job process & save pid
    path_job = f"{cwd}/edgeai/users/{session['user']}/{data['project_name']}/jobs/{ms}"
    path_log = f"{cwd}/edgeai/users/{session['user']}/{data['project_name']}/jobs/{ms}/log"
    path_pid = f"{cwd}/edgeai/users/{session['user']}/{data['project_name']}/jobs/{ms}/pid"

    env = conf["conda_env"]
    devices = conf["devices"]
    library = conf["ld_library_path"]
    os.system(f'''
    PYTHONPATH={job_path} LD_LIBRARY_PATH={library} CUDA_VISIBLE_DEVICES={devices} conda run -n {env} --live-stream python -u ./edgeai/engine/cli.py {cmd} {path_job} > {path_log} 2>&1 &
    echo $! > {path_pid}
    ''')


@models.route('/search', methods=['post'])
@session_required
def search():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        run_process(request.json, 'search', f"searched:{request.json['meta']['method']}")
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/train', methods=['post'])
@session_required
def train():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        run_process(request.json, 'train', 'trained')
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/optimize', methods=['post'])
@session_required
def optimize():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        run_process(request.json, 'optimize', f"optimized:{request.json['meta']['method']}")
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/profile', methods=['post'])
@session_required
def profile():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        run_process(request.json, 'profile', 'profiled')
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/query', methods=['post'])
@session_required
def query():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        run_process(request.json, 'query', 'queried')
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/eval', methods=['post'])
@session_required
def evaluate():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        run_process(request.json, 'eval', 'evaluated')
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/view', methods=['post'])
@session_required
def view():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        # get model path
        model_name = request.json['meta']['model_name']

        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/models"
        # with open(f"{path}/{model_name}/meta.json", 'r') as f:
        #     temp = json.loads(f.read())
        #     model_path = temp['model_path']

        model_path = f"{path}/{model_name}"

        # generate iew graph
        cmd = f'python ./edgeai/cli/cli_dummy.py view {model_path}'
        # print(cmd)
        st, res = subprocess.getstatusoutput(cmd)
        if st == 0:
            msg['res'] = conv_graph.conv_graph(f"{model_path}/view.json")
            # with open(f"{model_path}/view.json", 'r') as f:
            #     msg['res'] = json.loads(f.read())
        else:
            # set error message
            msg['err'] = res

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@models.route('/graph_info', methods=['post'])
@session_required
def graph_info():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        # project_name
        # model_name
        # from
        # to
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/models"
        model_path = f"{path}/{request.json['model_name']}"

        # query from to information
        msg['res'] = f"from:{request.json['from']}, to:{request.json['to']} information"

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)
