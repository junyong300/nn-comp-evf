$(document).ready(function () {
		if (backup_ok == null) {
			backup_ok = $("#id_create_model_ok").html()
		}

    init_handlers()
    get_codes(1)
    request_list()
});

function init_handlers() {
    $('#id_create_model').click(function () {
        console.log("id_create_model!");
				$("#id_create_model_ok").html(backup_ok)
        get_codes(1)
        reset_editors()
        creating = 0
        $('#id_modal_new_alert').hide()
        $("#id_modal_new_model").modal('toggle')
    })

    $('#id_create_model_ok').click(function () {
        console.log("id_create_model_ok!");
        request_create(creating)
        creating = 0
    })

    $("#id_search").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#id_table_body tr").filter(function () {
            $(this).toggle($(this).find(">:first-child").text().toLowerCase().indexOf(value) > -1)
        });
    })

    //if project is changed, update model list
    $('#id_project').change(request_list)

    //on_search_ok
    $('#id_modal_search_ok').click(function () {
        request_search()
    })

    $('#id_modal_train_ok').click(function () {
        request_train()
    })

    $('#id_modal_optimize_ok').click(function () {
        request_optimize()
    })

    $('#id_modal_profile_ok').click(function () {
        request_profile()
    })

    $('#id_modal_query_ok').click(function () {
        request_query()
    })

    $('#id_modal_eval_ok').click(function () {
        request_eval()
    })

    $('#id_graph_get').click(function () {
        request_graph_info()
    })
}

creating = 0
codes = null
meta = null
backup_ok = null
function get_codes(mode) {
    if (mode == 1) {
      body = {
          'source':'template',
          'project_name': sessionStorage.getItem("project_name")
      }
    } else {
      body = {
          'source':'custom',
          'project_name': sessionStorage.getItem("project_name"),
          'model_name':sessionStorage.getItem('model_name')
      }
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/get_codes",
        data: JSON.stringify(body),
        dataType: 'json',
        async: false,
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                codes = msg['res']['codes']
                meta = msg['res']['meta']
                set_editors()
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e);
        }
    });
}

function set_editors() {
    mycode = `# -*- coding: utf-8 -*-
import numpy as np
import math

# Create random input and output data
x = np.linspace(-math.pi, math.pi, 2000)
y = np.sin(x)

# Randomly initialize weights
a = np.random.randn()
b = np.random.randn()
c = np.random.randn()
d = np.random.randn()
`

    for (let i = 1; i <= 3; i++) {
        console.log(i);     // printing the value of i
        var editor = ace.edit("editor" + i)
        editor.setShowPrintMargin(false)
        editor.setTheme("ace/theme/monokai")
        editor.session.setMode("ace/mode/python")
        editor.setValue(mycode, -1)
    }

    // for (let i = 1; i <= 2; i++) {
    //     console.log(i);     // printing the value of i
    //     var editor = ace.edit("view_editor" + i)
    //     editor.setShowPrintMargin(false);
    //     editor.setTheme("ace/theme/monokai")
    //     editor.session.setMode("ace/mode/python")
    //     editor.setValue(mycode, -1)
    // }

    // init all modal option editor
    myoption = ""
    editor_list = ['search', 'optimize']
    for (k in editor_list) {
        var editor = ace.edit(`id_modal_${editor_list[k]}_editor1`)
        editor.setShowPrintMargin(false)
        editor.setTheme("ace/theme/monokai")
        editor.session.setMode("ace/mode/yaml")
        editor.setValue(myoption, -1)
    }

    editor_list = ['train', 'profile', 'query', 'eval']
    for (k in editor_list) {
        var editor = ace.edit(`id_modal_${editor_list[k]}_editor1`)
        editor.setShowPrintMargin(false)
        editor.setTheme("ace/theme/monokai")
        editor.session.setMode("ace/mode/yaml")
        editor.setValue(codes['config'][editor_list[k]], -1)
    }

    // set modal_task options
    temp = ""
    for (k in codes['task_names']) {
        temp += `<option>${codes['task_names'][k]}</option>\n`
    }
    $('#id_modal_search_task').html(temp)
    $("#id_modal_search_task").val($("#id_modal_search_task option:first").val());

    $('#id_modal_train_task').html(temp)
    $("#id_modal_train_task").val($("#id_modal_train_task option:first").val());

    $('#id_modal_optimize_task').html(temp)
    $("#id_modal_optimize_task").val($("#id_modal_optimize_task option:first").val());

    $('#id_modal_profile_task').html(temp)
    $("#id_modal_profile_task").val($("#id_modal_profile_task option:first").val());

    $('#id_modal_query_task').html(temp)
    $("#id_modal_query_task").val($("#id_modal_query_task option:first").val());

    $('#id_modal_eval_task').html(temp)
    $("#id_modal_eval_task").val($("#id_modal_eval_task option:first").val());

    // $('#id_modal_view_task').html(temp)
    // $("#id_modal_view_task").val($("#id_modal_view_task option:first").val());


    // set modal_target options
    temp = ""
    for (k in codes['targets']) {
        temp += `<option>${codes['targets'][k]}</option>\n`
    }
    $('#id_modal_profile_target').html(temp)
    $("#id_modal_profile_target").val($("#id_modal_profile_target option:first").val())

    $('#id_modal_query_target').html(temp)
    $("#id_modal_query_target").val($("#id_modal_query_target option:first").val())


    temp = ""
    for (k in codes['method_names']) {
        temp += `<option>${codes['method_names'][k]}</option>\n`
    }
    $('#id_modal_search_method').html(temp)
    $('#id_modal_optimize_method').html(temp)

    // modal_search_method
    $('#id_modal_search_method').change(function () {
        temp = $("#id_modal_search_method :selected").val()
        ace.edit("id_modal_search_editor1").setValue(codes['methods'][temp], -1)
    })
    // modal_optimize_method
    $('#id_modal_optimize_method').change(function () {
        temp = $("#id_modal_optimize_method :selected").val()
        ace.edit("id_modal_optimize_editor1").setValue(codes['methods'][temp], -1)
    })		

    // set first option
    $("#id_modal_search_method").val($("#id_modal_search_method option:first").val()).change()
    $("#id_modal_optimize_method").val($("#id_modal_optimize_method option:first").val()).change()
}

