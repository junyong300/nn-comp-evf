/**
 * experiments.js
 * Handles the experiments/runs management interface
 */

// Global state for run wizard
const RunWizard = {
    currentStep: 1,
    config: {
        basic: {
            name: '',
            type: 'train',
            description: ''
        },
        training: {
            batchSize: 32,
            epochs: 100,
            learningRate: 0.001,
            optimizer: 'adam',
            scheduler: 'cosine'
        },
        selection: {
            modelId: null,
            datasetId: null
        }
    }
};

// Initialize when document is ready
$(document).ready(function() {
    console.log('Initializing experiments page...');
    initializeHandlers();
    loadRunsList();
    loadModelOptions();
    loadDatasetOptions();
});

function updateWizardUI() {
    const step = RunWizard.currentStep;
    console.log('Updating UI for step:', step);

    // Hide all step contents
    $('.step-content').hide();

    // Show the current step content
    $(`#step${step}_content`).fadeIn();

    // Update progress indicators
    $('.step-item').removeClass('active');
    for (let i = 1; i <= step; i++) {
        $(`#step${i}-indicator`).addClass('active');
    }

    // Update button states
    $('#run_wizard_back').prop('disabled', step === 1);
    $('#run_wizard_next').text(step === 3 ? 'Create Run' : 'Next');

    // Update form fields with the values from RunWizard.config
    updateFormFields(step);
}

function updateFormFields(step) {
    const config = RunWizard.config;

    if (step === 1) {
        // Basic configuration
        $('#run_name').val(config.basic.name);
        $('#run_type').val(config.basic.type);
        $('#run_description').val(config.basic.description);
    } else if (step === 2) {
        // Training configuration
        $('#batch_size').val(config.training.batchSize);
        $('#epochs').val(config.training.epochs);
        $('#learning_rate').val(config.training.learningRate);
        $('#optimizer').val(config.training.optimizer);
        $('#scheduler').val(config.training.scheduler);
    } else if (step === 3) {
        // Selection configuration
        $('#model_dropdown').val(config.selection.modelId);
        $('#dataset_dropdown').val(config.selection.datasetId);
    }
}

function resetWizard() {
    console.log('Resetting wizard');  // Debug log
    RunWizard.currentStep = 1;
    RunWizard.config = {
        basic: {
            name: '',
            type: 'train',
            description: ''
        },
        training: {
            batchSize: 32,
            epochs: 100,
            learningRate: 0.001,
            optimizer: 'adam',
            scheduler: 'cosine'
        },
        selection: {
            modelId: null,
            datasetId: null
        }
    };

    updateWizardUI();
}

/**
 * Initialize all event handlers
 */
function initializeHandlers() {
    console.log('Setting up event handlers...');
    
    // Remove any existing handlers first
    $('#create_run_btn').off();
    $('#run_wizard_next').off('click');
    $('#run_wizard_back').off('click');

    $('#run_wizard_next').on('click', handleWizardNext);
    $('#run_wizard_back').on('click', handleWizardBack);

    $('#run-wizard-modal').off();
    $('#id_project').off();

    // Create new run button
    $('#create_run_btn').on('click', function(e) {
        e.preventDefault();
        console.log('Opening create run modal');
        resetWizard();
        const modal = new bootstrap.Modal(document.getElementById('run-wizard-modal'));
        modal.show();
    });

    // Form input handlers
    bindFormInputs();

    // Modal reset
    $('#run-wizard-modal').on('hidden.bs.modal', function() {
        console.log('Modal hidden, resetting wizard');
        resetWizard();
    });

    // Project change handler
    $('#id_project').on('change', function() {
        console.log('Project changed');
        loadRunsList();
    });
}

/**
 * Bind all form input handlers
 */
