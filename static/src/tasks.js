$(document).ready(function () {
		if (backup_ok == null) {
			backup_ok = $("#id_create_task_ok").html()
		}

    init_handlers()
    get_codes(1)
    request_list_tasks()
});

function init_handlers() {
    $('#id_create_task').click(function () {
        console.log("id_create_task!");
				$("#id_create_task_ok").html(backup_ok)
        get_codes(1)
        reset_editors()
        creating = 0
        $('#id_modal_new_alert').hide()
        $("#id_modal_new").modal('toggle')
    })

    $('#id_create_task_ok').click(function () {
        console.log("id_create_task_ok!");
        request_create_task(creating)
        creating = 0
    })

    $('#id_copy_task_ok').click(function () {
        console.log("id_copy_task_ok!");
        request_copy_task()
    })

    $("#id_search").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#id_table_body tr").filter(function () {
            $(this).toggle($(this).find(">:first-child").text().toLowerCase().indexOf(value) > -1)
        });
    });

    // if project is changed, update task list
    $('#id_project').change(request_list_tasks)
}

creating = 0
codes = null
meta = null
backup_ok = null
function get_codes(mode) {

    if (mode == 1) {
      body = {
          'source':'template'
      }
    }  else {
      body = {
          'source':'custom',
          'project_name': sessionStorage.getItem('project_name'),
          'task_name': sessionStorage.getItem('task_name')
      }
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/tasks/get_codes",
        data: JSON.stringify(body),
        dataType: 'json',
        async: false,
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                codes = msg['res']['codes']
                meta = msg['res']['meta']
                console.log(meta)
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
    for (let i = 1; i <= 7; i++) {
        console.log(i);     // printing the value of i
        var editor = ace.edit("editor" + i)
        editor.setShowPrintMargin(false);
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/python");
        editor.setValue(mycode, -1);
    }
}

function request_create_task(mode) {
    var task_name = $("#id_task_name").val()
    pattern = /(^[A-Za-z0-9-_]+$)/
    if(!pattern.test(task_name)) {
        // $.notify("task name is not valid! (only letters, numbers, - and _ are allowed)");
        $('#id_modal_new_alert').html("task name is not valid! (only letters, numbers, - and _ are allowed)")
        $('#id_modal_new_alert').show()
        return
    }
    var training_count = $("#id_training_count").val()
    var validation_count = $("#id_validation_count").val()

    //get codes
    body = {
        'project_name': sessionStorage.getItem("project_name"),
        'task_name': task_name,
        'training_count': training_count,
        'validation_count': validation_count,
        'config': ace.edit("editor1").getValue(),
        'augmentation': ace.edit("editor2").getValue(),
        'preprocessing': ace.edit("editor3").getValue(),
        'metric': ace.edit("editor4").getValue(),
        'loss': ace.edit("editor5").getValue(),
        'optimizer': ace.edit("editor6").getValue(),
        'callbacks': ace.edit("editor7").getValue(),
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
      url = "/tasks/create"
    } else {
      url = "/tasks/edit"
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
                $("#id_modal_new").modal('toggle')
                request_list_tasks()
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

function reset_editors() {
    $("#id_task_name").val("")
    $("#id_training_count").val(100)
    $("#id_validation_count").val(100)

    for (let i=1; i<=8; i++) {
        $("#id_tab_" + i).removeClass("active")
        $("#tab-top-" + i).removeClass("active show")
    }
    $("#id_tab_1").addClass("active")
    $("#tab-top-1").addClass("active show")

    // codes
    ace.edit("editor1").setValue(codes['config'], -1);
    ace.edit("editor2").setValue(codes['augmentation'], -1);
    ace.edit("editor3").setValue(codes['preprocessing'], -1);
    ace.edit("editor4").setValue(codes['metric'], -1);
    ace.edit("editor5").setValue(codes['loss'], -1);
    ace.edit("editor6").setValue(codes['optimizer'], -1);
    ace.edit("editor7").setValue(codes['callbacks'], -1);

    temp = ""
    for (let i=0; i<codes['libs'].length; i++) {
        if (meta['lib'].includes(codes['libs'][i])) {
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

function on_edit_task(task_name) {
    console.log(task_name)
    sessionStorage.setItem("task_name", task_name)
    get_codes(0)
    reset_editors()
    creating = 1
    console.log(codes)

    if (meta != null && "training_records" in meta) {
      $("#id_task_name").val(task_name)
      $("#id_task_name").prop("readonly", true)
      $("#id_training_count").val(meta["training_records"])
      $("#id_validation_count").val(meta["validation_records"])
    }

    $('#id_create_task_ok').html(`
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
    $("#id_modal_new").modal('toggle')

}

function on_copy_task(task_name) {
    console.log(task_name)

    // read task info and set new task dialog
    $("#id_copy_task_name").val(task_name)
    sessionStorage.setItem("task_name", task_name),

    // toggle dialog
    $("#id_modal_copy_task").modal('toggle')	
}

function request_copy_task(task_name) {
    var copy_task_name = $("#id_copy_task_name").val()
    pattern = /(^[A-Za-z0-9-_]+$)/
    if(!pattern.test(copy_task_name)) {
        $.notify("task name is not valid! (only letters, numbers, - and _ are allowed)");
        return
    }

    body = {
        'project_name': sessionStorage.getItem("project_name"),
        'task_name': sessionStorage.getItem("task_name"),
        'copy_task_name': copy_task_name,
    }

    // request copy task
    // if error => show message
    // if success => close modal and refresh task list
    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/tasks/copy",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                $("#id_modal_copy_task").modal('toggle')
                request_list_tasks()
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        }
    });
}

function on_delete_task(task_name) {
    console.log(task_name)
    $("#id_modal_confirm_msg").html(`Do you really want to delete <span class="badge bg-red-lt">${task_name}</span>?`)
    $("#id_modal_confirm_ok").attr("onclick", `on_delete_task_ok('${task_name}')`)
    $("#id_modal_confirm_ok").html("Delete")
    $("#id_modal_confirm").modal('toggle')
}

function on_delete_task_ok(task_name) {
    body = {
        'project_name': sessionStorage.getItem('project_name'),
        'task_name': task_name,
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/tasks/delete",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                request_list_tasks()
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        }
    });
}

function show_tasks(tasks) {
    $("#id_table_body").html("")

    temp = ""
    for (var k in tasks) {
        temp += `
        <tr>
            <td>${k}</td>
            <td class="text-muted">
                ${tasks[k]['training_count']}
            </td>
            <td class="text-muted">
                ${tasks[k]['validation_count']}
            </td>
            <td class="text-end">
                <div class="dropdown">
                    <button class="btn btn-sm dropdown-toggle" type="button" aria-haspopup="true" data-bs-toggle="dropdown">
                        Actions
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="on_copy_task('${k}')">Copy</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_edit_task('${k}')">Edit</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_delete_task('${k}')">Delete</a></li>
                    </ul>
                </div>
            </td>
        </tr>			
        `
    }
    $("#id_table_body").html(temp)
}

function request_list_tasks() {
    body = {
        'project_name': sessionStorage.getItem('project_name'),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/tasks/list",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                show_tasks(msg['res']['tasks'])
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        }
    });
}
