//models.js

class ModelsManagerClass{
    constructor() {
        this.editors = {
            config: null,
            model: null,
            callbacks: null
        };
        this.modules = [];
        this.moduleCount = 0;

        // Bind methods to ensure proper 'this' context
        this.handleCreateModel = this.handleCreateModel.bind(this);
        this.handleSaveModel = this.handleSaveModel.bind(this);
        this.loadModelList = this.loadModelList.bind(this);
        this.editModel = this.editModel.bind(this);
        this.deleteModel = this.deleteModel.bind(this);
        this.handleAddModule = this.handleAddModule.bind(this);

        // Initialize when document is ready
        $(document).ready(() => {
            this.initializeEventHandlers();
            // this.initializeEditors();
            this.loadModelList();
        });
    }
    
    initializeEventHandlers() {
        // Model creation and editing handlers
        $('#id_create_model').on('click', this.handleCreateModel);
        $('#id_save_model').on('click', this.handleSaveModel);
        $('#addModuleButton').on('click', () => this.handleAddModule());

        // Listen for project changes
        document.addEventListener('projectChanged', (event) => {
            this.loadModelList();
        });

        // Search functionality
        $('#id_search').on('keyup', (e) => {
            const value = e.target.value.toLowerCase();
            $("#id_table_body tr").filter(function() {
                const text = $(this).text().toLowerCase();
                $(this).toggle(text.indexOf(value) > -1);
            });
        });
    }
    
    
    initializeEditors() {
        if (!document.getElementById('editor_config')) return;

        try {
            // Initialize Ace editors
            this.editors.config = ace.edit('editor_config');
            this.editors.model = ace.edit('editor_model');
            this.editors.callbacks = ace.edit('editor_callbacks');

            // Configure editors
            Object.values(this.editors).forEach(editor => {
                editor.setTheme("ace/theme/monokai");
                editor.setShowPrintMargin(false);
                editor.renderer.setScrollMargin(10, 10);
                editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableSnippets: true,
                    enableLiveAutocompletion: true
                });
            });

