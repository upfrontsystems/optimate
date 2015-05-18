// angular module that contains all the controllers
var allControllers = angular.module('allControllers', []);

// A factory that builds a shared service for the controllers for passing info
allControllers.factory('sharedService', ['$rootScope',
    function($rootScope){
        var shared = {};

        // when a node is deleted from the projects treeview
        // the treeview should be reloaded in the directive
        shared.nodeDeleted = function(nodeid){
           this.deletedNodeId = nodeid;
           this.clearSlickgrid();
           $rootScope.$broadcast('handleDeletedNode');
        }

        // when a node is added to the projects treeview
        // the slickgrid should be reloaded
        shared.nodeAdded = function(){
            this.reloadSlickgrid($rootScope.currentNode.ID);
        }

        shared.clearSlickgrid = function(){
            $rootScope.$broadcast('handleClearSlickgrid');
        }

        shared.reloadSlickgrid = function(nodeid){
            this.reloadId = nodeid;
            $rootScope.$broadcast('handleReloadSlickgrid');
        }

        return shared;
}]);

// set the global server url
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
            url: globalServerURL + 'company_information',
        };
        $http(req).success(function(data){
            $scope.company_information = data;
        });

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function (){
            $http({
                method: 'GET',
                url: globalServerURL + 'company_information',
            }).success(function(response){
                $scope.formData = response;
            })
        }

        // editing company information data
        $scope.save = function(){
            $http({
                method: 'PUT',
                url: globalServerURL + 'company_information',
                data:$scope.formData
            }).success(function (data) {
                $scope.company_information = $scope.formData
            });
        };

    }
]);

// controller for the Client data from the server
allControllers.controller('clientsController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('setup');
        $scope.isDisabled = false;

        var req = {
            method: 'GET',
            url: globalServerURL +'clients',
        };
        $http(req).success(function(data){
            $scope.jsonclients = data;
        });

        // Adding or editing a client
        $scope.save = function(){
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled){
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit'){
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['ID'] + '/' + $scope.formData['NodeType'],
                        data:$scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else{
                    $http({
                        method: 'POST',
                        url: globalServerURL +'0/' + $scope.formData['NodeType'],
                        data:$scope.formData
                    }).success(function (response) {
                        $scope.formData['ID'] = response['newid'];
                        // post the new client to the shared service
                        $scope.handleNew($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new client to the list and sort
        $scope.handleNew = function(newclient){
            // the new client is added to the list
            $scope.jsonclients.push(newclient);
            // sort alphabetically by client name
            $scope.jsonclients.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Client added");
        }

        // listening for the handle edit client broadcast
        $scope.handleEdited = function(editedclient){
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
            console.log ("Client edited");
        };

        // Set the selected client and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedClient = obj;
            $('#client-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function (){
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'client'};
            if ($scope.selectedClient){
                $('#client-'+$scope.selectedClient.ID).removeClass('active');
                $scope.selectedClient = undefined;
            }
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function (){
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + $scope.selectedClient.ID + '/client'
            }).success(function(response){
                $scope.formData = response;
                $scope.formData['NodeType'] = 'client';
            })
        }

        // Delete client and remove from the clients list
        $scope.deleteClient = function() {
            var deleteid = $scope.selectedClient.ID;
            $scope.selectedClient = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + deleteid + '/client'
            }).success(function () {
                var result = $.grep($scope.jsonclients, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonclients.indexOf(result[0]);
                $scope.jsonclients.splice(i, 1);
                console.log("Deleted client");
            });
        };
    }
]);

// Controller for the suppliers page
allControllers.controller('suppliersController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('setup');
        $scope.isDisabled = false;

        var req = {
            method: 'GET',
            url: globalServerURL +'suppliers'
        };
        $http(req).success(function(data){
            $scope.jsonsuppliers = data;
        });

        // Adding or editing a supplier
        $scope.save = function(){
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled){
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit'){
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['ID'] + '/' + $scope.formData['NodeType'],
                        data:$scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else{
                    $http({
                        method: 'POST',
                        url: globalServerURL +'0/' + $scope.formData['NodeType'],
                        data:$scope.formData
                    }).success(function (response) {
                        $scope.formData['ID'] = response['newid'];
                        // post the new supplier
                        $scope.handleNew($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new supplier to the list and sort
        $scope.handleNew = function(newsupplier){
            // the new supplier is added to the list
            $scope.jsonsuppliers.push(newsupplier);
            // sort alphabetically by supplier name
            $scope.jsonsuppliers.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Supplier added");
        }

        // edit a supplier in the list
        $scope.handleEdited = function(editedsupplier){
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
        };

        // Set the selected supplier and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedSupplier = obj;
            $('#supplier-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function (){
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'supplier'};
            if ($scope.selectedSupplier){
                $('#supplier-'+$scope.selectedSupplier.ID).removeClass('active');
                $scope.selectedSupplier = undefined;
            }
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function (){
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + $scope.selectedSupplier.ID + '/supplier'
            }).success(function(response){
                $scope.formData = response;
                $scope.formData['NodeType'] = 'supplier';
            })
        }

        // Delete supplier and remove from the supplier list
        $scope.deleteSupplier = function() {
            var deleteid = $scope.selectedSupplier.ID;
            $http({
                method: 'DELETE',
                url: globalServerURL + deleteid + '/supplier'
            }).success(function () {
                var result = $.grep($scope.jsonsuppliers, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonsuppliers.indexOf(result[0]);
                $scope.jsonsuppliers.splice(i, 1);
                console.log("Deleted supplier");
            });
        };
    }
]);

// controller for the Cities data
allControllers.controller('citiesController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        var req = {
            method: 'GET',
            url: globalServerURL +'cities'
        };
        $http(req).success(function(data){
            $scope.cityList = data;
        });        

    }
]);