function reset_editors() {
    $("#id_model_name").val("")
    $("#id_model_path").val("")

    // task names
    temp = ""
    for (k in codes['task_names']) {
        temp += `<option>${codes['task_names'][k]}</option>\n`
    }
    $('#id_task_name').html(temp)

    // set default task name
    if(codes['task_names'].length > 0) {
        $("#id_task_name").val(codes['task_names'][0])
    }

    // reset tab focus
    for (let i=1; i<=4; i++) {
        $("#id_tab_" + i).removeClass("active")
        $("#id_tab_top_" + i).removeClass("active show")
    }
    $("#id_tab_1").addClass("active")
    $("#id_tab_top_1").addClass("active show")

    // codes	
    ace.edit("editor1").setValue(codes['model'], -1);
    ace.edit("editor2").setValue(codes['preprocess'], -1);
    ace.edit("editor3").setValue(codes['callbacks'], -1);

    temp = ""
    for (let i=0; i<codes['libs'].length; i++) {
        if ('lib' in meta && meta['lib'].includes(codes['libs'][i])) {
          temp += `
          <label class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" name="libs" checked value=${codes['libs'][i]}>
              <span class="form-check-label">${codes['libs'][i]}</span>
          </label>`
        } else {
          temp += `
          <label class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" name="libs" value=${codes['libs'][i]}>
              <span class="form-check-label">${codes['libs'][i]}</span>
          </label>`
        }
    }
    $("#id_libs").html(temp)
}

