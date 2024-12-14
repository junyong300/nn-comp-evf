$(document).ready(function () {
    init_handlers()
    set_editors()
    request_list()
});

function init_handlers() {

    $("#id_search").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#id_table_body tr").filter(function () {
            f1 = $(this).find("td:nth-child(1)").text().toLowerCase().indexOf(value) > -1
            f2 = $(this).find("td:nth-child(2)").text().toLowerCase().indexOf(value) > -1
            f3 = $(this).find("td:nth-child(3)").text().toLowerCase().indexOf(value) > -1
            f4 = $(this).find("td:nth-child(4)").text().toLowerCase().indexOf(value) > -1
            $(this).toggle(f1 || f2 || f3 || f4)
        });
    })

    //if project is changed, update model list
    $('#id_project').change(request_list)
}

function set_editors() {
    var editor = ace.edit("id_modal_log_msg")
    editor.setShowPrintMargin(false)
    editor.setReadOnly(true);
    editor.setTheme("ace/theme/monokai")
    editor.session.setMode("ace/mode/json")
    editor.setValue("", -1)
}

function request_list() {
    body = {
        'project_name': sessionStorage.getItem('project_name'),
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/jobs/list",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60 * 1000,
        success: function (msg) {
            if (msg['err'] == null) {
                show_list(msg['res'])
                // $.notify("list updated", "success")
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

    //model_name
    //tag
    //task
    //mode
    //accuracy
    //progress
    //elapsed_time

    temp = ""
    for (var k in data) {
        temp += `
        <tr>
            <td>${data[k]['meta']['model_name'] + ":" + data[k]['meta']['tag']}</td>
            <td>
                ${data[k]['meta']['task']}
            </td>											
            <td>
                ${data[k]['meta']['mode']}
            </td>
            <td>
                ${data[k]['progress']['accuracy']}
            </td>
            <td>
                ${data[k]['progress']['elapsed_time']}
            </td>																			
            <td class="text-sm-center">
                <small class="text-sm-center">${data[k]['progress']['progress']}%</small>
                <progress class="progress" value="${data[k]['progress']['progress']}" max="100"></progress>
            </td>
            <td class="text-end">
                <div class="dropdown">
                    <button class="btn btn-sm dropdown-toggle" type="button" aria-haspopup="true" data-bs-toggle="dropdown">
                        Actions
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="on_cancel('${k}')">Cancel</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_delete('${k}')">Delete</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_log('${k}')">Log</a></li>
                        <li><a class="dropdown-item" href="#" onclick="on_graph('${k}')">Graph</a></li>
                    </ul>
                </div>
            </td>
        </tr>
        `
    }
    $("#id_table_body").html(temp)
}

function on_cancel(name) {
    console.log(name)
    $("#id_modal_confirm_msg").html(`Do you really want to cancel job?<br/><span class="badge bg-red-lt">ID: ${name}</span>`)
    $("#id_modal_confirm_ok").attr("onclick", `on_cancel_ok('${name}')`)
    $("#id_modal_confirm_ok").html("Yes!")
    $("#id_modal_confirm").modal('toggle')
}

function on_cancel_ok(name) {
    body = {
        'project_name': sessionStorage.getItem('project_name'),
        'job_name': name,
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/jobs/cancel",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60 * 1000,
        success: function (msg) {
            if (msg['err'] == null) {
                $.notify("job canceled", "success");
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

function on_delete(name) {
    console.log(name)
    $("#id_modal_confirm_msg").html(`Do you really want to delete job?<br/><span class="badge bg-red-lt">ID: ${name}</span>`)
    $("#id_modal_confirm_ok").attr("onclick", `on_delete_ok('${name}')`)
    $("#id_modal_confirm_ok").html("Delete")
    $("#id_modal_confirm").modal('toggle')
}

function on_delete_ok(name) {
    body = {
        'project_name': sessionStorage.getItem('project_name'),
        'job_name': name,
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/jobs/delete",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60 * 1000,
        success: function (msg) {
            if (msg['err'] == null) {
                $.notify("job deleted", "success");
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

function on_log(name) {
    console.log(name)

    body = {
        'project_name': sessionStorage.getItem('project_name'),
        'job_name': name,
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/jobs/log",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60 * 1000,
        success: function (msg) {
            if (msg['err'] == null) {
                ace.edit("id_modal_log_msg").setValue(msg['res'], -1)
                $("#id_modal_log").modal('toggle')
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        }
    });
}

function on_graph(name) {
    console.log(name)

    body = {
        'project_name': sessionStorage.getItem('project_name'),
        'job_name': name,
    }

    $.ajax({
        type: "post",
        contentType: "application/json",
        url: "/jobs/graph",
        data: JSON.stringify(body),
        dataType: 'json',
        timeout: 60 * 1000,
        success: function (msg) {
            if (msg['err'] == null) {
                draw_charts(msg['res'])
                $("#id_modal_graph").modal('toggle')
            } else {
                $.notify(msg['err']);
            }
        },
        error: function (e) {
            $.notify(e.statusText);
        }
    });
}

// create function, convert data to temp format
function convertData(data) {
    temp = {}
    for (var key in data) {
        temp[key] = {
            x: [],
            y: []
        }
        for (var i = 0; i < data[key].length; i++) {
            temp[key].x.push(data[key][i][0])
            temp[key].y.push(data[key][i][1])
        }
    }
    return temp
}

function draw_charts(data) {

    var options = {
        series: [ 
            {
                name: "series_name",
                data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            },
        ],
        chart: {
            height: 300,
            type: 'line',
            zoom: {
                enabled: false
            }
        },
        colors: ['#77B6EA', '#545454'],
        dataLabels: {
            enabled: false
        },
        // stroke: {
        //     curve: 'straight'
        // },
        title: {
            text: 'chart_name',
            align: 'left'
        },
        xaxis: {
            categories: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
            title: {
                text: 'x'
            }
        },
        yaxis: {
            title: {
                text: 'y'
            }
        },        
    };


    data = convertData(data)

    temp = ""
    for(var key in data) {
        temp += `<div id="id_modal_graph_chart_${key}" class="card mt-0 mb-3"></div>`
    }
    $("#id_modal_graph_body").html(temp)

    for(var key in data) {
        // copy options object
        var opt = JSON.parse(JSON.stringify(options));

        opt['series'][0]['name'] = key
        opt['series'][0]['data'] = data[key]['y']
        opt['xaxis']['categories'] = data[key]['x']
        opt['title']['text'] = key        
        var chart = new ApexCharts(document.querySelector(`#id_modal_graph_chart_${key}`), opt);
        chart.render();
    }

    
        

    // temp = ""
    // for (var i = 1; i < 5; i++) {
    //     //temp += `<div id="id_modal_graph_chart${i}" class="mx-2 my-2" style="height: 20rem"></div>`
    //     temp += `<div id="id_modal_graph_chart${i}" class="card mt-0 mb-3"></div>`

    // }
    // $("#id_modal_graph_body").html(temp)

    // // Loss
    // // Accuracy Viewer
    // chart_list = ['Loss', 'Accuracy', 'Model Size vs. Accuracy', 'Model FLOPs vs. Accuracy']
    // for (var i = 0; i < chart_list.length; i++) {
    //     options['title']['text'] = chart_list[i]
    //     var chart = new ApexCharts(document.querySelector(`#id_modal_graph_chart${i+1}`), options);
    //     chart.render();
    // }
}