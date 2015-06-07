// angular module that contains all the controllers
var allControllers = angular.module('allControllers', ['config']);

// A factory that builds a shared service for the controllers for passing info
allControllers.factory('sharedService', ['$rootScope',
    function($rootScope){
        var shared = {};

        // when a node is added to the projects treeview
        // the slickgrid should be reloaded
        shared.nodeAdded = function(currentid){
            this.reloadSlickgrid(currentid);
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

function toggleMenu(itemclass) {
    $("ul.nav li").removeClass("active");
    $("li."+itemclass).toggleClass("active");
}

allControllers.controller('BasicExampleCtrl', ['$scope', function ($scope) {
      $scope.remove = function(scope) {
        scope.remove();
      };

      $scope.toggle = function(scope) {
        scope.toggle();
      };

      $scope.moveLastToTheBeginning = function () {
        var a = $scope.data.pop();
        $scope.data.splice(0,0, a);
      };

      $scope.newSubItem = function(scope) {
        var nodeData = scope.$modelValue;
        nodeData.nodes.push({
          id: nodeData.id * 10 + nodeData.nodes.length,
          title: nodeData.title + '.' + (nodeData.nodes.length + 1),
          nodes: []
        });
      };

      $scope.collapseAll = function() {
        $scope.$broadcast('collapseAll');
      };

      $scope.expandAll = function() {
        $scope.$broadcast('expandAll');
      };

      $scope.data = [{
        "id": 1,
        "title": "node1",
        "nodes": [
          {
            "id": 11,
            "title": "node1.1",
            "nodes": [
              {
                "id": 111,
                "title": "node1.1.1",
                "nodes": []
              }
            ]
          },
          {
            "id": 12,
            "title": "node1.2",
            "nodes": []
          }
        ],
      }, {
        "id": 2,
        "title": "node2",
        "nodes": [
          {
            "id": 21,
            "title": "node2.1",
            "nodes": []
          },
          {
            "id": 22,
            "title": "node2.2",
            "nodes": []
          }
        ],
      }, {
        "id": 3,
        "title": "node3",
        "nodes": [
          {
            "id": 31,
            "title": "node3.1",
            "nodes": []
          }
        ],
      }];
    }]);

// controller for the Company Information data from the server
allControllers.controller('companyinformationController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        $http.get(globalServerURL + 'company_information').success(function(data){
            $scope.company_information = data;
        });

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function (){
            $http({
                method: 'GET',
                url: globalServerURL + 'company_information'
            }).success(function(response){
                $scope.formData = response;
            })
        }

        // editing company information data
        $scope.save = function(){
            $http({
                method: 'PUT',
                url: globalServerURL + 'company_information',
                data: $scope.formData
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

        $http.get(globalServerURL + 'clients').success(function(data){
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
                        data: $scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else{
                    $http({
                        method: 'POST',
                        url: globalServerURL + '0/' + $scope.formData['NodeType'],
                        data: $scope.formData
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

        $http.get(globalServerURL + 'suppliers').success(function(data){
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
                        url: globalServerURL + '0/' + $scope.formData['NodeType'],
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

        $http.get(globalServerURL + 'cities').success(function(data){
            $scope.cityList = data;
        });

        // clear the city input fields
        $scope.clearInput = function(){
            $scope.newCity = undefined;
        }

        $scope.cityList = [];
        $scope.loadCities = function(){
            var req = {
                method: 'GET',
                url: globalServerURL + 'cities'
            }
            $http(req).success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });
        };

        // delete a city by id
        $scope.deleteCity = function(cityid, index){
            var req = {
                method: 'DELETE',
                url: globalServerURL + cityid + '/city',
            }
            $http(req).success(function(result) {
                if ( result.status == 'remove' ) {
                    $scope.cityList.splice(index, 1);
                    console.log("City deleted");
                }
            });
        }

        // add a city
        $scope.addCity = function(){
            if ($scope.newCity){
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'cities/city',
                    data: {'Name':$scope.newCity.Name}
                }
                $http(req).success(function() {
                    $scope.clearInput();
                    $scope.loadCities();
                    console.log("City added");
                });
            }
        }

    }
]);

// controller for the Units data
allControllers.controller('unitsController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        // clear the unit input fields
        $scope.clearInput = function(){
            $scope.newUnit = undefined;
        }

        $scope.unitList = [];
        $scope.loadUnits = function(){
            var req = {
                method: 'GET',
                url: globalServerURL + 'units'
            }
            $http(req).success(function(data) {
                $scope.unitList = data;
                console.log("Unit list loaded");
            });
        };

        // delete a unit by id
        $scope.deleteUnit = function(unitid, index){
            var req = {
                method: 'DELETE',
                url: globalServerURL + unitid + '/unit',
            }
            $http(req).success(function(result) {
                if ( result.status == 'remove' ) {
                    $scope.unitList.splice(index, 1);
                    console.log("Unit deleted");
                }
            });
        }

        // add an unit
        $scope.addUnit = function(){
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

// Controller for the projects and treeview
allControllers.controller('projectsController',['$scope', '$http', '$q', 'globalServerURL', '$rootScope', 'sharedService', '$timeout',
    function($scope, $http, $q, globalServerURL, $rootScope, sharedService, $timeout) {

        toggleMenu('projects');
        // variable for disabling submit button after user clicked it
        $scope.isDisabled = false;

        // load the projects used in the select project modal
        // Add a loading value to the project list while it loads
        $scope.projectsList = [{"Name": "Loading..."}];
        var req = {
            method: 'GET',
            url: globalServerURL + 'project_listing'
        };
        $http(req).success(function(data) {
            $scope.projectsList = data;
        });

        // When a new project is added to the tree
        $scope.projectAdded = function(newproject){
            // add the new project to the projects and role list and sort
            $scope.projectsList.push(newproject);
            $scope.projectsList.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });

            $scope.projectsRoot.Subitem.push(newproject);
            $scope.projectsRoot.Subitem.sort(function(a, b) {
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
            var url = globalServerURL + 'projectview/' + id + '/'
            $http.get(url).success(function(data) {
                if (!(containsObject(data[0], $scope.projectsRoot.Subitem))) {
                    // add latest select project, if not already in the list
                    $scope.projectsRoot.Subitem.push(data[0]);
                    // sort alphabetically by project name
                    $scope.projectsRoot.Subitem.sort(function(a, b) {
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
            var result = $.grep($scope.projectsRoot.Subitem, function(e) {
                return e.ID == project_id;
            });
            var i = $scope.projectsRoot.Subitem.indexOf(result[0]);
            if (i != -1) {
                $scope.projectsRoot.Subitem.splice(i, 1);

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
                    for (i = 0; i < open_projects.length; i++) {
                        var id = open_projects[i];
                        var url = globalServerURL + 'projectview/' + id + '/'
                        $http.get(url).success(function(data) {
                            $scope.projectsRoot.Subitem.push(data[0]);
                            $scope.projectsRoot.Subitem.sort(function(a, b) {
                                return a.Name.localeCompare(b.Name)
                            });
                        });
                    }
                }
            }
            else {
                console.log("LOCAL STORAGE NOT SUPPORTED!")
            }
        };
        // build the root for the projects in the tree
        $scope.projectsRoot = {"Name": "Root", "ID": 0, "NodeType":"Root", "Subitem": []};
        $scope.preloadProjects(); // check if anything is stored in local storage

        // functions used by the treeview
        // --------------------------------------------------------------------
        $scope.overheadList = [];
        // set the collapsed flag to false, this allows horizontal dragging
        // into any node
        $scope.$broadcast('expandAll');

        // set the allowed types to be dropped
        $scope.allowed = {}
        $scope.allowed['Project'] = ['BudgetGroup'];
        $scope.allowed['BudgetGroup'] = ['BudgetGroup', 'BudgetItem',
                                    'Component'];
        $scope.allowed['BudgetItem'] = ['BudgetItem', 'Component'];
        $scope.allowed['Component'] = [];
        $scope.allowed['ResourceCategory'] = ['ResourceCategory', 'Resource'];
        $scope.allowed['Resource'] = [];
        $scope.allowed['Root'] = ['Project'];

        // define the tree options for the ui-tree
        $scope.treeOptions = {
            // check if the dropped node can be accepted in the tree
           accept: function(sourceNodeScope, destNodesScope, destIndex) {
                var srctype = sourceNodeScope.$element.attr('data-type');
                var dsttype = destNodesScope.$element.attr('data-type');

                // check the allowed array for the types
                if($scope.allowed[dsttype].indexOf(srctype) > -1){
                    var dstparent = destNodesScope.$nodeScope.$modelValue.Name || undefined;
                    return true;
                }else{
                    return false;
                }
            },

            // when a node is dropped get the id's and paste in the server
            dropped: function(event){
                // get the node ids from the model value
                if (event.dest.nodesScope.$nodeScope){
                    var dest = event.dest.nodesScope.$nodeScope.$modelValue;
                }
                else{
                     var dest = {"ID":0}
                }
                if (event.source.nodesScope.$nodeScope)
                    var srcparent = event.source.nodesScope.$nodeScope.$modelValue.ID;
                else{
                    var srcparent = 0;
                }
                // only paste if it is not the same parent
                if (dest.ID != srcparent){
                    var parent = event.dest.nodesScope.$nodeScope || null;
                    var destprojectid = undefined;
                    // find the project the destination node is in
                    while (parent != null){
                        if (parent.$parentNodeScope == null){
                            destprojectid = parent.$modelValue.ID;
                        }
                        parent = parent.$parentNodeScope;
                    }
                    // find the project the source node is in
                    var parent = event.source.nodesScope.$nodeScope || null;
                    var srcprojectid = undefined;
                    while (parent != null){
                        if (parent.$parentNodeScope == null){
                            srcprojectid = parent.$modelValue.ID;
                        }
                        parent = parent.$parentNodeScope;
                    }
                    // set the current node to the one dropped in
                    $scope.currentNode = dest;
                    var src = event.source.nodeScope.$modelValue;
                    // if it's in the same project, cut
                    if (destprojectid == srcprojectid){
                        $scope.currentNodeScope = event.source.nodeScope;
                        $scope.cutThisNode(src.ID, src.NodeType);
                        $scope.pasteThisNode(dest.ID);
                    }
                    // otherwise paste
                    else{
                        $scope.copyThisNode(src.ID, src.NodeType);
                        $scope.pasteThisNode(dest.ID);
                        // set the flag to indicate the source needs to be added
                        // back to the parent when the node drops
                        $scope.addNodeBack = true;
                    }
                }
            },

            dragStop: function(event){
                if($scope.addNodeBack){
                    var sourceobject = event.source.nodeScope.$modelValue;
                    var parent = event.source.nodeScope.$parentNodeScope.$modelValue;
                    parent.Subitem.push(sourceobject);
                    $scope.addNodeBack = false;
                }
            },

            // beforeDrop: function(event){
            //     console.log("before drop");
            // },

            // beforeDrag: function(sourceNodeScope){
            //     console.log("before drag");
            //     return true;
            // },

            // dragStart: function(event){
            //     console.log("drag start");
            // },

            // dragMove: function(event){
            //     console.log("drag move");
            // }
        };

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
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
        $scope.selectNodeLabel = function(scope) {
            // reload the slickgrid
            sharedService.reloadSlickgrid(scope.$modelValue.ID);
            // set the current scope
            $scope.currentNodeScope = scope;
            // remove highlight from previous node
            if ($scope.currentNode) {
                $scope.currentNode.selected = undefined;
            }
            // set highlight to selected node
            // set currentNode
            $scope.currentNode = scope.$modelValue;
            $scope.currentNode.selected = 'selected';
        };

        $scope.loadOverheads = function(projectid){
            var req = {
                method: 'GET',
                url: globalServerURL + 'overhead_list/' + projectid + '/'
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
                url: globalServerURL + 'component_overheads/' + nodeid + '/'
            }
            $http(req).success(function(data) {
                $scope.componentOverheadList = data;
                console.log("Component overhead list loaded");
            });
        }

        // delete an overhead by id
        $scope.deleteOverhead = function(overheadid, index){
            var req = {
                method: 'DELETE',
                url: globalServerURL + 'overhead_list/' + overheadid + '/'
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
                    url: globalServerURL + 'overhead_list/' + projectid + '/',
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
        $scope.loadResourceList = function(state){
            var currentid = $scope.currentNode.ID;
            $('.finder').each(function() {
                var finder = new ContentFinder(this, function(id){
                    return $http({
                        method: 'GET',
                        url: globalServerURL + 'resource_list/' + id + '/'
                    })
                });
                finder.listdir(currentid);
            });

            //$http(req).success(function(data) {
            //    // instantiate the related items widget
            //    $('.finder').each(function() {
            //        $(document).on('click', function(event) {
            //            if (!$(event.target).closest('#related_items_finder').length) {
            //                finder.dropdown.css({'left': -9000});
            //                // close the widget if it was left open last time
            //                $('.finder-dropdown').attr('style','left: -9000px; width: 99.9%; top: 29px;');
            //                // set the text in case it is blank
            //                $('#inputResources').val('Click to search or browse');
            //            }
            //        });
            //    });

            //    if ( state == 'add' ) {
            //        // remove any old remembered choices from last time
            //        $('.search-choice').remove();
            //    }
            //    // close the widget if it was left open last time
            //    $('.finder-dropdown').attr('style','left: -9000px; width: 99.9%; top: 29px;');
            //    // set the text in case it is blank
            //    $('#inputResources').val('Click to search or browse');
            //    $('#inputResources').focus();
            //});
        };

        // Load a list of the fields used in adding a project
        $scope.loadProjectRelatedList = function(){
            // load the city list
            $scope.cityList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL + 'cities'
            }
            $http(req).success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });

            // load the client list
            $scope.clientList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL + 'clients'
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
                url: globalServerURL + 'resource_types'
            }
            $http(req).success(function(data) {
                $scope.restypeList = data;
                console.log("Resource Type list loaded");
            });

            // load the unit list
            $scope.unitList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL + 'units'
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
                var currentid = $scope.currentNode.ID;
                $scope.formData['OverheadList'] = $scope.componentOverheadList || [];
                $http({
                    method: 'POST',
                    url: globalServerURL + currentid + '/add',
                    data: $scope.formData
                }).success(function () {
                    // check if the current node is edited
                    if ($scope.formData['ID'] == currentid){
                        // update the node with the name in the form
                        $scope.currentNode.Name = $scope.formData['Name'];
                    }
                    $scope.formData = {'NodeType':$scope.formData['NodeType']};
                    sharedService.reloadSlickgrid(currentid);
                    $scope.loadNodeChildren(currentid);
                    console.log("Node added");
                });
            }
        };

        // Add a project to the tree and reload the projectlist
        $scope.addProject = function(){
            $scope.modalState = "Add"
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
                    $scope.projectAdded($scope.formData);
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
            $scope.modalState = "Add"
            $scope.formData = {'NodeType': nodetype};
        }

        // fetch the properties of the node being edited
        // to populate the respective edit form
        $scope.editNode = function(nodeid, nodetype){
            $scope.modalState = "Edit"
            $scope.isDisabled = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'node/' + nodeid + '/'
            }
            $http(req).success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = nodetype;
                $scope.formData['ID'] = nodeid;
                // special case for component types
                if (nodetype == 'Component') {
                    // update resource
                    // remove any old remembered choices from last time
                    $('.search-choice').remove();
                    var resource_html = '<li title="undefined" class="search-choice">' +
                                        '<span class="selected-resource">' + $scope.formData['ResourceName'] +
                                        '</span><a data-uid="' + $scope.formData['ResourceID'] +
                                        '" class="search-choice-close" href="javascript:void(0)"></a></li>'
                    $('#related_items_finder .finder-choices').prepend(resource_html);
                    // update overheadlist
                    var overheadlist = response['OverheadList'];
                    var arrayLength = $scope.componentOverheadList.length;
                    for (var i = 0; i < arrayLength; i++) {
                        if (overheadlist.indexOf($scope.componentOverheadList[i].ID) != -1){
                            $scope.componentOverheadList[i].selected = true;
                        }
                    }
                    $scope.formData['OverheadList'] = $scope.componentOverheadList;
                }
            });
        }

        // save changes made to the node's properties
        $scope.saveNodeEdits = function(){
            var req = {
                method: 'PUT',
                url: globalServerURL + 'edit/' + $scope.formData['ID'] + '/',
                data: $scope.formData,
            }
            $http(req).success(function(response) {
                console.log($scope.formData['NodeType'] + " edited")
                // XXX here refresh project list in case the name of node has been updated
                // set the current node name to the name in the modal form
                $scope.currentNode.Name = $scope.formData['Name'];
            });
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
                    $scope.nodeDeleted();
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
            $scope.nodeDeleted();
        }

        // function to paste copied node into another node
        // the id is sent to the server and the node pasted there
        // the user can't paste into the same node
        $scope.pasteThisNode = function(nodeid) {
            var cnode = $scope.copiedNode;
            if (cnode){
                if (cnode['id'] == nodeid){
                    console.log("You can't paste a node into itself");
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

        // when a node is deleted clear the slickgrid and remove it from the tree
        $scope.nodeDeleted = function(){
            $scope.currentNode = undefined;
            $scope.currentNodeScope.remove();
            sharedService.clearSlickgrid();
        }

        // Load the children and add to the tree
        $scope.loadNodeChildren = function(parentid){
            if ($scope.currentNode){
                $http.get(globalServerURL + parentid + '/').success(function(data) {
                    $scope.currentNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
        }
}]);

allControllers.controller('usersController', ['$scope', '$http', '$modal', 'globalServerURL',
    function($scope, $http, $modal, globalServerURL) {

        toggleMenu('setup');
        $scope.users = [];

        // populate user list
        ($scope.repopulate = function(){
            $http({
                method: 'GET',
                url: globalServerURL + 'users',
            }).then(
                function(response){
                    $scope.users = response.data;
                },
                function(){
                    alert('Error while fetching user list');
                }
            );
        })();

        $scope.selectedUser = null;
        $scope.showActionsFor = function(obj) {
            $scope.selectedUser = obj;
            for (i in $scope.users){
                $scope.users[i].selected = false;
            }
            obj.selected = true;
        };

        $scope.newuser = {
            username: '',
            password: '',
            roles: [
                { title: 'Administrator', selected: false }
            ]
        }
        var modalInstance = null;
        $scope.addingState = function (){
            $scope.modalState = "Add";
            $scope.newuser.password = '';
            $scope.newuser.roles.forEach(function(v){
                v.selected = false;
            });
            if ($scope.selectedUser){
                $scope.selectedUser.selected = false;
                $scope.selectedUser = null;
            }
            modalInstance = $modal.open({
                templateUrl: 'addUser',
                scope: $scope
            });
        };

        $scope.editingState = function (){
            $scope.modalState = "Edit";
            $scope.newuser.password = '';
            $http({
                method: 'GET',
                url: globalServerURL + 'users/' + $scope.selectedUser.username
            }).then(
                function(response){
                    var i;
                    $scope.data = response.data;
                    for (i in $scope.newuser.roles){
                        var role = $scope.newuser.roles[i];
                        role.selected = (response.data.roles.indexOf(role.title) > -1);
                    }
                    modalInstance = $modal.open({
                        templateUrl: 'addUser',
                        scope: $scope
                    });
                },
                function(){
                    alert('Error while fetching user information');
                }
            );
        };

        $scope.saveUser = function(){
            var newroles = $scope.newuser.roles.map(function(v){
                if (v.selected){
                    return v.title;
                } else {
                    return null;
                }
            }).filter(function(v){
                return v != null;
            });
            if ($scope.selectedUser){
                // Update the password (and later also the roles)
                $http({
                    method: "POST",
                    url: globalServerURL + 'users/' + $scope.selectedUser.username,
                    data: {
                        password: $scope.newuser.password,
                        roles: newroles
                    }
                }).then(
                    function(response){
                        $scope.selectedUser.roles = response.data.roles;
                        modalInstance && modalInstance.dismiss('ok');
                        modalInstance = null;
                    },
                    function(){
                        alert('Error while saving user details');
                    }
                );
            } else {
                $http({
                    method: "POST",
                    url: globalServerURL + 'users',
                    data: {
                        username: $scope.newuser.username,
                        password: $scope.newuser.password,
                        roles: newroles
                    }
                }).then(
                    function(){
                        modalInstance && modalInstance.dismiss('ok');
                        modalInstance = null;
                        $scope.repopulate();
                    },
                    function(){
                        alert('Error while saving user details');
                    }
                );
            }
        };

        $scope.deleteUser = function(user){
            if (confirm('Are you sure you want to delete ' + user.username + '?')){
                $http({
                    method: "DELETE",
                    url: globalServerURL + 'users/' + user.username
                }).then(
                    function(){
                        $scope.repopulate();
                    },
                    function(){
                        alert('Error deleting user');
                    }
                );
            }
        };

}]);

allControllers.controller('loginController', ['$scope', '$location', 'SessionService',
    function($scope, $location, SessionService){
        $scope.credentials = {
            username: '',
            password: ''
        }

        $scope.login = function(e){
            e.preventDefault();
            SessionService.login($scope.credentials.username, $scope.credentials.password).then(
                function(){
                    $location.path('/projects');
                },
                function(){
                    alert('Login failed');
                });
        }
}]);

allControllers.controller('logoutController', ['$location', 'SessionService',
    function($location, SessionService){
        SessionService.logout();
        $location.path('/login');
}]);

allControllers.controller('navController', ['$scope', 'SessionService',
    function($scope, SessionService){
        // Hide and show the toolbar depending on whether you're logged in.
        $scope.logged_in = SessionService.authenticated();
        $scope.username = SessionService.username();
        $scope.$on('session:changed', function(evt, username){
            $scope.logged_in = SessionService.authenticated();
            $scope.username = SessionService.username();
        });
}]);

// controller for the Order data from the server
allControllers.controller('ordersController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('orders');
        $scope.dateTimeNow = function() {
            $scope.date = new Date();
        };
        $scope.dateTimeNow();
        $scope.isDisabled = false;
        $scope.isCollapsed = true;
        $scope.addComponentsButton = "Add Components";
        $scope.jsonorders = [];
        $scope.componentsList = [];
        // Pagination variables and functions
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.orderListLength = $scope.maxPageSize;
        // get the length of the list of all the orders
        $http.get(globalServerURL + 'orders/length').success(function(data){
            $scope.orderListLength = data['length'];
        });

        $scope.loadOrderSection = function(){
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'orders',
                params: {'start':start,
                        'end': end}
            };
            $http(req).success(function(response) {
                $scope.jsonorders = response;
                console.log("Orders loaded");
            });
        }
        $scope.loadOrderSection();

        // aux function - checks if object is already in list based on ID
        function containsObject(objid, list) {
            var i;
            for (i = 0; i < list.length; i++) {
                if (list[i].ID === objid) {
                    return true;
                }
            }
            return false;
        }
        $scope.openProjectsList = [];
        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $scope.formData['ProjectID']
            var url = globalServerURL + 'projectview/' + id + '/'
            if (!(containsObject(id, $scope.openProjectsList))) {
                $http.get(url).success(function(data) {
                    // add the project, if not already in the list
                    $scope.openProjectsList = [data[0]];
                });
            }
        };

        // loading the project, client and supplier list
        $scope.projectsList = [];
        $http.get(globalServerURL + 'project_listing')
        .success(function(data) {
            $scope.projectsList = data;
        });

        $scope.supplierList = [];
        $http.get(globalServerURL + 'suppliers')
        .success(function(data){
            $scope.supplierList = data;
        });


        // when the add components button is clicked
        $scope.componentsButtonClicked = function(){
            $scope.loadProject();
            $scope.isCollapsed = !$scope.isCollapsed;
            if ($scope.isCollapsed){
                $scope.addComponentsButton = "Add Components";
            }
            else{
                $scope.addComponentsButton = "Back";
            }
        }


        // Adding or editing an order
        $scope.save = function(){
            // set the list of checked components
            $scope.setComponentsList();
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled){
                $scope.isDisabled = true;
                // convert the date to json format
                $scope.formData['Date'] = $scope.date.toJSON();
                if ($scope.modalState == 'Edit'){
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else{
                    $http({
                        method: 'POST',
                        url: globalServerURL + $scope.formData['NodeType'] + '/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new order to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new order to the list and sort
        $scope.handleNew = function(neworder){
            // the new order is added to the list
            var low = $scope.jsonorders[0].ID;
            var high = $scope.jsonorders[$scope.jsonorders.length - 1].ID + 2;
            // only need to add it if it's id falls in the current section
            if (neworder.ID > low && neworder.ID < high){
                $scope.jsonorders.push(neworder);
                // sort by order id
                $scope.jsonorders.sort(function(a, b) {
                    var idA = a.ID;
                    var idB = b.ID;
                    return (idA < idB) ? -1 : (idA > idB) ? 1 : 0;
                });
            }
            console.log ("Order added");
        }

        // handle editing an order
        $scope.handleEdited = function(editedorder){
            // search for the order and edit in the list
            var result = $.grep($scope.jsonorders, function(e) {
                return e.ID == editedorder.ID;
            });
            var i = $scope.jsonorders.indexOf(result[0]);
            if (i>-1){
                $scope.jsonorders[i] = editedorder;
            }
            console.log ("Order edited");
        };

        // Set the selected order and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedOrder = obj;
            $('#order-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function (){
            $scope.addComponentsButton = "Add Components";
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'order'};
            $scope.dateTimeNow();
            $scope.formData['Date'] = $scope.date;
            $scope.componentsList = [];
            if ($scope.selectedOrder){
                $('#order-'+$scope.selectedOrder.ID).removeClass('active');
                $scope.selectedOrder = undefined;
            }
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function (){
            $scope.addComponentsButton = "Add Components";
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.selectedOrder.ID + '/'
            }).success(function(response){
                $scope.formData = response;
                $scope.componentsList = $scope.formData['ComponentsList'];
                $scope.date = new Date($scope.formData['Date']);
                $scope.formData['NodeType'] = 'order';
            });
        }

        // Delete an order and remove from the orders list
        $scope.deleteOrder = function() {
            var deleteid = $scope.selectedOrder.ID;
            $scope.selectedOrder = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonorders, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonorders.indexOf(result[0]);
                if (i>-1){
                    $scope.jsonorders.splice(i, 1);
                    console.log("Deleted order");
                }
            });
        };

        $scope.setComponentsList = function(){
            $scope.formData['ComponentsList'] = $scope.componentsList;
        };

        $scope.toggleComponents = function(node){
            var flag = (node.selected === true) ? undefined : true;
            node.selected = flag;
            var componentid = node.ID;
            var result = $.grep($scope.componentsList, function(e) {
                    return e.ID == componentid;
            });
            var i = $scope.componentsList.indexOf(result[0]);
            if (i>-1){
                $scope.componentsList.splice(i, 1);
            }
            else{
                $scope.componentsList.push(node);
            }
        }

        $scope.componentSelected = function(node){
            $scope.componentsList.push(node);
        }

        // remove a component from the component list
        $scope.removeComponent = function(node){
            var deleteid = node.ID;
            var result = $.grep($scope.componentsList, function(e) {
                    return e.ID == deleteid;
            });
            var i = $scope.componentsList.indexOf(result[0]);
            if (i>-1){
                $scope.componentsList.splice(i, 1);
                // loop through all the open nodes and if the checked component
                // is in it uncheck the component
                for (i = 0; i<$scope.openProjectsList.length; i++){
                    var subitem = $scope.openProjectsList[i].Subitem || [];
                    if (subitem.length > 0){
                        $scope.uncheckComponent(deleteid, subitem);
                    }
                }

            }
        };

        $scope.uncheckComponent = function(componentId, subitem){
            for (var i = 0; i<subitem.length; i++){
                if (subitem[i].ID == componentId){
                    subitem[i].selected = false;
                    break;
                }
                else{
                    var subsubitem = subitem[i].Subitem || [];
                    if (subsubitem.length > 0){
                        $scope.uncheckComponent(componentId, subsubitem);
                    }
                }
            }
        }

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.collapsed){
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    // check if any of the components are in the components list
                    // and select then
                    for (i = 0; i<selectedNode.Subitem.length; i++){
                        if (selectedNode.Subitem[i].NodeType == 'Component'){
                            for (b = 0; b<$scope.componentsList.length; b++){
                                if ($scope.componentsList[b].ID == selectedNode.Subitem[i].ID){
                                    selectedNode.Subitem[i].selected = true;
                                }
                            }
                        }
                    }
                    console.log("Children loaded");
                });
            }
            else{
                selectedNode.collapsed = false;
            }
        };
    }
]);

allControllers.directive('smartFloat', function ($filter) {
    var FLOAT_REGEXP_1 = /^\$?\d+.(\d{3})*(\,\d*)$/; //Numbers like: 1.123,56
    var FLOAT_REGEXP_2 = /^\$?\d+,(\d{3})*(\.\d*)$/; //Numbers like: 1,123.56
    var FLOAT_REGEXP_3 = /^\$?\d+(\.\d*)?$/; //Numbers like: 1123.56
    var FLOAT_REGEXP_4 = /^\$?\d+(\,\d*)?$/; //Numbers like: 1123,56

    return {
        require: 'ngModel',
        link: function (scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function (viewValue) {
                if (FLOAT_REGEXP_1.test(viewValue)) {
                    ctrl.$setValidity('float', true);
                    return parseFloat(viewValue.replace('.', '').replace(',', '.'));
                } else if (FLOAT_REGEXP_2.test(viewValue)) {
                        ctrl.$setValidity('float', true);
                        return parseFloat(viewValue.replace(',', ''));
                } else if (FLOAT_REGEXP_3.test(viewValue)) {
                        ctrl.$setValidity('float', true);
                        return parseFloat(viewValue);
                } else if (FLOAT_REGEXP_4.test(viewValue)) {
                        ctrl.$setValidity('float', true);
                        return parseFloat(viewValue.replace(',', '.'));
                }else {
                    ctrl.$setValidity('float', false);
                    return undefined;
                }
            });

            ctrl.$formatters.unshift(
               function (modelValue) {
                   return $filter('number')(parseFloat(modelValue) , 2);
               }
           );
        }
    };
});