function request_create(mode) {
    var model_name = $("#id_model_name").val()
    pattern = /(^[A-Za-z0-9-_]+$)/
    if(!pattern.test(model_name)) {
        // $.notify("task name is not valid! (only letters, numbers, - and _ are allowed)");
        $('#id_modal_new_alert').html("model name is not valid! (only letters, numbers, - and _ are allowed)")
        $('#id_modal_new_alert').show()
        return
    }

    var model_path = $("#id_model_path").val()
    var task_name = $("#id_task_name :selected").val();

    // prepare request body
    body = {
        'project_name': sessionStorage.getItem("project_name"),
        'model_name': model_name,
        'model_path': model_path,
        'task_name': task_name,
        'model': ace.edit("editor1").getValue(),
        'preprocess': ace.edit("editor2").getValue(),
        'callbacks': ace.edit("editor3").getValue(),
        'libs': []
    }

    //get libs
    checked_libs = $("input:checkbox[name=libs]:checked")
    console.log(checked_libs)
    for (let i = 0; i < checked_libs.length; i++) {
        console.log(checked_libs[i].value)
        body['libs'].push(checked_libs[i].value)
    }

    // request new task
    // if error => show message
    // if success => close modal and refresh task list
    if (mode == 0){
      url = "/models/create"
    } else {
      url = "/models/edit"
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: url,
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                $("#id_modal_new_model").modal('toggle')
                request_list()
            } else {
                $('#id_modal_new_alert').html(msg['err'])
                $('#id_modal_new_alert').show()
            }
        },
        error: function (e) {
            $('#id_modal_new_alert').html(e.statusText)
            $('#id_modal_new_alert').show()
        }
    });
}

function request_list() {
    body = {
        'project_name': sessionStorage.getItem('project_name'),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/list",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                show_list(msg['res'])
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        }
    });
}

function show_list(data) {

    // # {
    // #     "inference_time": 0,
    // #     "accuracy": 0,
    // #     "num_parameters": 0,
    // #     "status": "",
    // #     "model_path": "/path.abc/",
    // #     "task_name": "a",
    // #     "lib": []
    // # }

    temp = ""
    for (var k in data) {
        temp += `
        <tr>
            <td style="word-break:break-all;">${k}</td>
            <td style="word-break:break-all;"><small>${data[k]['model_path']}</small></td>
            <td class="text-muted">${data[k]['task_name']}</td>
            <td class="text-muted">${data[k]['inference_time']}</td>
            <td class="text-muted">${data[k]['accuracy']}</td>
            <td class="text-muted">${data[k]['num_parameters']}</td>
            <td class="text-muted">${data[k]['status']}</td>
            <td class="text-end">
                <div class="dropdown">
                    <button class="btn btn-sm dropdown-toggle" type="button" aria-haspopup="true" data-bs-toggle="dropdown">
                        Actions
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="on_edit('${k}')">Edit</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_search('${k}')">Search</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_train('${k}')">Train</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_optimize('${k}')">Optimize</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_profile('${k}')">Profile</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_query('${k}')">Query</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_eval('${k}')">Eval</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_view('${k}')">View</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_delete('${k}')">Delete</a></li>
                    </ul>
                </div>
            </td>
        </tr>
        `
    }
    $("#id_table_body").html(temp)
}	


function on_search(name) {
    $("#id_modal_search_name").val(name)
    
    $('#id_modal_search_alert').hide()
    $("#modal-search").modal('toggle')
}

function on_train(name) {
    $("#id_modal_train_name").val(name)

    $('#id_modal_train_alert').hide()
    $("#modal-train").modal('toggle')
}

function on_optimize(name) {
    $("#id_modal_optimize_name").val(name)

    $('#id_modal_optimize_alert').hide()
    $("#modal-optimize").modal('toggle')
}

function on_profile(name) {
    $("#id_modal_profile_name").val(name)

    $('#id_modal_profile_alert').hide()
    $("#modal-profile").modal('toggle')
}

function on_query(name) {
    $("#id_modal_query_name").val(name)

    $('#id_modal_query_alert').hide()
    $("#modal-query").modal('toggle')
}

function on_eval(name) {
    $("#id_modal_eval_name").val(name)

    $('#id_modal_eval_alert').hide()
    $("#modal-eval").modal('toggle')
}

function on_view(name) {
    //$("#id_modal_view_name").val(name)
    $("#modal-view").modal('toggle')

    request_view(name)
}

function on_edit(name) {
    console.log(name)
    sessionStorage.setItem("model_name", name)
    get_codes(0)
    reset_editors()
    creating = 1

    if (meta != null) {
      $("#id_model_name").val(name)
      $("#id_model_name").prop("readonly", true)
      $("#id_model_path").val(meta["model_path"])
    }

    $('#id_create_model_ok').html(`
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24"
              stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
              stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Edit
    `)

    $('#id_modal_new_alert').hide()
    $("#id_modal_new_model").modal('toggle')
}


