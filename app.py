import functools

from flask import Flask, session, render_template, request, redirect, url_for, send_from_directory
from auth import auth, login_required
from project import project
from dashboard import dashboard
from tasks import tasks
from models import models
from jobs import jobs

app = Flask(__name__, static_url_path='/static')
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(project, url_prefix='/project')
app.register_blueprint(dashboard, url_prefix='/dashboard')
app.register_blueprint(tasks, url_prefix='/tasks')
app.register_blueprint(models, url_prefix='/models')
app.register_blueprint(jobs, url_prefix='/jobs')

app.secret_key = 'SECRET_KEY_!!!'
app.config['SECRET_KEY'] = app.secret_key  # for debugging tool


# app.permanent_session_lifetime = timedelta(hours=24)

@app.route('/')
@login_required
def root():
    return redirect(url_for('dashboard.root'))


@app.route('/<path:path>')
def static_proxy(path):
    return app.send_static_file(path)  # send_static_file will guess the correct MIME type


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)

'''
실행방법

1.waitress (윈도우즈)
waitress-serve --listen=*:8080 app:app

2.gunicon (linux, mac, ...)
gunicorn app:app --bind=0.0.0.0:8080 --daemon --reload
--daemon: 데몬 프로세스로 실행
--reload: 소스 변경시 재구동
'''