// controller for the Units data
allControllers.controller('unitsController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        var req = {
            method: 'GET',
            url: globalServerURL +'units'
        };
        $http(req).success(function(data){
            $scope.unitList = data;
        });

        // clear the unit input fields
        $scope.clearInput = function(){
            $scope.newUnit = undefined;
        }        

        $scope.unitList = [];
        $scope.loadUnits = function(){
            var req = {
                method: 'GET',
                url: globalServerURL +'units'
            }
            $http(req).success(function(data) {
                $scope.unitList = data;
                console.log("Unit list loaded");
            });
        };

        // add an unit
        $scope.addUnit= function(){
            if ($scope.newUnit){
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'units/unit',
                    data: {'Name':$scope.newUnit.Name}
                }
                $http(req).success(function() {
                    $scope.clearInput();
                    $scope.loadUnits();
                    console.log("Unit added");
                });
            }
        }        

    }
]);


// Angular function that loads a specific project into the treeview
// upon selection from the user
allControllers.controller('projectsController',['$scope', '$http', 'globalServerURL', '$rootScope', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, $rootScope, sharedService, $timeout) {

        toggleMenu('projects');
        $scope.isDisabled = false;

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
        $scope.handleAddedProject = function(newproject){
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
        };

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
            // clear the slickgrid
            sharedService.clearSlickgrid();
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

        // functions used by the treeview
        // --------------------------------------------------------------------
        $scope.overheadList = [];
        // Load the resources the user can select from the resource list
        $scope.loadOverheads = function(projectid){
            var req = {
                method: 'GET',
                url: globalServerURL +'overhead_list/' + projectid + '/'
            }
            $http(req).success(function(data) {
                $scope.overheadList = data;
                console.log("Overhead list loaded");
            });
        };

        // load the overheads a component can use
        $scope.loadComponentOverheads = function(nodeid){
            var req = {
                method: 'GET',
                url: globalServerURL +'component_overheads/' + nodeid + '/'
            }
            $http(req).success(function(data) {
                $scope.componentOverheadList = data;
                console.log("Overhead list loaded");
            });
        }

        // delete an overhead by id
        $scope.deleteOverhead = function(overheadid, index){
            var req = {
                method: 'DELETE',
                url: globalServerURL +'overhead_list/' + overheadid + '/'
            }
            $http(req).success(function() {
                $scope.overheadList.splice(index, 1);
                console.log("Overhead deleted");
            });
        }

        // add an overhead with the project id
        $scope.addOverhead = function(projectid){
            if ($scope.newOverhead){
                var req = {
                    method: 'POST',
                    url: globalServerURL +'overhead_list/' + projectid + '/',
                    data: {'Name':$scope.newOverhead.Name,
                            'Percentage': $scope.newOverhead.Percentage}
                }
                $http(req).success(function() {
                    $scope.clearInput();
                    $scope.loadOverheads(projectid);
                    console.log("Overhead added");
                });
            }
        }

        // clear the overhead modal input fields
        $scope.clearInput = function(){
            $scope.newOverhead = undefined;
        }

        // Load the resources the user can select from the resource list
        $scope.loadResourceList = function(){
            var req = {
                method: 'GET',
                url: globalServerURL +'resource_list/' + $rootScope.currentNode.ID + '/'
            }
            $http(req).success(function(data) {
                finderdata = data
                console.log(finderdata)
                // instantiate the related items widget
                $('.finder').each(function() {
                    var url = $(this).attr('data-url');
                    var finder = new ContentFinder('#'+$(this).attr('id'), url, true);
                    finder.listdir(url);
                });
                console.log("Resource list loaded");
                // remove any old remembered choices from last time
                $('.search-choice').remove();
                // close the widget if it was left open last time
                $('.finder-dropdown').attr('style','left: -9000px; width: 99.9%; top: 29px;');
                // set the text in case it is blank
                $('#inputResources').val('Click to search or browse');
                $('#inputResources').focus();

            });
        };

        // edit a component. load the overhead list followed by
        // data needed for the form
        $scope.editComponent = function(nodeid, nodetype){
            var req = {
                method: 'GET',
                url: globalServerURL +'component_overheads/' + nodeid + '/'
            }
            $http(req).success(function(data) {
                $scope.componentOverheadList = data;

                $http({
                    method: 'GET',
                    url: globalServerURL + 'node/' + nodeid + '/'
                }).success(function(response){
                    var overheadlist = response['overheadlist'];
                    var arrayLength = $scope.componentOverheadList.length;
                    for (var i = 0; i < arrayLength; i++) {
                        if (overheadlist.indexOf($scope.componentOverheadList[i].ID) != -1){
                            $scope.componentOverheadList[i].selected = true;
                        }
                    }
                    $scope.formData = response;
                    $scope.formData['NodeType'] = nodetype;
                })
            });
        }

        // Load a list of the fields used in adding a project
        $scope.loadProjectRelatedList = function(){
            // load the city list
            $scope.cityList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL +'cities'
            }
            $http(req).success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });

            // load the client list
            $scope.clientList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL +'clients'
            }
            $http(req).success(function(data) {
                $scope.clientList = data;
                console.log("Client list loaded");
            });
        }        

        // Load a list of the fields used in adding a resource
        $scope.loadResourceRelatedList = function(){
            // load the resource types
            $scope.restypeList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL +'resource_types'
            }
            $http(req).success(function(data) {
                $scope.restypeList = data;
                console.log("Resource Type list loaded");
            });

            // load the unit list
            $scope.unitList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL +'units'
            }
            $http(req).success(function(data) {
                $scope.unitList = data;
                console.log("Unit list loaded");
            });
        }

        // Add the selected resource from the list to the form data as name
        $scope.selectedResource = function(){
            var name = $('#related_items_finder .finder-choices .search-choice .selected-resource').html();
            $scope.formData['Name'] = name;
        };

        // When the addNode button is clicked on the modal a new node
        // is added to the database
        $scope.addNode = function () {
            // check if adding is disabled, if not disable it and add the node
            if (!$scope.isDisabled){
                $scope.isDisabled = true;
                var currentId = $rootScope.currentNode.ID;
                $scope.formData['OverheadList'] = $scope.componentOverheadList
                $http({
                    method: 'POST',
                    url: globalServerURL + currentId + '/add',
                    data: $scope.formData
                }).success(function () {
                    // check if the current node is edited
                    if ($scope.formData['ID'] == $rootScope.currentNode.ID){
                        // update the node with the name in the form
                        $rootScope.currentNode.Name = $scope.formData['Name'];
                    }
                    $scope.formData = {'NodeType':$scope.formData['NodeType']};
                    var nodeid = $rootScope.currentNode.ID;
                    sharedService.nodeAdded();
                    $scope.loadNodeChildren(nodeid);
                    console.log("Node added");
                });
            }
        };

        // Add a project to the tree and reload the projectlist
        $scope.addProject = function(){
            // check if adding is disabled, if not disable it and add the node
            if (!$scope.isDisabled){
                $scope.isDisabled = true;
                $http({
                    method: 'POST',
                    url: globalServerURL + '0' + '/add',
                    data: $scope.formData
                }).success(function (response) {
                    $scope.formData['ID'] = response['ID'];
                    $scope.formData['NodeTypeAbbr'] = 'P';
                    $scope.formData['Subitem'] = [{'Name': '...'}];
                    $scope.handleAddedProject($scope.formData);
                    $scope.formData = {'NodeType':$scope.formData['NodeType']};
                });
            }
        };

        // Setting the type of the node to be added
        // refresh it if the type is the same
        // $timeout is used so that the scope is refreshed and the directive
        // reloaded even if the node type is the same
        // reset the formdata to the type
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
            $scope.isDisabled = false;
            $scope.formData = {'NodeType': nodetype};
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
                    $scope.closeProject(nodeid);
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
        // the node is removed from the tree (but not deleted)
        $scope.cutThisNode = function(cutid, nodetype) {
            $scope.copiedNode = {'id': cutid, 'type': nodetype};
            console.log("Node id cut: " + cutid);
            $scope.cut = true;
            sharedService.nodeDeleted(cutid);
        }

        // function to paste copied node into another node
        // the id is sent to the server and the node pasted there
        // the user can't paste into the same node
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

        // Load the children and add to the tree
        $scope.loadNodeChildren = function(parentid){
            $http.get(globalServerURL + parentid + '/').success(function(data) {
                $rootScope.currentNode.Subitem = data;
                console.log("Children loaded");
            });
        }
}])

// Controller for the treeview. Handles expanding and collapsing the tree and
// setting the currentNode in the root
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
