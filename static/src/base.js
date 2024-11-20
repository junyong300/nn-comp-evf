// Global state management
// Add to AppState
const AppState = {
    lastSelectedOption: "dashboard",
    backup_ok: null,
    currentRun: {
        step: 1,
        config: {
            basic: {
                name: '',
                type: 'train',
                description: '',
                tags: []
            },
            training: {
                batchSize: 32,
                epochs: 100,
                learningRate: 0.001,
                optimizer: 'adam',
                weightDecay: 0.01,
                scheduler: 'cosine'
            },
            selection: {
                modelId: '',
                datasetId: '',
                modelConfig: {},
                datasetConfig: {}
            }
        }
    }
};

function resetWizard() {
    // Reset the wizard to the initial step
    AppState.currentRun.step = 1;

    // Reset the run configuration to default values
    AppState.currentRun.config = {
        basic: {
            name: '',
            type: 'train',
            description: '',
            tags: []
        },
        training: {
            batchSize: 32,
            epochs: 100,
            learningRate: 0.001,
            optimizer: 'adam',
            weightDecay: 0.01,
            scheduler: 'cosine'
        },
        selection: {
            modelId: '',
            datasetId: '',
            modelConfig: {},
            datasetConfig: {}
        }
    };

    // Update the wizard UI to reflect the reset state
    updateRunWizardUI();
}

// Place this in base.js or experiments.js, before it's called
function updateRunWizardUI(step) {
    // Update the UI elements based on the current step
    // For example:

    // Remove 'active' class from all step indicators
    $('.step-item').removeClass('active');

    // Add 'active' class to the current step indicator
    $('#step' + step + '-indicator').addClass('active');

    // Hide all step contents
    $('.step-content').hide();

    // Show the current step content
    $('#step' + step + '_content').show();

    // Enable or disable the 'Back' button
    if (step === 1) {
        $('#run_wizard_back').prop('disabled', true);
    } else {
        $('#run_wizard_back').prop('disabled', false);
    }

    // Change the 'Next' button text if it's the last step
    if (step === totalSteps) {
        $('#run_wizard_next').text('Submit');
    } else {
        $('#run_wizard_next').text('Next');
    }
}


document.addEventListener("DOMContentLoaded", function() {
    // Initialize components
    initializeEventHandlers();
    loadProjectList();
    setupNotifications();
});

function initializeEventHandlers() {
    // Modal handlers
    $('#id_create_project_ok').click(handleCreateProject);
    $('#id_delete_project_ok').click(handleDeleteProject);
    $('#id_logout_ok').click(handleLogout);

    // Project change handler
    $('#id_project').change(handleProjectChange);

    // Sidebar navigation handlers
    $('#sidebar_dashboard').click(() => handleSidebarClick('dashboard'));
    $('#sidebar_datasets').click(() => handleSidebarClick('datasets'));
    $('#sidebar_models').click(() => handleSidebarClick('models'));
    $('#sidebar_experiments').click(() => handleSidebarClick('experiments'));
    $('#sidebar_optimizations').click(() => handleSidebarClick('optimizations'));
    $('#sidebar_deployment').click(() => handleSidebarClick('deployment'));
    $('#sidebar_monitoring').click(() => handleSidebarClick('monitoring'));

    // Run Management
    $('#create_run_btn').click(handleCreateRun);
    $('#run_wizard_next').click(handleRunWizardNext);
    $('#run_wizard_back').click(handleRunWizardBack);
    $('#run_wizard_modal').on('hidden.bs.modal', resetWizard);
}

function setupNotifications() {
    $.notify.defaults({
        globalPosition: 'bottom right',
        className: 'info',
        showDuration: 300,
        hideDuration: 300,
        autoHideDelay: 3000
    });
}
async function loadRuns(projectName) {
    try {
        const response = await fetch("/runs/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ project_name: projectName })
        });
        
        const data = await response.json();
        updateRunsTable(data.runs || []);
    } catch (error) {
        console.error("Load runs error:", error);
        showNotification("Failed to load runs", "error");
    }
}

