$(document).ready(function () {
    // ============================================================
    // 1) CREATE ALL ACE EDITORS UPFRONT
    // ============================================================
    // For Create modal:
    let editorEnginePy = ace.edit("editor_engine_py");
    editorEnginePy.setTheme("ace/theme/monokai");
    editorEnginePy.session.setMode("ace/mode/python");
    editorEnginePy.setOptions({
        maxLines: Infinity,
        minLines: 30,
        readOnly: false,
        highlightActiveLine: true,
        showPrintMargin: false
    });

    let editorConfigYaml = ace.edit("editor_config_yaml");
    editorConfigYaml.setTheme("ace/theme/monokai");
    editorConfigYaml.session.setMode("ace/mode/yaml");
    editorConfigYaml.setOptions({
        maxLines: Infinity,
        minLines: 30,
        readOnly: false,
        highlightActiveLine: true,
        showPrintMargin: false
    });

    // For Edit modal:
    let editorEditEnginePy = ace.edit("editor_edit_engine_py");
    editorEditEnginePy.setTheme("ace/theme/monokai");
    editorEditEnginePy.session.setMode("ace/mode/python");
    editorEditEnginePy.setOptions({
        maxLines: Infinity,
        minLines: 30,
        readOnly: false,
        highlightActiveLine: true,
        showPrintMargin: false
    });

    let editorConfigYamlEdit = ace.edit("editor_config_yaml_edit");
    editorConfigYamlEdit.setTheme("ace/theme/monokai");
    editorConfigYamlEdit.session.setMode("ace/mode/yaml");
    editorConfigYamlEdit.setOptions({
        maxLines: Infinity,
        minLines: 30,
        readOnly: false,
        highlightActiveLine: true,
        showPrintMargin: false
    });

    // Log viewer in a modal:
    let logViewerAce = ace.edit("id_modal_log_editor");
    logViewerAce.setTheme("ace/theme/monokai");
    logViewerAce.session.setMode("ace/mode/text");
    logViewerAce.setOptions({
        maxLines: Infinity,
        minLines: 10,
        readOnly: true,
        highlightActiveLine: false,
        showPrintMargin: false
    });

    let currentLogRunName = null; // track run logs

    // ============================================================
    // 2) CREATE MODAL HANDLERS FOR "CREATE" RUN
    // ============================================================
    $('#id_modal_create_run').on('shown.bs.modal', function () {
        // Clear or provide default content each time
        editorEnginePy.setValue('', -1);
        editorConfigYaml.setValue(
`misc:
  seed: 42
  log_dir: ./logs
  checkpoint_dir: ./checkpoints

training:
  epochs: 10
  num_gpus: 1
  batch_size: 32
  loss_function: CrossEntropyLoss

optimization:
  optimizer:
    name: Adam
    params:
      lr: 0.001

dataset:
  name: sample_dataset
  params: {}

model:
  name: sample_model
  params: {}
`, -1);

        $('#id_run_name').val('');
        $('#id_num_gpus').val('1');
        $('#id_generate_engine_code').prop('disabled', true);
    });

    // When Create modal opens, populate dropdowns
    $('#id_modal_create_run').on('show.bs.modal', function () {
        loadDropdowns('#id_select_model', '#id_select_dataset', '#id_select_optimization');
    });

    // ============================================================
    // Log Viewer Modal: On show, resize & scroll to bottom
    // ============================================================
    $('#id_modal_log_viewer').on('shown.bs.modal', function () {
        // Force Ace to recalc layout
        logViewerAce.resize();
        // Scroll to bottom:
        logViewerAce.renderer.updateFull();     // force a full redraw
        const lastLine = logViewerAce.session.getLength();
        logViewerAce.gotoLine(lastLine, 0, false);
    });

    // ============================================================
    // 3) EDIT MODAL HANDLERS
    // ============================================================
    $('#id_modal_edit_run').on('shown.bs.modal', function () {
        // Optionally clear or keep existing content
        editorEditEnginePy.setValue('', -1);
        editorConfigYamlEdit.setValue('', -1);
    });

    // When Edit modal opens, populate dropdowns
    $('#id_modal_edit_run').on('show.bs.modal', function () {
        loadDropdowns('#id_edit_select_model', '#id_edit_select_dataset', '#id_edit_select_optimization');
    });

    // ============================================================
    // 4) CREATE & EDIT RUN
    // ============================================================
    function checkSelectionsCreate() {
        const runName = $('#id_run_name').val().trim();
        const modelOK = $('#id_select_model').val() !== "";
        const dataOK  = $('#id_select_dataset').val() !== "";
        const optOK   = $('#id_select_optimization').val() !== "";
        const numGpus = $('#id_num_gpus').val().trim();
        const allOK   = runName && modelOK && dataOK && optOK && numGpus;
        $('#id_generate_engine_code').prop('disabled', !allOK);
    }
    $('#id_run_name, #id_select_model, #id_select_dataset, #id_select_optimization, #id_num_gpus')
      .on('input change', checkSelectionsCreate);

    function checkSelectionsEdit() {
        const runName = $('#id_edit_run_name').val().trim();
        const modelOK = $('#id_edit_select_model').val() !== "";
        const dataOK  = $('#id_edit_select_dataset').val() !== "";
        const optOK   = $('#id_edit_select_optimization').val() !== "";
        const numGpus = $('#id_edit_num_gpus').val().trim();
        const allOK   = runName && modelOK && dataOK && optOK && numGpus;
        $('#id_generate_edit_engine_code').prop('disabled', !allOK);
    }
    $('#id_edit_run_name, #id_edit_select_model, #id_edit_select_dataset, #id_edit_select_optimization, #id_edit_num_gpus')
      .on('input change', checkSelectionsEdit);

    function isValidName(name) {
        const reservedWords = ['import','from','as','class','def','return','pass','if','else','for','while'];
        const invalidPattern = /[^a-zA-Z0-9_]/;
        return !reservedWords.includes(name) && !invalidPattern.test(name);
    }

    // Generate engine.py (Create)
    async function generateEngineCodeCreate() {
        const modelName        = $('#id_select_model').val();
        const datasetName      = $('#id_select_dataset').val();
        const optimizationName = $('#id_select_optimization').val();
        const numGpus          = parseInt($('#id_num_gpus').val()) || 1;

        if (!modelName || !datasetName || !optimizationName || !numGpus) {
            toastr.error("Please ensure all fields are selected.");
            return;
        }
        try {
            const importRes  = await fetch(`/runs/get_template?file=import.txt`);
            if(!importRes.ok) throw new Error("Failed to fetch import.txt");
            const importTxt  = await importRes.text();

            const engineRes  = await fetch(`/runs/get_template?file=engine.txt`);
            if(!engineRes.ok) throw new Error("Failed to fetch engine.txt");
            const engineTxt  = await engineRes.text();

            let dynamic = `
from model.${modelName}.model import Model as _Model
from dataset.${datasetName}.datasets import Dataset as _Dataset
from optimization.${optimizationName}.optimize import Optimizer as _Optimization
`;
            let cudaDevices = '';
            for(let i=0; i<numGpus; i++){ cudaDevices += `${i}, `; }
            cudaDevices = cudaDevices.slice(0, -2);

            let finalCode = `
${importTxt}

${dynamic}
# Set CUDA devices
os.environ["CUDA_VISIBLE_DEVICES"] = "${cudaDevices}"
${engineTxt}`.trim();

            editorEnginePy.setValue(finalCode, -1);
            toastr.success("Engine code generated successfully.");

            const defConfig = `
misc:
  seed: 42
  log_dir: ./logs
  checkpoint_dir: ./checkpoints

training:
  epochs: 10
  num_gpus: ${numGpus}
  batch_size: 32
  loss_function: CrossEntropyLoss

optimization:
  optimizer:
    name: Adam
    params:
      lr: 0.001

dataset:
  name: ${datasetName}
  params: {}

model:
  name: ${modelName}
  params: {}
`.trim();
            editorConfigYaml.setValue(defConfig, -1);

        } catch(err){
            toastr.error("Failed to generate engine code.");
        }
    }
    $('#id_generate_engine_code').click(generateEngineCodeCreate);

    // Generate engine.py (Edit)
    async function generateEngineCodeEdit() {
        const modelName        = $('#id_edit_select_model').val();
        const datasetName      = $('#id_edit_select_dataset').val();
        const optimizationName = $('#id_edit_select_optimization').val();
        const numGpus          = parseInt($('#id_edit_num_gpus').val()) || 1;

        if(!modelName || !datasetName || !optimizationName || !numGpus){
            toastr.error("Please ensure all fields are selected.");
            return;
        }
        try {
            const importRes  = await fetch(`/runs/get_template?file=import.txt`);
            if(!importRes.ok) throw new Error("Failed to fetch import.txt");
            const importTxt  = await importRes.text();

            const engineRes  = await fetch(`/runs/get_template?file=engine.txt`);
            if(!engineRes.ok) throw new Error("Failed to fetch engine.txt");
            const engineTxt  = await engineRes.text();

            let dynamic = `
from model.${modelName}.model import Model as _Model
from dataset.${datasetName}.datasets import Dataset as _Dataset
from optimization.${optimizationName}.optimize import Optimizer as _Optimization
`;
            let cudaDevices='';
            for(let i=0; i<numGpus; i++){ cudaDevices += `${i}, `; }
            cudaDevices = cudaDevices.slice(0, -2);

            let finalCode=`
${importTxt}

${dynamic}
// Set CUDA devices
os.environ["CUDA_VISIBLE_DEVICES"] = "${cudaDevices}"
${engineTxt}
`.trim();

            editorEditEnginePy.setValue(finalCode, -1);
            toastr.success("Engine code generated successfully.");
        } catch(err){
            toastr.error("Failed to generate engine code.");
        }
    }
    $('#id_generate_edit_engine_code').click(generateEngineCodeEdit);

    // CREATE RUN
    $('#id_create_run_ok').click(async function(){
        const runName          = $('#id_run_name').val().trim();
        const modelName        = $('#id_select_model').val();
        const datasetName      = $('#id_select_dataset').val();
        const optimizationName = $('#id_select_optimization').val();
        const numGpus          = parseInt($('#id_num_gpus').val())||1;

        if(!runName||!modelName||!datasetName||!optimizationName){
            toastr.error("Please fill in all required fields.");
            return;
        }
        if(!isValidName(runName)){
            toastr.error("Run name contains invalid characters or is reserved.");
            return;
        }
        const totalGpus=parseInt($('#id_gpu_count').text())||1;
        if(numGpus<1||numGpus>totalGpus){
            toastr.error(`Please select between 1 and ${totalGpus} GPUs.`);
            return;
        }

        const enginePyContent=editorEnginePy.getValue();
        const configYamlContent=editorConfigYaml.getValue();
        const payload={
            project_name:sessionStorage.getItem('project_name'),
            run_name:runName,
            model_name:modelName,
            dataset_name:datasetName,
            optimization_name:optimizationName,
            num_gpus:numGpus,
            misc:{seed:42},
            engine_py:enginePyContent,
            config_yaml:configYamlContent
        };
        $('#id_create_run_ok').prop('disabled',true).text('Creating...');
        try{
            const resp=await fetch('/runs/create',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(payload)
            });
            const data=await resp.json();
            if(!data.error){
                toastr.success("Run created successfully!");
                const modalEl=document.getElementById('id_modal_create_run');
                const modalInstance=bootstrap.Modal.getInstance(modalEl);
                if(modalInstance) modalInstance.hide();
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch(error){
            toastr.error("Failed to create run.");
        } finally {
            $('#id_create_run_ok').prop('disabled',false).text('Create Run');
        }
    });

    // EDIT RUN
    window.editRun=async function(run_name){
        const projectName=sessionStorage.getItem('project_name');
        if(!projectName||!run_name){
            toastr.error("Missing project or run name.");
            return;
        }
        try{
            const payload={project_name:projectName,run_name};
            const resp=await fetch('/runs/list',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(payload)
            });
            if(!resp.ok) throw new Error(`Failed to fetch run details: ${resp.statusText}`);
            const data=await resp.json();
            if(data.error){
                toastr.error(data.error);
                return;
            }
            const run=data.runs.find(r=>r.run_name===run_name);
            if(!run){
                toastr.error(`Run '${run_name}' not found.`);
                return;
            }
            $('#id_edit_run_name').val(run.run_name).data('original-name',run.run_name);
            $('#id_edit_num_gpus').val(run.num_gpus||1);
            $('#id_edit_select_model').val(run.model_name);
            $('#id_edit_select_dataset').val(run.dataset_name);
            $('#id_edit_select_optimization').val(run.optimization_name);

            // fetch engine.py
            const engineResponse=await fetch(
                `/runs/get_file?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(run_name)}&file=engine.py`
            );
            if(!engineResponse.ok){
                toastr.error("Failed to fetch engine.py.");
                return;
            }
            const engineData=await engineResponse.json();
            if(engineData.error){
                toastr.error(engineData.error);
            } else {
                editorEditEnginePy.setValue(engineData.content, -1);
            }

            // fetch config.yaml if exists
            const configResponse=await fetch(
                `/runs/get_file?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(run_name)}&file=config.yaml`
            );
            if(configResponse.ok){
                const configData=await configResponse.json();
                if(configData.error){
                    toastr.error(configData.error);
                } else {
                    editorConfigYamlEdit.setValue(configData.content, -1);
                }
            }
            $('#id_modal_edit_run').modal('show');
        } catch(err){
            toastr.error("Failed to fetch run details.123");
            console.error(err);
        }
    };

    // "Save Changes" in Edit modal
    $('#id_edit_run_ok').click(async function(){
        const originalRunName=$('#id_edit_run_name').data('original-name');
        const runName=$('#id_edit_run_name').val().trim();
        const modelName=$('#id_edit_select_model').val();
        const datasetName=$('#id_edit_select_dataset').val();
        const optimizationName=$('#id_edit_select_optimization').val();
        const numGpus=parseInt($('#id_edit_num_gpus').val())||1;

        if(!runName||!modelName||!datasetName||!optimizationName){
            toastr.error("Please fill in all required fields.");
            return;
        }
        if(!isValidName(runName)){
            toastr.error("Run name contains invalid characters or is reserved.");
            return;
        }
        const enginePyContent=editorEditEnginePy.getValue();
        const configYamlContent=editorConfigYamlEdit?editorConfigYamlEdit.getValue():'';

        const payload={
            project_name:sessionStorage.getItem('project_name'),
            original_run_name:originalRunName,
            run_name,
            model_name: modelName,
            dataset_name:datasetName,
            optimization_name:optimizationName,
            num_gpus:numGpus,
            misc:{seed:42},
            engine_py:enginePyContent,
            config_yaml:configYamlContent
        };
        $('#id_edit_run_ok').prop('disabled',true).text('Saving...');
        try{
            const resp=await fetch('/runs/edit',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(payload)
            });
            const data=await resp.json();
            if(!data.error){
                toastr.success("Run updated successfully!");
                const modalEl=document.getElementById('id_modal_edit_run');
                const modalInstance=bootstrap.Modal.getInstance(modalEl);
                if(modalInstance) modalInstance.hide();
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch(err){
            toastr.error("Failed to edit run.");
        } finally {
            $('#id_edit_run_ok').prop('disabled',false).text('Save Changes');
        }
    });

    // ============================================================
    // DROPDOWNS
    // ============================================================
    function loadDropdowns(selectModelId,selectDatasetId,selectOptimizationId){
        const projectName=sessionStorage.getItem('project_name');
        const payload={project_name:projectName};

        // Models
        $.ajax({
            url:'/models/list',
            method:'POST',
            contentType:'application/json',
            data:JSON.stringify(payload),
            dataType:'json',
            success:function(resp){
                if(!resp.error){
                    const $sel=$(selectModelId);
                    $sel.empty().append('<option value="">Select a Model</option>');
                    resp.models.forEach(m=>{
                        $sel.append(`<option value="${m.model_name}">${m.model_name}</option>`);
                    });
                }
            }
        });
        // Datasets
        $.ajax({
            url:'/datasets/list',
            method:'POST',
            contentType:'application/json',
            data:JSON.stringify(payload),
            dataType:'json',
            success:function(resp){
                if(!resp.error){
                    const $sel=$(selectDatasetId);
                    $sel.empty().append('<option value="">Select a Dataset</option>');
                    resp.datasets.forEach(d=>{
                        $sel.append(`<option value="${d.dataset_name}">${d.dataset_name}</option>`);
                    });
                }
            }
        });
        // Optimizations
        $.ajax({
            url:'/optimizations/list',
            method:'POST',
            contentType:'application/json',
            data:JSON.stringify(payload),
            dataType:'json',
            success:function(resp){
                if(!resp.error){
                    const $sel=$(selectOptimizationId);
                    $sel.empty().append('<option value="">Select an Optimization</option>');
                    resp.optimizations.forEach(o=>{
                        $sel.append(`<option value="${o.optimize_method_name}">${o.optimize_method_name}</option>`);
                    });
                }
            }
        });
    }

    // ============================================================
    // LOAD & UPDATE RUNS
    // ============================================================
    async function loadRunList(){
        try{
            const payload={project_name:sessionStorage.getItem('project_name')};
            const resp=await fetch('/runs/list',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(payload),
            });
            const data=await resp.json();
            if(data.error){
                toastr.error(data.error||"Failed to load runs.");
                return;
            }
            updateRunTable(data.runs);
        } catch(err){
            toastr.error("An error occurred while loading runs.");
        }
    }
    function updateRunTable(runs){
        const $tableBody=$('#id_table_body_runs');
        $tableBody.empty();
        if(!runs||runs.length===0){
            $tableBody.append('<tr><td colspan="8" class="text-center">No runs available</td></tr>');
            return;
        }
        runs.forEach(run=>{
            const status=run.status||'Not Running';
            const gpuList=run.gpu_ids?.join(', ')||'N/A';
            let actions='';
            if(status==='Running'){
                actions=`
                    <button class="btn btn-sm btn-danger me-1" onclick="stopRun('${run.run_name}')">Stop</button>
                    <button class="btn btn-sm btn-secondary me-1" onclick="editRun('${run.run_name}')">Edit</button>
                    <button class="btn btn-sm btn-info me-1" onclick="viewLogs('${run.run_name}')">Logs</button>
                    <button class="btn btn-sm btn-warning" onclick="deleteRun('${run.run_name}')">Delete</button>
                `;
            } else {
                actions=`
                    <button class="btn btn-sm btn-success me-1" onclick="startRun('${run.run_name}')">Start</button>
                    <button class="btn btn-sm btn-secondary me-1" onclick="editRun('${run.run_name}')">Edit</button>
                    <button class="btn btn-sm btn-info me-1" onclick="viewLogs('${run.run_name}')">Logs</button>
                    <button class="btn btn-sm btn-warning" onclick="deleteRun('${run.run_name}')">Delete</button>
                `;
            }
            const $row=$(`
                <tr>
                    <td>${run.run_name}</td>
                    <td>${run.created_date||'N/A'}</td>
                    <td>${run.model_name||'N/A'}</td>
                    <td>${run.dataset_name||'N/A'}</td>
                    <td>${run.optimization_name||'N/A'}</td>
                    <td>${status}</td>
                    <td>${gpuList}</td>
                    <td>${actions}</td>
                </tr>
            `);
            $tableBody.append($row);
        });
    }

    // ============================================================
    // DELETE, START, STOP, VIEW LOGS
    // ============================================================
    window.deleteRun=async function(run_name){
        if(!confirm(`Are you sure you want to delete run '${run_name}'?`))return;
        const payload={ project_name:sessionStorage.getItem('project_name'),run_name};
        $(`button[onclick="deleteRun('${run_name}')"]`).prop('disabled',true);
        try{
            const resp=await fetch('/runs/delete',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(payload)
            });
            const data=await resp.json();
            if(!data.error){
                toastr.success(`Run '${run_name}' deleted successfully.`);
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch(err){
            toastr.error("Failed to delete run.");
        } finally {
            $(`button[onclick="deleteRun('${run_name}')"]`).prop('disabled',false);
        }
    };

    window.startRun=async function(run_name){
        const payload={ project_name:sessionStorage.getItem('project_name'),run_name};
        $(`button[onclick="startRun('${run_name}')"]`).prop('disabled',true).text('Starting...');
        try{
            const resp=await fetch('/runs/start',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(payload)
            });
            const data=await resp.json();
            if(!data.error){
                toastr.success(`Run '${run_name}' started successfully.`);
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch(err){
            toastr.error("Failed to start run.");
        } finally {
            $(`button[onclick="startRun('${run_name}')"]`).prop('disabled',false).text('Start');
        }
    };

    window.stopRun=async function(run_name){
        const payload={ project_name:sessionStorage.getItem('project_name'),run_name};
        $(`button[onclick="stopRun('${run_name}')"]`).prop('disabled',true).text('Stopping...');
        try{
            const resp=await fetch('/runs/stop',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(payload)
            });
            const data=await resp.json();
            if(!data.error){
                toastr.success(`Run '${run_name}' stopped successfully.`);
                loadRunList();
            } else {
                toastr.error(data.error);
            }
        } catch(err){
            toastr.error("Failed to stop run.");
        } finally {
            $(`button[onclick="stopRun('${run_name}')"]`).prop('disabled',false).text('Stop');
        }
    };

    window.viewLogs=async function(run_name,showNotify=true){
        const projectName=sessionStorage.getItem('project_name');
        if(!projectName){
            toastr.error("No project selected.");
            return;
        }
        currentLogRunName=run_name;
        try{
            const statusRes=await fetch('/runs/list',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({project_name:projectName})
            });
            const statusData=await statusRes.json();
            const run=statusData.runs.find(r=>r.run_name===run_name);
            if(!run){
                if(showNotify)toastr.error(`Run '${run_name}' not found.`);
                return;
            }
            if(run.status==="Not Running"&&!run.pid&&(!run.gpu_ids||run.gpu_ids.length===0)){
                logViewerAce.setValue("Run has not been started yet. No logs available.",-1);
                $('#id_modal_log_viewer').modal('show');
                return;
            }
            const url=`/runs/logs?project_name=${encodeURIComponent(projectName)}&run_name=${encodeURIComponent(run_name)}`;
            const resp=await fetch(url);
            if(!resp.ok)throw new Error(`HTTP error! status: ${resp.status}`);
            const data=await resp.json();
            if(data.error){
                logViewerAce.setValue(`Error: ${data.error}`,-1);
                if(showNotify)toastr.error(`Failed to fetch logs: ${data.error}`);
            } else {
                const lines=data.lines||[];
                logViewerAce.setValue(lines.join("\n"),-1);
                // scroll to bottom
                const lastLine=logViewerAce.session.getLength();
                logViewerAce.gotoLine(lastLine,0,false);
            }
            $('#id_modal_log_viewer').modal('show');
        }catch(err){
            logViewerAce.setValue("Failed to fetch logs.",-1);
            if(showNotify)toastr.error("Failed to fetch logs.");
        }
    };

    // ============================================================
    // 5) STARTUP
    // ============================================================
    loadRunList(); // initial load
    // setInterval(loadRunList, 5000); // commented out - no auto-poll
});