function on_delete(name) {
    console.log(name)
    $("#id_modal_confirm_msg").html(`Do you really want to delete <span class="badge bg-red-lt">${name}</span>?`)
    $("#id_modal_confirm_ok").attr("onclick", `on_delete_ok('${name}')`)
    $("#id_modal_confirm_ok").html("Delete")
    $("#id_modal_confirm").modal('toggle')
}

function on_delete_ok(name) {
    body = {
        'project_name': sessionStorage.getItem('project_name'),
        'model_name': name,
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/delete",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                request_list()
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        }
    });    
}

function request_search() {
    body = {
        project_name: sessionStorage.getItem('project_name'),
    	meta: {
    		model_name: $('#id_modal_search_name').val(),
            tag: "",
    		task: $('#id_modal_search_task').val(),
    		method: $('#id_modal_search_method').val(),
    		gpus: $('#id_modal_search_gpu').val(),
    		mode: "search"
    	},
        conf: ace.edit("id_modal_search_editor1").getValue(),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/search",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                request_list()
                $("#modal-search").modal('toggle')
                $.notify("success", "success");
            } else {
                $('#id_modal_search_alert').html(msg['err'])
                $('#id_modal_search_alert').show()
            }
        },
        error: function (e) {
            $('#id_modal_search_alert').html(e.statusText)
            $('#id_modal_search_alert').show()
        },
        complete: function () {
            console.log("compete")
        }
    });
}

function request_train() {
    body = {
        project_name: sessionStorage.getItem('project_name'),
    	meta: {
    		model_name: $('#id_modal_train_name').val(),
            tag: $('#id_modal_train_tag').val(),
    		task: $('#id_modal_train_task').val(),
    		gpus: $('#id_modal_search_gpu').val(),
    		mode: "train"
    	},
        conf: ace.edit("id_modal_train_editor1").getValue(),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/train",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                request_list()
                $("#modal-train").modal('toggle')
                $.notify("success", "success");
            } else {
                $('#id_modal_train_alert').html(msg['err'])
                $('#id_modal_train_alert').show()
            }
        },
        error: function (e) {
            $('#id_modal_train_alert').html(e.statusText)
            $('#id_modal_train_alert').show()
        },
        complete: function () {
            console.log("compete")
        }
    });
}

function request_optimize(){
    body = {
        project_name: sessionStorage.getItem('project_name'),
    	meta: {
    		model_name: $('#id_modal_optimize_name').val(),
            tag: $('#id_modal_optimize_tag').val(),
    		task: $('#id_modal_optimize_task').val(),
            method: $('#id_modal_optimize_method').val(),
    		gpus: $('#id_modal_search_gpu').val(),
    		mode: "optimize"
    	},
        conf: ace.edit("id_modal_optimize_editor1").getValue(),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/optimize",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                request_list()
                $("#modal-optimize").modal('toggle')
                $.notify("success", "success");
            } else {
                $('#id_modal_optimize_alert').html(msg['err'])
                $('#id_modal_optimize_alert').show()
            }
        },
        error: function (e) {
            $('#id_modal_optimize_alert').html(e.statusText)
            $('#id_modal_optimize_alert').show()
        },
        complete: function () {
            console.log("compete")
        }
    });
}

function request_profile() {  
    body = {
        project_name: sessionStorage.getItem('project_name'),
    	meta: {
    		model_name: $('#id_modal_profile_name').val(),
            tag: "",
    		task: $('#id_modal_profile_task').val(),
            target: $('#id_modal_profile_target').val(),
    		gpus: $('#id_modal_profile_gpu').val(),
    		mode: "profile"
    	},
        conf: ace.edit("id_modal_profile_editor1").getValue(),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/profile",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                request_list()
                $("#modal-profile").modal('toggle')
                $.notify("success", "success");
            } else {
                $('#id_modal_profile_alert').html(msg['err'])
                $('#id_modal_profile_alert').show()
            }
        },
        error: function (e) {
            $('#id_modal_profile_alert').html(e.statusText)
            $('#id_modal_profile_alert').show()
        },
        complete: function () {
            console.log("compete")
        }
    });
}