function bindFormInputs() {
    // Step 1: Basic Info
    $('#run_name').on('input', function(e) {
        const value = $(this).val().trim();
        console.log('Run name changed:', value);
        RunWizard.config.basic.name = value;  // Directly update the state
        
        // Optional: Real-time validation feedback
        if (value) {
            $(this).removeClass('is-invalid').addClass('is-valid');
        } else {
            $(this).removeClass('is-valid').addClass('is-invalid');
        }
    });

    $('#run_type').on('change', function(e) {
        const value = $(this).val();
        console.log('Run type changed:', value);
        RunWizard.config.basic.type = value;
        updateTrainingConfigVisibility(value);
    });

    $('#run_description').on('input', function(e) {
        RunWizard.config.basic.description = $(this).val().trim();
    });

    // Step 2: Training Config
    $('#batch_size').on('input', function(e) {
        const value = parseInt(e.target.value);
        console.log('Batch size changed:', value);
        updateConfig('training', 'batchSize', value);
    });

    $('#epochs').on('input', function(e) {
        const value = parseInt(e.target.value);
        console.log('Epochs changed:', value);
        updateConfig('training', 'epochs', value);
    });

    $('#learning_rate').on('input', function(e) {
        const value = parseFloat(e.target.value);
        console.log('Learning rate changed:', value);
        updateConfig('training', 'learningRate', value);
    });

    $('#optimizer').on('change', function(e) {
        console.log('Optimizer changed:', e.target.value);
        updateConfig('training', 'optimizer', e.target.value);
    });

    $('#scheduler').on('change', function(e) {
        console.log('Scheduler changed:', e.target.value);
        updateConfig('training', 'scheduler', e.target.value);
    });

    // Step 3: Model & Dataset Selection
    $('#model_dropdown').on('change', function(e) {
        const value = $(this).val();
        console.log('Model selected:', value);
        RunWizard.config.selection.modelId = value;
    });

    $('#dataset_dropdown').on('change', function(e) {
        const value = $(this).val();
        console.log('Dataset selected:', value);
        RunWizard.config.selection.datasetId = value;
    });
}

/**
 * Update configuration state
 */
function updateConfig(section, field, value) {
    console.log(`Updating config - ${section}.${field}:`, value);
    RunWizard.config[section][field] = value;
}

/**
 * Handle next button click in wizard
 */
async function handleWizardNext(e) {
    // Prevent default button action
    e && e.preventDefault();
    
    console.log('=== Next Button Clicked ===');
    console.log('Current step:', RunWizard.currentStep);

    // Now call validation
    console.log('Starting validation for step:', RunWizard.currentStep);
    const isValid = await validateStep();
    console.log('Validation completed with result:', isValid);

    if (!isValid) {
        console.log('Validation failed, stopping');
        return false;
    }

    // If validation passed, proceed
    if (RunWizard.currentStep < 3) {
        RunWizard.currentStep++;
        console.log('Moving to step:', RunWizard.currentStep);
        updateWizardUI();
        
        if (RunWizard.currentStep === 3) {
            try {
                await loadModelListDropdown('model_dropdown');
                await loadDatasetListDropdown('dataset_dropdown');
            } catch (error) {
                console.error('Error loading models/datasets:', error);
                alert("Error loading models or datasets");
                return false;
            }
        }
    } else {
        await submitRun();
    }

    return true;
}

/**
 * Handle back button click in wizard
 */
function handleWizardBack(e) {
    // Prevent default button action
    e && e.preventDefault();

    if (RunWizard.currentStep > 1) {
        RunWizard.currentStep--;
        updateWizardUI();
    }
}

/**
 * Validate the current step
 */
async function validateStep() {
    console.log('=== Validating Step ===');
    console.log('Step:', RunWizard.currentStep);
    console.log('Current config:', RunWizard.config);

    try {
        switch (RunWizard.currentStep) {
            case 1: {
                const name = RunWizard.config.basic.name;
                const type = RunWizard.config.basic.type;
                
                console.log('Validating step 1:', { name, type });

                if (!name || name.trim() === '') {
                    console.log('Name validation failed');
                    $('#run_name').addClass('is-invalid').focus();
                    alert("Run name is required");
                    return false;
                }

                $('#run_name').removeClass('is-invalid');
                console.log('Step 1 validation passed');
                return true;
            }

            case 2: {
                console.log('Validating step 2');
                if (RunWizard.config.basic.type === 'train' || 
                    RunWizard.config.basic.type === 'finetune') {
                    
                    const batchSize = parseInt($('#batch_size').val());
                    const epochs = parseInt($('#epochs').val());
                    const learningRate = parseFloat($('#learning_rate').val());

                    console.log('Validating training params:', {
                        batchSize, epochs, learningRate
                    });

                    if (!batchSize || batchSize <= 0) {
                        $('#batch_size').addClass('is-invalid').focus();
                        alert("Invalid batch size");
                        return false;
                    }

                    if (!epochs || epochs <= 0) {
                        $('#epochs').addClass('is-invalid').focus();
                        alert("Invalid number of epochs");
                        return false;
                    }

                    if (!learningRate || learningRate <= 0) {
                        $('#learning_rate').addClass('is-invalid').focus();
                        alert("Invalid learning rate");
                        return false;
                    }

                    // Update config with validated values
                    RunWizard.config.training = {
                        batchSize,
                        epochs,
                        learningRate,
                        optimizer: $('#optimizer').val(),
                        scheduler: $('#scheduler').val()
                    };
                }

                console.log('Step 2 validation passed');
                return true;
            }

            case 3: {
                console.log('Validating step 3');
                if (!RunWizard.config.selection.modelId) {
                    alert("Please select a model");
                    return false;
                }

                if (!RunWizard.config.selection.datasetId) {
                    alert("Please select a dataset");
                    return false;
                }

                console.log('Step 3 validation passed');
                return true;
            }

            default: {
                console.error('Invalid step:', RunWizard.currentStep);
                return false;
            }
        }
    } catch (error) {
        console.error('Validation error:', error);
        alert("An error occurred during validation");
        return false;
    }
}

