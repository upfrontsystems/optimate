// angular module that contains all the controllers
var allControllers = angular.module('allControllers', []);

// A factory that builds a shared service for the controllers for passing info
allControllers.factory('sharedService', ['$rootScope',
    function($rootScope){
        var shared = {};

        shared.newClient = '';
        shared.newSupplier = '';
        // when a new client or supplier is added
        shared.added = function(postdata, saveType){
            if (saveType == 'client'){
                this.newClient = postdata;
                $rootScope.$broadcast('handleNewClient');
            }
            else {
                this.newSupplier = postdata;
                $rootScope.$broadcast('handleNewSupplier');
            }
        }

        // when a client or supplier is edited
        shared.edited = function(postdata, saveType){
            if (saveType == 'client'){
                this.newClient = postdata;
                $rootScope.$broadcast('handleEditedClient');
            }
            else {
                this.newSupplier = postdata;
                $rootScope.$broadcast('handleEditedSupplier');
            }
        }

        // when a node is deleted from the projects treeview
        shared.nodeDeleted = function(nodeid){
           this.deletedNodeId = nodeid;
           $rootScope.$broadcast('handleDeletedNode');
        }

        // when a node is added to the projects treeview
        shared.nodeAdded = function(){
           $rootScope.$broadcast('handleAddedNode');
           this.reloadSlickgrid();
        }

        // when a node is cut the node is removed from the treeview
        shared.nodeCut = function(nodeid){
            this.cutNodeId = nodeid;
            $rootScope.$broadcast('handleCutNode');
        }

        // when a project is added it needs to be be added to the rolelist
        shared.projectAdded = function(newproject){
            this.newProject = newproject;
            $rootScope.$broadcast('handleAddedProject');
        }

        // delete a project from the rolelist
        shared.projectDeleted = function(deletedid){
            this.deletedNodeId = deletedid;
            $rootScope.$broadcast('handleDeletedProject');
        }

        shared.reloadSlickgrid = function(){
            this.reloadId = $rootScope.currentNode.ID;
            $rootScope.$broadcast('handleReloadSlickgrid');
        }

        return shared;
}]);

allControllers.value('globalServerURL', 'http://127.0.0.1:8100/');

function toggleMenu(itemclass) {
    $("ul.nav li").removeClass("active");
    $("li."+itemclass).toggleClass("active");
}

// controller for the Company Information data from the server
allControllers.controller('companyinformationController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        var req = {
            method: 'GET',
            url: globalServerURL +'company_information',
        };
        $http(req).success(function(data){
            $scope.company_information = data;
        });
    }
]);

// controller for the Client data from the server
allControllers.controller('clientsController', ['$scope', '$http', '$modal', '$log', 'globalServerURL', 'sharedService',
    function($scope, $http, $modal, $log, globalServerURL, sharedService) {

        toggleMenu('setup');

        var req = {
            method: 'GET',
            url: globalServerURL +'clients',
        };
        $http(req).success(function(data){
            $scope.jsonclients = data;
        });

        // listening for the handle new client broadcast
        $scope.$on('handleNewClient', function(){
            var newclient = sharedService.newClient;
            // the new client is added to the list
            $scope.jsonclients.push(newclient);
            // sort alphabetically by client name
            $scope.jsonclients.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("client added");
        });

        // listening for the handle edit client broadcast
        $scope.$on('handleEditedClient', function(){
            var editedclient = sharedService.newClient;

            // search for the client and edit in the list
            var result = $.grep($scope.jsonclients, function(e) {
                return e.ID == editedclient.ID;
            });
            var i = $scope.jsonclients.indexOf(result[0]);
            $scope.jsonclients[i] = editedclient;
            $scope.jsonclients.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });

            console.log ("client edited");
        });

        // Set the selected client and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedClient = obj;
            $('#client-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // Deselect the selected client and remove the css
        $scope.deselect = function (){
            if ($scope.selectedClient){
                $('#client-'+$scope.selectedClient.ID).removeClass('active');
                $scope.selectedClient = undefined;
            }
        }

        // Delete client and remove from the clients list
        $scope.deleteClient = function() {
            var deleteid = $scope.selectedClient.ID;
            $scope.deselect();
            $http({
                method: 'DELETE',
                url: globalServerURL + deleteid + '/client'
            }).success(function () {
                var result = $.grep($scope.jsonclients, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonclients.indexOf(result[0]);
                $scope.jsonclients.splice(i, 1);
                console.log("deleted client");
            });
        };
    }
]);

