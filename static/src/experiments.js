class Experiments {
    debug(method, message, data = null) {
        const debugMsg = `[Experiments.${method}] ${message}`;
        if (data) {
            console.log(debugMsg, data);
        } else {
            console.log(debugMsg);
        }
    }
    constructor() {
        this.debug('constructor', 'Initializing Experiments class');
        
        this.wizardConfig = { 
            step: 1,
            totalSteps: 3,
            moduleCount: 0
        };
        this.debug('constructor', 'Wizard config initialized:', this.wizardConfig);

        this.config = { name: 'Unnamed' };
        this.modules = [];
        this.templatePath = '/edgeai/template/project/experiments';
        
        this.debug('constructor', 'Attempting to initialize editors');
        try {
            this.editors = {
                config: ace.edit('editor_config'),
                runs: ace.edit('editor_runs')
            };
            this.debug('constructor', 'Editors initialized successfully');
        } catch (error) {
            this.debug('constructor', 'Error initializing editors:', error);
        }

        // Initialize event handlers on document ready
        $(document).ready(() => {
            this.debug('constructor', 'Document ready, initializing components');
            this.initializeEventHandlers();
            this.initializeEditors();
            this.loadTemplates();
        });
    }

    updateTemplatesWithSelections() {
        const modelId = $('#model_dropdown').val();
        const datasetId = $('#dataset_dropdown').val();

        let configContent = this.editors.config.getValue();
        let runsContent = this.editors.runs.getValue();

        // Update config.yaml
        configContent = configContent.replace(/model:\n  name:.*/, `model:\n  name: ${modelId}`);
        configContent = configContent.replace(/dataset:\n  name:.*/, `dataset:\n  name: ${datasetId}`);

        // Update runs.py
        runsContent = runsContent.replace(/model = None.*/, `model = ${modelId}.Model()`);
        runsContent = runsContent.replace(/dataset = None.*/, `dataset = ${datasetId}.Dataset()`);

        this.editors.config.setValue(configContent, -1);
        this.editors.runs.setValue(runsContent, -1);
    }

    async submitRun() {
        try {
            const projectName = sessionStorage.getItem("project_name");
            if (!projectName) throw new Error("Please select a project first");

            const config = {
                name: this.config.name,
                type: this.config.type,
                description: this.config.description,
                model: {
                    module: this.config.modelId
                },
                dataset: {
                    module: this.config.datasetId
                },
                runs_py: this.editors.runs.getValue(),
                config_yaml: this.editors.config.getValue(),
                modules: this.getModulesContent()
            };

            const response = await fetch("/experiments/runs/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    project_name: projectName,
                    config: config
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            App.showNotification("Run created successfully!", "success");
            $('#run-wizard-modal').modal('hide');
            await this.loadRunsList();
        } catch (error) {
            console.error("Failed to submit run:", error);
            App.showNotification(error.message, "error");
        }
    }

    initializeEventHandlers() {
        this.debug('initializeEventHandlers', 'Setting up event handlers');

        // Wizard navigation buttons
        $('#run_wizard_next').on('click', () => {
            this.debug('initializeEventHandlers', 'Next button clicked');
            this.handleNextStep();
        });
        
        $('#run_wizard_back').on('click', () => {
            this.debug('initializeEventHandlers', 'Back button clicked');
            this.handlePreviousStep();
        });
        
        // Modal events
        $('#run-wizard-modal').on('shown.bs.modal', () => {
            this.debug('initializeEventHandlers', 'Modal shown');
            this.resetWizard();
            if (this.editors.runs) {
                this.editors.runs.resize();
            }
            if (this.editors.config) {
                this.editors.config.resize();
            }
        });

        this.debug('initializeEventHandlers', 'Event handlers initialized');
    }

    initializeEventHandlers() {
        // Wizard navigation buttons
        $('#run_wizard_next').on('click', () => this.handleNextStep());
        $('#run_wizard_back').on('click', () => this.handlePreviousStep());
        
        // Initialize run modal events
        $('#run-wizard-modal').on('shown.bs.modal', () => {
            this.resetWizard();
            if (this.editors.runs) {
                this.editors.runs.resize();
            }
            if (this.editors.config) {
                this.editors.config.resize();
            }
        });

        // Module button
        $('#addModuleButton').on('click', () => this.handleAddModule());
    }

    
    async loadTemplates() {
        try {
            // Fetch template contents
            const response = await fetch('/experiments/load_template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load templates');
            
            const templates = await response.json();
            
            if (templates.err) {
                throw new Error(templates.err);
            }

            // Set editor contents from templates
            if (this.editors.runs) {
                this.editors.runs.setValue(templates.runs_py || '', -1);
            }
            if (this.editors.config) {
                this.editors.config.setValue(templates.config_yaml || '', -1);
            }

            console.log('Templates loaded successfully');
        } catch (error) {
            console.error('Error loading templates:', error);
            App.showNotification('Error loading templates: ' + error.message, 'error');
        }
    }
    
    initializeEditors() {
        // Initialize Ace editors
        this.editors.runs = ace.edit('editor_runs');
        this.editors.runs.setTheme("ace/theme/monokai");
        this.editors.runs.session.setMode("ace/mode/python");
        this.editors.runs.setShowPrintMargin(false);

        this.editors.config = ace.edit('editor_config');
        this.editors.config.setTheme("ace/theme/monokai");
        this.editors.config.session.setMode("ace/mode/yaml");
        this.editors.config.setShowPrintMargin(false);

        // Set initial content
        this.setDefaultEditorContent();
    }

    
    handleNextStep() {
        this.debug('handleNextStep', `Current step: ${this.wizardConfig.step}`);
        
        // Validate current step
        if (!this.validateCurrentStep()) {
            this.debug('handleNextStep', 'Validation failed for current step');
            return;
        }

        if (this.wizardConfig.step < this.wizardConfig.totalSteps) {
            this.wizardConfig.step++;
            this.debug('handleNextStep', `Moving to step ${this.wizardConfig.step}`);
            this.updateWizardUI();
        } else {
            this.debug('handleNextStep', 'On final step, submitting run');
            this.submitRun();
        }
    }

    handlePreviousStep() {
        if (this.wizardConfig.step > 1) {
            this.wizardConfig.step--;
            this.updateWizardUI();
        }
    }

    validateCurrentStep() {
        this.debug('validateCurrentStep', `Validating step ${this.wizardConfig.step}`);
        
        switch(this.wizardConfig.step) {
            case 1:
                const runName = $('#run_name').val();
                this.debug('validateCurrentStep', 'Step 1 - Run name:', runName);
                
                if (!runName) {
                    this.debug('validateCurrentStep', 'Step 1 validation failed: No run name');
                    App.showNotification("Run name is required", "error");
                    return false;
                }
                
                this.config.name = runName;
                this.config.type = $('#run_type').val();
                this.config.description = $('#run_description').val();
                
                this.debug('validateCurrentStep', 'Step 1 validation passed, config:', this.config);
                return true;

            case 2:
                const modelId = $('#model_dropdown').val();
                const datasetId = $('#dataset_dropdown').val();
                
                this.debug('validateCurrentStep', 'Step 2 - Model:', modelId, 'Dataset:', datasetId);
                
                if (!modelId || !datasetId) {
                    this.debug('validateCurrentStep', 'Step 2 validation failed: Missing model or dataset');
                    App.showNotification("Please select both model and dataset", "error");
                    return false;
                }
                
                this.config.modelId = modelId;
                this.config.datasetId = datasetId;
                this.updateTemplatesWithSelections();
                
                this.debug('validateCurrentStep', 'Step 2 validation passed');
                return true;

            case 3:
                this.debug('validateCurrentStep', 'Step 3 validation passed (no validation needed)');
                return true;

            default:
                this.debug('validateCurrentStep', `Unknown step ${this.wizardConfig.step}`);
                return true;
        }
    }

    resetWizard() {
        this.wizardConfig.step = 1;
        this.config = { name: 'Unnamed' };
        this.modules = [];
        this.updateWizardUI();

        // Reset form fields
        $('input, select, textarea').each(function() {
            $(this).val($(this).prop('defaultValue'));
        });
    }

    // Utility methods
    getStatusBadgeClass(status) {
        const classes = {
            'running': 'bg-green',
            'stopped': 'bg-yellow',
            'completed': 'bg-blue',
            'failed': 'bg-red',
            'pending': 'bg-gray'
        };
        return classes[status.toLowerCase()] || 'bg-secondary';
    }

    showEmptyState(title, message) {
        $('#runs_table_body').html(`
            <tr>
                <td colspan="8" class="text-center p-4">
                    <div class="empty">
                        <p class="empty-title">${title}</p>
                        <p class="empty-subtitle text-muted">${message}</p>
                    </div>
                </td>
            </tr>
        `);
    }

    showErrorState(error) {
        $('#runs_table_body').html(`
            <tr>
                <td colspan="8" class="text-center p-4">
                    <div class="empty">
                        <p class="empty-title">Error loading runs</p>
                        <p class="empty-subtitle text-muted">${error}</p>
                        <div class="empty-action">
                            <button onclick="Experiments.loadRunsList()" class="btn btn-primary">Retry</button>
                        </div>
                    </div>
                </td>
            </tr>
        `);
    }

    // SVG Icons
    getPlayIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" 
                     stroke-width="2" stroke="currentColor" fill="none">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M7 4v16l13 -8z"/>
                </svg>`;
    }

    getPauseIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" 
                     stroke-width="2" stroke="currentColor" fill="none">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <rect x="6" y="5" width="4" height="14" rx="1"/>
                    <rect x="14" y="5" width="4" height="14" rx="1"/>
                </svg>`;
    }

    getEditIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" 
                     stroke-width="2" stroke="currentColor" fill="none">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/>
                    <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"/>
                    <path d="M16 5l3 3"/>
                </svg>`;
    }

    getDeleteIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" 
                     stroke-width="2" stroke="currentColor" fill="none">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="4" y1="7" x2="20" y2="7"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/>
                    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>
                </svg>`;
    }

    async handleAddModule() {
        this.wizardConfig.moduleCount++;
        const moduleName = `module${this.wizardConfig.moduleCount}`;
        
        // Add new tab
        const tab = $(`
            <li class="nav-item">
                <a class="nav-link" id="${moduleName}-tab" data-bs-toggle="tab" href="#${moduleName}" role="tab">
                    ${moduleName}.py
                </a>
            </li>
        `);
        $('#runCodeTabs').append(tab);

        // Add new editor container
        const editorContainer = $(`
            <div class="tab-pane fade" id="${moduleName}" role="tabpanel">
                <div id="editor_${moduleName}" style="height: 400px;"></div>
            </div>
        `);
        $('#runCodeContent').append(editorContainer);

        // Initialize new editor
        const editor = ace.edit(`editor_${moduleName}`);
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/python");
        editor.setShowPrintMargin(false);
        editor.setValue(`# ${moduleName}.py\n\n`, -1);
        
        this.modules.push({
            name: moduleName,
            editor: editor
        });

        // Switch to new tab
        $(`#${moduleName}-tab`).tab('show');
    }

    async toggleRunStatus(runId, currentStatus) {
        try {
            const action = currentStatus === 'running' ? 'stop' : 'start';
            const projectName = sessionStorage.getItem("project_name");
            const response = await fetch(`/experiments/runs/${action}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    project_name: projectName,
                    run_id: runId
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            App.showNotification(`Run ${action}ed successfully!`, "success");
            await this.loadRunsList();
        } catch (error) {
            console.error("Failed to ${action} run:", error);
            App.showNotification(error.message, "error");
        }
    }

    updateWizardUI() {
        this.debug('updateWizardUI', `Updating UI for step ${this.wizardConfig.step}`);

        // Update step indicators
        this.debug('updateWizardUI', 'Updating step indicators');
        $('.step-item').removeClass('active');
        $(`#step${this.wizardConfig.step}-indicator`).addClass('active');

        // Show/hide content
        this.debug('updateWizardUI', 'Updating step content visibility');
        $('.step-content').hide();
        const currentContent = $(`#step${this.wizardConfig.step}_content`);
        this.debug('updateWizardUI', 'Current content element:', currentContent[0]);
        currentContent.show();

        // Update buttons
        const $backBtn = $('#run_wizard_back');
        const $nextBtn = $('#run_wizard_next');

        this.debug('updateWizardUI', 'Updating button states');
        $backBtn.prop('disabled', this.wizardConfig.step === 1);
        $nextBtn.text(this.wizardConfig.step === this.wizardConfig.totalSteps ? 'Create Run' : 'Next');

        // Resize editors if on step 3
        if (this.wizardConfig.step === 3) {
            this.debug('updateWizardUI', 'On step 3, resizing editors');
            Object.values(this.editors).forEach(editor => {
                try {
                    editor.resize();
                    this.debug('updateWizardUI', 'Editor resized successfully');
                } catch (error) {
                    this.debug('updateWizardUI', 'Error resizing editor:', error);
                }
            });
        }
    }
    

    async showDeleteConfirmation(runId) {
        const modal = new bootstrap.Modal(document.getElementById('delete-confirm-modal'));
        const confirmButton = document.getElementById('confirm-delete-btn');
        
        // Remove any existing click handlers
        confirmButton.replaceWith(confirmButton.cloneNode(true));
        const newConfirmButton = document.getElementById('confirm-delete-btn');
        
        // Add click handler
        newConfirmButton.addEventListener('click', async () => {
            try {
                const projectName = sessionStorage.getItem("project_name");
                if (!projectName) throw new Error("Project name is missing");

                const response = await fetch("/experiments/runs/delete", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        project_name: projectName,
                        run_id: runId
                    })
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                if (data.error) throw new Error(data.error);

                modal.hide();
                App.showNotification("Run deleted successfully!", "success");
                await this.loadRunsList();

            } catch (error) {
                console.error("Failed to delete run:", error);
                App.showNotification(error.message, "error");
        }
        });
        modal.show();
    }

    async editRun(runId) {
        try {
            const projectName = sessionStorage.getItem("project_name");
            if (!projectName) throw new Error("Project name is missing");

            const response = await fetch("/experiments/runs/get", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    project_name: projectName,
                    run_id: runId
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Populate form with run data
            $('#run_name').val(data.name || 'Unnamed');
            $('#run_type').val(data.type);
            $('#run_description').val(data.description || '');
            $('#model_dropdown').val(data.model);
            $('#dataset_dropdown').val(data.dataset);

            // Set editor contents
            this.editors.runs.setValue(data.runs_py || '', -1);
            this.editors.config.setValue(data.config_yaml || '', -1);

            // Handle additional modules if any
            if (data.modules) {
                Object.entries(data.modules).forEach(([name, content]) => {
                    this.handleAddModule();
                    const module = this.modules[this.modules.length - 1];
                    module.editor.setValue(content, -1);
                });
            }

            // Show modal in edit mode
            const modal = document.getElementById('run-wizard-modal');
            modal.setAttribute('data-mode', 'edit');
            modal.setAttribute('data-run-id', runId);
            modal.querySelector('.modal-title').textContent = 'Edit Run';
            
            new bootstrap.Modal(modal).show();

        } catch (error) {
            console.error("Failed to edit run:", error);
                App.showNotification(error.message, "error");
        }
    }
    
}

// Initialize and expose to window
const ExperimentsInstance = new Experiments();
window.Experiments = ExperimentsInstance;
