// Global state management
var App = (function() {
    var AppState = {
        lastSelectedOption: "dashboard",
        backup_ok: null,
        currentProject: null,
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
        },
        projects: [],
        models: [],
        datasets: []
    };
    
    function initializeEventHandlers() {
        // Modal handlers
        $('#id_create_project_ok').click(handleCreateProject);
        $('#id_delete_project_ok').click(handleDeleteProject);
        $('#id_logout_ok').click(handleLogout);

        // Project change handler
        $('#id_project').on('change', function() {
            const selectedProject = $(this).val();
            if (selectedProject) {
                AppState.currentProject = selectedProject;
                sessionStorage.setItem("project_name", selectedProject);
                handleProjectChange(selectedProject);
            }
        });

        // Sidebar navigation handlers
        $('#sidebar_dashboard').click(() => handleSidebarClick('dashboard'));
        $('#sidebar_datasets').click(() => handleSidebarClick('datasets'));
        $('#sidebar_models').click(() => handleSidebarClick('models'));
        $('#sidebar_experiments').click(() => handleSidebarClick('experiments'));
        $('#sidebar_optimizations').click(() => handleSidebarClick('optimizations'));
        $('#sidebar_deployment').click(() => handleSidebarClick('deployment'));
        $('#sidebar_monitoring').click(() => handleSidebarClick('monitoring'));
    }
    
    $(document).ready(function() {
        initializeEventHandlers();
        loadProjects();
    });


    function handleCreateProject() {
        const projectName = $("#id_project_name").val();
        if (!validateProjectName(projectName)) {
            showNotification("Project name is not valid! (only letters, numbers, - and _ are allowed)", "error");
            return;
        }

        createProject(projectName);
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
                AppState.currentProject = projectName;
                sessionStorage.setItem("project_name", projectName);
                showNotification("Project created successfully!", "success");
                $("#id_modal_create_project").modal('hide');
                await loadProjects();
            } else {
                showNotification(data.err, "error");
            }
        } catch (error) {
            console.error("Create project error:", error);
            showNotification("Failed to create project", "error");
        }
    }

    function validateProjectName(name) {
        return /^[a-zA-Z0-9_-]+$/.test(name);
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
                await loadProjects();
                clearProjectRelatedItems();
            } else {
                showNotification(data.err, "error");
            }
        } catch (error) {
            console.error("Delete project error:", error);
            showNotification("Failed to delete project", "error");
            await loadProjects();
        }
    }

    async function loadProjects() {
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
        const $projectSelect = $('#id_project');
        $projectSelect.empty();
    
        // Get current project from storage or state
        let currentProject = sessionStorage.getItem("project_name") || AppState.currentProject;
    
        // Create a default "Select Project" option
        const defaultOption = new Option('Select Project', '', !currentProject, !currentProject);
        $projectSelect.append(defaultOption);
    
        if (data.projects && data.projects.length > 0) {
            // If no current project but we have projects, use the first one
            if (!currentProject || currentProject === "undefined") {
                currentProject = data.projects[0];
                AppState.currentProject = currentProject;
                sessionStorage.setItem("project_name", currentProject);
            }
    
            // Populate dropdown with projects
            data.projects.forEach(project => {
                const isSelected = project === currentProject;
                const option = new Option(project, project, isSelected, isSelected);
                $projectSelect.append(option);
            });
    
            // Ensure the dropdown shows the current selection
            $projectSelect.val(currentProject);
        }
    
        // Update button visibility
        const hasProjects = data.projects && data.projects.length > 0;
        $('[data-bs-target="#id_modal_delete_project"]').prop('disabled', !hasProjects);
    
        // Trigger projectChanged event if we have a current project
        if (currentProject && currentProject !== "undefined") {
            const event = new CustomEvent('projectChanged', { 
                detail: { projectName: currentProject } 
            });
            document.dispatchEvent(event);
        }
    
        // Show create project dialog if no projects exist
        if (!hasProjects) {
            $("#id_modal_create_project").modal('show');
        }
    }

    function updateUIForProject(projectName) {
        // Update any UI elements that depend on the current project
        // This will be called after project changes
        if (AppState.lastSelectedOption) {
            loadContentBasedOnCurrentView(AppState.lastSelectedOption);
        }
    
        // Update page title or other elements if needed
        document.title = `${projectName} - Edge Vision Framework`;
    }

    async function handleProjectChange(projectName) {
        // Update state and storage
        AppState.currentProject = projectName;
        sessionStorage.setItem("project_name", projectName);
        console.log('Project changed to:', projectName);

        // Notify other components about project change
        const event = new CustomEvent('projectChanged', { 
            detail: { projectName: projectName } 
        });
        document.dispatchEvent(event);
        updateUIForProject(projectName);
    }

    function handleSidebarClick(section) {
        AppState.lastSelectedOption = section;
        loadContentBasedOnCurrentView();
    }

    async function loadContentBasedOnCurrentView(view) {
        const projectName = AppState.currentProject;
        if (!projectName) return;

        // Clear existing content
        clearProjectRelatedItems();

        // Load appropriate content based on view
        switch(view) {
            case 'datasets':
                if (window.DatasetManager) {
                    await window.DatasetManager.loadDatasetList();
                }                break;
            case 'models':
                if (window.ModelsManager) {
                    await window.ModelsManager.loadModelList();
                }                break;
            case 'experiments':
                if (window.Experiments) {
                    await window.Experiments.loadRunsList();
                }                break;
            // ... other cases
        }
    }

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

    async function handleNextStepInCreateExperiment() {
        const experimentName = $("#id_experiment_name").val();
        if (!validateExperimentName(experimentName)) {
            showNotification("Experiment name is not valid! (only letters, numbers, - and _ are allowed)", "error");
            return;
        }

        createExperiment(experimentName);
    }
    async function createExperiment(experimentName) {
        try {
            const response = await fetch("/experiment/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ experiment_name: experimentName })
            });

            const data = await response.json();
            if (!data.err) {
                showNotification("Experiment created successfully!", "success");
            } else {
                showNotification(data.err, "error");
            }

            // Load the next step in the create experiment process
            loadNextStepInCreateExperiment();
        } catch (error) {
            console.error("Create experiment error:", error);
            showNotification("Failed to create experiment", "error");
            loadNextStepInCreateExperiment();
        }
    }

    async function loadNextStepInCreateExperiment() {
        try {
            const response = await fetch("/experiment/list", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            const data = await response.json();
            if (!data.err) {
                updateCreateExperimentForm(data.res);
            } else {
                showNotification(data.err, "error");
            }
        } catch (error) {
            console.error("Load next step in create experiment error:", error);
            showNotification("Failed to load next step", "error");
        }
    }

    function updateCreateExperimentForm(data) {
        // Update the form based on the data from the server
        $("#id_experiment_name").val(data.experiment_name);
        $("#id_project_id").val(data.project_id);

        // Show the experiment creation dialog
        $("#id_modal_create_experiment").modal('show');
    }

    // Event listeners for project changes
    document.addEventListener('DOMContentLoaded', function() {
        // Initial load
        loadProjects();

        // Listen for storage changes (for multi-tab support)
        window.addEventListener('storage', function(e) {
            if (e.key === 'project_name') {
                const newProject = e.newValue;
                if (newProject !== AppState.currentProject) {
                    AppState.currentProject = newProject;
                    handleProjectChange(newProject);
                }
            }
        });
    });

    return {
        AppState: AppState,
        showNotification: showNotification,
        loadProjects: loadProjects,
        getCurrent: () => AppState.currentProject,
        handleNextStepInCreateExperiment: handleNextStepInCreateExperiment,
    };
    })();

    window.App = App;
