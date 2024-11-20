// Function to load dataset list and populate a dropdown
async function loadDatasetListDropdown(dropdownId) {
    const project = sessionStorage.getItem("project_name");
    if (!project) {
        alert("Project name is missing. Please select a project.");
        return;
    }

    try {
        const response = await fetch("/datasets/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_name: project })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.datasets) {
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
            defaultOption.textContent = "Select a dataset";
            dropdown.appendChild(defaultOption);

            // Populate dropdown with datasets
            data.datasets.forEach(dataset => {
                const option = document.createElement("option");
                option.value = dataset.dataset_name;
                option.textContent = `${dataset.dataset_name} (${dataset.mode})`;
                dropdown.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading datasets:", error);
        alert("Failed to load datasets");
    }
}



function loadDatasetList() {
    const datasetList = document.getElementById("datasets_table_body");
    // if (!datasetList) {
    //     console.error("Error: 'datasets_table_body' element not found.");
    //     return;
    // }
    const project = sessionStorage.getItem("project_name");
    // if (!project) {
    //     alert("Project name is missing. Please select a project.");
    //     return;
    // }

    fetch("/datasets/list", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ project_name: project })
    })
    .then(response => response.json())
    .then(data => {
        if (data.datasets) {
            const datasetList = document.getElementById("id_table_body");
            datasetList.innerHTML = ""; // Clear existing rows
            data.datasets.forEach(dataset => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${dataset.dataset_name}</td>
                    <td>${dataset.dataset_path}</td>
                    <td>${dataset.task_type}</td>
                    <td>${dataset.mode}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="editDataset('${dataset.dataset_name}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDataset('${dataset.dataset_name}')">Delete</button>
                    </td>
                `;
                datasetList.appendChild(row);
            });
        }
    })
    .catch(error => console.error("Error loading datasets:", error));
}
document.addEventListener("DOMContentLoaded", function () {
    // Event listener for creating a new dataset
    document.getElementById("id_create_dataset").addEventListener("click", function () {
        // Set default values for a new dataset
        document.getElementById("dataset_name").value = "CIFAR100";
        document.getElementById("dataset_path").value = "/data/jyp/cifar100/";
        document.getElementById("task_type").value = "Classification";
        document.getElementById("mode").value = "train";

        // Fetch the default CIFAR100 template code from the server
        fetch("/datasets/load_template")
            .then(response => response.json())
            .then(data => {
                // Populate the editor tabs with the default CIFAR100 template code
                ace.edit("editor_config").setValue(data.config, -1);
                ace.edit("editor_dataset").setValue(data.dataset, -1);
                ace.edit("editor_collate_fn").setValue(data.collate_fn, -1);
            })
            .catch(error => console.error("Error loading template:", error));

        const modal = new bootstrap.Modal(document.getElementById("newDatasetModal"));
        modal.show();
    });

    // Event listener for saving a new or edited dataset
    document.getElementById("id_save_dataset").addEventListener("click", function () {
        const dataset = {
            meta: {
                dataset_name: document.getElementById("dataset_name").value,
                dataset_path: document.getElementById("dataset_path").value,
                task_type: document.getElementById("task_type").value,
                mode: document.getElementById("mode").value
            },
            config: ace.edit("editor_config").getValue(),
            dataset: ace.edit("editor_dataset").getValue(),
            collate_fn: ace.edit("editor_collate_fn").getValue()
        };

        // Define the folder structure based on the username and project
        const username = sessionStorage.getItem("username");
        const project = sessionStorage.getItem("project_name");
        if (!project) {
            alert("Project name is missing. Please select a project.");
            return;
        }
        const datasetFolderPath = `workspace/${username}/${project}/datasets/${dataset.meta.dataset_name}/`;

        // Add folder path to dataset object
        dataset.folder_path = datasetFolderPath;

        // Send a POST request to save the dataset configuration
        fetch("/datasets/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...dataset, project_name: project })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message); // Show success message
                window.location.reload(); // Reload to show the new dataset in the list
            } else if (data.error) {
                console.error("Save error:", data.error);
                alert("Error saving dataset: " + data.error);
            }
        });
    });


    // Call function to load datasets list on page load
    loadDatasetList();

    // Function to delete a dataset
    window.deleteDataset = function (datasetName) {
        const project = sessionStorage.getItem("project_name");
        if (!project) {
            alert("Project name is missing. Please select a project.");
            return;
        }

        if (confirm(`Are you sure you want to delete dataset '${datasetName}'?`)) {
            fetch("/datasets/delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name: datasetName, project_name: project })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    loadDatasetList(); // Reload the list of datasets
                } else if (data.error) {
                    console.error("Delete error:", data.error);
                    alert("Error deleting dataset: " + data.error);
                }
            });
        }
    };

    // Function to edit a dataset (fetch data and populate fields)
    window.editDataset = function (datasetName) {
        const project = sessionStorage.getItem("project_name");
        if (!project) {
            alert("Project name is missing. Please select a project.");
            return;
        }

        fetch(`/datasets/load_template?name=${datasetName}&project_name=${project}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById("dataset_name").value = data.meta.dataset_name;
                document.getElementById("dataset_path").value = data.meta.dataset_path;
                document.getElementById("task_type").value = data.meta.task_type;
                document.getElementById("mode").value = data.meta.mode;

                // Populate the editor tabs with the dataset code
                ace.edit("editor_config").setValue(data.config, -1);
                ace.edit("editor_dataset").setValue(data.dataset, -1);
                ace.edit("editor_collate_fn").setValue(data.collate_fn, -1);

                // Show the modal for editing
                const modal = new bootstrap.Modal(document.getElementById("newDatasetModal"));
                modal.show();
            })
            .catch(error => console.error("Error loading dataset for edit:", error));
    };
});

window.loadDatasetListDropdown = loadDatasetListDropdown;
