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
    angular.module( 'angularTreeview', ['allControllers'] )
    .directive(
        'treeModel', ['$compile', '$http', 'globalServerURL', '$rootScope', '$templateCache', '$timeout', '$parse',
        function($compile, $http, globalServerURL, $rootScope, $templateCache, $timeout, $parse) {
            // // var getTemplate = function(contentType) {
            // var getTemplate = function(contentType) {
            //     var templateLoader,
            //     baseUrl = 'modal_templates',
            //     templateMap = {
            //         text: 'text.html',
            //         photo: 'photo.html',
            //         video: 'video.html',
            //         quote: 'quote.html',
            //         link: 'link.html',
            //         chat: 'chat.html',
            //         audio: 'audio.html',
            //         answer: 'answer.html'
            //     };

            //     var templateUrl = baseUrl + templateMap[contentType];
            //     // templateLoader = $http.get(templateUrl, {cache: $templateCache});
            //     var treeviewtemplate = $http.get("partials/treeview.html", {cache: $templateCache});

            //     // return templateLoader;
            //     return treeviewtemplate;

            // }

            // var linker = function(scope, element, attrs) {
            //     // tree id
            //     scope.treeId = attrs.treeId;
            //     // type
            //     scope.nodeType = attrs.nodeType || 'NodeType';
            //     // tree model
            //     scope.treeModel = attrs.treeModel;
            //     // node id
            //     scope.nodeId = attrs.nodeId || 'id';
            //     // type
            //     scope.nodeType = attrs.nodeType || 'NodeType';
            //     // node label
            //     scope.nodeLabel = attrs.nodeLabel || 'label';
            //     // children
            //     scope.nodeChildren = attrs.nodeChildren || 'children';
            //     // Copied node to be pasted
            //     scope.copiednode;

            //     var loader = getTemplate(scope.post.type);

            //     // check tree id, tree model
            //     if ( scope.treeId && scope.treeModel ) {
            //         // root node
            //         if ( attrs.angularTreeview ) {
            //             // create tree object if not exists
            //             scope[scope.treeId] = scope[scope.treeId] || {};

            //             // Function to delete data in server
            //             scope[scope.treeId].deleteItem = function(nodeid) {
            //                 console.log("Deleting "+ nodeid);
            //                 $http({
            //                     method: 'POST',
            //                     url:globalServerURL + nodeid + '/delete'
            //                 }).success(function () {
            //                     console.log('Success: Item deleted');
            //                     scope[scope.treeId].loadChildren(nodeid);
            //                 });
            //             }

            //             // Function to copy a node
            //             scope[scope.treeId].copy = function(cnode) {
            //                 scope.copiednode = cnode;
            //                 console.log("Path that is copied: " + scope.copiednode);
            //             }

            //             // function to POST data to server to paste item
            //             scope[scope.treeId].paste = function(nodeid) {
            //                 console.log("Node to be pasted: " + scope.copiednode);
            //                 $http({
            //                     method: 'POST',
            //                     url: globalServerURL + nodeid + '/paste',
            //                     data:{'ID': scope.copiednode}
            //                 }).success(function () {
            //                     console.log('Success: Node pasted');
            //                     scope[scope.treeId].loadChildren(nodeid);
            //                 });
            //             }

            //             // if node head clicks,
            //             // get the children of the node
            //             // and collapse or expand the node
            //             scope[scope.treeId].selectNodeHead = scope[scope.treeId].selectNodeHead || function( selectedNode ) {
            //                 scope[scope.treeId].currentNode = selectedNode;
            //                 // if the node is collapsed, get the data and
            //                 // expand the node
            //                 if (!selectedNode.collapsed){
            //                     // get path from the node
            //                     // and go to that path with http
            //                     var nodeid = selectedNode.ID;
            //                     scope[scope.treeId].loadChildren(nodeid);
            //                     selectedNode.collapsed = true;
            //                 }
            //                 else{
            //                 // collapse the node if it is expanded
            //                     selectedNode.collapsed = false;
            //                 }
            //             };

            //             scope[scope.treeId].loadChildren = function(parentid){
            //                 $http.get(globalServerURL + parentid + '/').success(function(data) {
            //                         console.log("Children loaded");
            //                         scope[scope.treeId].currentNode.Subitem = data;
            //                     });
            //             }

            //             // if node label clicks,
            //             scope[scope.treeId].selectNodeLabel = scope[scope.treeId].selectNodeLabel || function( selectedNode ) {
            //                 // remove highlight from previous node
            //                 if ( scope[scope.treeId].currentNode && scope[scope.treeId].currentNode.selected ) {
            //                     scope[scope.treeId].currentNode.selected = undefined;
            //                 }

            //                 // set highlight to selected node
            //                 selectedNode.selected = 'selected';

            //                 // set currentNode
            //                 scope[scope.treeId].currentNode = selectedNode;

            //                 // add the add menus in the dropdown
            //                 var nodetype = scope[scope.treeId].currentNode.NodeType;
            //                 var appendThis = '<li><a style="color: gray;">Add</a></li';
            //                 var otherMenuItems = '<li class="divider"></li>'+
            //                                     // '<li><a data-ng-click="' + treeId + '.deleteItem('+scope[treeId].currentNode.ID+')">Delete</a></li>'+
            //                                     // '<li><a data-ng-click="' + treeId + '.copy('+scope[treeId].currentNode.ID+')">Copy</a></li>'+
            //                                     // '<li><a data-ng-click="' + treeId + '.paste('+scope[treeId].currentNode.ID+')">Paste</a></li>';
            //                                     '<li><a data-toggle="modal" data-target="#myModal">Launch demo modal</a></li>'+
            //                                     '<li><a data-ng-click="' + scope.treeId + '.deleteItem(node.ID)">Delete</a></li>'+
            //                                     '<li><a data-ng-click="' + scope.treeId + '.copy(node.ID)">Copy</a></li>'+
            //                                     '<li><a data-ng-click="' + scope.treeId + '.paste(node.ID)">Paste</a></li>';
            //             };
            //         }
            //     }

            //     var promise = loader.success(function(html) {
            //         element.html(html);
            //     }).then(function (response) {
            //         element.replaceWith($compile(element.html())(scope));
            //     });
            // }

            // var getDropdownMenu = function(nodetype, treeid){
            //     var appendThis = '<li><a style="color: gray;">Add</a></li';
            //     var otherMenuItems = '<li class="divider"></li>'+
            //                         '<li><a data-toggle="modal" data-target="#myModal">Launch demo modal</a></li>'+
            //                         '<li><a data-ng-click="' + treeid + '.deleteItem(node.ID)">Delete</a></li>'+
            //                         '<li><a data-ng-click="' + treeid + '.copy(node.ID)">Copy</a></li>'+
            //                         '<li><a data-ng-click="' + treeid + '.paste(node.ID)">Paste</a></li>';

            //     return otherMenuItems;
            // }

            // return {
            //     restrict: 'E',
            //     scope: {
            //         post:'='
            //     },
            //     link: linker
            // };

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
                                            // Menu items added when node selected
                                        '</ul>'+
                                '</div>'+

                                '<div data-ng-hide="!node.collapsed"'+
                                    ' data-tree-id="' + treeId + '"' +
                                    ' data-tree-model="node.' + nodeChildren + '"'+
                                    ' data-node-id=' + nodeId +
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

                            // Watch for adding a child
                            $rootScope.$watch('addedChild', function() {
                                if ($rootScope.addedChild){
                                    var nodeid = scope[treeId].currentNode.ID;
                                    scope[treeId].loadChildren(nodeid);
                                    $rootScope.addedChild = false;
                                }
                            });

                            // Function to delete data in server
                            scope[treeId].deleteItem = function(nodeid) {
                                console.log("Deleting "+ nodeid);
                                $http({
                                    method: 'POST',
                                    url:globalServerURL + nodeid + '/delete'
                                }).success(function (response) {
                                    console.log('Success: Item deleted');
                                    scope[treeId].loadChildren(nodeid);
                                    scope[treeId].currentNode.selected = undefined;
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
                                    url: globalServerURL + nodeid + '/paste',
                                    data:{'ID': scope.copiednode}
                                }).success(function () {
                                    console.log('Success: Node pasted');
                                    scope[treeId].loadChildren(nodeid);
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
                                    scope[treeId].loadChildren(nodeid);
                                    selectedNode.collapsed = true;
                                }
                                else{
                                // collapse the node if it is expanded
                                    selectedNode.collapsed = false;
                                }
                            };

                            // Load the children and add to the tree
                            scope[treeId].loadChildren = function(parentid){
                                $http.get(globalServerURL + parentid + '/').success(function(data) {
                                        console.log("Children loaded");
                                        scope[treeId].currentNode.Subitem = data;
                                    });
                            }

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
                                var appendThis = '<li><a style="color: gray;">Add</a></li>';
                                var otherMenuItems = '<li class="divider"></li>'+
                                                    '<li><a data-ng-click="' + treeId + '.deleteItem('+scope[treeId].currentNode.ID+')">Delete</a></li>'+
                                                    '<li><a data-ng-click="' + treeId + '.copy('+scope[treeId].currentNode.ID+')">Copy</a></li>'+
                                                    '<li><a data-ng-click="' + treeId + '.paste('+scope[treeId].currentNode.ID+')">Paste</a></li>';
                                // Check the current node type and add menus
                                if (nodetype == 'Project'){
                                    appendThis = '<li><a data-toggle="modal" data-target="#addbudgetgroup">Add BudgetGroup</a></li>'+
                                                 '<li><a class="close-project" data-id="'+scope[treeId].currentNode.ID+'">Close project</a></li>';
                                }
                                else if (nodetype == 'BudgetGroup'){
                                    appendThis = '<li><a data-toggle="modal" data-target="#addbudgetgroup">Add BudgetGroup</a></li>'+
                                                    '<li><a data-toggle="modal" data-target="#addbudgetitem">Add BudgetItem</a></li>'+
                                                    '<li><a data-toggle="modal" data-target="#addcomponent">Add Component</a></li>';
                                }
                                else if (nodetype == 'BudgetItem'){
                                    appendThis = '<li><a data-toggle="modal" data-target="#addcomponent">Add Component</a></li>';
                                }
                                else if (nodetype == 'ResourceCategory'){
                                    appendThis = '<li><a data-toggle="modal" data-target="#addresource">Add Resource</a></li>';
                                }
                                $rootScope.currentSelectedNodeID = scope[treeId].currentNode.ID;

                                // Add to the html
                                $(".dropdown > ul.dropdown-menu").html(appendThis + otherMenuItems);
                                $compile($(".dropdown > ul.dropdown-menu").contents())(scope);
                            };
                        }
                        // Rendering template.
                        element.html('').append( $compile( template )( scope ) );
                    }
                }
            };
    }]);
})( angular );
