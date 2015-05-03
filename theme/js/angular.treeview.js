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

            var linker = function(scope, element, attrs) {
                var loader = $http.get("partials/treeview.html", {cache: $templateCache});

                // Watch for when a child is added and refresh the treeview
                $rootScope.$watch('addedChild', function() {
                    if ($rootScope.addedChild){
                        var nodeid = $rootScope.currentNode.ID;
                        scope.loadNodeChildren(nodeid);
                        $rootScope.addedChild = false;
                    }
                });

                // Check if the model exists before adding functions to it
                if (scope.treeModel){
                    // Deleting a node. It recieves the index of the node
                    // The id is sent to the server to be deleted and the node
                    // removed from the treemodel
                    scope.deleteThisNode = function ( idx ) {
                        var nodeid = scope.treeModel[idx].ID;
                        $http({
                            method: 'POST',
                            url:globalServerURL + nodeid + '/delete'
                        }).success(function (response) {
                            console.log('Success: Item deleted');
                            scope.treeModel.splice(idx, 1);
                        });
                    };

                    // Function to copy a node
                    scope.copyThisNode = function(cnode) {
                        $rootScope.copiednodeid = cnode;
                        console.log("Path that is copied: " + cnode);
                    }

                    // function to paste copied node into another node
                    // the id is sent to the server and the node pasted there
                    // the user cant paste into the same node
                    scope.pasteThisNode = function(nodeid) {
                        if ($rootScope.copiednodeid){
                            if ($rootScope.copiednodeid == nodeid){
                                alert("You can't paste into the same node");
                            }
                            else {
                                $http({
                                    method: 'POST',
                                    url: globalServerURL + nodeid + '/paste',
                                    data:{'ID': $rootScope.copiednodeid}
                                }).success(function () {
                                    console.log('Success: Node pasted');
                                    scope.loadNodeChildren(nodeid);
                                });
                            }
                        }
                    }
                    // if node head clicks,
                    // get the children of the node
                    // and collapse or expand the node
                    scope.selectNodeHead = scope.selectNodeHead || function( selectedNode ) {
                        // if the node is collapsed, get the data and
                        // expand the node
                        if (!selectedNode.collapsed){
                            selectedNode.collapsed = true;
                            var parentid = selectedNode.ID;
                            $http.get(globalServerURL + parentid + '/').success(function(data) {
                                console.log("Children loaded");
                                selectedNode.Subitem = data;
                            });
                        }
                        else{
                            selectedNode.collapsed = false;
                        }
                    };

                    // Load the children and add to the tree
                    scope.loadNodeChildren = function(parentid){
                        $http.get(globalServerURL + parentid + '/').success(function(data) {
                            console.log("Children loaded");
                            $rootScope.currentNode.Subitem = data;
                        });
                    }

                    // if node label clicks,
                    scope.selectNodeLabel = scope.selectNodeLabel || function( selectedNode ) {
                        // remove highlight from previous node
                        if ($rootScope.currentNode) {
                            $rootScope.currentNode.selected = undefined;
                        }

                        // set highlight to selected node
                        selectedNode.selected = 'selected';
                        // set currentNode
                        $rootScope.currentNode = selectedNode;

                         // add the add menus in the dropdown
                        var nodetype = $rootScope.currentNode.NodeType;
                        var currentnodeid = $rootScope.currentNode.ID;
                        $rootScope.currentSelectedNodeID = currentnodeid;
                        var appendThis = '<li><a class="unselectable">Add</a></li>';
                        // Check the current node type and add menus
                        if (nodetype == 'Project'){
                            appendThis = '<li><a role="button" data-toggle="modal" data-target="#addbudgetgroup">Add BudgetGroup</a></li>'+
                                         '<li><a role="button" class="close-project" data-id="'+currentnodeid+'">Close project</a></li>';
                        }
                        else if (nodetype == 'BudgetGroup'){
                            appendThis = '<li><a role="button" data-toggle="modal" data-target="#addbudgetgroup">Add BudgetGroup</a></li>'+
                                        '<li><a role="button" data-toggle="modal" data-target="#addbudgetitem">Add BudgetItem</a></li>'+
                                        '<li><a role="button" data-toggle="modal" data-target="#addcomponent">Add Component</a></li>';
                        }
                        else if (nodetype == 'BudgetItem'){
                            appendThis = '<li><a role="button" data-toggle="modal" data-target="#addcomponent">Add Component</a></li>';
                        }
                        else if (nodetype == 'ResourceCategory'){
                            appendThis = '<li><a role="button" data-toggle="modal" data-target="#addresource">Add Resource</a></li>';
                        }
                        // Add to the html
                        // $(".dropdown > ul.dropdown-menu").html(appendThis);
                        // $compile($(".dropdown > ul.dropdown-menu").contents())(scope);
                        $(".dropdown > ul.dropdown-menu #space-for-add-menus").html(appendThis);
                        $compile($(".dropdown > ul.dropdown-menu #space-for-add-menus").contents())(scope);

                        // var e = $compile(appendThis)(scope);
                        // $(".dropdown > ul.dropdown-menu #space-for-add-menus").replaceWith(e);
                    };
                }

                var promise = loader.success(function(html) {
                    element.html(html);
                }).then(function (response) {
                    var result = $compile(element.html())(scope);
                    element.html('').append(result);
                });
            }

            return {
                restrict: 'A',
                controller: 'treeviewController',
                scope: {
                    treeModel:'='
                },
                link: linker
            };
    }]);
})( angular );
