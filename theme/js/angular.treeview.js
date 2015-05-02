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

                // Check if the model exists before adding functions to it
                if (scope.treeModel){
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
                         // Get the node type and retrieve the neccesary html
                        var nodetype = selectedNode.NodeType;
                        $http.get("modal_templates/menu"+nodetype+".html")
                        .success(function (response) {
                            $(".dropdown > ul.dropdown-menu #space-for-add-menus").html(response);
                            $compile($(".dropdown > ul.dropdown-menu #space-for-add-menus").contents())(scope);
                        });
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
