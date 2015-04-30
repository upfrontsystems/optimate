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
                //     text: 'text.html',
                //     photo: 'photo.html',
                //     video: 'video.html',
                //     quote: 'quote.html',
                //     link: 'link.html',
                //     chat: 'chat.html',
                //     audio: 'audio.html',
                //     answer: 'answer.html'
                // };

                // var templateUrl = baseUrl + templateMap[contentType];
                // templateLoader = $http.get(templateUrl, {cache: $templateCache});
                var treeviewtemplate = $http.get("partials/treeview.html", {cache: $templateCache});
                // return templateLoader;
                return treeviewtemplate;

            }

            var linker = function(scope, element, attrs) {
                scope.nodeType = attrs.nodeType || 'NodeType';
                // tree model
                // scope.treeModel = scope.roleList;
                scope.treeModel = scope[attrs.treeModel] || [];
                // node id
                scope.nodeId = attrs.nodeId || 'id';
                // node label
                scope.nodeLabel = attrs.nodeLabel || 'label';
                // children
                scope.nodeChildren = attrs.nodeChildren || 'children';
                // Copied node to be pasted
                scope.copiednodeid;
                console.log("Current array of nodes: " + attrs.treeModel);
                console.log(scope.treeModel);
                // console.log(attrs.treeModel);

                var loader = getTemplate();

                // check tree id, tree model
                // if ( treeId && treeModel ) {
                if (scope.treeModel) {
                    // root node
                    if ( attrs.angularTreeview ) {
                        // create tree object if not exists
                        // scope[treeId] = scope[treeId] || {};

                        // Watch for adding a child
                        $rootScope.$watch('addedChild', function() {
                            if ($rootScope.addedChild){
                                var nodeid = scope.currentNode.ID;
                                scope.loadNodeChildren(nodeid);
                                $rootScope.addedChild = false;
                            }
                        });

                        // Function to delete data in server
                        scope.deleteThisNode = function(nodeid) {
                            console.log("Deleting "+ nodeid);
                            $http({
                                method: 'POST',
                                url:globalServerURL + nodeid + '/delete'
                            }).success(function (response) {
                                console.log('Success: Item deleted');
                                scope.loadNodeChildren(nodeid);
                                scope.currentNode.selected = undefined;
                            });
                        }

                        // Function to copy a node
                        scope.copyThisNode = function(cnode) {
                            scope.copiednodeid = cnode;
                            console.log("Path that is copied: " + scope.copiednodeid);
                        }

                        // function to POST data to server to paste item
                        scope.pasteThisNode = function(nodeid) {
                            console.log("Node to be pasted: " + scope.copiednodeid);
                            $http({
                                method: 'POST',
                                url: globalServerURL + nodeid + '/paste',
                                data:{'ID': scope.copiednodeid}
                            }).success(function () {
                                console.log('Success: Node pasted');
                                scope.loadNodeChildren(nodeid);
                            });
                        }
                        // if node head clicks,
                        // get the children of the node
                        // and collapse or expand the node
                        scope.selectNodeHead = scope.selectNodeHead || function( selectedNode ) {
                            scope.currentNode = selectedNode;
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
                                    scope.currentNode.Subitem = data;
                                });
                        }

                        // if node label clicks,
                        scope.selectNodeLabel = scope.selectNodeLabel || function( selectedNode ) {
                            // remove highlight from previous node
                            if ( scope.currentNode && scope.currentNode.selected ) {
                                scope.currentNode.selected = undefined;
                            }

                            // set highlight to selected node
                            selectedNode.selected = 'selected';

                            // set currentNode
                            scope.currentNode = selectedNode;

                            /*

                            TODO: adding dropdown menu items

                            */
                        };
                    }
                }

                var promise = loader.success(function(html) {
                    element.html(html);
                }).then(function (response) {
                    element.replaceWith($compile(element.html())(scope));
                });
            }

            return {
                restrict: 'A',
                scope: {
                    treeModel:'='
                },
                link: linker
            };

            // return {
            //     restrict: 'EA',

            //     templateUrl: 'partials/treeview.html',

            //     compile: function (element, attrs) {
            //         var template = element.html()
            //                         .replace('#__NODETYPE__#', attrs.nodeType || 'NodeType')
            //                         .replace('#__TREEMODEL__#', attrs.treeModel)
            //                         .replace('#__NODEID__#', attrs.nodeId || 'id')
            //                         .replace('#__NODELABEL__#', attrs.nodeLabel || 'label')
            //                         .replace('#__NODECHILDREN__#', attrs.nodeChildren || 'children');

            //         element.html(template);

            //         return function link(scope, element, attrs) {}
            //         }
            //     };

            // return {
            //     restrict: 'A',
            //     link: function ( scope, element, attrs ) {
            //         // tree id
            //         // var treeId = attrs.treeId;
            //         // console.log(treeId);
            //         // type
            //         var nodeType = attrs.nodeType || 'NodeType';
            //         // tree model
            //         var treeModel = attrs.treeModel;
            //         // node id
            //         var nodeId = attrs.nodeId || 'id';
            //         // node label
            //         var nodeLabel = attrs.nodeLabel || 'label';
            //         // children
            //         var nodeChildren = attrs.nodeChildren || 'children';
            //         // Copied node to be pasted
            //         scope.copiednodeid;
            //         // tree template

            //         var template =
            //             // Build a list of the nodes in the tree
            //             // Display depends on the state of the node
            //             '<ul>' +
            //                 '<li data-ng-repeat="node in ' + treeModel + '">' +
            //                     '<i class="collapsed" ' +
            //                         'data-ng-show="node.' + nodeChildren +
            //                         '.length && node.collapsed" '+
            //                         'data-ng-click="selectNodeHead(node)">'+
            //                     '</i>' +
            //                     '<i class="expanded" '+
            //                         'data-ng-show="node.' + nodeChildren +
            //                         '.length && !node.collapsed" '+
            //                         'data-ng-click="selectNodeHead(node)">'+
            //                     '</i>' +
            //                     '<i class="normal" '+
            //                         'data-ng-hide="node.' + nodeChildren +
            //                         '.length">'+
            //                     '</i> ' +
            //                     // Call this funcion when
            //                     // the node label is clicked
            //                     '<span class="treenode {{node.' + nodeType + '}}" '+
            //                         'id="{{node.' + nodeId + '}}"'+
            //                         'data-ng-class="node.selected" '+
            //                         'data-ng-click="selectNodeLabel(node)">'+
            //                         '{{node.' + nodeLabel + '}}'+
            //                     '</span>' +

            //                     // bootstap dropdown menu
            //                     '<div class="dropdown" data-ng-show="node.selected">'+
            //                             '<a data-toggle="dropdown"><span class="caret"></span></a>'+
            //                             '<ul class="dropdown-menu">'+
            //                                 // Menu items added when node selected
            //                             '</ul>'+
            //                     '</div>'+

            //                     '<div data-ng-hide="!node.collapsed"'+
            //                         // ' data-tree-id="' + treeId + '"' +
            //                         ' data-tree-model="node.' + nodeChildren + '"'+
            //                         ' data-node-id=' + nodeId +
            //                         ' data-node-label=' + nodeLabel +
            //                         ' data-node-children=' + nodeChildren + '>'+
            //                     '</div>' +
            //                 '</li>' +
            //             '</ul>';

            //         // check tree id, tree model
            //         // if ( treeId && treeModel ) {
            //         if (treeModel ) {
            //             // root node
            //             if ( attrs.angularTreeview ) {
            //                 // create tree object if not exists
            //                 // scope[treeId] = scope[treeId] || {};

            //                 // Watch for adding a child
            //                 $rootScope.$watch('addedChild', function() {
            //                     if ($rootScope.addedChild){
            //                         var nodeid = scope.currentNode.ID;
            //                         scope.loadNodeChildren(nodeid);
            //                         $rootScope.addedChild = false;
            //                     }
            //                 });

            //                 // Function to delete data in server
            //                 scope.deleteThisNode = function(nodeid) {
            //                     console.log("Deleting "+ nodeid);
            //                     $http({
            //                         method: 'POST',
            //                         url:globalServerURL + nodeid + '/delete'
            //                     }).success(function (response) {
            //                         console.log('Success: Item deleted');
            //                         scope.loadNodeChildren(nodeid);
            //                         scope.currentNode.selected = undefined;
            //                     });
            //                 }

            //                 // Function to copy a node
            //                 scope.copyThisNode = function(cnode) {
            //                     scope.copiednodeid = cnode;
            //                     console.log("Path that is copied: " + scope.copiednodeid);
            //                 }

            //                 // function to POST data to server to paste item
            //                 scope.pasteThisNode = function(nodeid) {
            //                     console.log("Node to be pasted: " + scope.copiednodeid);
            //                     $http({
            //                         method: 'POST',
            //                         url: globalServerURL + nodeid + '/paste',
            //                         data:{'ID': scope.copiednodeid}
            //                     }).success(function () {
            //                         console.log('Success: Node pasted');
            //                         scope.loadNodeChildren(nodeid);
            //                     });
            //                 }
            //                 // if node head clicks,
            //                 // get the children of the node
            //                 // and collapse or expand the node
            //                 scope.selectNodeHead = scope.selectNodeHead || function( selectedNode ) {
            //                     scope.currentNode = selectedNode;
            //                     // if the node is collapsed, get the data and
            //                     // expand the node
            //                     if (!selectedNode.collapsed){
            //                         // get path from the node
            //                         // and go to that path with http
            //                         var nodeid = selectedNode.ID;
            //                         scope.loadNodeChildren(nodeid);
            //                         selectedNode.collapsed = true;
            //                     }
            //                     else{
            //                     // collapse the node if it is expanded
            //                         selectedNode.collapsed = false;
            //                     }
            //                 };

            //                 // Load the children and add to the tree
            //                 scope.loadNodeChildren = function(parentid){
            //                     $http.get(globalServerURL + parentid + '/').success(function(data) {
            //                             console.log("Children loaded");
            //                             scope.currentNode.Subitem = data;
            //                         });
            //                 }

            //                 // if node label clicks,
            //                 scope.selectNodeLabel = scope.selectNodeLabel || function( selectedNode ) {
            //                     // remove highlight from previous node
            //                     if ( scope.currentNode && scope.currentNode.selected ) {
            //                         scope.currentNode.selected = undefined;
            //                     }

            //                     // set highlight to selected node
            //                     selectedNode.selected = 'selected';

            //                     // set currentNode
            //                     scope.currentNode = selectedNode;

            //                     // add the add menus in the dropdown
            //                     var nodetype = scope.currentNode.NodeType;
            //                     var appendThis = '<li><a style="color: gray;">Add</a></li>';
            //                     var otherMenuItems = '<li class="divider"></li>'+
            //                                         '<li><a data-ng-click="deleteThisNode('+scope.currentNode.ID+')">Delete</a></li>'+
            //                                         '<li><a data-ng-click="copyThisNode('+scope.currentNode.ID+')">Copy</a></li>'+
            //                                         '<li><a data-ng-click="pasteThisNode('+scope.currentNode.ID+')">Paste</a></li>';
            //                     // Check the current node type and add menus
            //                     if (nodetype == 'Project'){
            //                         appendThis = '<li><a data-toggle="modal" data-target="#addbudgetgroup">Add BudgetGroup</a></li>';
            //                     }
            //                     else if (nodetype == 'BudgetGroup'){
            //                         appendThis = '<li><a data-toggle="modal" data-target="#addbudgetgroup">Add BudgetGroup</a></li>'+
            //                                         '<li><a data-toggle="modal" data-target="#addbudgetitem">Add BudgetItem</a></li>'+
            //                                         '<li><a data-toggle="modal" data-target="#addcomponent">Add Component</a></li>';
            //                     }
            //                     else if (nodetype == 'BudgetItem'){
            //                         appendThis = '<li><a data-toggle="modal" data-target="#addcomponent">Add Component</a></li>';
            //                     }
            //                     else if (nodetype == 'ResourceCategory'){
            //                         appendThis = '<li><a data-toggle="modal" data-target="#addresource">Add Resource</a></li>';
            //                     }
            //                     $rootScope.currentSelectedNodeID = scope.currentNode.ID;

            //                     // Add to the html
            //                     $(".dropdown > ul.dropdown-menu").html(appendThis + otherMenuItems);
            //                     $compile($(".dropdown > ul.dropdown-menu").contents())(scope);
            //                 };
            //             }
            //             // Rendering template.
            //             element.html('').append( $compile( template )( scope ) );
            //         }
            //     }
            // };



    }]);
})( angular );
