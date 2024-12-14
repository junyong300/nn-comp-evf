

class Experiments {

    constructor() {
        console.log('Constructor called');
        // Log initial state
        console.log('Initial wizardConfig:', this.wizardConfig);
        console.log('Initial editors:', this.editors);
        console.log('Initial config:', this.config);
        console.log('Initial modules:', this.modules);
        
        // Before initialization
        console.log('Starting event handler initialization');
        this.initializeEventHandlers();
        console.log('Starting runs list initialization');
        this.loadRunsList();
        console.log('Constructor complete');
    }

    initializeEditors() {
        console.log('initializeEditors called');
        if (typeof ace === 'undefined') {
            console.error('Ace editor not loaded');
            return;
        }
        console.log('Initializing ace editors');
        try {
            this.editors = {
                runs: ace.edit('editor_runs'),
                config: ace.edit('editor_config')
            };
            console.log('Editors created:', this.editors);
            
            this.editors.runs.setTheme("ace/theme/monokai");
            this.editors.runs.session.setMode("ace/mode/python");
            console.log('Runs editor configured');
            
            this.editors.config.setTheme("ace/theme/monokai"); 
            this.editors.config.session.setMode("ace/mode/yaml");
            console.log('Config editor configured');
 
        } catch (error) {
            console.error('Editor initialization error:', error);
        }
    }
 
    async updateTemplatesWithSelections(modelId, datasetId) {
        console.log('updateTemplatesWithSelections called with:', {modelId, datasetId});
        
        if (!modelId || !datasetId) {
            console.log('Missing modelId or datasetId, returning');
            return;
        }
        
        console.log('Getting current editor values');
        let configContent = this.editors.config.getValue();
        let runsContent = this.editors.runs.getValue();
        
        console.log('Original config content:', configContent);
        configContent = configContent.replace(/model:\n\s*name:.*/, `model:\n  name: ${modelId}`);
        console.log('Updated config content:', configContent);
        
        console.log('Original runs content:', runsContent); 
        runsContent = runsContent.replace(/model = None.*/, `model = "${modelId}"`);
        console.log('Updated runs content:', runsContent);
        
        console.log('Setting updated content to editors');
        this.editors.config.setValue(configContent, -1);
        this.editors.runs.setValue(runsContent, -1);
        console.log('Template update complete');
    }
 