// Controller for the suppliers page
allControllers.controller('suppliersController', ['$scope', '$http', '$modal', '$log', 'globalServerURL', 'sharedService',
    function($scope, $http, $modal, $log, globalServerURL, sharedService) {

        toggleMenu('setup');

        var req = {
            method: 'GET',
            url: globalServerURL +'suppliers'
        };
        $http(req).success(function(data){
            $scope.jsonsuppliers = data;
        });

        // listening for the handle new supplier broadcast
        $scope.$on('handleNewSupplier', function(){
            var newsupplier = sharedService.newSupplier;
            $scope.jsonsuppliers.push(newsupplier);
            // sort alphabetically by supplier name
            $scope.jsonsuppliers.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log("supplier added");
        });

        // listening for the handle edit supplier broadcast
        $scope.$on('handleEditedSupplier', function(){
            var editedsupplier = sharedService.newSupplier;

            // search for the supplier and edit in the list
            var result = $.grep($scope.jsonsuppliers, function(e) {
                return e.ID == editedsupplier.ID;
            });
            var i = $scope.jsonsuppliers.indexOf(result[0]);
            $scope.jsonsuppliers[i] = editedsupplier;
            $scope.jsonsuppliers.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });

            console.log ("Supplier edited");
        });

        // Set the selected supplier and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedSupplier = obj;
            $('#supplier-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // Deselect the selected supplier and remove the css
        $scope.deselect = function (){
            if ($scope.selectedSupplier){
                $('#supplier-'+$scope.selectedSupplier.ID).removeClass('active');
                $scope.selectedSupplier = undefined;
            }
        }

        // Delete supplier and remove from the supplier list
        $scope.deleteSupplier = function() {
            var deleteid = $scope.selectedSupplier.ID;
            $scope.deselect();
            $http({
                method: 'DELETE',
                url: globalServerURL + deleteid + '/supplier'
            }).success(function () {
                var result = $.grep($scope.jsonsuppliers, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonsuppliers.indexOf(result[0]);
                $scope.jsonsuppliers.splice(i, 1);
                console.log("deleted supplier");
            });
        };
    }
]);

// Controller for the modals, handles adding new nodes
allControllers.controller('ModalInstanceCtrl',
    function ($scope, $rootScope, $http, globalServerURL, sharedService) {

        // Load the resources the user can select from
        $scope.loadResources = function(){
            // Add a loading value to the project list while it loads
            $scope.resourceList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL +'resources',
            }
            $http(req).success(function(data) {
                $scope.resourceList = data;
                console.log("Resources loaded");
                $('select#resource-select').focus();
            });
        }

        // Load the resources the user can select from the resource list
        $scope.loadResourceList = function(){
            // Add a loading value to the project list while it loads
            $scope.resourceList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL +'resource_list/' + $rootScope.currentNode.ID + '/'
            }
            $http(req).success(function(data) {
                $scope.resourceList = data;
                console.log("Resource list loaded");
                $('select#resource-select').focus();
            });
        }

        $scope.selectedResource = function(){
            var name = $('#resource-select').find(":selected").val()
            $scope.formData['Name'] = name;
        }

        // Saving a new client or supplier or editing an existing one
        $scope.save = function(saveType, editing){
            if ($scope.editId){
                $http({
                    method: 'PUT',
                    url: globalServerURL + $scope.editId + '/' + $scope.saveType,
                    data:$scope.formData
                }).success(function () {
                    $scope.formData['ID'] = $scope.editId;
                    sharedService.edited($scope.formData, $scope.saveType)
                    $scope.formData = {'NodeType': $scope.saveType};
                });
            }
            else{
                $http({
                    method: 'POST',
                    url: globalServerURL +'0/' + $scope.saveType,
                    data:$scope.formData
                }).success(function (response) {
                    $scope.formData['ID'] = response['newid'];
                    // post the new client to the shared service
                    sharedService.added($scope.formData, $scope.saveType);
                    $scope.formData = {'NodeType': $scope.saveType};
                });
            }
        };

        // When the addNode button is clicked on the modal a new node
        // is added to the database
        $scope.addNode = function () {
            var currentId = $rootScope.currentNode.ID;

            $http({
                method: 'POST',
                url: globalServerURL + currentId + '/add',
                data: $scope.formData
            }).success(function () {
                $scope.formData = {'NodeType':$scope.formData['NodeType']};
                console.log("Node added");
                sharedService.nodeAdded();
            });
          };

        $scope.addProject = function(){
            $http({
                method: 'POST',
                url: globalServerURL + '0' + '/add',
                data: $scope.formData
            }).success(function (response) {
                $scope.formData['ID'] = response['ID'];
                $scope.formData['NodeTypeAbbr'] = 'P';
                sharedService.projectAdded($scope.formData);
                $scope.formData = {'NodeType':$scope.formData['NodeType']};
            });
          }
});

