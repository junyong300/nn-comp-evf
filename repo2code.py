import os

# File paths
home_folder = os.path.expanduser("~")
output_file = os.path.join(home_folder, "repo2output.txt")

def write_tree_to_file():
    with open(output_file, "w") as f:
        for root, dirs, files in os.walk(home_folder):
            # Write the tree structure to file
            depth = root.replace(home_folder, '').count(os.sep)
            indent = '    ' * depth
            f.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = '    ' * (depth + 1)
            for file in files:
                f.write(f"{subindent}{file}\n")

def append_files_by_pattern(folder, pattern):
    with open(output_file, "a") as f:
        for file_name in os.listdir(folder):
            if file_name.endswith(pattern):
                file_path = os.path.join(folder, file_name)
                f.write(f"\n=== {file_path} ===\n")
                f.write(f"File Path: {file_path}\nFile Name: {file_name}\n")
                with open(file_path, "r") as file:
                    f.write(file.read())

# Step 1: Write the tree structure to file
write_tree_to_file()

# Step 2: Append Python files in the home folder
append_files_by_pattern(home_folder, ".py")

# Step 3: Append HTML files in the ./templates/ folder
templates_folder = os.path.join(home_folder, "templates")
if os.path.exists(templates_folder):
    append_files_by_pattern(templates_folder, ".html")

# Step 4: Append JavaScript files in the ./static/src/ folder
static_src_folder = os.path.join(home_folder, "static", "src")
if os.path.exists(static_src_folder):
    append_files_by_pattern(static_src_folder, ".js")

# Step 5: Append files from edgeai/template/project/*
edgeai_project_folder = os.path.join(home_folder, "edgeai", "template", "project")
if os.path.exists(edgeai_project_folder):
    for root, dirs, files in os.walk(edgeai_project_folder):
        for file_name in files:
            file_path = os.path.join(root, file_name)
            with open(output_file, "a") as f:
                f.write(f"\n=== {file_path} ===\n")
                f.write(f"File Path: {file_path}\nFile Name: {file_name}\n")
                with open(file_path, "r") as file:
                    f.write(file.read())