    async submitRun() {
        console.log('submitRun called');
        try {
            const projectName = sessionStorage.getItem("project_name");
            console.log('Project name:', projectName);
            
            if (!projectName) {
                console.error('No project name found');
                throw new Error("Please select a project first");
            }
 
            const timestamp = new Date().toISOString()
                .replace(/[^0-9]/g, '')
                .slice(0, 14);
            console.log('Generated timestamp:', timestamp);
 
            console.log('Building config object');
            const config = {
                name: this.config.name,
                type: this.config.type || 'train',
                // ... rest of config build
            };
            console.log('Built config:', config);
 
            console.log('Sending create request');
            const response = await fetch("/experiments/runs/create", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    project_name: projectName,
                    run_id: timestamp, 
                    config: config
                })
            });
            console.log('Create response received:', response);
 
            // ... rest of function
        } catch (error) {
            console.error("Submit run error:", error);
        }
    }
 
    initializeEventHandlers() {
        console.log('initializeEventHandlers called');
 
        console.log('Binding class methods');
        this.handleNextStep = this.handleNextStep.bind(this);
        this.handlePreviousStep = this.handlePreviousStep.bind(this);
        this.deleteRun = this.deleteRun.bind(this);
 
        console.log('Setting up wizard button handlers');
        $('#run_wizard_next').on('click', () => {
            console.log('Next button clicked');
            this.handleNextStep();
        });
 
        console.log('Setting up modal handlers');
        $('#run-wizard-modal').on('shown.bs.modal', async () => {
            console.log('Wizard modal shown');
            // ... modal setup code
        });
 
        console.log('Setting up delete modal handlers');
        $('#delete-confirm-modal').on('show.bs.modal', (event) => {
            console.log('Delete modal show triggered');
            const runId = $(event.relatedTarget).data('run-id');
            console.log('Run ID for deletion:', runId);
            $('#confirm-delete-btn').data('run-id', runId);
        });
 
        // ... rest of handlers
 
        console.log('Event handlers initialization complete');
    }
 
    destroyEditors() {
        console.log('destroyEditors called');
 
        if (this.editors.runs) {
            console.log('Destroying runs editor');
            this.editors.runs.destroy();
            this.editors.runs = null;
        }
 
        if (this.editors.config) {
            console.log('Destroying config editor');
            this.editors.config.destroy(); 
            this.editors.config = null;
        }
 
        if (this.modules?.length > 0) {
            console.log('Destroying module editors');
            this.modules.forEach(module => {
                if (module.editor) {
                    console.log('Destroying module:', module.name);
                    module.editor.destroy();
                    module.editor = null;
                }
            });
            this.modules = [];
            this.wizardConfig.moduleCount = 0;
        }
        console.log('Editor destruction complete');
    }
 
    async loadTemplates() {
        console.log('loadTemplates called');
        try {
            if (!this.editors.runs || !this.editors.config) {
                console.log('Editors not initialized, returning');
                return;
            }
 
            console.log('Fetching templates');
            const response = await fetch('/experiments/load_template', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'}
            });
            console.log('Template response:', response);
 
            const data = await response.json();
            console.log('Template data:', data);
 
            console.log('Setting editor contents');
            if (this.editors.runs) {
                this.editors.runs.setValue(data.runs_py || '', -1);
            }
            if (this.editors.config) {
                this.editors.config.setValue(data.config_yaml || '', -1);
            }
 
            console.log('Template loading complete');
        } catch (error) {
            console.error('Template loading error:', error);
        }
    }
 
    getModulesContent() {
        console.log('getModulesContent called');
        const modulesContent = {};
 
        if (this.modules?.length > 0) {
            console.log('Processing modules:', this.modules.length);
            this.modules.forEach(module => {
                if (module.name && module.editor) {
                    console.log('Getting content for module:', module.name);
                    modulesContent[module.name] = module.editor.getValue();
                }
            });
        }
 
        console.log('Modules content:', modulesContent);
        return modulesContent;
    }
    
    handlePreviousStep() {
        if (this.wizardConfig.step > 1) {
            this.wizardConfig.step--;
            this.updateWizardUI();
        }
    }

    async validateCurrentStep() {
        try {
            switch(this.wizardConfig.step) {
                case 1:
                    const runName = $('#run_name').val();
                    if (!runName) {
                        App.showNotification("Run name is required", "error");
                        return false;
                    }
                    
                    this.config.name = runName;
                    this.config.type = $('#run_type').val();
                    this.config.description = $('#run_description').val();
                    
                    return true;
    
                case 2:
                    const modelId = $('#model_dropdown').val();
                    const datasetId = $('#dataset_dropdown').val();
                    
                    if (!modelId || !datasetId) {
                        App.showNotification("Please select both model and dataset", "error");
                        return false;
                    }
                    
                    this.config.modelId = modelId;
                    this.config.datasetId = datasetId;
                    
                    await this.updateTemplatesWithSelections(modelId, datasetId);
                    
                    return true;
    
                case 3:
                    return true;
    
                default:
                    return true;
            }
        } catch (error) {
            App.showNotification("Validation error: " + error.message, "error");
            return false;
        }
    }
    
    async handleNextStep() {
        try {
            // Validate current step
            const isValid = await this.validateCurrentStep();
            if (!isValid) {
                return;
            }

            if (this.wizardConfig.step < this.wizardConfig.totalSteps) {
                this.wizardConfig.step++;
                this.updateWizardUI();
            } else {
                await this.submitRun();
            }
        } catch (error) {
            App.showNotification(error.message, "error");
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

    async loadRunsList() {
        console.log('loadRunsList called');

        try {
            const projectName = sessionStorage.getItem("project_name");
            if (!projectName) {
                this.showEmptyState("No Project Selected", "Please select a project first");
                return;
            }

            const response = await fetch("/experiments/runs/list", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    project_name: projectName
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            const tableBody = $('#runs_table_body');
            tableBody.empty();

            if (!data.runs || data.runs.length === 0) {
                this.showEmptyState("No Runs Found", "Create a new run to get started");
                return;
            }

            // Populate the table with runs
            data.runs.forEach(run => {
                const row = $(`
                    <tr data-run-id="${run.id}">
                        <td>${run.name || 'Unnamed Run'}</td>
                        <td>${run.id}</td>
                        <td>${run.type || 'N/A'}</td>
                        <td>${run.model || 'N/A'}</td>
                        <td>${run.dataset || 'N/A'}</td>
                        <td><span class="badge ${this.getStatusBadgeClass(run.status)}">${run.status}</span></td>
                        <td>
                            <div class="progress progress-sm">
                                <div class="progress-bar" style="width: ${run.progress || 0}%" 
                                    role="progressbar" aria-valuenow="${run.progress || 0}" 
                                    aria-valuemin="0" aria-valuemax="100">
                                    <span class="sr-only">${run.progress || 0}% Complete</span>
                                </div>
                            </div>
                        </td>
                        <td class="text-center">
                            <div class="btn-list flex-nowrap">
                                <button class="btn btn-sm btn-icon toggle-status-btn" 
                                        title="${run.status === 'running' ? 'Stop' : 'Start'} Run">
                                    ${run.status === 'running' ? this.getPauseIcon() : this.getPlayIcon()}
                                </button>
                                <button class="btn btn-sm btn-icon edit-run-btn" 
                                        title="Edit Run">
                                    ${this.getEditIcon()}
                                </button>
                                <button class="btn btn-sm btn-icon" 
                                        data-bs-toggle="modal"
                                        data-bs-target="#delete-confirm-modal" 
                                        data-run-id="${run.id}"
                                        title="Delete Run">
                                    ${this.getDeleteIcon()}
                                </button>
                            </div>
                        </td>
                    </tr>
                `);

                // Add event handlers to the buttons
                row.find('.toggle-status-btn').on('click', () => this.toggleRunStatus(run.id, run.status));
                row.find('.edit-run-btn').on('click', () => this.editRun(run.id));
                // Delete button now uses data attributes to trigger modal
                row.find('.delete-run-btn').attr({
                    'data-bs-toggle': 'modal',
                    'data-bs-target': '#delete-confirm-modal',
                    'data-run-id': run.id
                });
                tableBody.append(row);
            });

        } catch (error) {
            console.error("Failed to load runs:", error);
            this.showErrorState(error.message);
        }
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

        try {
            // Initialize new editor
            const editor = ace.edit(`editor_${moduleName}`);
            editor.setTheme("ace/theme/monokai");
            editor.session.setMode("ace/mode/python");
            editor.setShowPrintMargin(false);
            editor.setValue(`# ${moduleName}.py\n\n`, -1);
            
            // Add to modules array with proper structure
            this.modules.push({
                name: moduleName,
                editor: editor
            });
    
            // Switch to new tab
            $(`#${moduleName}-tab`).tab('show');
            
            // Ensure editor is properly sized
            editor.resize();
        } catch (error) {
            console.error(`Failed to initialize module editor: ${error}`);
            App.showNotification("Failed to create new module", "error");
        }
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
            console.error(`Failed to ${action} run:`, error);
            App.showNotification(error.message, "error");
        }
    }

    updateWizardUI() {
        // Update step indicators
        $('.step-item').removeClass('active');
        $(`#step${this.wizardConfig.step}-indicator`).addClass('active');

        // Show/hide content
        $('.step-content').hide();
        const currentContent = $(`#step${this.wizardConfig.step}_content`);
        currentContent.show();

        // Update buttons
        const $backBtn = $('#run_wizard_back');
        const $nextBtn = $('#run_wizard_next');

        $backBtn.prop('disabled', this.wizardConfig.step === 1);
        $nextBtn.text(this.wizardConfig.step === this.wizardConfig.totalSteps ? 'Create Run' : 'Next');

        // Resize editors if on step 3
        if (this.wizardConfig.step === 3) {
            Object.values(this.editors).forEach(editor => {
                try {
                    editor.resize();
                } catch (error) {
                    console.error('Error resizing editor:', error);
                }
            });
        }
    }

    async deleteRun(runId) {
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
    
            App.showNotification("Run deleted successfully!", "success");
            await this.loadRunsList();
    
        } catch (error) {
            console.error("Failed to delete run:", error);
            App.showNotification(error.message, "error");
        }
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
    
            // Store the data for later use when the modal is shown
            this.editRunData = data;
    
            // Set the modal to 'edit' mode
            const modal = document.getElementById('run-wizard-modal');
            modal.setAttribute('data-mode', 'edit');
            modal.setAttribute('data-run-id', runId);
    
            // Show modal
            new bootstrap.Modal(modal).show();
    
        } catch (error) {
            console.error("Failed to edit run:", error);
            App.showNotification(error.message, "error");
        }
    }
}

// Initialize and expose to window
$(document).ready(function() {
    const ExperimentsInstance = new Experiments();
    window.Experiments = ExperimentsInstance;
});
