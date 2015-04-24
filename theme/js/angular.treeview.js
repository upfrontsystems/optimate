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
                    // type
                    var nodeType = attrs.nodeType || 'NodeType';
                    // tree model
                    var treeModel = attrs.treeModel;
                    // node id
                    var nodeId = attrs.nodeId || 'id';
                    // type
                    var nodeType = attrs.nodeType || 'NodeType';
                    // node label
                    var nodeLabel = attrs.nodeLabel || 'label';
                    // children
                    var nodeChildren = attrs.nodeChildren || 'children';
                    // Copied node to be pasted
                    scope.copiednode;
                    // show modal and other input options
                    scope.showcosts = false
                    scope.showtype = false;
                    scope.tempTestingType = 'Project';

                    // tree template
                    var template =
                        // Bootstrap modal dialog for adding a budgetgroup
                        '<div id="addBudgetGroup" class="modal">'+
                            '<div class="modal-dialog">'+
                                '<div class="modal-content">'+
                                    '<div class="modal-header">'+
                                        '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'+
                                        '<h3 class="modal-title">Add BudgetGroup</h3>'+
                                    '</div>'+
                                    '<div class="modal-body">'+
                                        '<form>'+
                                            '<br>Name:'+
                                            '<input type="text"'+
                                                    'name="inputName"'+
                                                    'ng-model="formData.inputName"'+
                                                    'required'+
                                                    'autofocus>'+
                                            '<br>Description:'+
                                            '<input type="textarea"'+
                                                    'name="inputDescription"'+
                                                    'ng-model="formData.inputDescription"'+
                                                    'style="width: 300px; height: 150px;"'+
                                                    'autofocus>'+
                                        '</form>'+
                                    '</div>'+
                                    '<div class="modal-footer">'+
                                        '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>'+
                                        '<button type="button" class="btn btn-primary" data-dismiss="modal" ng-click="addItem()">Add</button>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+

                        // Bootstrap modal dialog for adding a budgetitem
                        '<div id="addBudgetItem" class="modal">'+
                            '<div class="modal-dialog">'+
                                '<div class="modal-content">'+
                                    '<div class="modal-header">'+
                                        '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'+
                                        '<h3 class="modal-title">Add BudgetItem</h3>'+
                                    '</div>'+
                                    '<div class="modal-body">'+
                                        '<form>'+
                                            '<br>Name:'+
                                            '<input type="text"'+
                                                    'name="inputName"'+
                                                    'ng-model="formData.inputName"'+
                                                    'required'+
                                                    'autofocus>'+
                                            '<br>Description:'+
                                            '<input type="textarea"'+
                                                    'name="inputDescription"'+
                                                    'ng-model="formData.inputDescription"'+
                                                    'style="width: 300px; height: 150px;"'+
                                                    'autofocus>'+
                                            '<br>Quantity:'+
                                            '<input type="text"'+
                                                    'name="inputQuantity"'+
                                                    'ng-model="formData.inputQuantity"'+
                                                    'autofocus>'+
                                            '<br>Markup:'+
                                            '<input type="number"'+
                                                    'name="inputMarkup"'+
                                                    'ng-model="formData.inputMarkup"'+
                                                    'autofocus>'+
                                        '</form>'+
                                    '</div>'+
                                    '<div class="modal-footer">'+
                                        '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>'+
                                        '<button type="button" class="btn btn-primary" data-dismiss="modal" ng-click="addItem()">Add</button>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+

                        // Bootstrap modal dialog for adding a component
                        '<div id="addComponent" class="modal">'+
                            '<div class="modal-dialog">'+
                                '<div class="modal-content">'+
                                    '<div class="modal-header">'+
                                        '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'+
                                        '<h3 class="modal-title">Add Component</h3>'+
                                    '</div>'+
                                    '<div class="modal-body">'+
                                        '<form>'+
                                            '<br>Name:'+
                                            '<input type="text"'+
                                                    'name="inputName"'+
                                                    'ng-model="formData.inputName"'+
                                                    'required'+
                                                    'autofocus>'+
                                            '<br>Description:'+
                                            '<input type="textarea"'+
                                                    'name="inputDescription"'+
                                                    'ng-model="formData.inputDescription"'+
                                                    'style="width: 300px; height: 150px;"'+
                                                    'autofocus>'+
                                            '<br>Quantity:'+
                                            '<input type="text"'+
                                                    'name="inputQuantity"'+
                                                    'ng-model="formData.inputQuantity"'+
                                                    'autofocus>'+
                                            '<br>Markup:'+
                                            '<input type="number"'+
                                                    'name="inputMarkup"'+
                                                    'ng-model="formData.inputMarkup"'+
                                                    'autofocus>'+
                                            '<br>Type:'+
                                            '<input type="number"'+
                                                    'name="inputType"'+
                                                    'ng-model="formData.inputType"'+
                                                    'autofocus>'+
                                        '</form>'+
                                    '</div>'+
                                    '<div class="modal-footer">'+
                                        '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>'+
                                        '<button type="button" class="btn btn-primary" data-dismiss="modal" ng-click="addItem()">Add</button>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+

                        // Bootstrap modal dialog for adding a resource
                        '<div id="addResource" class="modal">'+
                            '<div class="modal-dialog">'+
                                '<div class="modal-content">'+
                                    '<div class="modal-header">'+
                                        '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'+
                                        '<h3 class="modal-title">Add Resource</h3>'+
                                    '</div>'+
                                    '<div class="modal-body">'+
                                        '<form>'+
                                            '<br>Name:'+
                                            '<input type="text"'+
                                                    'name="inputName"'+
                                                    'ng-model="formData.inputName"'+
                                                    'required'+
                                                    'autofocus>'+
                                        '</form>'+
                                    '</div>'+
                                    '<div class="modal-footer">'+
                                        '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>'+
                                        '<button type="button" class="btn btn-primary" data-dismiss="modal" ng-click="addItem()">Add</button>'+
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
                                '<span class="treenode {{node.' + nodeType + '}}" '+
                                    'id="{{node.' + nodeId + '}}"'+
                                    'data-ng-class="node.selected" '+
                                    'data-ng-click="' + treeId +
                                    '.selectNodeLabel(node)">'+
                                    '{{node.' + nodeLabel + '}}'+
                                '</span>' +

                                // bootstap dropdown menu
                                '<div class="dropdown" data-ng-show="node.selected">'+
                                        '<a data-toggle="dropdown"><span class="caret"></span></a>'+
                                        '<ul class="dropdown-menu">'+

                                        '</ul>'+
                                '</div>'+

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
                                    console.log('Success: Item deleted');
                                });
                            }

                            // Function to copy a node
                            scope[treeId].copy = function(cnode) {
                                scope.copiednode = cnode;
                                console.log("Path that is copied: " + scope.copiednode);
                            }

                            // function to POST data to server to paste item
                            scope[treeId].paste = function(nodeid) {
                                console.log("Node to be pasted: " + scope.copiednode);
                                $http({
                                    method: 'POST',
                                    url: 'http://localhost:8100/' + nodeid + '/paste',
                                    data:{'ID': scope.copiednode}
                                }).success(function () {
                                    console.log('Success: Node pasted');
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

                                // add the add menus in the dropdown
                                var nodetype = scope[treeId].currentNode.NodeType;
                                var appendThis = '<li><p>Add</p></li>';
                                var otherMenuItems = '<li class="divider"></li>'+
                                            '<li><a data-ng-click="' + treeId + '.deleteItem(node.ID)">Delete</a></li>'+
                                            '<li><a data-ng-click="' + treeId + '.copy(node.ID)">Copy</a></li>'+
                                            '<li><a data-ng-click="' + treeId + '.paste(node.ID)">Paste</a></li>';
                                if (nodetype == 'Project'){
                                    appendThis = '<li><a data-target="#addBudgetGroup" href="" data-toggle="modal">Add BudgetGroup</a></li>';
                                }
                                else if (nodetype == 'BudgetGroup'){
                                    appendThis = '<li><a data-target="#addBudgetGroup" href="" data-toggle="modal">Add BudgetGroup</a></li>'+
                                                                '<li><a data-target="#addBudgetItem" href="" data-toggle="modal">Add BudgetItem</a><li>'+
                                                                '<li><a data-target="#addComponent" href="" data-toggle="modal">Add Component</a><li>';
                                }
                                else if (nodetype == 'BudgetItem'){
                                    appendThis = '<li><a data-target="#addComponent" href="" data-toggle="modal">Add Component</a></li>';
                                }
                                else if (nodetype == 'Component'){
                                    appendThis = '<li><a style="color: gray;">Add</a></li';
                                }
                                else if (nodetpye == 'ResourceCategory'){
                                    appendThis = '<li><a data-target="#addResource" href="" data-toggle="modal">Add Resource</a></li>'
                                }

                                $(".dropdown > ul.dropdown-menu").append(appendThis + otherMenuItems);
                            };
                        }
                        // Rendering template.
                        element.html('').append( $compile( template )( scope ) );
                    }
                }
            };
    }]);
})( angular );
