/*
    @license Angular Treeview version 0.1.6
    ⓒ 2013 AHN JAE-HA http://github.com/eu81273/angular.treeview
    License: MIT
    [TREE attribute]
    angular-treeview: the treeview directive
    tree-id : each tree's unique id.
    tree-model : the tree model on $scope.
    node-id : each node's id
    node-label : each node's label
    node-children: each node's children
    <div
        data-angular-treeview="true"
        data-tree-id="tree"
        data-tree-model="roleList"
        data-node-id="roleId"
        data-node-label="roleName"
        data-node-children="children" >
    </div>
*/
// Treeview directive
(function ( angular ) {
    'use strict';
    angular.module( 'angularTreeview', [] )
    .directive(
        'treeModel', ['$compile', '$http', function( $compile, $http) {
            return {
                restrict: 'A',
                link: function ( scope, element, attrs ) {
                    // tree id
                    var treeId = attrs.treeId;
                    // tree model
                    var treeModel = attrs.treeModel;
                    // node id
                    var nodeId = attrs.nodeId || 'id';
                    // node label
                    var nodeLabel = attrs.nodeLabel || 'label';
                    // children
                    var nodeChildren = attrs.nodeChildren || 'children';
                    // Copied node to be pasted
                    scope.copiednode;
                    // show modal and other input options
                    scope.showcosts = false
                    scope.showtype = false;

                    // tree template
                    var template =
                        // Bootstrap modal dialog for adding a node
                        '<div id="addItem" class="modal">'+
                            '<div class="modal-dialog">'+
                                '<div class="modal-content">'+
                                    '<div class="modal-header">'+
                                        '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'+
                                        '<h3 class="modal-title">Add a new Node</h3>'+
                                    '</div>'+
                                    '<div class="modal-body">'+
                                        '<form>'+
                                            '<br>Name:'+
                                            '<input type="text"'+
                                                    'name="inputName"'+
                                                    'data-ng-model="formData.inputName"'+
                                                    'required'+
                                                    'autofocus>'+
                                        '</form>'+
                                    '</div>'+
                                    '<div class="modal-footer">'+
                                        '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>'+
                                        '<button type="button" class="btn btn-primary" data-dismiss="modal" data-ng-click="addItem()">Add</button>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+
                        // Build a list of the nodes in the tree
                        // Display depends on the state of the node

                        '<ul>' +
                            '<li data-ng-repeat="node in ' + treeModel + '">' +
                                '<i class="collapsed" ' +
                                    'data-ng-show="node.' + nodeChildren +
                                    '.length && node.collapsed" '+
                                    'data-ng-click="' +
                                    treeId + '.selectNodeHead(node)">'+
                                '</i>' +
                                '<i class="expanded" '+
                                    'data-ng-show="node.' + nodeChildren +
                                    '.length && !node.collapsed" '+
                                    'data-ng-click="' +
                                    treeId + '.selectNodeHead(node)">'+
                                '</i>' +
                                '<i class="normal" '+
                                    'data-ng-hide="node.' + nodeChildren +
                                    '.length">'+
                                '</i> ' +
                                // Call this funcion when
                                // the node label is clicked
                                '<span class="treenode" '+
                                    'id="{{node.' + nodeId + '}}"'+
                                    'data-ng-class="node.selected" '+
                                    'data-ng-click="' + treeId +
                                    '.selectNodeLabel(node)">'+
                                    '{{node.' + nodeLabel + '}}'+
                                '</span>' +

                                // bootstap dropdown menu
                                '<span class="btn-group" data-ng-show="node.selected">'+
                                        '<button type="button" data-toggle="dropdown" class="btn btn-default dropdown-toggle"><span class="caret"></span></button>'+
                                        '<ul class="dropdown-menu">'+
                                            '<li><a ng-data-target="#addItem" href="" ng-data-toggle="modal">Add</a></li>'+
                                            '<li class="divider"></li>'+
                                            '<li><a data-ng-click="' + treeId + '.deleteItem(node.ID)">Delete</a></li>'+
                                            '<li><a data-ng-click="' + treeId + '.copy(node.ID)">Copy</a></li>'+
                                            '<li><a data-ng-click="' + treeId + '.paste(node.ID)">Paste</a></li>'+
                                        '</ul>'+
                                '</span>'+

                                '<div data-ng-hide="!node.collapsed" '+
                                    'data-tree-id="' + treeId +
                                    '" data-tree-model="node.' + nodeChildren +
                                    '" data-node-id=' + nodeId +
                                    ' data-node-label=' + nodeLabel +
                                    ' data-node-children=' + nodeChildren + '>'+
                                '</div>' +
                            '</li>' +
                        '</ul>';


                    // check tree id, tree model
                    if ( treeId && treeModel ) {
                        // root node
                        if ( attrs.angularTreeview ) {
                            // create tree object if not exists
                            scope[treeId] = scope[treeId] || {};

                            // function to POST data to server to add item
                            // Get values from the user input
                            scope[treeId].addItem = function(nodeid) {
                                var name = scope.formData.inputName;
                                scope.formData.inputName = "";
                                var description = scope.formData.inputDescription;
                                scope.formData.inputDescription = "";
                                var nodetype = scope.formData.inputNodeType;
                                var quantity = scope.formData.inputQuantity;
                                scope.formData.inputQuantity = 0
                                // var rate = scope.formData.inputRate;
                                // scope.formData.inputRate = 0
                                var componenttype = scope.formData.inputComponentType;
                                scope.formData.inputComponentType = 0

                                console.log("Adding a " + nodetype + " " + name +
                                    ", " + description + " to: " + nodeid);
                                $http({
                                    method: 'POST',
                                    url: 'http://localhost:8100/' + nodeid + '/add',
                                    data:{'Name': name,
                                          'Description': description,
                                          'NodeType': nodetype,
                                          'Quantity': quantity,
                                          // 'Rate': rate,
                                          'ComponentType': componenttype}
                                }).success(function () {
                                    alert('Success: Child added');
                                    console.log("added");
                                    scope[treeId].currentNode.Subitem = [{'Name': '...'}];
                                });
                            }

                            // Function to delete data in server
                            scope[treeId].deleteItem = function(nodeid) {
                                console.log("Deleting "+ nodeid);
                                $http({
                                    method: 'POST',
                                    url:'http://localhost:8100/' + nodeid + '/delete'
                                }).success(function () {
                                    alert('Success: Item deleted');
                                });
                            }

                            // Function to copy a node
                            scope[treeId].copy = function(cnode) {
                                scope.copiednode = cnode;
                                console.log("Path that is copied: " + scope.copiednode);
                                alert('Node address copied')
                            }

                            // function to POST data to server to paste item
                            scope[treeId].paste = function(nodeid) {
                                console.log("Node to be pasted: " + scope.copiednode);
                                $http({
                                    method: 'POST',
                                    url: 'http://localhost:8100/' + nodeid + '/paste',
                                    data:{'ID': scope.copiednode}
                                }).success(function () {
                                    alert('Success: Node pasted');
                                    scope[treeId].currentNode.Subitem = [{'Name': '...'}];
                                });
                            }

                            // if node head clicks,
                            // get the children of the node
                            // and collapse or expand the node
                            scope[treeId].selectNodeHead = scope[treeId].selectNodeHead || function( selectedNode ) {
                                scope[treeId].currentNode = selectedNode;
                                // if the node is collapsed, get the data and
                                // expand the node
                                if (!selectedNode.collapsed){
                                    // get path from the node
                                    // and go to that path with http
                                    var nodeid = selectedNode.ID;
                                    $http.get('http://127.0.0.1:8100/' + nodeid + '/').success(function(data) {
                                        console.log("Children loaded");
                                        scope[treeId].currentNode.Subitem = data;
                                    });
                                    selectedNode.collapsed = true;
                                }
                                else{
                                // collapse the node if it is expanded
                                    selectedNode.collapsed = false;
                                }
                            };

                            // if node label clicks,
                            scope[treeId].selectNodeLabel = scope[treeId].selectNodeLabel || function( selectedNode ) {
                                // remove highlight from previous node
                                if ( scope[treeId].currentNode && scope[treeId].currentNode.selected ) {
                                    scope[treeId].currentNode.selected = undefined;
                                }

                                // set highlight to selected node
                                selectedNode.selected = 'selected';

                                // set currentNode
                                scope[treeId].currentNode = selectedNode;
                            };
                        }
                        // Rendering template.
                        element.html('').append( $compile( template )( scope ) );
                    }
                }
            };
    }]);
})( angular );
