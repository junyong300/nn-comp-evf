import json
import os
import shutil
import subprocess
import datetime

from flask import Blueprint, render_template, send_from_directory, jsonify, request, session
from auth import login_required, session_required

jobs = Blueprint('jobs', __name__)


@jobs.route('/')
@login_required
def root():
    return render_template('jobs.html')


@jobs.route('/list', methods=['post'])
@session_required
def list():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/jobs"
        dirs = sorted(os.listdir(path))
        for dir_ in dirs:
            msg['res'][dir_] = {}
            with open(f"{path}/{dir_}/meta.json", 'r') as f:
                msg['res'][dir_]['meta'] = json.loads(f.read())
            with open(f"{path}/{dir_}/progress.json", 'r') as f:
                msg['res'][dir_]['progress'] = json.loads(f.read())

            s_time = datetime.datetime.fromtimestamp(int(dir_) / 1000000)

            # 현재시간과 s_time의 차이를 구한다.
            # Calculate the difference between the current time and s_time.
            e_time = datetime.datetime.now() - s_time

            # e_time을 문자열로 변환한다. 초 단위 까지만 변환한다.
            # Convert e_time to a string. Only convert to the second unit.
            e_time = str(e_time).split('.')[0]
            msg['res'][dir_]['progress']['elapsed_time'] = str(e_time)

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@jobs.route('/cancel', methods=['post'])
@session_required
def cancel():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        # it just kills the process
        # it doesn't check if the job is canceled successfully at this version
        path_pid = f"./edgeai/users/{session['user']}/{request.json['project_name']}/jobs/{request.json['job_name']}/pid"
        cmd = f'kill -9 `cat {path_pid}`'
        st, res = subprocess.getstatusoutput(cmd)
        if st != 0:
            msg['err'] = res
        else:
            msg['res'] = res

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@jobs.route('/delete', methods=['post'])
@session_required
def delete():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        # it just kills the process
        # it doesn't check if the job is canceled successfully at this version
        path_pid = f"./edgeai/users/{session['user']}/{request.json['project_name']}/jobs/{request.json['job_name']}/pid"
        cmd = f'kill -9 `cat {path_pid}`'
        _, _ = subprocess.getstatusoutput(cmd)

        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/jobs/{request.json['job_name']}"
        shutil.rmtree(path)
    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@jobs.route('/log', methods=['post'])
@session_required
def log():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/jobs/{request.json['job_name']}/log.out"
        with open(path, 'r') as f:
            msg['res'] = f.read()

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)


@jobs.route('/graph', methods=['post'])
@session_required
def graph():
    msg = {
        'err': None,
        'res': {}
    }

    try:
        path = f"./edgeai/users/{session['user']}/{request.json['project_name']}/jobs/{request.json['job_name']}/values.json"
        with open(path, 'r') as f:
            msg['res'] = json.loads(f.read())

    except Exception as e:
        msg['err'] = str(e)

    return jsonify(msg)
