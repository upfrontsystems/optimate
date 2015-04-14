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

// Modal dialog module
(function() {
    var app;
    app = angular.module("ngModal", []);
    app.provider("ngModalDefaults", function() {
        return {
            options: {
                closeButtonHtml: "<span class='ng-modal-close-x'>X</span>"
            },
            $get: function() {
                return this.options;
            },
            set: function(keyOrHash, value) {
                var k, v, _results;
                if (typeof keyOrHash === 'object') {
                    _results = [];
                    for (k in keyOrHash) {
                        v = keyOrHash[k];
                        _results.push(this.options[k] = v);
                    }
                    return _results;
                }
                else {
                    return this.options[keyOrHash] = value;
                }
            }
        };
    });

    app.directive('modalDialog', [
        'ngModalDefaults', '$sce', function(ngModalDefaults, $sce) {
            return {
                restrict: 'E',
                scope: {
                    show: '=',
                    dialogTitle: '@',
                    onClose: '&?'
                },
                replace: true,
                transclude: true,
                link: function(scope, element, attrs) {
                    var setupCloseButton, setupStyle;
                    setupCloseButton = function() {
                        return scope.closeButtonHtml = $sce.trustAsHtml(ngModalDefaults.closeButtonHtml);
                    };
                    setupStyle = function() {
                        scope.dialogStyle = {};
                        if (attrs.width) {
                            scope.dialogStyle['width'] = attrs.width;
                        }
                        if (attrs.height) {
                            return scope.dialogStyle['height'] = attrs.height;
                        }
                    };
                    scope.hideModal = function() {
                        return scope.show = false;
                    };
                    scope.$watch('show', function(newVal, oldVal) {
                        if (newVal && !oldVal) {
                            document.getElementsByTagName("body")[0].style.overflow = "hidden";
                        }
                        else {
                            document.getElementsByTagName("body")[0].style.overflow = "";
                        }
                        if ((!newVal && oldVal) && (scope.onClose != null)) {
                            return scope.onClose();
                        }
                    });
                    setupCloseButton();
                    return setupStyle();
                },
                template: "<div class='ng-modal' ng-show='show'>\n  "+
                                "<div class='ng-modal-overlay' "+
                                    "ng-click='hideModal()'>"+
                                "</div>\n  "+
                                "<div class='ng-modal-dialog' "+
                                    "ng-style='dialogStyle'>\n"+
                                    "<span class='ng-modal-title' "+
                                        "ng-show='dialogTitle && dialogTitle.length' "+
                                        "ng-bind='dialogTitle'>"+
                                    "</span>\n"+
                                    "<div class='ng-modal-close' "+
                                        "ng-click='hideModal()'>\n"+
                                        "<div ng-bind-html='closeButtonHtml'></div>\n"+
                                    "</div>\n"+
                                    "<div class='ng-modal-dialog-content'"+
                                        "ng-transclude>"+
                                    "</div>\n"+
                                "</div>\n"+
                            "</div>"
            };
        }
    ]);

}).call(this);

// Treeview module
(function ( angular ) {
    'use strict';
    angular.module( 'angularTreeview', ['ngModal'] )
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
                    scope.showoptions = false;
                    scope.showinput = false;
                    scope.showcosts = false
                    scope.showtype = false;

                    // tree template
                    var template =
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

                                // Modal dialog with functions
                                '<span class="additem" data-ng-show="node.selected">'+
                                    '<img data-ng-src="../img/menu.png" data-ng-click="showoptions = true;"/>'+
                                    '<modal-dialog  show=showoptions '+
                                                    'dialog-title="Options" '+
                                                    'width="150px">'+
                                            // When Add button is pressed
                                            // another modal dialog opens
                                            '<button data-ng-click="showinput=true">Add</button>'+
                                                '<modal-dialog show=showinput '+
                                                                'dialog-title="Enter data" '+
                                                                'width="300px">'+
                                                    // a form in the add modal dialog
                                                    '<form data-ng-submit="'+
                                                                treeId + '.addItem(node.ID)">'+
                                                        // Name input
                                                        'Name:<br>'+
                                                        '<input type="text" '+
                                                                'name="inputName" '+
                                                                'data-ng-model="formData.inputName" '+
                                                                'required '+
                                                                'autofocus>'+
                                                        // Description input
                                                        '<br>Description:<br>'+
                                                        '<input type="text" '+
                                                                'name="inputDescription" '+
                                                                'data-ng-model="formData.inputDescription" '+
                                                                'required '+
                                                                'autofocus>'+
                                                        '<br>'+
                                                        // radio buttons to select type
                                                        '<br>Type:<br>'+
                                                        '<input type="radio" '+
                                                                'data-ng-model="formData.inputNodeType" '+
                                                                'data-ng-click="showcosts=false; showtype=false"'+
                                                                'value="project">'+
                                                                'Project<br>'+
                                                        '<input type="radio" '+
                                                                'data-ng-model="formData.inputNodeType" '+
                                                                'data-ng-click="showcosts=false; showtype=false"'+
                                                                'value="budgetgroup">'+
                                                                'BudgetGroup<br>'+
                                                        '<input type="radio" '+
                                                                'data-ng-model="formData.inputNodeType" '+
                                                                'data-ng-click="showcosts=true; showtype=false"'+
                                                                'value="budgetitem">'+
                                                                'BudgetItem<br>'+
                                                        '<input type="radio" '+
                                                                'data-ng-model="formData.inputNodeType" '+
                                                                'data-ng-click="showcosts=true; showtype=true"'+
                                                                'value="component">'+
                                                                'Component<br>'+
                                                        // depending on the radio button
                                                        // clicked these extra inputs
                                                        // are then displayed or hid
                                                        '<div data-ng-show="showcosts">'+
                                                                '<br>Quantity:<br>'+
                                                                    '<input type="integer" '+
                                                                    'name="inputQuantity" '+
                                                                    'data-ng-model="formData.inputQuantity">'+
                                                                // The rate should not be set by the user
                                                                // '<br>Rate:<br>'+
                                                                //     '<input type="integer" '+
                                                                //     'name="inputRate" '+
                                                                //     'data-ng-model="formData.inputRate">'+
                                                        '</div>'+
                                                        '<div data-ng-show="showtype">'+
                                                                'Type:<br>'+
                                                                    '<input type="integer" '+
                                                                    'name="inputComponentType" '+
                                                                    'data-ng-model="formData.inputComponentType">'+
                                                        '</div>'+
                                                        '<br><input type="submit" '+
                                                            'value="Add"/>'+
                                                    '</form>'+
                                                '</modal-dialog>'+
                                            '<button data-ng-click='+
                                                        '"' + treeId + '.deleteItem(node.ID)">'+
                                                        'Delete'+
                                            '</button>'+
                                            '<button data-ng-click='+
                                                        '"' + treeId + '.copy(node.ID)">'+
                                                        'Copy'+
                                            '</button>'+
                                            '<button data-ng-click='+
                                                        '"' + treeId + '.paste(node.ID)">'+
                                                        'Paste'+
                                            '</button>'+
                                            '<button data-ng-click='+
                                                        '"' + treeId + '.costItem(node.ID)">'+
                                                        'Get total cost'+
                                            '</button>'+
                                    '</modal-dialog>'+
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

                            // Function to get the cost of the node
                            scope[treeId].costItem = function(nodeid) {
                                console.log("Costing "+ nodeid);
                                $http.get(
                                    'http://127.0.0.1:8100/' + nodeid + '/cost'
                                    ).success(function(data) {
                                    console.log("Http request success: " + data);
                                     // get the cost of the node and post alert
                                    alert(data['Cost']);
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
