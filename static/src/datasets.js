$(document).ready(function () {
    // Initialize Ace Editors
    var editorConfigYaml = ace.edit("editor_config_yaml");
    editorConfigYaml.setTheme("ace/theme/monokai");
    editorConfigYaml.session.setMode("ace/mode/yaml");
    editorConfigYaml.setOptions({
        maxLines: Infinity,
        minLines: 30
    });

    var editorDatasetPy = ace.edit("editor_dataset_py");
    editorDatasetPy.setTheme("ace/theme/monokai");
    editorDatasetPy.session.setMode("ace/mode/python");
    editorDatasetPy.setOptions({
        maxLines: Infinity,
        minLines: 30
    });

    var editorCollateFnPy = ace.edit("editor_collate_fn_py");
    editorCollateFnPy.setTheme("ace/theme/monokai");
    editorCollateFnPy.session.setMode("ace/mode/python");
    editorCollateFnPy.setOptions({
        maxLines: Infinity,
        minLines: 30
    });

    // Modal Event Listener - Populate Editors with Template Content
    $('#id_modal_create_dataset').on('show.bs.modal', function () {
        $.get('/datasets/load_template', function (data) {
            if (data.error) {
                toastr.error(data.error, "Error");
            } else {
                editorConfigYaml.setValue(data.config, -1);
                editorDatasetPy.setValue(data.dataset, -1);
                editorCollateFnPy.setValue(data.collate_fn, -1);
            }
        }).fail(function () {
            toastr.error("Failed to load template files.", "Error");
        });
    });

    // Handle Create Dataset Button Click
    $('#id_create_dataset_ok').click(async function () {
        const datasetName = $('#id_dataset_name').val();
        const datasetPath = $('#id_dataset_path').val();
        const datasetShape = $('#id_dataset_shape').val();
        const datasetMode = $('#id_dataset_mode').val();

        if (!datasetName || !datasetPath || !datasetShape || !datasetMode) {
            toastr.error("Please fill in all the required fields.", "Error");
            return;
        }

        const payload = {
            meta: {
                dataset_name: datasetName,
                dataset_path: datasetPath,
                dataset_shape: datasetShape,
                dataset_mode: datasetMode
            },
            config: editorConfigYaml.getValue(),
            dataset: editorDatasetPy.getValue(),
            collate_fn: editorCollateFnPy.getValue(),
            project_name: sessionStorage.getItem('project_name')
        };

        try {
            const response = await fetch(`/datasets/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!data.error) {
                toastr.success("Dataset created successfully!");
                $('#id_modal_create_dataset').modal('hide');
                loadDatasetList();
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Create dataset error:", error);
            toastr.error("Failed to create dataset.", "Error");
        }
    });



    async function loadDatasetList() {
        try {
            const response = await fetch(`/datasets/list`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_name: sessionStorage.getItem('project_name') })
            });

            const data = await response.json();
            if (!data.error) {
                updateDatasetTable(data.datasets);
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Load dataset list error:", error);
            toastr.error("Failed to load datasets.", "Error");
        }
    }

    function updateDatasetTable(datasets) {
        const $tableBody = $('#id_table_body_datasets');
        $tableBody.empty();
    
        if (datasets.length === 0) {
            $tableBody.append('<tr><td colspan="6" class="text-center">No datasets available</td></tr>');
        } else {
            datasets.forEach((dataset, index) => {
                const $row = $(`
                    <tr draggable="true" data-index="${index}" data-name="${dataset.dataset_name}">
                        <td class="drag-handle" style="cursor: move; width: 30px;">
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <line x1="4" y1="6" x2="20" y2="6" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <line x1="4" y1="18" x2="20" y2="18" />
                            </svg>
                        </td>
                        <td>${dataset.dataset_name}</td>
                        <td>${dataset.dataset_path}</td>
                        <td>${dataset.dataset_shape}</td>
                        <td>${dataset.dataset_mode}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-2" onclick="editDataset('${dataset.dataset_name}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteDataset('${dataset.dataset_name}')">Delete</button>
                        </td>
                    </tr>
                `);
                $tableBody.append($row);
            });
        }
    
        initDragAndDrop();
    }

    function initDragAndDrop() {
        const rows = document.querySelectorAll('#id_table_body_datasets tr');
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

                // Update the DOM
                if (draggedIndex < droppedIndex) {
                    this.parentNode.insertBefore(draggedRow, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedRow, this);
                }

                // Save the new order
                saveNewOrder();
            });
        });
    }

    async function saveNewOrder() {
        const newOrder = [];
        document.querySelectorAll('#id_table_body_datasets tr').forEach(row => {
            newOrder.push(row.dataset.name);
        });

        try {
            const response = await fetch('/datasets/reorder', {
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

    window.editDataset = function (datasetName) {
        $.ajax({
            url: '/datasets/list',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ project_name: sessionStorage.getItem('project_name') }),
            success: function (data) {
                if (data.error) {
                    toastr.error(data.error, "Error");
                } else {
                    const dataset = data.datasets.find(d => d.dataset_name === datasetName);
                    if (dataset) {
                        $('#id_dataset_name').val(dataset.dataset_name);
                        $('#id_dataset_path').val(dataset.dataset_path);
                        $('#id_dataset_shape').val(dataset.dataset_shape);
                        $('#id_dataset_mode').val(dataset.dataset_mode);
                        editorConfigYaml.setValue(dataset.config || '', -1);
                        editorDatasetPy.setValue(dataset.dataset || '', -1);
                        editorCollateFnPy.setValue(dataset.collate_fn || '', -1);
                        $('#id_modal_create_dataset').modal('show');
                    }
                }
            },
            error: function () {
                toastr.error("Failed to load dataset list.", "Error");
            }
        });
    };

    window.deleteDataset = async function (datasetName) {
        if (!confirm("Are you sure you want to delete this dataset?")) return;

        try {
            const response = await fetch(`/datasets/delete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: datasetName, project_name: sessionStorage.getItem('project_name') })
            });

            const data = await response.json();
            if (!data.error) {
                toastr.success("Dataset deleted successfully!");
                loadDatasetList();
            } else {
                toastr.error(data.error, "Error");
            }
        } catch (error) {
            console.error("Delete dataset error:", error);
            toastr.error("Failed to delete dataset.", "Error");
        }
    };

    loadDatasetList();
});
