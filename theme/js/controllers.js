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

        shared.reloadOrderSlickgrid = function(){
            $rootScope.$broadcast('handleReloadOrderSlickgrid');
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

        // load the city list
        $scope.cityList = [{"Name": "Loading..."}];
        var req = {
            method: 'GET',
            url: globalServerURL + 'cities'
        }
        $http(req).success(function(data) {
            $scope.cityList = data;
        });

        // Adding or editing a client
        $scope.save = function(){
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled){
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit'){
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'client/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else{
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'client/0/',
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
            $http.get(globalServerURL + 'client/' + $scope.selectedClient.ID + '/')
            .success(function(response){
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
                url: globalServerURL + 'client/' + deleteid + '/'
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

        // load the city list
        $scope.cityList = [{"Name": "Loading..."}];
        var req = {
            method: 'GET',
            url: globalServerURL + 'cities'
        }
        $http(req).success(function(data) {
            $scope.cityList = data;
        });

        // Adding or editing a supplier
        $scope.save = function(){
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled){
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit'){
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'supplier/' + $scope.formData['ID'] + '/',
                        data:$scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else{
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'supplier/0/',
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
                url: globalServerURL + 'supplier/' + $scope.selectedSupplier.ID + '/'
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
                url: globalServerURL + 'supplier/' + deleteid + '/'
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
        $scope.newCity = [];
        $http.get(globalServerURL + 'cities').success(function(data){
            $scope.cityList = data;
        });

        // clear the city input fields
        $scope.clearInput = function(){
            $scope.newCity = [];
        }

        $scope.cityList = [];
        $scope.loadCities = function(){
            $http.get(globalServerURL + 'cities')
            .success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });
        };

        // delete a city by id
        $scope.deleteCity = function(cityid, index){
            var req = {
                method: 'DELETE',
                url: globalServerURL + 'city/' + cityid + '/',
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
                    url: globalServerURL + 'city/0/',
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
        $scope.newUnit = [];
        $http.get(globalServerURL + 'units').success(function(data) {
            $scope.unitList = data;
            console.log("Unit list loaded");
        });

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
                url: globalServerURL + 'unit/' + unitid + '/',
            }
            $http(req).success(function(result) {
                if ( result.status == 'remove' ) {
                    $scope.unitList.splice(index, 1);
                    console.log("Unit deleted");
                }
            });
        }

        // add a unit
        $scope.addUnit = function(){
            if ($scope.newUnit){
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'unit/0/',
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
allControllers.controller('projectsController',['$scope', '$http', '$cacheFactory', 'globalServerURL', '$rootScope', 'sharedService', '$timeout',
    function($scope, $http, $cacheFactory, globalServerURL, $rootScope, sharedService, $timeout) {

        toggleMenu('projects');
        // variable for disabling submit button after user clicked it
        $scope.isDisabled = false;

        // load the projects used in the select project modal
        // Add a loading value to the project list while it loads
        $scope.projectsList = [{"Name": "Loading..."}];
        $http.get(globalServerURL + 'projects/').success(function(data) {
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
            for (var i = 0; i < list.length; i++) {
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
            var url = globalServerURL + 'node/' + id + '/'
            $http.get(url).success(function(data) {
                if (!(containsObject(data, $scope.projectsRoot.Subitem))) {
                    // add latest select project, if not already in the list
                    $scope.projectsRoot.Subitem.push(data);
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
                            open_projects.push(data.ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                        catch (exception) {
                            // create a new open_projects storage as one doesnt exist
                            localStorage.setItem("open_projects", []);
                            open_projects = []
                            open_projects.push(data.ID);
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
                    for (var i = 0; i < open_projects.length; i++) {
                        var id = open_projects[i];
                        var url = globalServerURL + 'node/' + id + '/'
                        $http.get(url).success(function(data) {
                            $scope.projectsRoot.Subitem.push(data);
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
                $http.get(globalServerURL + 'node/' + parentid + '/children/').success(function(data) {
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
            $http.get(globalServerURL + 'project/' + projectid + '/overheads/')
            .success(function(data) {
                $scope.overheadList = data;
                console.log("Overhead list loaded");
            });
        };

        // load the overheads a component can use
        $scope.loadComponentOverheads = function(nodeid){
            var req = {
                method: 'GET',
                url: globalServerURL + 'component/' + nodeid + '/overheads/'
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
                url: globalServerURL + 'project/' + overheadid + '/overheads/'
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
                    url: globalServerURL + 'project/' + projectid + '/overheads/',
                    data: {'Name':$scope.newOverhead.Name,
                            'Percentage': $scope.newOverhead.Percentage}
                }
                $http(req).success(function() {
                    $scope.newOverhead = undefined;
                    $scope.loadOverheads(projectid);
                    console.log("Overhead added");
                });
            }
        }

        // add an overhead if it has been input
        // and clear the overhead modal input fields
        $scope.clearInput = function(){
            if ($scope.newOverhead){
                $scope.addOverhead($scope.currentNode.ID);
            }
            $scope.newOverhead = undefined;
        }

        // Load the resources the user can select from the resource list
        $scope.loadResourceList = function(state){
            var currentid = $scope.currentNode.ID,
                finder = $('.finder').get(0);
            $scope.finder = $scope.finder || new ContentFinder(finder, function(id){
                return $http({
                    method: 'GET',
                    cache: $cacheFactory.get('optimate.resources'),
                    url: globalServerURL + 'project/' + id + '/resources/'
                })
            });
            if (state == 'add'){ $scope.finder.clear_selection(); }
            $scope.finder.listdir(currentid);
        };

        $scope.refreshResourceList = function(){
            $cacheFactory.get('optimate.resources').removeAll();
            $scope.finder.listdir($scope.currentNode.ID);
        };

        // Not the most angular approach, but it does help it go away
        // when you click outside the dropdown.
        $scope.closeDropdown = function(e){
            if (!e.isDefaultPrevented()){
                $scope.finder && $scope.finder.opened && $scope.finder.close_dropdown();
            }
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
                url: globalServerURL + 'resourcetypes'
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
                console.log($scope.componentOverheadList)
                $http({
                    method: 'POST',
                    url: globalServerURL + 'node/' + currentid + '/',
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
                    url: globalServerURL + 'node/' + '0' + '/',
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
                    $http.get(globalServerURL + 'component/' + nodeid + '/overheads/')
                    .success(function(data) {
                        $scope.componentOverheadList = data;
                        var overheadlist = response['OverheadList'];
                        var arrayLength = $scope.componentOverheadList.length;
                        for (var i = 0; i < arrayLength; i++) {
                            if (overheadlist.indexOf($scope.componentOverheadList[i].ID) != -1){
                                $scope.componentOverheadList[i].selected = true;
                            }
                        }
                        $scope.formData['OverheadList'] = $scope.componentOverheadList;
                    });
                }
            });
        }

        // save changes made to the node's properties
        $scope.saveNodeEdits = function(){
            var req = {
                method: 'PUT',
                url: globalServerURL + 'node/' + $scope.formData['ID'] + '/',
                data: $scope.formData,
            }
            $http(req).success(function(response) {
                console.log($scope.formData['NodeType'] + " edited")
                // XXX here refresh project list in case the name of node has been updated
                // set the current node name to the name in the modal form
                $scope.currentNode.Name = $scope.formData['Name'];
                sharedService.reloadSlickgrid($scope.formData['ID']);
            });
        }

        // Deleting a node. It recieves the id of the node
        // The id is sent to the server to be deleted and the node
        // removed from the treemodel
        $scope.deleteThisNode = function ( nodeid ) {
            $http({
                method: 'DELETE',
                url:globalServerURL + 'node/' + nodeid + '/'
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
                        url: globalServerURL + 'node/' + nodeid + '/paste/',
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
                $http.get(globalServerURL + 'node/' + parentid + '/children/').success(function(data) {
                    $scope.currentNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
        }

        $scope.loadComponentTypes = function() {
            var ctypes = [
                { Name:"Labour", selected:true },
                { Name:"Material", selected:true },
                { Name:"Subcontractor", selected:true }];
            $scope.componentTypeList = ctypes
                console.log("Component Type list loaded");
        };

        $scope.getReport = function (report, nodeid) {
            if ( report == 'projectbudget' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $scope.formData['ComponentTypeList'] = $scope.componentTypeList || [];
                $http({
                    method: 'POST',
                    url: globalServerURL + 'project_budget_report/' + nodeid + '/',
                    data: $scope.formData},
                    {responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    var file = new Blob([response], {type: 'application/pdf'});
                    var fileURL = URL.createObjectURL(file);
                    var result = document.getElementsByClassName("pdf_hidden_download");
                    var anchor = angular.element(result);
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    anchor.attr({
                        href: fileURL,
                        target: '_blank',
                        download: filename
                    })[0].click();
                    // clear the hidden anchor so that everytime a new report is linked
                    anchor.attr({
                        href: '',
                        target: '',
                        download: ''
                    });
                }).error(function(data, status, headers, config) {
                    console.log("Project budget pdf download error")
                });
            }
            else if ( report == 'resourcelist' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({method: 'GET', url:globalServerURL + 'resource_list_report/' + nodeid + '/'},
                      {responseType:'arraybuffer'
                }).success(function (response, status, headers, config) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    var file = new Blob([response], {type: 'application/pdf'});
                    var fileURL = URL.createObjectURL(file);
                    var result = document.getElementsByClassName("pdf_download");
                    var anchor = angular.element(result);
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    anchor.attr({
                        href: fileURL,
                        target: '_blank',
                        download: filename
                    })[0].click();
                    // clear the anchor so that everytime a new report is linked
                    anchor.attr({
                        href: '',
                        target: '',
                        download: ''
                    });
                }).error(function(data, status, headers, config) {
                    console.log("Resource list pdf download error")
                });
            }
        };

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
            for (var i in $scope.users){
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
                    for (var i in $scope.newuser.roles){
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
allControllers.controller('ordersController', ['$scope', '$http', 'globalServerURL', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, sharedService, $timeout) {

        toggleMenu('orders');
        $scope.dateTimeNow = function() {
            $scope.date = new Date();
        };
        $scope.dateTimeNow();
        $scope.isDisabled = false;
        $scope.isCollapsed = true;
        $scope.jsonorders = [];
        $scope.componentsList = [];
        $scope.modalForm = [];
        // Pagination variables and functions
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.orderListLength = $scope.maxPageSize + 1;

        // loading the project, client and supplier list
        $scope.clearFilters = function(){
            $scope.filters = [];
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });

            $http.get(globalServerURL + 'suppliers')
            .success(function(data){
                $scope.supplierList = data;
            });

            $http.get(globalServerURL + 'clients')
            .success(function(data){
                $scope.clientList = data;
            });

            // get the length of the list of all the orders
            $http.get(globalServerURL + 'orders/length').success(function(data){
                $scope.orderListLength = data['length'];
            });
        }
        $scope.projectsList = [];
        $scope.supplierList = [];
        $scope.clientList = [];
        $scope.clearFilters();

        $scope.loadOrderSection = function(){
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'orders',
                params: {'start':start,
                        'end': end,
                        'project': $scope.filters.Project,
                        'client': $scope.filters.Client,
                        'supplier': $scope.filters.Supplier}
            };
            $http(req).success(function(response) {
                var length = response.pop();
                $scope.jsonorders = response;
                if (length){
                    $scope.orderListLength = length;
                }
                console.log("Orders loaded");
            });
        }
        $scope.loadOrderSection();

        // filter the other filter options by project
        $scope.filterBy = function(selection){
            var req = {
                method: 'GET',
                url: globalServerURL + 'orders/filter',
                params: {'project': $scope.filters.Project,
                        'client': $scope.filters.Client,
                        'supplier': $scope.filters.Supplier}
            };
            $http(req).success(function(response){
                if (selection == 'project'){
                    $scope.clientList = response['clients'];
                    $scope.supplierList = response['suppliers'];
                }
                else if (selection == 'client'){
                    $scope.projectsList = response['projects'];
                    $scope.supplierList = response['suppliers'];
                }
                else {
                    $scope.clientList = response['clients'];
                    $scope.projectsList = response['projects'];
                }
            })
        };

        // Adding or editing an order
        $scope.save = function(){
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled){
                $scope.isDisabled = true;
                // set the list of checked components
                $scope.formData['ComponentsList'] = $scope.componentsList;
                // set the tax rate
                $scope.formData['TaxRate'] = $scope.formData['TaxRate'] ? 14 : 0;
                // convert the date to json format
                $scope.formData['Date'] = $scope.date.toJSON();
                // convert the total to a number
                $scope.formData['Total'] = parseFloat($scope.modalForm.Total.replace(/[^0-9-.]/g, ''));;
                if ($scope.modalState == 'Edit'){
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        response['TaxRate'] = (response['TaxRate'] > 0);
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
            var high = $scope.jsonorders[0].ID + 2;
            var low = $scope.jsonorders[$scope.jsonorders.length - 1].ID + 2;
            // only need to add it if it's id falls in the current section
            if (neworder.ID > low && neworder.ID < high){
                $scope.jsonorders.push(neworder);
                // sort by order id
                $scope.jsonorders.sort(function(a, b) {
                    var idA = a.ID;
                    var idB = b.ID;
                    return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
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
            $scope.formData = {'NodeType': 'order',
                                'TaxRate': false};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.dateTimeNow();
            $scope.formData['Date'] = $scope.date;
            $scope.modalForm.Total = '0.00';
            $scope.componentsList = [];
            if ($scope.selectedOrder){
                $('#order-'+$scope.selectedOrder.ID).removeClass('active');
                $scope.selectedOrder = undefined;
            }
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function (){
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.selectedOrder.ID + '/'
            }).success(function(response){
                $scope.formData = response;
                $scope.loadProject()
                $scope.componentsList = $scope.formData['ComponentsList'];
                $scope.date = new Date($scope.formData['Date']);
                $scope.formData['NodeType'] = 'order';
                $scope.formData['TaxRate'] = ($scope.formData['TaxRate'] > 0);
                $scope.modalForm.Total = response.Total;
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

        $scope.toggleComponents = function(comp){
            // set the component selected or unselected
            var flag = (comp.selected === true) ? undefined : true;
            comp.selected = flag;
            // find the component in the component list
            var i = $scope.componentsList.map(function(e)
                { return e.id; }).indexOf(comp.ID);
            // if the component is already in the list
            // and the node is deselected
            if ((i>-1) &(!flag)){
                // remove it
                $scope.componentsList.splice(i, 1);
            }
            // if the component is not in the list
            // and the node is being selected
            else if ((i==-1) & flag){
                // add the component
                $scope.componentsList.push(comp);
            }
        }

        // remove a component from the component list
        $scope.removeComponent = function(node){
            var deleteid = node.ID;
            var result = $.grep($scope.componentsList, function(e) {
                    return e.id == deleteid;
            });
            var i = $scope.componentsList.indexOf(result[0]);
            if (i>-1){
                $scope.componentsList.splice(i, 1);
                // loop through all the open nodes and if the checked component
                // is in it uncheck the component
                for (var i = 0; i<$scope.openProjectsList.length; i++){
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

        $scope.toggleNode= function(node){
            // when a node that is not a component is selected
            // flag the node, set the selection on all its children
            // load the components in the node and toggle them in the
            // component list
            var flag = (node.selected === true) ? undefined : true;
            node.selected = flag;
            var nodeid = node.ID;
            var subitems = node['Subitem'];
            // select the subitems
            for (var i = 0; i<subitems.length; i++){
                subitems[i].selected = flag;
                var subsubitem = subitems[i]['Subitem'] || [];
                if (subsubitem.length > 0){
                    $scope.toggleSubitems(subsubitem, flag);
                }
            }
            // add the components to the list
            $http.get(globalServerURL + 'node/' + nodeid + '/components/')
            .success(function(response){
                for (var v = 0; v<response.length; v++){
                    var comp = response[v];
                    // find the component in the component list
                    var i = $scope.componentsList.map(function(e)
                        { return e.id; }).indexOf(comp.ID);
                    // if the component is already in the list
                    // and the node is deselected
                    if ((i>-1) &(!flag)){
                        // remove it
                        $scope.componentsList.splice(i, 1);
                    }
                    // if the component is not in the list
                    // and the node is being selected
                    else if ((i==-1) & flag){
                        // add the component
                        $scope.componentsList.push(comp);
                    }
                }
            });
        };

        $scope.toggleSubitems = function(subitem, selected){
            // recursively select/unselect all the children of a node
            for (var i = 0; i<subitem.length; i++){
                subitem[i].selected = selected;
                var subsubitem = subitem[i]['Subitem'] || [];
                if (subsubitem.length > 0){
                    $scope.toggleSubitems(subsubitem, selected);
                }
            }
        };

        $scope.toggleComponentsGrid = function(){
            $scope.isCollapsed = !$scope.isCollapsed;
            if ($scope.isCollapsed){
                sharedService.reloadOrderSlickgrid();
            }
        };

        $scope.openProjectsList = [];
        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $scope.formData['ProjectID']
            $http.get(globalServerURL + 'node/' + id + '/')
            .success(function(data) {
                $scope.openProjectsList = [data];
            });
        };

        // update the order total
        // inside an apply function to ensure it updates the model
        $scope.updateOrderTotal = function(total){
            $timeout(function(){
                $scope.modalForm.Total = total;
            });
        };

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.collapsed){
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + "orders/tree/" + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    // check if any of the components are in the components list
                    // and select then
                    for (var i = 0; i<selectedNode.Subitem.length; i++){
                        if (selectedNode.Subitem[i].NodeType == 'Component'){
                            for (var b = 0; b<$scope.componentsList.length; b++){
                                if ($scope.componentsList[b].ID == selectedNode.Subitem[i].ID){
                                    selectedNode.Subitem[i].selected = true;
                                }
                            }
                        }
                        // for all the other node set the same state as the parent
                        else {
                            selectedNode.Subitem[i].selected = selectedNode.selected;
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

allControllers.run(['$cacheFactory', function($cacheFactory){
    $cacheFactory('optimate.resources')
}]);
