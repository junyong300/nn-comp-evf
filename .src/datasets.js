class DatasetsManagerClass {
    constructor() {
        this.editors = {
            config: null,
            dataset: null,
            collate_fn: null
        };

        // Bind methods to this instance
        this.loadDatasetList = this.loadDatasetList.bind(this);
        this.handleCreateDataset = this.handleCreateDataset.bind(this);
        this.handleSaveDataset = this.handleSaveDataset.bind(this);
        this.editDataset = this.editDataset.bind(this);
        this.deleteDataset = this.deleteDataset.bind(this);

        // Initialize when document is ready
        $(document).ready(() => {
            this.initializeEventHandlers();
            this.loadDatasetList();
        });
    }

    initializeEventHandlers() {
        // Create dataset handler
        $('#newDatasetModal').on('shown.bs.modal', async () => {
            try {
                // Load template first
                const response = await fetch('/datasets/load_template');
                const data = await response.json();
                
                // Set default values
                $('#dataset_name').val('CIFAR100');
                $('#dataset_path').val('/data/jyp/cifar100/');
                $('#task_type').val('Classification');
                $('#mode').val('train');

                // Initialize editors
                this.initializeEditors();

                // Set editor values
                if (this.editors.config) this.editors.config.setValue(data.config || '', -1);
                if (this.editors.dataset) this.editors.dataset.setValue(data.dataset || '', -1);
                if (this.editors.collate_fn) this.editors.collate_fn.setValue(data.collate_fn || '', -1);
                
                this.resizeEditors();
            } catch (error) {
                console.error('Error initializing modal:', error);
            }
        });
        // Save dataset handler
        $('#id_save_dataset').on('click', async () => {
            await this.handleSaveDataset();
            $('#newDatasetModal').modal('hide');
            this.loadDatasetList();
        });

        // Modal shown event - initialize editors
        $('#newDatasetModal').on('shown.bs.modal', () => {
            this.initializeEditors();
        });

        // Modal hidden event - cleanup editors
        $('#newDatasetModal').on('hidden.bs.modal', () => {
            this.destroyEditors();
        });

        // Listen for project changes
        // document.addEventListener('projectChanged', () => {
        //     this.loadDatasetList();
        // });
    }

    initializeEditors() {
        try {
            // Clean up any existing editors
            this.destroyEditors();

            // Initialize each editor
            this.editors.config = ace.edit('editor_config');
            this.editors.dataset = ace.edit('editor_dataset');
            this.editors.collate_fn = ace.edit('editor_collate_fn');

            // Configure editors
            Object.values(this.editors).forEach(editor => {
                editor.setTheme('ace/theme/monokai');
                editor.setShowPrintMargin(false);
                editor.renderer.setScrollMargin(10, 10);
            });

            // Set specific modes
            this.editors.config.session.setMode('ace/mode/yaml');
            this.editors.dataset.session.setMode('ace/mode/python');
            this.editors.collate_fn.session.setMode('ace/mode/python');

            // Resize editors
            setTimeout(() => this.resizeEditors(), 100);
        } catch (error) {
            console.error('Error initializing editors:', error);
            App.showNotification('Failed to initialize code editors', 'error');
        }
    }

    destroyEditors() {
        Object.entries(this.editors).forEach(([key, editor]) => {
            if (editor && typeof editor.destroy === 'function') {
                editor.destroy();
                this.editors[key] = null;
            }
        });
    }

    resizeEditors() {
        Object.values(this.editors).forEach(editor => {
            if (editor) editor.resize();
        });
    }

    async handleCreateDataset() {
        try {
            // Set default values
            document.getElementById('dataset_name').value = 'CIFAR100';
            document.getElementById('dataset_path').value = '/data/jyp/cifar100/';
            document.getElementById('task_type').value = 'Classification';
            document.getElementById('mode').value = 'train';
    
            // Load template
            const response = await fetch('/datasets/load_template');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
    
            // Initialize modal before showing it
            const modalEl = document.getElementById('newDatasetModal');
            if (!modalEl) throw new Error('Modal element not found');
    
            const modal = new bootstrap.Modal(modalEl, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
    
            modalEl.addEventListener('shown.bs.modal', () => {
                if (this.editors.config) this.editors.config.setValue(data.config || '', -1);
                if (this.editors.dataset) this.editors.dataset.setValue(data.dataset || '', -1);
                if (this.editors.collate_fn) this.editors.collate_fn.setValue(data.collate_fn || '', -1);
                this.resizeEditors();
            }, { once: true });
    
            modal.show();
    
        } catch (error) {
            console.error('Error creating dataset:', error);
            App.showNotification('Failed to create dataset: ' + error.message, 'error');
        }
    }

    async handleSaveDataset() {
        try {
            const dataset = {
                meta: {
                    dataset_name: $('#dataset_name').val(),
                    dataset_path: $('#dataset_path').val(),
                    task_type: $('#task_type').val(),
                    mode: $('#mode').val()
                },
                config: this.editors.config.getValue(),
                dataset: this.editors.dataset.getValue(),
                collate_fn: this.editors.collate_fn.getValue()
            };
    
            const response = await fetch('/datasets/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...dataset,
                    project_name: sessionStorage.getItem('project_name')
                })
            });
    
            const data = await response.json();
            if (data.error) throw new Error(data.error);
    
            $('#newDatasetModal').modal('hide');
            App.showNotification('Dataset saved successfully!', 'success');
            await this.loadDatasetList();
    
        } catch (error) {
            console.error('Error saving dataset:', error);
            App.showNotification(error.message, 'error');
        }
    }

    async loadDatasetList() {
        try {
            const project = sessionStorage.getItem('project_name');
            if (!project) {
                this.showEmptyState('No Project Selected', 'Please select a project first');
                return;
            }

            const response = await fetch('/datasets/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: project })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            this.updateDatasetTable(data.datasets || []);
        } catch (error) {
            console.error('Error loading datasets:', error);
            this.showErrorState(error.message);
        }
    }

    updateDatasetTable(datasets) {
        const tbody = $('#id_table_body');
        tbody.empty();

        if (datasets.length === 0) {
            this.showEmptyState('No Datasets Found', 'Click "New Dataset" to create one');
            return;
        }

        datasets.forEach(dataset => {
            const row = $(`
                <tr>
                    <td>${dataset.dataset_name}</td>
                    <td>${dataset.dataset_path}</td>
                    <td>${dataset.task_type}</td>
                    <td>${dataset.mode}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-secondary edit-dataset">Edit</button>
                            <button class="btn btn-sm btn-danger delete-dataset">Delete</button>
                        </div>
                    </td>
                </tr>
            `);

            // Attach event handlers
            row.find('.edit-dataset').on('click', () => this.editDataset(dataset.dataset_name));
            row.find('.delete-dataset').on('click', () => this.deleteDataset(dataset.dataset_name));

            tbody.append(row);
        });
    }

    showEmptyState(title, message) {
        $('#id_table_body').html(`
            <tr>
                <td colspan="5" class="text-center p-4">
                    <div class="empty">
                        <p class="empty-title">${title}</p>
                        <p class="empty-subtitle text-muted">${message}</p>
                    </div>
                </td>
            </tr>
        `);
    }

    showErrorState(error) {
        $('#id_table_body').html(`
            <tr>
                <td colspan="5" class="text-center p-4">
                    <div class="empty">
                        <p class="empty-title">Error loading datasets</p>
                        <p class="empty-subtitle text-muted">${error}</p>
                        <div class="empty-action">
                            <button onclick="DatasetsManager.loadDatasetList()" class="btn btn-primary">
                                Retry
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `);
    }

    async editDataset(datasetName) {
        try {
            const project = sessionStorage.getItem('project_name');
            if (!project) {
                throw new Error('Project name is missing. Please select a project.');
            }

            const response = await fetch(`/datasets/load_template?name=${datasetName}&project_name=${project}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Set form values
            document.getElementById('dataset_name').value = data.meta.dataset_name;
            document.getElementById('dataset_path').value = data.meta.dataset_path;
            document.getElementById('task_type').value = data.meta.task_type;
            document.getElementById('mode').value = data.meta.mode;

            // Show modal (will trigger editor initialization)
            const modal = new bootstrap.Modal(document.getElementById('newDatasetModal'));
            modal.show();

            // Set editor values after modal is shown
            setTimeout(() => {
                if (this.editors.config) this.editors.config.setValue(data.config || '', -1);
                if (this.editors.dataset) this.editors.dataset.setValue(data.dataset || '', -1);
                if (this.editors.collate_fn) this.editors.collate_fn.setValue(data.collate_fn || '', -1);
                this.resizeEditors();
            }, 100);

        } catch (error) {
            console.error('Error editing dataset:', error);
            App.showNotification('Failed to edit dataset: ' + error.message, 'error');
        }
    }

    async deleteDataset(datasetName) {
        try {
            if (!confirm(`Are you sure you want to delete dataset '${datasetName}'?`)) {
                return;
            }

            const project = sessionStorage.getItem('project_name');
            if (!project) {
                throw new Error('Project name is missing. Please select a project.');
            }

            const response = await fetch('/datasets/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: datasetName, 
                    project_name: project 
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            App.showNotification('Dataset deleted successfully!', 'success');
            await this.loadDatasetList();

        } catch (error) {
            console.error('Error deleting dataset:', error);
            App.showNotification('Failed to delete dataset: ' + error.message, 'error');
        }
    }

    async loadDatasetListDropdown(dropdownId) {
        try {
            const project = sessionStorage.getItem('project_name');
            if (!project) {
                throw new Error('Project name is missing. Please select a project.');
            }

            const response = await fetch('/datasets/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: project })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) {
                throw new Error(`Dropdown element with ID '${dropdownId}' not found.`);
            }

            // Clear existing options
            dropdown.innerHTML = '<option value="">Select a dataset</option>';

            // Populate dropdown
            if (data.datasets) {
                data.datasets.forEach(dataset => {
                    const option = document.createElement('option');
                    option.value = dataset.dataset_name;
                    option.textContent = `${dataset.dataset_name} (${dataset.mode})`;
                    dropdown.appendChild(option);
                });
            }

        } catch (error) {
            console.error('Error loading datasets dropdown:', error);
            App.showNotification('Failed to load datasets: ' + error.message, 'error');
        }
    }
}

// Initialize and expose to window
const DatasetsManager = new DatasetsManagerClass();
window.DatasetsManager = DatasetsManager;

// Export necessary methods globally
window.loadDatasetListDropdown = DatasetsManager.loadDatasetListDropdown.bind(DatasetsManager);