from flask import Flask, session, render_template, request, redirect, url_for, send_from_directory
from auth import auth, login_required
from project import project
from dashboard import dashboard
# from tasks import tasks
from models import models
from jobs import jobs
from experiments import experiments  # Import the new experiments blueprint
from datasets import dataset

app = Flask(__name__, static_url_path='/static')
app.register_blueprint(auth, url_prefix='/auth')

app.register_blueprint(project, url_prefix='/project')
app.register_blueprint(dataset, url_prefix='/datasets')
app.register_blueprint(models, url_prefix='/models')

app.register_blueprint(dashboard, url_prefix='/dashboard')
app.register_blueprint(experiments, url_prefix='/experiments')  # Register the experiments blueprint

# app.register_blueprint(jobs, url_prefix='/jobs')

app.secret_key = 'SECRET_KEY_!!!'
app.config['SECRET_KEY'] = app.secret_key  # for debugging tool

@app.route('/')
@login_required
def root():
    return redirect(url_for('dashboard.root'))

@app.route('/<path:path>')
def static_proxy(path):
    return app.send_static_file(path)  # send_static_file will guess the correct MIME type

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
