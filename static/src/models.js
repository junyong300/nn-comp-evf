$(document).ready(function () {
    // Initialize Ace Editors
    var editorConfigYaml = ace.edit("editor_config_yaml");
    editorConfigYaml.setTheme("ace/theme/monokai");
    editorConfigYaml.session.setMode("ace/mode/yaml");
    editorConfigYaml.setOptions({
        maxLines: Infinity,
        minLines: 30
    });

    var editorModelPy = ace.edit("editor_model_py");
    editorModelPy.setTheme("ace/theme/monokai");
    editorModelPy.session.setMode("ace/mode/python");
    editorModelPy.setOptions({
        maxLines: Infinity,
        minLines: 30
    });

    // Modal Event Listener - Populate Editors with Template Content
    $('#id_modal_create_model').on('show.bs.modal', function () {
        // Load default content from templates
        $.get('/models/load_template', function (data) {
            if (data.error) {
                toastr.error(data.err, "Error");
            } else {
                editorConfigYaml.setValue(data.config, -1);
                editorModelPy.setValue(data.model, -1);
            }
        }).fail(function () {
            toastr.error("Failed to load template files.", "Error");
        });
    });

    $('#id_create_model_ok').click(async function () {
        const modelName = $('#id_model_name').val();
        const modelType = $('#id_model_type').val();
        const modelArchitecture = $('#id_model_architecture').val();
    
        // Validate input fields
        if (!modelName || !modelType || !modelArchitecture) {
            console.error("Validation failed: Missing input fields");
            toastr.error("Please fill in all the required fields.", "error");
            return;
        }
    
        // Debug input values
        console.log("Model Name:", modelName);
        console.log("Model Type:", modelType);
        console.log("Model Architecture:", modelArchitecture);
    
        const configYamlContent = editorConfigYaml.getValue();
        const modelPyContent = editorModelPy.getValue();
    
        // Prepare payload
        const payload = {
            meta: {
                model_name: modelName,
                model_type: modelType,
                model_architecture: modelArchitecture
            },
            config: configYamlContent,
            model: modelPyContent,
            project_name: sessionStorage.getItem('project_name')
        };
    
        try {
            console.log("Sending payload to /models/save:", payload); // Debug log
            const response = await fetch(`/models/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
    
            const data = await response.json();
            if (!data.error) {
                console.log("Response from server:", data); // Debug log
                toastr.success("Model created successfully!", "success");
                $('#id_modal_create_model').modal('hide');
                loadModelList();
            } else {
                console.error("Error response from server:", data.error);
                toastr.error(data.error, "error");
            }
        } catch (error) {
            console.error("Error during create model request:", error);
            toastr.error("Failed to create model.", "error");
        }
    });
    

    // Function to Load Model List
    async function loadModelList() {
        try {
            const response = await fetch(`/models/list`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ project_name: sessionStorage.getItem('project_name') })
            });

            const data = await response.json();
            if (!data.error) {
                updateModelTable(data.models);
            } else {
                toastr.error(data.err, "Error");
            }
        } catch (error) {
            console.error("Load model list error:", error);
            toastr.error("Failed to load models. Please ensure the server is running and the project name is correctly provided.", "Error");
        }
    }

    function updateModelTable(models) {
        const $tableBody = $('#id_table_body_models');
        $tableBody.empty();
    
        if (models.length === 0) {
            $tableBody.append('<tr><td colspan="5" class="text-center">No models available</td></tr>');
        } else {
            models.forEach((model, index) => {
                const $row = $(`
                    <tr draggable="true" data-index="${index}" data-name="${model.model_name}">
                        <td class="drag-handle" style="cursor: move;">
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <line x1="4" y1="6" x2="20" y2="6" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <line x1="4" y1="18" x2="20" y2="18" />
                            </svg>
                        </td>
                        <td>${model.model_name}</td>
                        <td>${model.model_type}</td>
                        <td>${model.model_architecture}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-2" onclick="editModel('${model.model_name}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteModel('${model.model_name}')">Delete</button>
                        </td>
                    </tr>
                `);
                $tableBody.append($row);
            });
        }
    
        // Add drag and drop functionality
        initDragAndDrop();
    }
    
    function initDragAndDrop() {
        const rows = document.querySelectorAll('#id_table_body_models tr');
        let draggedRow = null;
    
        rows.forEach(row => {
            row.addEventListener('dragstart', function(e) {
                draggedRow = this;
                this.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
            });
    
            row.addEventListener('dragend', function(e) {
                this.style.opacity = '1';
                rows.forEach(row => row.classList.remove('drag-over'));
            });
    
            row.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
    
            row.addEventListener('dragenter', function(e) {
                this.classList.add('drag-over');
            });
    
            row.addEventListener('dragleave', function(e) {
                this.classList.remove('drag-over');
            });
    
            row.addEventListener('drop', function(e) {
                e.preventDefault();
                if (this === draggedRow) return;
    
                let allRows = [...rows];
                const draggedIndex = allRows.indexOf(draggedRow);
                const droppedIndex = allRows.indexOf(this);
    
                if (draggedIndex < droppedIndex) {
                    this.parentNode.insertBefore(draggedRow, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedRow, this);
                }
    
                saveNewOrder();
            });
        });
    }
    
    async function saveNewOrder() {
        const newOrder = [];
        document.querySelectorAll('#id_table_body_models tr').forEach(row => {
            newOrder.push(row.dataset.name);
        });
    
        try {
            const response = await fetch('/models/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: sessionStorage.getItem('project_name'),
                    order: newOrder
                })
            });
    
            const data = await response.json();
            if (data.error) {
                toastr.error(data.error);
            }
        } catch (error) {
            console.error('Failed to save new order:', error);
            toastr.error('Failed to save the new order');
        }
    }

    // Handle Edit Model
    window.editModel = function (modelName) {
        $.ajax({
            url: '/models/list',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ project_name: sessionStorage.getItem('project_name') }),
            success: function (data) {
                if (data.error) {
                    toastr.error(data.err, "Error");
                } else {
                    const model = data.models.find(m => m.model_name === modelName);
                    if (model) {
                        $('#id_model_name').val(model.model_name);
                        $('#id_model_type').val(model.model_type);
                        $('#id_model_architecture').val(model.model_architecture);
                        editorConfigYaml.setValue(model.config || '', -1);
                        editorModelPy.setValue(model.model || '', -1);
                        $('#id_modal_create_model').modal('show');
                    }
                }
            },
            error: function () {
                toastr.error("Failed to load model list.", "Error");
            }
        });
    };

    // Handle Delete Model
    window.deleteModel = async function (modelName) {
        if (!confirm("Are you sure you want to delete this model?")) {
            return;
        }

        try {
            const response = await fetch(`/models/delete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: modelName, project_name: sessionStorage.getItem('project_name') })
            });

            const data = await response.json();
            if (!data.error) {
                toastr.success("Model deleted successfully!");
                loadModelList();
            } else {
                toastr.error(data.err, "Error");
            }
        } catch (error) {
            console.error("Delete model error:", error);
            toastr.error("Failed to delete model.", "Error");
        }
    };

    // Initial Load of Model List
    loadModelList();
});