/**
 * Loads and displays the list of runs for the current project
 */
async function loadRunsList() {
    try {
        const projectName = sessionStorage.getItem("project_name");
        if (!projectName) {
            console.log("No project selected");
            // Show empty state
            showEmptyState("No project selected", "Please select a project to view runs.");
            return;
        }

        console.log("Loading runs for project:", projectName);
        
        // Show loading state
        showLoadingState();

        const response = await fetch("/experiments/runs/list", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ project_name: projectName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received runs data:", data);

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.runs || data.runs.length === 0) {
            showEmptyState("No runs found", "Click 'New Run' to create your first run.");
            return;
        }

        updateRunsTable(data.runs);

    } catch (error) {
        console.error("Failed to load runs:", error);
        showErrorState(error.message);
    }
}

/**
 * Updates the runs table with the provided data
 */
function updateRunsTable(runs) {
    const tableBody = $('#runs_table_body');
    tableBody.empty();

    runs.forEach(run => {
        const row = `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <span class="text-truncate">${run.name}</span>
                    </div>
                </td>
                <td>
                    <span class="text-muted">${run.type}</span>
                </td>
                <td>
                    <span class="text-truncate">${run.model}</span>
                </td>
                <td>
                    <span class="text-truncate">${run.dataset}</span>
                </td>
                <td>
                    <span class="badge bg-${getStatusBadgeColor(run.status)}">
                        ${run.status}
                    </span>
                </td>
                <td class="w-25">
                    <div class="progress">
                        <div class="progress-bar" style="width: ${run.progress || 0}%">
                            ${run.progress || 0}%
                        </div>
                    </div>
                </td>
                <td class="text-end">
                    <div class="dropdown">
                        <button class="btn btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                            Actions
                        </button>
                        <div class="dropdown-menu dropdown-menu-end">
                            ${getRunActionButtons(run)}
                        </div>
                    </div>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
}

/**
 * Shows loading state in the table
 */
function showLoadingState() {
    const tableBody = $('#runs_table_body');
    tableBody.html(`
        <tr>
            <td colspan="7" class="text-center p-4">
                <div class="d-flex flex-column align-items-center">
                    <div class="spinner-border text-primary mb-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div>Loading runs...</div>
                </div>
            </td>
        </tr>
    `);
}

/**
 * Shows empty state in the table
 */
function showEmptyState(title, message) {
    const tableBody = $('#runs_table_body');
    tableBody.html(`
        <tr>
            <td colspan="7" class="text-center p-4">
                <div class="empty">
                    <div class="empty-icon">
                        <!-- Add an appropriate icon -->
                    </div>
                    <p class="empty-title">${title}</p>
                    <p class="empty-subtitle text-muted">${message}</p>
                </div>
            </td>
        </tr>
    `);
}

/**
 * Shows error state in the table
 */
function showErrorState(error) {
    const tableBody = $('#runs_table_body');
    tableBody.html(`
        <tr>
            <td colspan="7" class="text-center p-4">
                <div class="empty">
                    <div class="empty-icon">
                        <!-- Add an appropriate icon -->
                    </div>
                    <p class="empty-title">Error loading runs</p>
                    <p class="empty-subtitle text-muted">${error}</p>
                    <div class="empty-action">
                        <button onclick="loadRunsList()" class="btn btn-primary">
                            Retry
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `);
}

/**
 * Helper function to get the appropriate badge color for a status
 */
function getStatusBadgeColor(status) {
    switch (status.toLowerCase()) {
        case 'running': return 'blue';
        case 'completed': return 'green';
        case 'failed': return 'red';
        case 'pending': return 'yellow';
        default: return 'secondary';
    }
}

/**
 * Helper function to get the action buttons for a run
 */
function getRunActionButtons(run) {
    const buttons = [];
    
    if (run.status === 'running') {
        buttons.push(`
            <a class="dropdown-item" href="#" onclick="stopRun('${run.id}')">
                Stop
            </a>
        `);
    }
    
    if (run.status === 'completed') {
        buttons.push(`
            <a class="dropdown-item" href="#" onclick="viewResults('${run.id}')">
                Results
            </a>
        `);
    }
    
    buttons.push(`
        <a class="dropdown-item" href="#" onclick="deleteRun('${run.id}')">
            Delete
        </a>
    `);

    return buttons.join('');
}

async function submitRun() {
    const selectedModelModule = $('#model_dropdown').val();  // Get selected model
    const selectedDatasetModule = $('#dataset_dropdown').val();  // Get selected dataset
    const experimentName = $('#run_name').val() || 'my_experiment';
    const epochs = parseInt($('#epochs').val()) || 10;
    const batchSize = parseInt($('#batch_size').val()) || 32;
    const learningRate = parseFloat($('#learning_rate').val()) || 0.001;
    const optimizer = $('#optimizer').val() || 'adam';
    const scheduler = $('#scheduler').val() || 'cosine';

    console.log('Selected Model Module:', selectedModelModule);
    console.log('Selected Dataset Module:', selectedDatasetModule);

    try {
        const projectName = sessionStorage.getItem("project_name");
        if (!projectName) {
            alert("Project name is missing. Please select a project.");
            return;
        }

        // Ensure RunWizard.config is an object
        RunWizard.config = RunWizard.config || {};

        // Add collected data to RunWizard.config
        RunWizard.config.experiment_name = experimentName;
        RunWizard.config.model = {
            module: selectedModelModule,
            name: selectedModelModule  // Adjust if you have a display name
        };
        RunWizard.config.dataset = {
            module: selectedDatasetModule,
            name: selectedDatasetModule  // Adjust if you have a display name
        };
        RunWizard.config.training = {
            epochs: epochs,
            batch_size: batchSize,
            learning_rate: learningRate,
            optimizer: optimizer,
            scheduler: scheduler
        };
        // Add other configurations if necessary
        RunWizard.config.training_count = 1000;  // Update as needed
        RunWizard.config.validation_count = 200;  // Update as needed
        RunWizard.config.libs = ['torch', 'numpy'];  // Update as needed

        // Generate yaml_content
        RunWizard.config.yaml_content = generateYamlContent(RunWizard.config);

        console.log('Submitting run with config:', RunWizard.config);

        const response = await fetch("/experiments/runs/create", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                project_name: projectName,
                config: RunWizard.config
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        alert("Run created successfully!");
        const modal = bootstrap.Modal.getInstance(document.getElementById('run-wizard-modal'));
        modal.hide();

        loadRunsList();

    } catch (error) {
        console.error("Failed to submit run:", error);
        alert("Failed to create run: " + error.message);
    }
}


// Additional functions as needed, such as stopRun, viewResults, deleteRun

// Update training config visibility based on run type
function updateTrainingConfigVisibility(type) {
    if (type === 'train' || type === 'finetune') {
        $('#training_config_fields').show();
    } else {
        $('#training_config_fields').hide();
    }
}
/**
 * Function to generate YAML content from the configuration object
 * @param {Object} config - The configuration object
 * @returns {string} - The YAML content as a string
 */
function generateYamlContent(config) {
    // Build the YAML content
    let yamlContent = `
        experiment_name: '${config.experiment_name || 'my_experiment'}'
        model:
        module: '${config.model.module}'
        name: '${config.model.name}'
        dataset:
        module: '${config.dataset.module}'
        name: '${config.dataset.name}'
        training:
        epochs: ${config.training.epochs}
        batch_size: ${config.training.batch_size}
        `;

    // Return the generated YAML content
    return yamlContent;
}

function loadModelOptions() {
    const modelDropdown = $('#model_dropdown');
    modelDropdown.empty();  // Clear existing options

    // Example models; replace with your actual data
    const models = [
        { module: 'vit_b_16', name: 'ViT Base 16' },
        { module: 'resnet50', name: 'ResNet-50' },
        // Add more models as needed
    ];

    models.forEach(model => {
        modelDropdown.append(new Option(model.name, model.module));
    });
}

function loadDatasetOptions() {
    const datasetDropdown = $('#dataset_dropdown');
    datasetDropdown.empty();  // Clear existing options

    // Example datasets; replace with your actual data
    const datasets = [
        { module: 'CIFAR10', name: 'CIFAR-10' },
        { module: 'CIFAR100', name: 'CIFAR-100' },
        // Add more datasets as needed
    ];

    datasets.forEach(dataset => {
        datasetDropdown.append(new Option(dataset.name, dataset.module));
    });
}