function updateRunsTable(runs) {
    const tableBody = $('#id_table_body');
    tableBody.empty();

    runs.forEach(run => {
        const row = `
            <tr>
                <td>${run.name}</td>
                <td>${run.type}</td>
                <td>${run.status}</td>
                <td>${run.progress || 0}%</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editRun('${run.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRun('${run.id}')">Delete</button>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
}
function loadContentBasedOnCurrentView() {
    const projectName = sessionStorage.getItem("project_name");
    if (!projectName) return;

    switch (AppState.lastSelectedOption) {
        // ... existing cases ...
        case 'runs':
            loadRuns(projectName);
            break;
    }
}
// Project Management
function handleCreateProject() {
    const projectName = $("#id_project_name").val();
    if (!validateProjectName(projectName)) {
        showNotification("Project name is not valid! (only letters, numbers, - and _ are allowed)", "error");
        return;
    }

    createProject(projectName);
}

function validateProjectName(name) {
    const pattern = /^[A-Za-z0-9-_]+$/;
    return pattern.test(name);
}

async function createProject(projectName) {
    try {
        const response = await fetch("/project/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ project_name: projectName })
        });

        const data = await response.json();
        if (!data.err) {
            sessionStorage.setItem("project_name", projectName);
            showNotification("Project created successfully!", "success");
            $("#id_modal_create_project").modal('hide');
            $("#id_project_name").val("");
            await loadProjectList();
        } else {
            showNotification(data.err, "error");
        }
    } catch (error) {
        console.error("Create project error:", error);
        showNotification("Failed to create project", "error");
        await loadProjectList();
    }
}

// Add these functions
function handleCreateRun() {
    AppState.currentRun.step = 1;
    resetRunWizardState();
    updateRunWizardUI();
    $('#run_wizard_modal').modal('show');
}

function handleRunWizardNext() {
    if (!validateCurrentStep()) {
        return;
    }

    if (AppState.currentRun.step < 3) {
        AppState.currentRun.step++;
        updateRunWizardUI();
    } else {
        submitRunConfiguration();
    }
}

function handleRunWizardBack() {
    if (AppState.currentRun.step > 1) {
        AppState.currentRun.step--;
        updateRunWizardUI();
    }
}

function validateCurrentStep() {
    const step = AppState.currentRun.step;
    const config = AppState.currentRun.config;

    switch (step) {
        case 1:
            if (!config.basic.name) {
                showNotification("Run name is required", "error");
                return false;
            }
            break;
        case 2:
            if (config.training.batchSize <= 0 || config.training.epochs <= 0) {
                showNotification("Invalid training parameters", "error");
                return false;
            }
            break;
        case 3:
            if (!config.selection.modelId || !config.selection.datasetId) {
                showNotification("Please select both model and dataset", "error");
                return false;
            }
            break;
    }
    return true;
}

async function submitRunConfiguration() {
    const projectName = sessionStorage.getItem("project_name");
    try {
        const response = await fetch("/runs/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                project_name: projectName,
                config: AppState.currentRun.config
            })
        });

        const data = await response.json();
        if (!data.err) {
            showNotification("Run created successfully!", "success");
            $('#run_wizard_modal').modal('hide');
            loadRuns(projectName);  // Refresh runs list
        } else {
            showNotification(data.err, "error");
        }
    } catch (error) {
        console.error("Create run error:", error);
        showNotification("Failed to create run", "error");
    }
}

async function handleDeleteProject() {
    const projectName = $("#id_project").val();
    try {
        const response = await fetch("/project/delete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ project_name: projectName })
        });

        const data = await response.json();
        if (!data.err) {
            sessionStorage.removeItem("project_name");
            showNotification("Project deleted successfully!", "success");
            await loadProjectList();
            clearProjectRelatedItems();
        } else {
            showNotification(data.err, "error");
        }
    } catch (error) {
        console.error("Delete project error:", error);
        showNotification("Failed to delete project", "error");
        await loadProjectList();
    }
}

async function loadProjectList() {
    try {
        const response = await fetch("/project/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });

        const data = await response.json();
        if (!data.err) {
            updateProjectList(data.res);
        } else {
            showNotification(data.err, "error");
        }
    } catch (error) {
        console.error("Load project list error:", error);
        showNotification("Failed to load projects", "error");
    }
}

function updateProjectList(data) {
    let currentProject = sessionStorage.getItem("project_name");
    if (!currentProject || currentProject === "undefined") {
        if (data.projects.length > 0) {
            currentProject = data.projects[0];
            sessionStorage.setItem("project_name", currentProject);
        }
    }

    const projectOptions = data.projects
        .map(project => `<option ${project === currentProject ? 'selected' : ''}>${project}</option>`)
        .join('\n');
    
    $('#id_project').html(projectOptions);
    $('#id_project').trigger('change');

    // Show create project dialog if no projects exist
    if (data.projects.length === 0) {
        $("#id_modal_create_project").modal('show');
    }
}

// Navigation and Content Loading
function handleProjectChange() {
    const projectName = $("#id_project :selected").val();
    sessionStorage.setItem("project_name", projectName);
    loadContentBasedOnCurrentView();
}

function handleSidebarClick(section) {
    AppState.lastSelectedOption = section;
    loadContentBasedOnCurrentView();
}

function loadContentBasedOnCurrentView() {
    const projectName = sessionStorage.getItem("project_name");
    if (!projectName) return;

    switch (AppState.lastSelectedOption) {
        case 'dashboard':
            // loadDashboard(projectName);
            break;
        case 'datasets':
            loadDatasets(projectName);
            break;
        case 'models':
            loadModels(projectName);
            break;
        case 'experiments':
            loadExperiments(projectName);
            break;
        // Add other sections as needed
    }
}

// Content Loading Functions
async function loadDatasets(projectName) {
    try {
        const response = await fetch("/datasets/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ project_name: projectName })
        });
        
        const data = await response.json();
        updateDatasetTable(data.datasets || []);
    } catch (error) {
        console.error("Load datasets error:", error);
        showNotification("Failed to load datasets", "error");
    }
}

function updateDatasetTable(datasets) {
    const tableBody = $('#datasets_table_body');
    tableBody.empty();

    datasets.forEach(dataset => {
        const row = `
            <tr>
                <td>${dataset.name}</td>
                <td>${dataset.size}</td>
                <td>${dataset.created_at}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editDataset('${dataset.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDataset('${dataset.id}')">Delete</button>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
}



async function loadModels(projectName) {
    try {
        const response = await fetch("/models/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ project_name: projectName })
        });
        
        const data = await response.json();
        updateModelTable(data.models || []);
    } catch (error) {
        console.error("Load models error:", error);
        showNotification("Failed to load models", "error");
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    $.notify(message, {
        className: type,
        position: 'bottom right'
    });
}

function clearProjectRelatedItems() {
    $('#id_table_body').html("");
    // Clear any other project-specific content
}

async function handleLogout() {
    try {
        const response = await fetch("/auth/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (!data.err) {
            showNotification("Logout successful!", "success");
        } else {
            showNotification(data.err, "error");
        }

        sessionStorage.removeItem("project_name");
        window.location.href = "/";
    } catch (error) {
        console.error("Logout error:", error);
        showNotification("Failed to logout", "error");
        sessionStorage.removeItem("project_name");
        window.location.href = "/";
    }
}

// Export necessary functions for global use
window.handleCreateProject = handleCreateProject;
window.handleDeleteProject = handleDeleteProject;
window.handleLogout = handleLogout;