function request_query() {
    body = {
        project_name: sessionStorage.getItem('project_name'),
    	meta: {
    		model_name: $('#id_modal_query_name').val(),
    		tag: $('#id_modal_query_tag').val(),
            task: $('#id_modal_query_task').val(),
            target: $('#id_modal_query_target').val(),
    		mode: "query"
    	},
        conf: ace.edit("id_modal_query_editor1").getValue(),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/query",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                request_list()
                $("#modal-query").modal('toggle')
                $.notify("success", "success");
            } else {
                $('#id_modal_query_alert').html(msg['err'])
                $('#id_modal_query_alert').show()
            }
        },
        error: function (e) {
            $('#id_modal_query_alert').html(e.statusText)
            $('#id_modal_query_alert').show()
        },
        complete: function () {
            console.log("compete")
        }
    });
}

function request_eval() {
    body = {
        project_name: sessionStorage.getItem('project_name'),
    	meta: {
    		model_name: $('#id_modal_eval_name').val(),
            tag: "",
            task: $('#id_modal_eval_task').val(),
    		mode: "eval"
    	},
        conf: ace.edit("id_modal_eval_editor1").getValue(),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/eval",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                request_list()
                $("#modal-eval").modal('toggle')
                $.notify("success", "success");
            } else {
                $('#id_modal_eval_alert').html(msg['err'])
                $('#id_modal_eval_alert').show()
            }
        },
        error: function (e) {
            $('#id_modal_eval_alert').html(e.statusText)
            $('#id_modal_eval_alert').show()
        },
        complete: function () {
            console.log("compete")
        }
    });
}

function request_view(name) {
    body = {
        project_name: sessionStorage.getItem('project_name'),
    	meta: {
    		model_name: name,
            tag: "",
            task: "",
    		mode: "view"
    	},
        conf: ""
    }
    
    $('#id_graph_model').val(name)
    $("#id_graph_from").val("");
    $("#id_graph_to").val("");
    $("#id_graph_info").html("");

    temp = `<h1 class="d-flex align-items-center justify-content-center">Loading<span class="animated-dots"></span></h1>`
    $('#id_view_graph').html(temp)


    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/view",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                console.log(msg['res'])
                $('#id_view_graph').html("")
                view(msg['res'])
                $.notify("success", "success");
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        },
        complete: function () {
            console.log("complete")
        }
    });
}

// request graph_info
function request_graph_info(name, from, to) {

    body = {
        project_name: sessionStorage.getItem('project_name'),
        model_name: $('#id_graph_model').val(),
        from: $('#id_graph_from').attr('value'),
        to: $('#id_graph_to').attr('value')
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/models/graph_info",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                console.log(msg['res'])
                $('#id_graph_info').html(msg['res'])
                $.notify("success", "success");
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        },
        complete: function () {
            console.log("complete")
        }
    });  
}




function reset() {
    cy.nodes().forEach(function (ele) {
        console.log(ele.id());
        console.log(ele.removeClass("start"));
        console.log(ele.removeClass("end"));
        console.log(ele.removeClass("selected"));
    });

    cy.edges().forEach(function (ele) {
        console.log(ele.removeClass("selected"));
    });

    count = 0

    $("#id_graph_from").val("");
    $("#id_graph_to").val("");
    $("#id_graph_info").html("");

    // disable bootstrap a tag
    $("#id_graph_get").addClass("disabled");
    
}

function findPaths(start, end) {
    e_predecessors = end.predecessors()
    s_predecessors = start.predecessors()
    paths = e_predecessors.difference(s_predecessors)

    return paths
}

