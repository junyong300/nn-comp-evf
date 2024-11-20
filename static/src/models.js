// Global variables for editors
let configEditor, modelEditor, callbacksEditor;
const modules = [];
let moduleCount = 0;



document.addEventListener("DOMContentLoaded", function () {
    // Initialize the main editors
    configEditor = ace.edit("editor_config");
    modelEditor = ace.edit("editor_model");
    callbacksEditor = ace.edit("editor_callbacks");

    // Setting themes and modes for the editors
    initializeEditors();
    
    // Event Listeners
    document.getElementById("id_create_model").addEventListener("click", handleCreateModel);
    document.getElementById("id_save_model").addEventListener("click", handleSaveModel);
    document.getElementById("addModuleButton").addEventListener("click", handleAddModule);

    // Initial setup
    setupTabSwitching();
    loadModelList();
});

// Editor initialization
function initializeEditors() {
    const editors = [
        { editor: configEditor, mode: "yaml" },
        { editor: modelEditor, mode: "python" },
        { editor: callbacksEditor, mode: "python" }
    ];

    editors.forEach(({ editor, mode }) => {
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode(`ace/mode/${mode}`);
        editor.setShowPrintMargin(false);
    });
}


// Function to load model list and populate a dropdown
async function loadModelListDropdown(dropdownId) {
    const project = sessionStorage.getItem("project_name");
    if (!project) {
        alert("Project name is missing. Please select a project.");
        return;
    }

    try {
        const response = await fetch("/models/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_name: project })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.models) {
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) {
                console.error(`Error: Dropdown element with ID '${dropdownId}' not found.`);
                return;
            }

            // Clear existing options
            dropdown.innerHTML = "";

            // Add a default option
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Select a model";
            dropdown.appendChild(defaultOption);

            // Populate dropdown with models
            data.models.forEach(model => {
                const option = document.createElement("option");
                option.value = model.model_name;
                option.textContent = `${model.model_name} (v${model.version})`;
                dropdown.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading models:", error);
        alert("Failed to load models");
    }
}


// Load model list
function loadModelList() {
    const project = sessionStorage.getItem("project_name");
    if (!project) {
        alert("Project name is missing. Please select a project.");
        return;
    }

    fetch("/models/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: project })
    })
    .then(response => response.json())
    .then(data => {
        if (data.models) {
            updateModelTable(data.models);
        }
    })
    .catch(error => {
        console.error("Error loading models:", error);
        alert("Failed to load models");
    });
}

// Update model table
function updateModelTable(models) {
    const modelList = document.getElementById("id_table_body");
    if (!modelList) {
        console.error("Error: 'models_table_body' element not found.");
        return;
    }
    modelList.innerHTML = "";
    
    models.forEach(model => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${model.model_name}</td>
            <td>${model.task_type}</td>
            <td>${model.model_path}</td>
            <td>${model.version}</td>
            <td>${model.status || ''}</td>
            <td>${model.misc || ''}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-secondary" onclick="editModel('${model.model_name}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDeleteModel('${model.model_name}')">Delete</button>
                </div>
            </td>
        `;
        modelList.appendChild(row);
    });
}
// Create new model
async function handleCreateModel() {
    // Reset form and set default values
    document.getElementById("model_name").value = "vit_b_16";
    document.getElementById("model_path").value = "workspace/";
    document.getElementById("task_type").value = "Train";
    document.getElementById("status").value = "Ready";
    document.getElementById("version").value = "1.0";
    document.getElementById("misc").value = "";

    // Clear existing modules and reset editors
    resetModules();

    // Re-initialize editors since DOM elements were recreated
    configEditor = ace.edit("editor_config");
    modelEditor = ace.edit("editor_model");
    callbacksEditor = ace.edit("editor_callbacks");
    initializeEditors();

    try {
        // Load template
        const response = await fetch("/models/load_template");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        // Set editor values
        if (data.config) configEditor.setValue(data.config, -1);
        if (data.model) modelEditor.setValue(data.model, -1);
        if (data.callbacks) callbacksEditor.setValue(data.callbacks, -1);

        // Update form fields from meta
        if (data.meta) {
            document.getElementById("model_name").value = data.meta.model_name || "efficientnet_b0";
            document.getElementById("model_path").value = data.meta.model_path || "workspace/";
            document.getElementById("status").value = data.meta.status || "Ready";
            document.getElementById("version").value = data.meta.version || "1.0";
            document.getElementById("misc").value = data.meta.misc || "";
        }

        // Update modal title
        document.querySelector("#newModelModal .modal-title").textContent = "Create New Model";
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById("newModelModal"));
        modal.show();

        // Force editors to refresh
        setTimeout(() => {
            configEditor.resize();
            modelEditor.resize();
            callbacksEditor.resize();
        }, 100);

    } catch (error) {
        console.error("Error loading template:", error);
        alert("Failed to load model template: " + error.message);
    }
}

// Reset modules with proper cleanup
function resetModules() {
    // Clean up existing editors
    if (configEditor) configEditor.destroy();
    if (modelEditor) modelEditor.destroy();
    if (callbacksEditor) callbacksEditor.destroy();
    
    modules.length = 0;
    moduleCount = 0;

    // Reset tabs and editors
    document.getElementById("modelTabs").innerHTML = `
        <li class="nav-item">
            <a class="nav-link active" id="config-tab" data-bs-toggle="tab" href="#config" role="tab">Config</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" id="model-tab" data-bs-toggle="tab" href="#model" role="tab">Model</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" id="callbacks-tab" data-bs-toggle="tab" href="#callbacks" role="tab">Callbacks</a>
        </li>
    `;

    document.getElementById("modelTabContent").innerHTML = `
        <div class="tab-pane fade show active" id="config" role="tabpanel">
            <div id="editor_config" class="editor" style="height: 300px;"></div>
        </div>
        <div class="tab-pane fade" id="model" role="tabpanel">
            <div id="editor_model" class="editor" style="height: 300px;"></div>
        </div>
        <div class="tab-pane fade" id="callbacks" role="tabpanel">
            <div id="editor_callbacks" class="editor" style="height: 300px;"></div>
        </div>
    `;
}

// Initialize editors with better error handling
function initializeEditors() {
    const editors = [
        { editor: configEditor, mode: "yaml", id: "editor_config" },
        { editor: modelEditor, mode: "python", id: "editor_model" },
        { editor: callbacksEditor, mode: "python", id: "editor_callbacks" }
    ];

    editors.forEach(({ editor, mode, id }) => {
        try {
            editor.setTheme("ace/theme/monokai");
            editor.session.setMode(`ace/mode/${mode}`);
            editor.setShowPrintMargin(false);
            editor.renderer.setScrollMargin(10, 10);
            editor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true,
                enableLiveAutocompletion: true
            });
        } catch (error) {
            console.error(`Error initializing editor ${id}:`, error);
        }
    });
}

// Edit existing model
function editModel(modelName) {
    const project = sessionStorage.getItem("project_name");
    if (!project) {
        alert("Project name is missing. Please select a project.");
        return;
    }

    fetch(`/models/load_template?name=${modelName}&project_name=${project}`)
        .then(response => response.json())
        .then(data => {
            // Populate form fields
            document.getElementById("model_name").value = data.meta.model_name;
            document.getElementById("model_path").value = data.meta.model_path;
            document.getElementById("task_type").value = data.meta.task_type;
            document.getElementById("status").value = data.meta.status;
            document.getElementById("version").value = data.meta.version;
            document.getElementById("misc").value = data.meta.misc || '';

            // Update editors
            configEditor.setValue(data.config, -1);
            modelEditor.setValue(data.model, -1);
            callbacksEditor.setValue(data.callbacks, -1);

            // Update modal title
            document.querySelector("#newModelModal .modal-title").textContent = "Edit Model";

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById("newModelModal"));
            modal.show();
        })
        .catch(error => {
            console.error("Error loading model:", error);
            alert("Failed to load model data");
        });
}

// Save model
function handleSaveModel() {
    const modelName = document.getElementById("model_name").value;
    const project = sessionStorage.getItem("project_name");

    if (!project) {
        alert("Project name is missing. Please select a project.");
        return;
    }

    if (!modelName) {
        alert("Model name is required.");
        return;
    }

    const modelData = {
        meta: {
            model_name: modelName,
            model_path: document.getElementById("model_path").value,
            task_type: document.getElementById("task_type").value,
            status: document.getElementById("status").value,
            version: document.getElementById("version").value,
            misc: document.getElementById("misc").value
        },
        config: configEditor.getValue(),
        model: modelEditor.getValue(),
        callbacks: callbacksEditor.getValue(),
        modules: {}
    };

    // Add module data if any exist
    modules.forEach(moduleName => {
        const moduleEditor = ace.edit(`editor_${moduleName}`);
        modelData.modules[moduleName] = moduleEditor.getValue();
    });

    // Save model data
    fetch("/models/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            modelData,
            project_name: project
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            const modal = bootstrap.Modal.getInstance(document.getElementById("newModelModal"));
            modal.hide();
            loadModelList();
        } else if (data.error) {
            alert("Error saving model: " + data.error);
        }
    })
    .catch(error => {
        console.error("Error saving model:", error);
        alert("Failed to save model");
    });
}

// Delete model confirmation
function confirmDeleteModel(modelName) {
    if (confirm(`Are you sure you want to delete model '${modelName}'?`)) {
        deleteModel(modelName);
    }
}

// Delete model
function deleteModel(modelName) {
    const project = sessionStorage.getItem("project_name");
    if (!project) {
        alert("Project name is missing. Please select a project.");
        return;
    }

    fetch("/models/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            name: modelName, 
            project_name: project 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            loadModelList();
        } else if (data.error) {
            alert("Error deleting model: " + data.error);
        }
    })
    .catch(error => {
        console.error("Error deleting model:", error);
        alert("Failed to delete model");
    });
}

// Add new module
function handleAddModule() {
    moduleCount++;
    const moduleName = `Module_${moduleCount}`;
    modules.push(moduleName);

    // Add new tab
    addModuleTab(moduleName);
    
    // Add new editor container
    addModuleEditor(moduleName);

    // Refresh tab switching
    setupTabSwitching();
}

// Add module tab
function addModuleTab(moduleName) {
    const newTab = document.createElement("li");
    newTab.className = "nav-item";
    newTab.innerHTML = `
        <a class="nav-link" id="${moduleName}-tab" data-bs-toggle="tab" 
           href="#${moduleName}" role="tab" aria-controls="${moduleName}" 
           aria-selected="false">${moduleName}</a>
    `;
    document.getElementById("modelTabs").appendChild(newTab);
}

// Add module editor
function addModuleEditor(moduleName) {
    const newTabContent = document.createElement("div");
    newTabContent.className = "tab-pane fade";
    newTabContent.id = moduleName;
    newTabContent.setAttribute("role", "tabpanel");
    newTabContent.setAttribute("aria-labelledby", `${moduleName}-tab`);
    newTabContent.innerHTML = `
        <div id="editor_${moduleName}" class="editor" style="height: 200px;"></div>
    `;
    document.getElementById("modelTabContent").appendChild(newTabContent);

    // Initialize new editor
    const newEditor = ace.edit(`editor_${moduleName}`);
    newEditor.setTheme("ace/theme/monokai");
    newEditor.session.setMode("ace/mode/python");
    newEditor.setValue(`# ${moduleName} code here`, -1);
}

// Reset modules
function resetModules() {
    modules.length = 0;
    moduleCount = 0;
    document.getElementById("modelTabs").innerHTML = `
        <li class="nav-item">
            <a class="nav-link active" id="config-tab" data-bs-toggle="tab" href="#config" role="tab">Config</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" id="model-tab" data-bs-toggle="tab" href="#model" role="tab">Model</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" id="callbacks-tab" data-bs-toggle="tab" href="#callbacks" role="tab">Callbacks</a>
        </li>
    `;
    document.getElementById("modelTabContent").innerHTML = `
        <div class="tab-pane fade show active" id="config" role="tabpanel">
            <div id="editor_config" style="height: 300px;"></div>
        </div>
        <div class="tab-pane fade" id="model" role="tabpanel">
            <div id="editor_model" style="height: 300px;"></div>
        </div>
        <div class="tab-pane fade" id="callbacks" role="tabpanel">
            <div id="editor_callbacks" style="height: 300px;"></div>
        </div>
    `;
    initializeEditors();
}

// Setup tab switching
function setupTabSwitching() {
    document.querySelectorAll('#modelTabs a[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener("shown.bs.tab", function (event) {
            const targetId = event.target.getAttribute("href").substring(1);
            const editorId = `editor_${targetId}`;
            const editor = ace.edit(editorId);
            editor.resize();
        });
    });
}

// Make functions globally available
window.editModel = editModel;
window.confirmDeleteModel = confirmDeleteModel;
window.deleteModel = deleteModel;
window.loadModelListDropdown = loadModelListDropdown;
