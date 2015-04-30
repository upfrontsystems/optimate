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
            // var getTemplate = function(contentType) {
            var getTemplate = function() {
                // var templateLoader,
                // baseUrl = 'modal_templates',
                // templateMap = {
                // };

                // var templateUrl = baseUrl + templateMap[contentType];
                // templateLoader = $http.get(templateUrl, {cache: $templateCache});
                var treeviewtemplate = $http.get("partials/treeview.html", {cache: $templateCache});
                // return templateLoader;
                return treeviewtemplate;
            }

            var linker = function(scope, element, attrs) {
                var loader = getTemplate();


                // Watch for adding a child
                $rootScope.$watch('addedChild', function() {
                    if ($rootScope.addedChild){
                        var nodeid = $rootScope.currentNode.ID;
                        scope.loadNodeChildren(nodeid);
                        $rootScope.addedChild = false;
                    }
                });

                // Check if the model exists before adding functions to it
                if (scope.treeModel){
                    // Function to delete data in server
                    scope.deleteThisNode = function(nodeid) {
                        console.log("Deleting "+ nodeid);
                        $http({
                            method: 'POST',
                            url:globalServerURL + nodeid + '/delete'
                        }).success(function (response) {
                            console.log('Success: Item deleted');
                            scope.loadNodeChildren(nodeid);
                            $rootScope.currentNode.selected = undefined;
                        });
                    }

                    // Function to copy a node
                    scope.copyThisNode = function(cnode) {
                        $rootScope.copiednodeid = cnode;
                        console.log("Path that is copied: " + cnode);
                    }

                    // function to POST data to server to paste item
                    scope.pasteThisNode = function(nodeid) {
                        if ($rootScope.copiednodeid){
                            console.log("Node to be pasted: " + $rootScope.copiednodeid);
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
                    // if node head clicks,
                    // get the children of the node
                    // and collapse or expand the node
                    scope.selectNodeHead = scope.selectNodeHead || function( selectedNode ) {
                        $rootScope.currentNode = selectedNode;
                        // if the node is collapsed, get the data and
                        // expand the node
                        if (!selectedNode.collapsed){
                            // get path from the node
                            // and go to that path with http
                            var nodeid = selectedNode.ID;
                            scope.loadNodeChildren(nodeid);
                            selectedNode.collapsed = true;
                        }
                        else{
                        // collapse the node if it is expanded
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
                        if ( $rootScope.currentNode && $rootScope.currentNode.selected ) {
                            $rootScope.currentNode.selected = undefined;
                        }

                        // set highlight to selected node
                        selectedNode.selected = 'selected';
                        // set currentNode
                        $rootScope.currentNode = selectedNode;

                         // add the add menus in the dropdown
                        var nodetype = $rootScope.currentNode.NodeType;
                        var currentnodeid = $rootScope.currentNode.NodeType;
                        var appendThis = '<li><a style="color: gray;">Add</a></li>';
                        var otherMenuItems = '<li class="divider"></li>'+
                                        '<li><a data-ng-click="deleteThisNode('+currentnodeid+')">Delete</a></li>'+
                                        '<li><a data-ng-click="copyThisNode('+currentnodeid+')">Copy</a></li>'+
                                        '<li><a data-ng-click="pasteThisNode('+currentnodeid+')">Paste</a></li>';
                        // Check the current node type and add menus
                        if (nodetype == 'Project'){
                            appendThis = '<li><a data-toggle="modal" data-target="#addbudgetgroup">Add BudgetGroup</a></li>';
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
                        $rootScope.currentSelectedNodeID = currentnodeid;

                        // Add to the html
                        $(".dropdown > ul.dropdown-menu").html(appendThis + otherMenuItems);
                        $compile($(".dropdown > ul.dropdown-menu").contents())(scope);
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
                scope: {
                    treeModel:'='
                },
                link: linker
            };
    }]);
})( angular );