            // Set specific modes
            this.editors.config.session.setMode("ace/mode/yaml");
            this.editors.model.session.setMode("ace/mode/python");
            this.editors.callbacks.session.setMode("ace/mode/python");

        } catch (error) {
            console.error('Error initializing editors:', error);
            App.showNotification('Error initializing code editors', 'error');
        }
    }

    async loadModelListDropdown(dropdownId) {
        const project = sessionStorage.getItem("project_name");
        if (!project) {
            console.warn("Project name is missing. Please select a project.");
            return;
        }

        try {
            const response = await fetch("/models/list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_name: project })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) {
                console.error(`Dropdown element with ID '${dropdownId}' not found.`);
                return;
            }

            // Clear existing options
            dropdown.innerHTML = '<option value="">Select a model</option>';

            if (data.models && data.models.length > 0) {
                data.models.forEach(model => {
                    const option = document.createElement("option");
                    option.value = model.model_name;
                    option.textContent = `${model.model_name} (${model.task_type})`;
                    dropdown.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error loading models:", error);
        }
    }

    async loadModelList() {
        const project = sessionStorage.getItem("project_name");
        if (!project) {
            console.warn("No project selected");
            return;
        }

        try {
            const response = await fetch("/models/list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_name: project })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);
            
            this.updateModelTable(data.models || []);
        } catch (error) {
            console.error("Error loading models:", error);
            App.showNotification("Failed to load models: " + error.message, "error");
        }
    }

    // Update model table
    updateModelTable(models) {
        const tbody = $("#id_table_body");
        tbody.empty();

        if (models.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        No models found. Click "New Model" to create one.
                    </td>
                </tr>
            `);
            return;
        }

        models.forEach(model => {
            const row = $(`
                <tr>
                    <td>${model.model_name}</td>
                    <td>${model.task_type || 'N/A'}</td>
                    <td>${model.model_path || 'N/A'}</td>
                    <td>${model.version || '1.0'}</td>
                    <td>${model.status || 'Ready'}</td>
                    <td>${model.misc || ''}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-secondary edit-model">Edit</button>
                            <button class="btn btn-sm btn-danger delete-model">Delete</button>
                        </div>
                    </td>
                </tr>
            `);

            // Attach event handlers
            row.find('.edit-model').on('click', () => this.editModel(model.model_name));
            row.find('.delete-model').on('click', () => this.confirmDeleteModel(model.model_name));

            tbody.append(row);
        });
    }

    confirmDeleteModel(modelName) {
        if (confirm(`Are you sure you want to delete model '${modelName}'?`)) {
            this.deleteModel(modelName);
        }
    }

    // Create new model
    handleCreateModel() {
        // Reset form and set default values
        document.getElementById("model_name").value = "vit_b_16";
        document.getElementById("model_path").value = "workspace/";
        document.getElementById("task_type").value = "Train";
        document.getElementById("status").value = "Ready";
        document.getElementById("version").value = "1.0";
        document.getElementById("misc").value = "";

        // Clear existing modules and reset editors
        this.resetModules();

        // Load template and show modal
        this.loadTemplate()
        .then(() => {
            const modalElement = document.getElementById("newModelModal");
            const modal = new bootstrap.Modal(modalElement);

            // Attach event listener for modal shown event
            modalElement.addEventListener('shown.bs.modal', () => {
                // Initialize editors after modal is shown
                this.initializeEditors();
                // Resize editors if necessary
                this.resizeEditors();
            }, { once: true }); // Use { once: true } to ensure the handler is called only once

            modal.show();
        })
        .catch(error => {
            App.showNotification("Failed to load model template: " + error.message, "error");
        });
    }

    // Reset modules with proper cleanup
    resetModules() {
        // Clean up existing editors
        Object.values(this.editors).forEach(editor => {
            if (editor) {
                editor.destroy();
                editor = null;
            }
        });
        
        this.modules = [];
        this.moduleCount = 0;

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
                <div id="editor_config" style="height: 300px;"></div>
            </div>
            <div class="tab-pane fade" id="model" role="tabpanel">
                <div id="editor_model" style="height: 300px;"></div>
            </div>
            <div class="tab-pane fade" id="callbacks" role="tabpanel">
                <div id="editor_callbacks" style="height: 300px;"></div>
            </div>
        `;

        // Reinitialize editors
        // this.initializeEditors();
    }

    // Initialize editors with better error handling
    initializeEditors() {
        if (!document.getElementById('editor_config') ||!document.getElementById('editor_model') || !document.getElementById('editor_callbacks')) {
            console.warn('Editor elements not found in DOM.');
            return;
        }
        try {
            // Initialize Ace editors
            this.editors.config = ace.edit('editor_config');
            this.editors.model = ace.edit('editor_model');
            this.editors.callbacks = ace.edit('editor_callbacks');

            // Configure editors
            Object.values(this.editors).forEach(editor => {
                editor.setTheme("ace/theme/monokai");
                editor.setShowPrintMargin(false);
                editor.renderer.setScrollMargin(10, 10);
                editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableSnippets: true,
                    enableLiveAutocompletion: true
                });
            });

            // Set specific modes
            this.editors.config.session.setMode("ace/mode/yaml");
            this.editors.model.session.setMode("ace/mode/python");
            this.editors.callbacks.session.setMode("ace/mode/python");

        } catch (error) {
            console.error('Error initializing editors:', error);
            App.showNotification('Error initializing code editors', 'error');
        }
    }

    // Edit existing model
    async editModel(modelName) {
        try {
            const project = sessionStorage.getItem("project_name");
            if (!project) {
                App.showNotification("Project name is missing. Please select a project.", "error");
                return;
            }

            // Reset modules and editors before loading new content
            this.resetModules();

            // Load the model data
            const response = await fetch(`/models/load_template?name=${encodeURIComponent(modelName)}&project_name=${encodeURIComponent(project)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            // Populate form fields
            document.getElementById("model_name").value = data.meta.model_name;
            document.getElementById("model_path").value = data.meta.model_path;
            document.getElementById("task_type").value = data.meta.task_type;
            document.getElementById("status").value = data.meta.status;
            document.getElementById("version").value = data.meta.version;
            document.getElementById("misc").value = data.meta.misc || '';

            // Update editors with content
            if (this.editors.config && data.config) {
                this.editors.config.setValue(data.config, -1);
                this.editors.config.clearSelection();
            }
            
            if (this.editors.model && data.model) {
                this.editors.model.setValue(data.model, -1);
                this.editors.model.clearSelection();
            }
            
            if (this.editors.callbacks && data.callbacks) {
                this.editors.callbacks.setValue(data.callbacks, -1);
                this.editors.callbacks.clearSelection();
            }

            // Handle additional modules if any
            if (data.modules) {
                Object.entries(data.modules).forEach(([name, content]) => {
                    this.handleAddModule();
                    const moduleName = `module${this.moduleCount}`;
                    if (this.editors[moduleName]) {
                        this.editors[moduleName].setValue(content, -1);
                        this.editors[moduleName].clearSelection();
                    }
                });
            }

            // Update modal title
            document.querySelector("#newModelModal .modal-title").textContent = "Edit Model";

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById("newModelModal"));
            modal.show();

            // Resize editors after modal is shown
            setTimeout(() => this.resizeEditors(), 100);

        } catch (error) {
            console.error("Error loading model:", error);
            App.showNotification("Failed to load model: " + error.message, "error");
        }
    }

    // Save model
    handleSaveModel() {
        const modelName = document.getElementById("model_name").value;
        const project = sessionStorage.getItem("project_name");

        if (!project) {
            App.showNotification("Project name is missing. Please select a project.", "error");
            return;
        }

        if (!modelName) {
            App.showNotification("Model name is required.", "error");
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
            config: this.editors.config.getValue(),
            model: this.editors.model.getValue(),
            callbacks: this.editors.callbacks.getValue(),
            modules: {}
        };

        // Add module data
        this.modules.forEach(moduleName => {
            if (this.editors[moduleName]) {
                modelData.modules[moduleName] = this.editors[moduleName].getValue();
            }
        });

        this.saveModelToServer(modelData, project);
    }

    async saveModelToServer(modelData, project) {
        try {
            const response = await fetch("/models/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    modelData,
                    project_name: project
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            App.showNotification("Model saved successfully!", "success");
            const modal = bootstrap.Modal.getInstance(document.getElementById("newModelModal"));
            modal.hide();
            this.loadModelList();
        } catch (error) {
            console.error("Error saving model:", error);
            App.showNotification("Failed to save model: " + error.message, "error");
        }
    }

    resizeEditors() {
        Object.values(this.editors).forEach(editor => {
            if (editor) editor.resize();
        });
    }

    // Delete model confirmation
    confirmDeleteModel(modelName) {
        if (confirm(`Are you sure you want to delete model '${modelName}'?`)) {
            deleteModel(modelName);
        }
    }

    // Delete model
    deleteModel(modelName) {
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
    handleAddModule() {
        this.moduleCount++;
        const moduleName = `module${this.moduleCount}`;
        this.modules.push(moduleName);

        // Add new tab
        const tab = $(`
            <li class="nav-item">
                <a class="nav-link" id="${moduleName}-tab" data-bs-toggle="tab" href="#${moduleName}" role="tab">
                    ${moduleName}.py
                </a>
            </li>
        `);
        $('#modelTabs').append(tab);

        // Add new editor container
        const editorContainer = $(`
            <div class="tab-pane fade" id="${moduleName}" role="tabpanel">
                <div id="editor_${moduleName}" style="height: 400px;"></div>
            </div>
        `);
        $('#modelTabContent').append(editorContainer);

        // Initialize new editor
        const editor = ace.edit(`editor_${moduleName}`);
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/python");
        editor.setShowPrintMargin(false);
        editor.setValue(`# ${moduleName}.py\n\n`, -1);
        
        // Add to editors object
        this.editors[moduleName] = editor;

        // Switch to new tab
        $(`#${moduleName}-tab`).tab('show');
    }
    
    async loadTemplate() {
        try {
            const response = await fetch("/models/load_template");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Set editor values
            if (data.config) this.editors.config.setValue(data.config, -1);
            if (data.model) this.editors.model.setValue(data.model, -1);
            if (data.callbacks) this.editors.callbacks.setValue(data.callbacks, -1);

            // Force editors to refresh
            setTimeout(() => this.resizeEditors(), 100);
        } catch (error) {
            console.error("Error loading template:", error);
            throw error;
        }
    }

    // Add module tab
    addModuleTab(moduleName) {
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
    addModuleEditor(moduleName) {
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
    resetModules() {
        // Clean up existing editors
        Object.values(this.editors).forEach(editor => {
            if (editor) {
                editor.destroy();
                editor = null;
            }
        });
        
        this.modules = [];
        this.moduleCount = 0;

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
                <div id="editor_config" style="height: 300px;"></div>
            </div>
            <div class="tab-pane fade" id="model" role="tabpanel">
                <div id="editor_model" style="height: 300px;"></div>
            </div>
            <div class="tab-pane fade" id="callbacks" role="tabpanel">
                <div id="editor_callbacks" style="height: 300px;"></div>
            </div>
        `;

        // Reinitialize editors
        this.initializeEditors();
    }

    // Setup tab switching
    setupTabSwitching() {
        document.querySelectorAll('#modelTabs a[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener("shown.bs.tab", function (event) {
                const targetId = event.target.getAttribute("href").substring(1);
                const editorId = `editor_${targetId}`;
                const editor = ace.edit(editorId);
                editor.resize();
            });
        });
    }
}

// Initialize and expose to window
// models.js

// Initialize and expose to window
const ModelsManager = new ModelsManagerClass();
window.ModelsManager = ModelsManager;

// Expose loadModelListDropdown globally
window.loadModelListDropdown = ModelsManager.loadModelListDropdown.bind(ModelsManager);

// Make methods globally available for inline HTML event handlers
window.editModel = (name) => ModelsManager.editModel(name);
window.confirmDeleteModel = (name) => ModelsManager.confirmDeleteModel(name);
window.deleteModel = (name) => ModelsManager.deleteModel(name);