count = 0;
cy = null;
function view(elements) {

    count = 0;
    cy = cytoscape({
    
        container: document.getElementById('id_view_graph'), // container to render in
    
        elements: elements,
        // elements: {
        //     nodes: [
        //       { data: { id: 'a' } },
        //       { data: { id: 'b' } },
        //       { data: { id: 'c' } },
        //       { data: { id: 'd' } },
        //       { data: { id: 'e' } }
        //     ],
      
        //     edges: [
        //       { data: { id: 'a"e', weight: 1, source: 'a', target: 'e' } },
        //       { data: { id: 'ab', weight: 3, source: 'a', target: 'b' } },
        //       { data: { id: 'be', weight: 4, source: 'b', target: 'e' } },
        //       { data: { id: 'bc', weight: 5, source: 'b', target: 'c' } },
        //       { data: { id: 'ce', weight: 6, source: 'c', target: 'e' } },
        //       { data: { id: 'cd', weight: 2, source: 'c', target: 'd' } },
        //       { data: { id: 'de', weight: 7, source: 'd', target: 'e' } }
        //     ]
        // },
    
        style: [ // the stylesheet for the graph
            {
                selector: 'node',
                style: {
                    'background-color': '#e6e6e6',
                    // 'label': 'data(label)',
                    // 'content': 'data(label)',
                    'text-halign': 'center',
                    'text-valign': 'center',
                    'shape': 'roundrectangle',
                    'width': '300',
                    'height': '100',
    
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 5,
                    'label': 'data(label)',
                    'line-color': '#b3b3b3',
                    'target-arrow-color': '#b3b3b3',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'font-name': 'Tahoma',
                    //'color': '#333333',
                    'font-size': 20,
                    'text-background-color': '#b3b3b3',
                }
            },
            {
                selector: ".selected",
                css: {
                    'background-color': '#cceeff',
                    'line-color': '#cceeff',
                    'target-arrow-color': '#cceeff',
                    'source-arrow-color': '#cceeff',
                    "shape": "roundrectangle",
                }
            },
            // {
            //     selector: "node[class = 'foo']",
            //     css: {
            //         "shape": "roundrectangle",
            //         "background-color": "red"
            //     }
            // },
            {
                selector: ".start",
                css: {
                    "background-color": "#66ccff",
                    "shape": "roundrectangle",
                }
            },
            {
                selector: ".end",
                css: {
                    "background-color": "#66ccff",
                    "shape": "roundrectangle",
                }
            }
    
        ],
    
        layout: {
            name: 'breadthfirst',
            //name: 'grid',
            rows: 3,
            directed: true,
            //animate: true,
            fit: true,
            grid: true,
            roots: '#input_1',
            //avoidOverlap: false,
            padding: 100,
            
        },
    
    });
    
    
    // https://codesandbox.io/s/ihz5o?file=/src/components/tree.vue:11040-11516
    cy.nodeHtmlLabel(
        [
            {
                query: 'node',
                valign: "center",
                valignBox: "center",
                tpl: function (data) {
                    return `<div class="nodeTitle">${data.id}
                                <div class="nodeValue">${data.classname}</div>
                            </div>`
    
                },
            }
        ]
    );

    cy.on('tap', 'node', function (e) {
    
        if (count == 2) {
            reset()
        }
    
        if (count == 0) {
            e.target.addClass('start')
            count = 1

            temp = e.target.data("id") + " (" + e.target.data("idx") + ")"
            console.log(temp)
            $("#id_graph_from").val(temp);
    
        } else if (count == 1) {
            e.target.addClass('end')
    
            // get start and end node
            node_s = cy.nodes().filter('.start'); // start node
            node_e = cy.nodes().filter('.end'); // end node
            idx_s = node_s.data("idx") // start node idx
            idx_e = node_e.data("idx") // end node idx

            // if start and end node are the same, reset
            if(idx_s == idx_e){
                reset()
            } else {
                // find path from start to end
                var aStar = cy.elements().aStar({ root: ".start", goal: ".end", directed: true });
                if (aStar.found) {
                    // draw path
                    // it should path all the parentes of the end node
                    paths = findPaths(cy.$('#.start'), cy.$('.end'))
                    paths.forEach(function (ele) {
                        // if the node idx is between start and end node, draw the path
                        if (ele.data("idx") >= idx_s && ele.data("idx") <= idx_e) {
                            ele.addClass('selected')
                        }
                    });
                    count = 2

                    temp = e.target.data("id") + " (" + e.target.data("idx") + ")"
                    console.log(temp)
                    $("#id_graph_to").val(temp);

                    $("#id_graph_from").attr("value", idx_s);
                    $("#id_graph_to").attr("value", idx_e);

                    // enable bootstrap a tag
                    $("#id_graph_get").removeClass("disabled");
            
                } else {
                    reset()
                }
            }
        }
        // console.log(e.target.data("id") + ":" + e.target.data("idx"))
        // $("input:text").val("Glenn Quagmire");

        //console.log(e.data)
        // console.log(e.target)
    });    
}
