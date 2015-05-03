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
            return {
                restrict: 'A',
                controller: 'treeviewFunctionsController',
                scope: {
                    treeModel:'='
                },
                // templateUrl: 'partials/treeview.html',
                link: function(scope, element, attrs) {
                    $http.get("partials/treeview.html", {cache: $templateCache})
                    .success(function(html) {
                        element.html(html);
                    }).then(function (response) {
                        var result = $compile(element.html())(scope);
                        element.html('').append(result);
                    });
                }
            };
    }]);
})( angular );
