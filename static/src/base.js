$(document).ready(function () {
    $('#id_create_project_ok').click(function () {
        console.log("id_create_project_ok!");
        create_project()
    })

    $('#id_delete_project_ok').click(function () {
        console.log("id_delete_project_ok!");
        delete_project()
    })			

    $('#id_logout_ok').click(function () {
        console.log("id_logout_ok!");
        logout()
    })			

    $('#id_project').change(project_changed)

    load_project_list()

    $.notify.defaults({globalPosition: 'bottom right'});
});

function load_project_list() {
    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/project/list",
        // data: JSON.stringify({}),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                update_project_list(msg['res'])
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            console.log(e)
            $.notify(e);
        }
    });
}

function create_project() {
    project_name = $("#id_project_name").val()
    pattern = /(^[A-Za-z0-9-_]+$)/
    if(!pattern.test(project_name)) {
        $.notify("project name is not valid! (only letters, numbers, - and _ are allowed)");
        // $('#id_modal_new_alert').html("project name is not valid! (only letters, numbers, - and _ are allowed)")
        // $('#id_modal_new_alert').show()
        // $("#id_modal_create_project").modal('toggle')
        return
    }

    body= {
        project_name : project_name,
    }
    
    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/project/create",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                //$.cookie("project", project_name, { path: '/' });
                sessionStorage.setItem("project_name", project_name)
                $.notify("project has created!", "success");
                $("#id_modal_create_project").modal('toggle')
                $("#id_project_name").val("")
            } else {
                $.notify(msg['err']);
            }
            load_project_list()
        },
        error: function (e) {
            console.log(e)
            $.notify(e);
            load_project_list()
        }
    });
}

function delete_project() {
    project_name = $("#id_project").val()

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/project/delete",
        data: JSON.stringify({"project_name":project_name}),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                sessionStorage.removeItem("project_name")
                //$.cookie("project", "", { path: '/' }); // delete project_name!
                $.notify("project has deleted!", "success");
            } else {
                $.notify(msg['err']);
            }
            load_project_list()
        },
        error: function (e) {
            console.log(e)
            $.notify(e);
            load_project_list()
        }
    });
}				

function update_project_list(data) {
    console.log(data)

    current_project = sessionStorage.getItem("project_name")
    if (current_project == null || current_project == "undefined") {
        if (data['projects'].length > 0) {
            current_project = data['projects'][0]
            sessionStorage.setItem("project_name", current_project)
        }
    }

    temp = ""
    for (i = 0; i < data['projects'].length; i++) {
        if (data['projects'][i] == current_project) {
            temp += `<option selected>${data['projects'][i]}</option>\n`
        } else {
            temp += `<option>${data['projects'][i]}</option>\n`
        }	
    }
    $('#id_project').html(temp)
    $('#id_project').change()

    // show create project dialog if no project exists.
    if (data['projects'].length == 0) {
        $("#id_modal_create_project").modal('toggle')
        return
    }
}

function project_changed() {
    temp = $("#id_project :selected").val();
    sessionStorage.setItem("project_name", temp)
}

function logout() {
    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/auth/logout",
        // data: JSON.stringify({}),
        dataType: 'json',
        timeout: 60*1000,
        success: function (msg) {
            if (msg['err'] == null) {
                $.notify("Logout success!", "success");
            } else {
                $.notify(msg['err']);
            }

            //$.cookie("project", "", { path: '/' })
            sessionStorage.removeItem("project_name")
            window.location.href = "/";
        },
        error: function (e) {
            $.notify(e);

            //$.cookie("project", "", { path: '/' })
            sessionStorage.removeItem("project_name")
            window.location.href = "/";
        }
    });
}