// Angular function that loads a specific project into the treeview
// upon selection from the user
allControllers.controller('projectsController',['$scope', '$http', 'globalServerURL', '$rootScope', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, $rootScope, sharedService, $timeout) {

        toggleMenu('projects');

        // load the projects used in the select project modal
        // Add a loading value to the project list while it loads
        $scope.projectsList = [{"Name": "Loading..."}];
        var req = {
            method: 'GET',
            url: globalServerURL +'project_listing'
        };
        $http(req).success(function(data) {
            $scope.projectsList = data;
        });

        // listening for the handle new project broadcast
        $scope.$on('handleAddedProject', function(){
            var newproject = sharedService.newProject;
            // add the new project to the projects and role list and sort

            $scope.projectsList.push(newproject);
            $scope.projectsList.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });

            $scope.roleList.push(newproject);
            $scope.roleList.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            if (hasStorage) {
                // add id of project to local storage
                var open_projects;
                try {
                    // attempt to add an id to open_projects storage
                    open_projects = JSON.parse(localStorage["open_projects"])
                    open_projects.push(newproject.ID);
                    localStorage["open_projects"] = JSON.stringify(open_projects);
                }
                catch (exception) {
                    // create a new open_projects storage as one doesnt exist
                    localStorage.setItem("open_projects", []);
                    open_projects = []
                    open_projects.push(newproject.ID);
                    localStorage["open_projects"] = JSON.stringify(open_projects);
                }
            }
            else {
                console.log("LOCAL STORAGE NOT SUPPORTED!")
            }
            console.log("Project added");
        });

        // When a project is deleted close it as well
        $scope.$on('handleDeletedProject', function(){
            $scope.closeProject(sharedService.deletedNodeId);
        });

        // aux function - checks if object is already in list based on ID
        function containsObject(obj, list) {
            var i;
            for (i = 0; i < list.length; i++) {
                if (list[i].ID === obj.ID) {
                    return true;
                }
            }
            return false;
        }
        // aux function to test if we can support localstorage
        var hasStorage = (function() {
            try {
                var mod = 'modernizr';
                localStorage.setItem(mod, mod);
                localStorage.removeItem(mod);
                return true;
            }
            catch (exception) {
                return false;
            }
        }());

        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $('#project-select').find(":selected").val()
            var url = globalServerURL +'projectview/' + id + '/'
            var req = {
                method: 'GET',
                url: url,
            }
            $http(req).success(function(data) {
                if (!(containsObject(data[0], $scope.roleList))) {
                    // add latest select project, if not already in the list
                    $scope.roleList.push(data[0]);
                    // sort alphabetically by project name
                    $scope.roleList.sort(function(a, b) {
                        var textA = a.Name.toUpperCase();
                        var textB = b.Name.toUpperCase();
                        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                    });
                    if (hasStorage) {
                        // add id of project to local storage
                        var open_projects;
                        try {
                            // attempt to add an id to open_projects storage
                            open_projects = JSON.parse(localStorage["open_projects"])
                            open_projects.push(data[0].ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                        catch (exception) {
                            // create a new open_projects storage as one doesnt exist
                            localStorage.setItem("open_projects", []);
                            open_projects = []
                            open_projects.push(data[0].ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                    }
                    else {
                        console.log("LOCAL STORAGE NOT SUPPORTED!")
                    }
                }
            });
        };

        // Close a project and remove it from the tree
        $scope.closeProject = function (project_id) {
            var result = $.grep($scope.roleList, function(e) {
                return e.ID == project_id;
            });
            var i = $scope.roleList.indexOf(result[0]);
            if (i != -1) {
                $scope.roleList.splice(i, 1);

                if (hasStorage) {
                    // remove id of project that we are closing from storage
                    var open_projects = JSON.parse(localStorage["open_projects"])
                    var index = open_projects.indexOf(project_id);
                    if (index > -1) {
                       open_projects.splice(index, 1);
                    }
                    localStorage["open_projects"] = JSON.stringify(open_projects);
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED!")
                }
                // blank the data in the info box under the treeview
                $rootScope.currentNode = '';
            }
        };
        // reopen projects that were previously opened upon page load
        $scope.preloadProjects = function () {
            if (hasStorage) {
                open_projects = []
                try {
                    open_projects = JSON.parse(localStorage["open_projects"])
                }
                catch (exception) {
                }
                if ( open_projects.length != 0 ) {
                    var templist = []
                    for (i = 0; i < open_projects.length; i++) {
                        var id = open_projects[i];
                        var url = globalServerURL +'projectview/' + id + '/'
                        var req = {
                            method: 'GET',
                            url: url,
                        }
                        $http(req).success(function(data) {
                            templist.push(data[0]);
                        });
                    }
                    templist.sort(function(a, b) {
                                var textA = a.Name.toUpperCase();
                                var textB = b.Name.toUpperCase();
                                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                            });
                    $scope.roleList = templist;
                }
            }
            else {
                console.log("LOCAL STORAGE NOT SUPPORTED!")
            }
        };
        $scope.roleList = [];
        $scope.preloadProjects(); // check if anything is stored in local storage
        $scope.formData = {};

        // functions used by the treeview
        // --------------------------------------------------------------------

        // Setting the type of the node to be added
        // refresh it if the type is the same
        // $timeout is used so that the scope is refreshed and the directive
        // reloaded even if the noe type is the same
        $scope.changeAddingType = function(nodetype){
            if ($scope.addingNodeType == nodetype){
                $scope.addingNodeType = '';
                $timeout(function(){
                    $scope.changeAddingType(nodetype);
                });
            }
            else{
                $scope.addingNodeType = nodetype;
            }
        }

        // Deleting a node. It recieves the id of the node
        // The id is sent to the server to be deleted and the node
        // removed from the treemodel
        $scope.deleteThisNode = function ( nodeid ) {
            $http({
                method: 'POST',
                url:globalServerURL + nodeid + '/delete'
            }).success(function (response) {
                if (response['parentid'] == 0){
                    sharedService.projectDeleted(nodeid);
                }
                else{
                    sharedService.nodeDeleted(nodeid);
                }
            });
        };

        // Function to copy a node
        $scope.copyThisNode = function(copiedid, nodetype) {
            $scope.copiedNode = {'id': copiedid, 'type': nodetype};
            $scope.cut = false;
            console.log("Node id copied: " + copiedid);
        }

        // Function to cut a node
        $scope.cutThisNode = function(cutid, nodetype) {
            $scope.copiedNode = {'id': cutid, 'type': nodetype};
            console.log("Node id cut: " + cutid);
            $scope.cut = true;
            sharedService.nodeCut(cutid);
        }

        // function to paste copied node into another node
        // the id is sent to the server and the node pasted there
        // the user cant paste into the same node
        $scope.pasteThisNode = function(nodeid, nodetype) {
            var cnode = $scope.copiedNode;
            if (cnode){
                if (cnode['id'] == nodeid){
                    alert("You can't paste into the same node");
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + nodeid + '/paste',
                        data:{'ID': cnode['id'],
                                'cut': $scope.cut}
                    }).success(function () {
                        console.log('Success: Node pasted');
                        sharedService.reloadSlickgrid(nodeid);
                        $scope.loadNodeChildren(nodeid);
                    }).error(function(){
                        console.log("Server error");
                    });
                }
            }
        }

        // Watch for when a child is added and refresh the treeview
        $rootScope.$on('handleAddedNode', function() {
            var nodeid = $rootScope.currentNode.ID;
            $scope.loadNodeChildren(nodeid);
        });

        // Load the children and add to the tree
        $scope.loadNodeChildren = function(parentid){
            $http.get(globalServerURL + parentid + '/').success(function(data) {
                $rootScope.currentNode.Subitem = data;
                console.log("Children loaded");
            });
        }
}])

allControllers.controller('treeviewController', ['$http', '$scope', 'globalServerURL', '$rootScope', 'sharedService',
    function($http, $scope, globalServerURL, $rootScope, sharedService){
        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = $scope.selectNodeHead || function( selectedNode ) {
            // if the node is collapsed, get the data and
            // expand the node
            if (!selectedNode.collapsed){
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
            else{
                selectedNode.collapsed = false;
            }
        };

        // if node label clicks,
        $scope.selectNodeLabel = $scope.selectNodeLabel || function(selectedNode) {
            // remove highlight from previous node
            if ($rootScope.currentNode) {
                $rootScope.currentNode.selected = undefined;
            }
            // set highlight to selected node
            selectedNode.selected = 'selected';
            // set currentNode
            $rootScope.currentNode = selectedNode;
        };
}])
