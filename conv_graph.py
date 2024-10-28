import json


# elements: [ // list of graph elements to start with
#     { // node a
#         data: {
#             id: "a",
#             label: '노드 이름 ABC',
#             color: "#f2f2f2",
#         }
#     },
#     { // node b
#         data: {
#             id: "b",
#             label: 'Node B',
#             color: "#a1a1a1",
#         },
#     },
#     { // node c
#         data: {
#             id: "c",
#             label: 'Node C',
#             color: "#888888",
#         },
#     },
#
#     { // edge ab
#         data: { id: 'ab', source: 'a', target: 'b' }
#     },
#     { // edge ac
#         data: { id: 'ac', source: 'a', target: 'c' }
#     },
# ],
def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)


#     { // node a
#         data: {
#             id: "a",
#             label: '노드 이름 ABC',
#             color: "#f2f2f2",
#         }
#     },
def conv_graph(path):
    elements = []

    data = load_json(path)

    layers_ = {}

    # get nodes
    for layer in data['layers']:
        layers_[layer['name']] = layer  # for searching edges
        node = {
            "data": {
                "id": layer['name'],
                "classname": layer['classname'],
                "idx": layer['idx'],
            }
        }
        elements.append(node)

    # get edges
    for layer in data['layers']:
        for inbound in layer['inbound']:
            edge = {
                "data": {
                    "source": inbound[0],
                    "idx": layers_[inbound[0]]['idx'],
                    "target": layer['name'],
                    "label": 'x'.join(map(str, layers_[inbound[0]]['output_shape'][inbound[1]]))
                }
            }
            elements.append(edge)

            # check if it is output layer
            layers_[inbound[0]]['is_output'] = False


    # # find end nodes & add final node to it
    # # if node has no outbound, it is end node
    # for i, v in enumerate(layers_.values()):
    #
    #     if 'is_output' not in v:
    #         # add final node
    #         node = {
    #             "data": {
    #                 "id": f"output_{i}",
    #                 "classname": f"output_{i}",
    #                 "idx": 0
    #             }
    #         }
    #         elements.append(node)
    #
    #         # add edge to final node
    #         edge = {
    #             "data": {
    #                 "source": v['name'],
    #                 "target": node['data']['id'],
    #                 "label": 'x'.join(map(str, v['output_shape'][0]))
    #             }
    #         }
    #         elements.append(edge)



    # edge = {
    #     "data": {
    #         "source": node['data']['id'],
    #         "target": 'final',
    #         "label": 'x'.join(map(str, layers_[node['data']['id']]['output_shape'][0]))
    #     }
    # }
    # elements.append(edge)

    return elements