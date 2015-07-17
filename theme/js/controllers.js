// angular module that contains all the controllers
var allControllers = angular.module('allControllers', ['config']);

// A factory that builds a shared service for the controllers for passing info
allControllers.factory('sharedService', ['$rootScope',
    function($rootScope) {
        var shared = {};

        // when a node is added to the projects treeview
        // the slickgrid should be reloaded
        shared.nodeAdded = function(currentid) {
            console.log("nodeAdded() function deprecated");
            // this.reloadSlickgrid(currentid);
        }

        shared.clearSlickgrid = function() {
            console.log("clearSlickgrid() function deprecated");
            // $rootScope.$broadcast('handleClearSlickgrid');
        }

        shared.reloadSlickgrid = function(nodeid) {
            console.log("reloadSlickgrid() function deprecated");
            // this.reloadId = nodeid;
            // $rootScope.$broadcast('handleReloadSlickgrid');
        }

        shared.reloadOrderSlickgrid = function() {
            console.log("reloadOrderSlickgrid() function deprecated");
            // $rootScope.$broadcast('handleReloadOrderSlickgrid');
        }

        shared.reloadValuationSlickgrid = function() {
            console.log("reloadValuationSlickgrid() function deprecated");
            // $rootScope.$broadcast('handleReloadValuationSlickgrid');
        }
        return shared;
}]);

function toggleMenu(itemclass) {
    $("ul.nav li").removeClass("active");
    $("li."+itemclass).toggleClass("active");
}

// controller for the Company Information data from the server
allControllers.controller('companyinformationController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        $http.get(globalServerURL + 'company_information').success(function(data) {
            $scope.company_information = data;
        });

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $http({
                method: 'GET',
                url: globalServerURL + 'company_information'
            }).success(function(response) {
                $scope.formData = response;
            })
            $scope.EditCompanyInformationForm.$setPristine();
        }

        // editing company information data
        $scope.save = function() {
            $http({
                method: 'PUT',
                url: globalServerURL + 'company_information',
                data: $scope.formData
            }).success(function(response) {
                $scope.company_information = $scope.formData
            });
            $scope.EditCompanyInformationForm.$setPristine();
        };

    }
]);

// controller for the Client data from the server
allControllers.controller('clientsController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('setup');
        $scope.isDisabled = false;

        $http.get(globalServerURL + 'clients').success(function(data) {
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
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
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
        $scope.handleNew = function(newclient) {
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
        $scope.handleEdited = function(editedclient) {
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
        $scope.addingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'client'};
            if ($scope.selectedClient) {
                $('#client-'+$scope.selectedClient.ID).removeClass('active');
                $scope.selectedClient = undefined;
            }
            $scope.saveModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http.get(globalServerURL + 'client/' + $scope.selectedClient.ID + '/')
            .success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = 'client';
            })
            $scope.saveModalForm.$setPristine();
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

        $http.get(globalServerURL + 'suppliers').success(function(data) {
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
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
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
        $scope.handleNew = function(newsupplier) {
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
        $scope.handleEdited = function(editedsupplier) {
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
        $scope.addingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'supplier'};
            if ($scope.selectedSupplier) {
                $('#supplier-'+$scope.selectedSupplier.ID).removeClass('active');
                $scope.selectedSupplier = undefined;
            }
            $scope.saveModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'supplier/' + $scope.selectedSupplier.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = 'supplier';
            })
            $scope.saveModalForm.$setPristine();
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
        $http.get(globalServerURL + 'cities').success(function(data) {
            $scope.cityList = data;
        });

        // clear the city input fields
        $scope.clearInput = function() {
            $scope.newCity = [];
        }

        $scope.cityList = [];
        $scope.loadCities = function() {
            $http.get(globalServerURL + 'cities')
            .success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });
        };

        // delete a city by id
        $scope.deleteCity = function(cityid, index) {
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
        $scope.addCity = function() {
            if ($scope.newCity) {
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
        $scope.clearInput = function() {
            $scope.newUnit = undefined;
        }

        $scope.unitList = [];
        $scope.loadUnits = function() {
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
        $scope.deleteUnit = function(unitid, index) {
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
        $scope.addUnit = function() {
            if ($scope.newUnit) {
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

var duplicateModalController = function ($scope, $modalInstance, selections) {

    $scope.selections = selections;

    $scope.skip = function () {
        $scope.selections.overwrite = false;
        $modalInstance.close($scope.selections);
    };

    $scope.overwrite = function () {
        $scope.selections.overwrite = true;
        $modalInstance.close($scope.selections);
    };
};

angular.module('allControllers').controller('duplicateModalController', duplicateModalController);

// Controller for the projects and treeview
allControllers.controller('projectsController',['$scope', '$http', '$cacheFactory', 'globalServerURL', '$rootScope', 'sharedService', '$timeout', '$modal',
    function($scope, $http, $cacheFactory, globalServerURL, $rootScope, sharedService, $timeout, $modal) {

        toggleMenu('projects');
        // variable for disabling submit button after user clicked it
        $scope.isDisabled = false;
        $scope.calculatorHidden = true; // set calculator to be hidden by default
        $scope.rowsSelected = false;    // set selected rows false

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

        // load the projects used in the select project modal
        $http.get(globalServerURL + 'projects/').success(function(data) {
            $scope.projectsList = data;
        });

        // load the unit list
        $http.get(globalServerURL + 'units').success(function(data) {
            $scope.unitList = data;
            console.log("Unit list loaded");
        });

        // load the resource types
        $http.get(globalServerURL + 'resourcetypes').success(function(data) {
            $scope.restypeList = data;
            console.log("Resource Type list loaded");
        });

        // load the suppliers list
        $http.get(globalServerURL + 'suppliers').success(function(data) {
            $scope.supplierList = data;
            console.log("Resource Supplier list loaded");
        });

        // load the city list
        $http.get(globalServerURL + 'cities').success(function(data) {
            $scope.cityList = data;
            console.log("City list loaded");
        });

        // load the client list
        $http.get(globalServerURL + 'clients').success(function(data) {
            $scope.clientList = data;
            console.log("Client list loaded");
        });

        $scope.statusMessage = function(message, timeout, type) {
            $('#status_message span').text(message);
            $('#status_message span').addClass(type);
            $('#status_message').show();
            // setting timeout to 0, makes the message sticky, next non-sticky
            // message will clear it.
            if ( timeout != 0 ) {
                window.setTimeout(function () {
                    $("#status_message").hide();
                    $('#status_message span').removeClass(type);
                }, timeout);
            }
        }

        // When a new project is added to the tree
        $scope.projectAdded = function(newproject) {
            if (!(containsObject(newproject, $scope.projectsRoot.Subitem))) {
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
            }
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

        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $scope.selectedProject;
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
            $scope.handleClearSlickgrid();
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

        // functions used by the treeview
        // --------------------------------------------------------------------
        $scope.overheadList = [];
        // set the collapsed flag to false, this allows horizontal dragging
        // into any node
        $scope.$broadcast('expandAll');

        // set the allowed types to be dropped
        $scope.allowed = {};
        $scope.allowed['Project'] = ['BudgetGroup'];
        $scope.allowed['BudgetGroup'] = ['BudgetGroup', 'BudgetItem',
                                    'Component'];
        $scope.allowed['BudgetItem'] = ['BudgetItem', 'Component'];
        $scope.allowed['Component'] = [];
        $scope.allowed['ResourceCategory'] = ['ResourceCategory', 'Resource'];
        $scope.allowed['Resource'] = [];
        $scope.allowed['Root'] = ['Project'];
        $scope.dragOverNode = {'original': undefined};
        $scope.dragOver = function(node) {
            // check for the previous dragged over node
            if ($scope.dragOverNode.copy != undefined) {
                // reset previous to default values
                $scope.dragOverNode.copy.selected = undefined;
                var original = $scope.dragOverNode.original || {'Subitem': undefined};
                if (original.Subitem != undefined){
                    $scope.dragOverNode.copy.Subitem = original.Subitem;
                    // $scope.dragOverNode.copy.collapsed = $scope.dragOverNode.original.collapsed;
                }
            }
            // reset original node values
            $scope.dragOverNode.original = {'Subitem': undefined};
            $scope.dragOverNode.copy = node;
            // highlight the parent destination node
            $scope.dragOverNode.copy.selected = 'selected';
            // if the current node has no children add a dummy child
            if ($scope.dragOverNode.copy.Subitem.length == 0) {
                $scope.dragOverNode.original.Subitem = [];
                // $scope.dragOverNode.original.collapsed = false;
                $scope.dragOverNode.copy.Subitem.push({'Name': '', 'NodeType': 'Default'});
                // $scope.dragOverNode.copy.collapsed = true;
            }
            // if the node is collapsed clear the children name
            // else if (!$scope.dragOverNode.copy.collapsed) {
            //     $scope.dragOverNode.original.Subitem = [{'Name': '...', 'NodeType': 'Default'}];
            //     // $scope.dragOverNode.original.collapsed = false;
            //     $scope.dragOverNode.copy.Subitem[0].Name = '';
            //     // $scope.dragOverNode.copy.collapsed = true;
            // }
        }

        // define the tree options for the ui-tree
        $scope.treeOptions = {
            // check if the dropped node can be accepted in the tree
           accept: function(sourceNodeScope, destNodesScope, destIndex) {
                var srctype = sourceNodeScope.$element.attr('data-type');
                var dsttype = destNodesScope.$element.attr('data-type') || 'Root';
                // $scope.treeOptions.draggedOver = destNodesScope.$nodeScope.$modelValue;

                // check the allowed array for the types
                if ($scope.allowed[dsttype]) {
                    if($scope.allowed[dsttype].indexOf(srctype) > -1) {
                        // call the drag over function
                        if (destNodesScope.$nodeScope){
                            $scope.dragOver(destNodesScope.$nodeScope.$modelValue);
                        }
                        return true;
                    }else{
                        return false;
                    }
                }
                else{
                    return false;
                }
            },

            // when a node is dropped get the id's and paste in the server
            dropped: function(event) {
                // get the node ids from the model value
                if (event.dest.nodesScope.$nodeScope) {
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
                if (dest.ID != srcparent) {
                    var parent = event.dest.nodesScope.$nodeScope || null;
                    var destprojectid = undefined;
                    // find the project the destination node is in
                    while (parent != null) {
                        if (parent.$parentNodeScope == null) {
                            destprojectid = parent.$modelValue.ID;
                        }
                        parent = parent.$parentNodeScope;
                    }
                    // find the project the source node is in
                    var parent = event.source.nodesScope.$nodeScope || null;
                    var srcprojectid = undefined;
                    while (parent != null) {
                        if (parent.$parentNodeScope == null) {
                            srcprojectid = parent.$modelValue.ID;
                        }
                        parent = parent.$parentNodeScope;
                    }
                    // set the current node to the one dropped in
                    $scope.currentNode = dest;
                    var src = event.source.nodeScope.$modelValue;
                    // if it's in the same project, cut
                    if (destprojectid == srcprojectid) {
                        $scope.currentNodeScope = event.source.nodeScope;
                        $scope.cutThisNode(src);
                        $scope.currentNode = dest;
                        $scope.pasteThisNode(dest.ID);
                    }
                    // otherwise paste
                    else{
                        $scope.copyThisNode(src);
                        $scope.pasteThisNode(dest.ID);
                        // set the flag to indicate the source needs to be added
                        // back to the parent when the node drops
                        $scope.addNodeBack = true;
                    }
                }
                // clear the drag over value
                if ($scope.dragOverNode != undefined){
                    if ($scope.dragOverNode.copy != undefined){
                        $scope.dragOverNode.copy.selected = undefined;
                    }
                }
                $scope.dragOverNode = {'original': undefined};
            },

            dragStop: function(event) {
                if($scope.addNodeBack) {
                    var sourceobject = event.source.nodeScope.$modelValue;
                    var parent = event.source.nodeScope.$parentNodeScope.$modelValue;
                    parent.Subitem.push(sourceobject);
                    $scope.addNodeBack = false;
                }
            },
        };

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.collapsed) {
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + 'node/' + parentid + '/children/').success(function(data) {
                    selectedNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
            else {
                selectedNode.collapsed = false;
            }
        };

        // if node label clicks,
        $scope.selectNodeLabel = function(scope) {
            // reload the slickgrid
            $scope.handleReloadSlickgrid(scope.$modelValue.ID);
            // sharedService.reloadSlickgrid(scope.$modelValue.ID);
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

        $scope.loadOverheads = function(projectid) {
            $http.get(globalServerURL + 'project/' + projectid + '/overheads/')
            .success(function(data) {
                $scope.overheadList = data;
                console.log("Overhead list loaded");
            });
        };

        // load the overheads a component can use
        $scope.loadComponentOverheads = function(nodeid) {
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
        $scope.deleteOverhead = function(overheadid, index) {
            var req = {
                method: 'DELETE',
                url: globalServerURL + 'overhead/' + overheadid + '/'
            }
            $http(req).success(function() {
                $scope.overheadList.splice(index, 1);
                console.log("Overhead deleted");
            });
        }

        // add an overhead with the project id
        $scope.addOverhead = function(projectid) {
            if ($scope.newOverhead) {
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
        $scope.clearInput = function() {
            if ($scope.newOverhead) {
                $scope.addOverhead($scope.currentNode.ID);
            }
            $scope.newOverhead = undefined;
        }

        // transform the tag to a new resource-like object
        $scope.tagTransform = function (newTag) {
            var item = {
                Name: newTag,
                ID: undefined,
                Description: "",
                Rate: "0.00",
                Quantity: "0.00",
                Type: undefined
            };
            return item;
        };

        // search for the resources in the node's category that match the search term
        $scope.refreshResources = function(searchterm){
            if ($scope.currentNode){
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'project/' + $scope.currentNode.ID + '/resources/',
                    params: {'search': searchterm}
                };
                $http(req).success(function(response) {
                    $scope.resourceList = response;
                });
            }
        }

        $scope.resourceSelected = function(item){
            var $addComponent = $('#addComponent'),
                $description = $addComponent.find('#description');
            if (item.ID == undefined){
                $scope.addComponentForm.has_selection = false;
                $description.focus();
            }
            else{
                $scope.addComponentForm.has_selection = true;
                $addComponent.find('#inputQuantity').focus();
            }
        };

        // load the lists used in adding/editing a component
        $scope.loadComponentRelatedList = function(nodeid){
            $scope.loadComponentOverheads(nodeid);
        };

        // When the addNode button is clicked on the modal a new node
        // is added to the database
        $scope.addNode = function () {
            // check if adding is disabled, if not disable it and add the node
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                var currentid = $scope.currentNode.ID;
                // if the node is a component set the selected data to the form
                if ($scope.formData.NodeType == 'Component' || $scope.formData.NodeType == 'SimpleComponent'){
                    $scope.formData['OverheadList'] = $scope.componentOverheadList || [];
                    if ($scope.formData.selected.ID === undefined){
                        $scope.formData.Quantity = $scope.formData.selected.Quantity;
                        $scope.formData.NodeType = 'SimpleComponent'
                        $scope.formData.Rate = $scope.formData.selected.Rate
                        $scope.formData.Name = $scope.formData.selected.Name
                        $scope.formData.Description = $scope.formData.selected.Description
                        $scope.formData.ResourceType = $scope.formData.selected.ResourceType
                    }
                    else{
                        $scope.formData.ResourceID = $scope.formData.selected.ID;
                        $scope.formData.Quantity = $scope.formData.selected.Quantity;
                        $scope.formData.NodeType = 'Component'
                    }
                }
                $http({
                    method: 'POST',
                    url: globalServerURL + 'node/' + currentid + '/',
                    data: $scope.formData
                }).success(function () {
                    $scope.formData = {'NodeType':$scope.formData.NodeType};
                    $scope.handleReloadSlickgrid(currentid)
                    // sharedService.reloadSlickgrid(currentid);
                    $scope.loadNodeChildren(currentid);
                    // expand the node if this is its first child
                    if ($scope.currentNode.Subitem.length == 0) {
                        $scope.currentNode.collapsed = true;
                    }
                    console.log("Node added");
                });
            }
        };

        // Add a project to the tree and reload the projectlist
        $scope.addProject = function() {
            $scope.modalState = "Add"
            // check if adding is disabled, if not disable it and add the node
            if (!$scope.isDisabled) {
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

        // save changes made to the node's properties
        $scope.saveNodeEdits = function() {
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // if the node is a component set the selected data to the form
                if ($scope.formData.NodeType == 'Component' || $scope.formData.NodeType == 'SimpleComponent'){
                    $scope.formData.ResourceID = $scope.formData.selected.ID;
                    $scope.formData.Quantity = $scope.formData.selected.Quantity;
                    if ($scope.formData.ResourceID == undefined){
                        $scope.formData.NodeType == 'SimpleComponent'
                        $scope.formData.Rate = $scope.formData.selected.Rate
                        $scope.formData.Name = $scope.formData.selected.Name
                        $scope.formData.Description = $scope.formData.selected.Description
                        $scope.formData.ResourceType = $scope.formData.selected.ResourceType
                    }
                    else{
                        $scope.formData.NodeType == 'Component'
                        $scope.formData.Name = $scope.formData.selected.Name
                    }
                }
                var req = {
                    method: 'PUT',
                    url: globalServerURL + 'node/' + $scope.currentNode.ID + '/',
                    data: $scope.formData,
                }
                $http(req).success(function(response) {
                    console.log($scope.formData['NodeType'] + " edited")
                    // set the current node name to the name in the modal form
                    if ($scope.currentNode.Name != $scope.formData.Name) {
                        $scope.currentNode.Name = $scope.formData.Name;
                        // only sort if its not a project's resource category
                        var parent = $scope.currentNodeScope.$parentNodeScope || {'$modelValue':{'NodeType':'Project'}};
                        if (!($scope.currentNode.NodeType == 'ResourceCategory' && parent.$modelValue.NodeType == 'Project')){
                            $scope.currentNodeScope.$parentNodesScope.$modelValue.sort(function(a, b) {
                                var textA = a.Name.toUpperCase();
                                var textB = b.Name.toUpperCase();
                                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                            });
                        }
                    }
                    $scope.currentNode.Description = $scope.formData.Description
                    $scope.handleReloadSlickgrid($scope.formData.ID);
                });
            }
        };

        // Setting the type of the node to be added
        // refresh it if the type is the same
        // $timeout is used so that the scope is refreshed and the directive
        // reloaded even if the node type is the same
        // reset the formdata to the type
        $scope.changeAddingType = function(nodetype) {
            $scope.calculatorHidden = true;
            if ($scope.addingNodeType == nodetype) {
                $scope.addingNodeType = '';
                $timeout(function() {
                    $scope.changeAddingType(nodetype);
                });
            }
            else{
                $scope.addingNodeType = nodetype;
            }
            $scope.isDisabled = false;
            $scope.modalState = "Add"
            $scope.formData = {'NodeType': nodetype};
            $scope['add' + nodetype + 'Form'].$setPristine();
        }

        // fetch the properties of the node being edited
        // to populate the respective edit form
        $scope.editNode = function(nodeid) {
            $scope.calculatorHidden = true;
            $scope.modalState = "Edit"
            $scope.isDisabled = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'node/' + nodeid + '/'
            }
            $http(req).success(function(response) {
                var nodetype = response.NodeType;
                $scope.formData.ID = nodeid;
                // special case for component types
                if (nodetype == 'Component') {
                    // populate the selection
                    $scope.formData.selected = response;
                    $scope.formData.selected.ID = response.ResourceID
                    $scope.formData.NodeType = nodetype;
                    // update overheadlist
                    $http.get(globalServerURL + 'component/' + nodeid + '/overheads/')
                    .success(function(data) {
                        $scope.componentOverheadList = data;
                        var overheadlist = response['OverheadList'];
                        var arrayLength = $scope.componentOverheadList.length;
                        for (var i = 0; i < arrayLength; i++) {
                            if (overheadlist.indexOf($scope.componentOverheadList[i].ID) != -1) {
                                $scope.componentOverheadList[i].selected = true;
                            }
                        }
                        $scope.formData['OverheadList'] = $scope.componentOverheadList;
                    });
                }
                else if(nodetype == 'SimpleComponent'){
                    // populate the selection
                    $scope.formData.selected = response;
                    $scope.formData.NodeType = nodetype;
                    nodetype = 'Component';
                }
                else{
                    $scope.formData = response;
                }
                $scope['add' + nodetype + 'Form'].$setPristine();
            });
        };

        // Deleting a node. It receives the id of the node
        // The id is sent to the server to be deleted and the node
        // removed from the treemodel
        $scope.deleteThisNode = function ( nodeid ) {
            $scope.statusMessage("Deleting " + $scope.currentNode.Name, 0, 'alert-info');
            $http({
                method: 'DELETE',
                url:globalServerURL + 'node/' + nodeid + '/'
            }).success(function (response) {
                $scope.statusMessage("Deleted " + $scope.currentNode.Name, 1000, 'alert-info');
                if (response['parentid'] == 0) {
                    $scope.closeProject(nodeid);
                }
                else {
                    $scope.nodeDeleted();
                }
            });
        };

        // Function to copy a node
        $scope.copyThisNode = function(node) {
            $scope.statusMessage(node.Name + " copied.", 1000, 'alert-info');
            $scope.copiedNode = node;
            $scope.cut = false;
            console.log("Node id copied: " + node.ID);
        }

        // Function to cut a node
        // the node is removed from the tree (but not deleted)
        $scope.cutThisNode = function(node) {
            $scope.statusMessage(node.Name + " cut.", 1000, 'alert-info');
            $scope.copiedNode = node;
            console.log("Node id cut: " + node.ID);
            $scope.cut = true;
            $scope.nodeDeleted();
        }

        // handle pasting nodes
        $scope.pasteAction = function(nodeid, selectionlist) {
            $http({
                method: 'POST',
                url: globalServerURL + 'node/' + nodeid + '/paste/',
                data:{'ID': $scope.copiedNode.ID,
                        'cut': $scope.cut,
                        'duplicates': selectionlist}
            }).success(function (response) {
                $scope.statusMessage($scope.copiedNode.Name + " pasted.", 1000, 'alert-info');
                console.log('Success: Node pasted');
                // if a project was pasted into the root
                if (nodeid == 0) {
                    var newprojectid = response.newId;
                    // get the new project
                    $http.get(globalServerURL + 'node/' + newprojectid + '/')
                    .success(function(data) {
                        // and add it to the open projects
                        $scope.projectAdded(data);
                    });
                }
                else {
                    $scope.handleReloadSlickgrid(nodeid);
                    $scope.loadNodeChildren(nodeid);
                }
                // expand the node if this is its first child
                if ($scope.currentNode.Subitem.length == 0) {
                    $scope.currentNode.collapsed = true;
                }
            }).error(function() {
                console.log("Server error");
                $scope.statusMessage("Server error.", 1000, 'alert-warning');
            });
        };

        // loop over a list of duplicate resources and get the user action for each
        $scope.handleDuplicateResourceActions = function(nodeid, duplicatelist){
            var doAll = undefined;
            var overwrite = false;
            var keys = Object.keys(duplicatelist);

            var openModal = function() {
                var modalInstance = $modal.open({
                    templateUrl: 'duplicateConfirmationModal.html',
                    controller: duplicateModalController,
                    resolve: {
                        selections: function () {
                            return $scope.selections;
                        }
                    }
                });

                return modalInstance.result.then(function (selections) {
                    overwrite = selections.overwrite;
                    if (selections.doAll) {
                        doAll = selections.doAll;
                    }
                });
            };

            (function checkItems() {
                // get the first key and remove it from array
                var key = keys.shift();
                var duplicateResource = duplicatelist[key];
                if (doAll == undefined) {
                    // open the modal
                    $scope.selections = {'overwrite': overwrite,
                                        'doAll': doAll,
                                        'resourceName': duplicateResource.Name};
                    // continue when response from modal is returned
                    openModal().finally(function() {
                        selectionlist[duplicateResource.Code] = overwrite;
                        if (keys.length) {
                            checkItems();
                        }
                        else{
                            $scope.pasteAction(nodeid, selectionlist);
                        }
                    });
                }
                else {
                    // skip has been selected
                    // set the overwrite to the skip value
                    selectionlist[duplicateResource.Code] = doAll;
                    if (keys.length) {
                        checkItems();
                    }
                    else {
                        $scope.pasteAction(nodeid, selectionlist);
                    }
                }
            })();
        };


        // function to paste copied node into another node
        // the id is sent to the server and the node pasted there
        // the user can't paste into the same node
        $scope.pasteThisNode = function(nodeid) {
            var cnode = $scope.copiedNode;
            var duplicatelist = undefined;
            var flag = false;
            if (cnode) {
                flag = true;
            }
            if (flag && (cnode.ID == nodeid)) {
                flag = false;
                console.log("You can't paste a node into itself");
                $scope.statusMessage("You can't paste a node into itself", 1000, 'alert-warning');
            }
            if ($scope.cut) {
                $scope.statusMessage("Busy moving...", 0, 'alert-info');
            }
            else {
                $scope.statusMessage("Busy copying...", 0, 'alert-info');
            }
            if (flag && ((cnode.NodeType == 'ResourceCategory') && ($scope.currentNode.NodeType == 'ResourceCategory'))) {
                flag = false;
                if (cnode.ParentID == nodeid) {
                    console.log("You can't paste a Resource Category into the same list");
                    $scope.statusMessage("You can't paste a Resource Category into the same list", 1000, 'alert-warning');
                }
                else {
                    // get the resources in the copied category
                    $http.get(globalServerURL + 'resourcecategory/' + cnode.ID + '/resources/')
                    .success(function (response) {
                        var copiedresources = response;
                        // get the resources in the destination category
                        $http.get(globalServerURL + 'resourcecategory/' + nodeid + '/allresources/')
                        .success(function (response) {
                            duplicatelist = [];
                            selectionlist = {};
                            var destinationresources = response;
                            // get a list of the duplicate resources
                            for (var d in destinationresources) {
                                for (var c in copiedresources) {
                                    if (copiedresources[c].Code == destinationresources[d].Code)
                                        duplicatelist.push(copiedresources[c]);
                                }
                            }
                            if (duplicatelist.length > 0) {
                                $scope.handleDuplicateResourceActions(nodeid, duplicatelist);
                            }
                            else {
                                $scope.pasteAction(nodeid, {});
                            }
                        });
                    });
                }
            }
            if (flag) {
                $scope.pasteAction(nodeid, {});
            }
        };

        // when a node is deleted clear the slickgrid and remove it from the tree
        $scope.nodeDeleted = function() {
            $scope.currentNode = undefined;
            $scope.currentNodeScope.remove();
            $scope.handleClearSlickgrid();
        }

        // Load the children and add to the tree
        $scope.loadNodeChildren = function(parentid) {
            // if the parent id is 0 reload the projectslist
            if (parentid == 0) {
                $scope.preloadProjects();
            }
            else if ($scope.currentNode) {
                $http.get(globalServerURL + 'node/' + parentid + '/children/')
                .success(function(data) {
                    $scope.currentNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
        }

        $scope.budgetgroupList = [];

        $scope.loadComponentTypes = function() {
            var ctypes = [
                { Name:"Labour", selected:true },
                { Name:"Material", selected:true },
                { Name:"Subcontractor", selected:true }];
            $scope.componentTypeList = ctypes
            $scope.printSelectedBudgetGroups = false;
            console.log("Component Type list loaded");
        };

        $scope.loadSuppliers = function() {
            // load the suppliers list
            $scope.suppliersList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL + 'suppliers'
            }
            $http(req).success(function(data) {
                $scope.suppliersList = data;
            });
            console.log("Suppliers list loaded");
            $scope.filterBySupplier = false;
        };

        $scope.copySelectedRecords = function(node){
            // put the id's of the selected records in an array
            if ($scope.rowsSelected){
                var selectedRowIds = $scope.getSelectedNodes();
                $scope.toggleCopiedRecords(selectedRowIds, false);
                console.log("Records copied");
                $scope.statusMessage("Records copied.", 1000, 'alert-info');
            }
        };

        $scope.cutSelectedRecords = function(node){
            // put the id's of the selected records in an array
            if ($scope.rowsSelected){
                var selectedRowIds = $scope.getSelectedNodes();
                $scope.toggleCopiedRecords(selectedRowIds, true);
                // remove rows from slickgrid
                $scope.cutSelectedNodes(selectedRowIds);
                // get node in scope and remove
                if (selectedRowIds[0] == node.ID){
                    $scope.nodeDeleted()
                }
                else{
                    for (var i in selectedRowIds){
                        var result = $.grep($scope.currentNode.Subitem, function(e) {
                            return e.ID == selectedRowIds[i];
                        });
                        var index = $scope.currentNode.Subitem.indexOf(result[0]);
                        if (index>-1) {
                            $scope.currentNode.Subitem.splice(index, 1);
                        }
                    }
                }
                console.log("Records cut");
                $scope.statusMessage("Records cut.", 1000, 'alert-info');
            }
        };

        $scope.pasteSelectedRecords = function(nodeid){
            // paste each node
            for (var i in $scope.copiedRecords){
                $http({
                    method: 'POST',
                    url: globalServerURL + 'node/' + nodeid + '/paste/',
                    data:{'ID': $scope.copiedRecords[i],
                            'cut': $scope.cut}
                }).success(function () {
                    console.log('Success: Node pasted');
                    $scope.statusMessage("Node pasted.", 1000, 'alert-info');
                    // on the last loop reload the slickgrid and node
                    if (i == $scope.copiedRecords.length-1){
                        $scope.loadNodeChildren(nodeid);
                        $scope.handleReloadSlickgrid(nodeid);
                        $scope.toggleRowsSelected(false);
                    }
                }).error(function() {
                    console.log("Server error");
                });
            }
        };

        $scope.deleteSelectedRecords = function(nodeid){
            // all the currently selected records in the slickgrid are
            // deleted from the database and the grid is reloaded
            if ($scope.rowsSelected){
                var selectedRowIds = $scope.getSelectedNodes()
                for (var i in selectedRowIds){
                    $http({
                        method: 'DELETE',
                        url:globalServerURL + 'node/' + selectedRowIds[i] + '/'
                    }).success(function (response) {
                        console.log(selectedRowIds[i] + " deleted");
                        // on the last loop reload the slickgrid and node
                        if (i == selectedRowIds.length-1){
                            // if the deleted id equals the selected id
                            // simply remove it from the tree
                            if (nodeid == selectedRowIds[i]){
                                $scope.nodeDeleted();
                            }
                            else{
                                $scope.loadNodeChildren(nodeid);
                                $scope.handleReloadSlickgrid(nodeid);
                            }
                            $scope.toggleRowsSelected(false);
                        }
                    });
                }
            }
        };


        $scope.toggleRowsSelected = function(rowsselected){
            $timeout(function() {
                $scope.rowsSelected = rowsselected;
            });
        }

        $scope.toggleCopiedRecords = function(copiedrecords, cut){
            $scope.copiedRecords = copiedrecords;
            $scope.cut = cut;
        }

        $scope.openNodeList = [];
        // load the node that has been selected into the tree for pdf printing
        $scope.loadNodeForPrinting = function (id) {
            $http.get(globalServerURL + 'node/' + id + '/')
            .success(function(data) {
                $scope.openNodeList = [data];
                $scope.selectReportNodeHead(data);
            });
        };

        $scope.getReport = function (report, nodeid) {
            var target = document.getElementsByClassName('pdf_download');
            var spinner = new Spinner().spin(target[0]);
            if ( report == 'projectbudget' ) {
                $scope.formData['ComponentTypeList'] = $scope.componentTypeList || [];
                $scope.formData['PrintSelectedBudgerGroups'] = $scope.printSelectedBudgetGroups;
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList || [];
                var url = globalServerURL + 'project_budget_report/' + nodeid + '/'
            }
            else if ( report == 'costcomparison' ) {
                $scope.formData['PrintSelectedBudgerGroups'] = $scope.printSelectedBudgetGroups;
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList || [];
                var url = globalServerURL + 'cost_comparison_report/' + nodeid + '/'
            }
            else if ( report == 'resourcelist' ) {
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                var url = globalServerURL + 'resource_list_report/' + nodeid + '/'
            }
            $http({
                method: 'POST',
                url: url,
                data: $scope.formData},
                {responseType: 'arraybuffer'
            }).success(function (response, status, headers, config) {
                spinner.stop(); // stop the spinner - ajax call complete
                $scope.budgetgroupList = [] // clear selected budget group list
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
                console.log("Report pdf download error")
            });
        };

        $scope.toggleBudgetgroup = function(bgroup) {
            // set the budgetgroup selected or unselected
            var flag = (bgroup.selected === true) ? undefined : true;
            bgroup.selected = flag;
            // find the budgetgroup in the budgetgroup list
            var i = $scope.budgetgroupList.map(function(e)
                { return e.id; }).indexOf(bgroup.ID);
            // if the budgetgroup is already in the list
            // and the node is deselected
            if ((i>-1) &(!flag)) {
                // remove it
                $scope.budgetgroupList.splice(i, 1);
            }
            // if the budget group is not in the list
            // and the node is being selected
            else if ((i==-1) & flag) {
                // add the budgetgroup
                $scope.budgetgroupList.push(bgroup);
            }
        }

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectReportNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.collapsed) {
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + "reports/tree/" + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
            else{
                selectedNode.collapsed = false;
            }
        };

        $scope.toggleCalculator = function() {
            $scope.calculatorHidden = !$scope.calculatorHidden;
        };

}]);

allControllers.controller('usersController', ['$scope', '$http', '$modal', 'globalServerURL',
    function($scope, $http, $modal, globalServerURL) {

        toggleMenu('setup');
        $scope.users = [];

        // populate user list
        ($scope.repopulate = function() {
            $http({
                method: 'GET',
                url: globalServerURL + 'users',
            }).then(
                function(response) {
                    $scope.users = response.data;
                },
                function() {
                    alert('Error while fetching user list');
                }
            );
        })();

        $scope.selectedUser = null;
        $scope.showActionsFor = function(obj) {
            $scope.selectedUser = obj;
            for (var i in $scope.users) {
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
        $scope.addingState = function () {
            $scope.modalState = "Add";
            $scope.newuser.password = '';
            $scope.newuser.roles.forEach(function(v) {
                v.selected = false;
            });
            if ($scope.selectedUser) {
                $scope.selectedUser.selected = false;
                $scope.selectedUser = null;
            }
            modalInstance = $modal.open({
                templateUrl: 'addUser',
                scope: $scope
            });
        };

        $scope.editingState = function () {
            $scope.modalState = "Edit";
            $scope.newuser.password = '';
            $http({
                method: 'GET',
                url: globalServerURL + 'users/' + $scope.selectedUser.username
            }).then(
                function(response) {
                    var i;
                    $scope.data = response.data;
                    for (var i in $scope.newuser.roles) {
                        var role = $scope.newuser.roles[i];
                        role.selected = (response.data.roles.indexOf(role.title) > -1);
                    }
                    modalInstance = $modal.open({
                        templateUrl: 'addUser',
                        scope: $scope
                    });
                },
                function() {
                    alert('Error while fetching user information');
                }
            );
        };

        $scope.saveUser = function() {
            var newroles = $scope.newuser.roles.map(function(v) {
                if (v.selected) {
                    return v.title;
                } else {
                    return null;
                }
            }).filter(function(v) {
                return v != null;
            });
            if ($scope.selectedUser) {
                // Update the password (and later also the roles)
                $http({
                    method: "POST",
                    url: globalServerURL + 'users/' + $scope.selectedUser.username,
                    data: {
                        password: $scope.newuser.password,
                        roles: newroles
                    }
                }).then(
                    function(response) {
                        $scope.selectedUser.roles = response.data.roles;
                        modalInstance && modalInstance.dismiss('ok');
                        modalInstance = null;
                    },
                    function() {
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
                    function() {
                        modalInstance && modalInstance.dismiss('ok');
                        modalInstance = null;
                        $scope.repopulate();
                    },
                    function() {
                        alert('Error while saving user details');
                    }
                );
            }
        };

        $scope.deleteUser = function(user) {
            if (confirm('Are you sure you want to delete ' + user.username + '?')) {
                $http({
                    method: "DELETE",
                    url: globalServerURL + 'users/' + user.username
                }).then(
                    function() {
                        $scope.repopulate();
                    },
                    function() {
                        alert('Error deleting user');
                    }
                );
            }
        };

}]);

allControllers.controller('loginController', ['$scope', '$location', 'SessionService',
    function($scope, $location, SessionService) {
        $scope.credentials = {
            username: '',
            password: ''
        }

        $scope.login = function(e) {
            e.preventDefault();
            SessionService.login($scope.credentials.username, $scope.credentials.password).then(
                function() {
                    $location.path('/projects');
                },
                function() {
                    alert('Login failed');
                });
        }
}]);

allControllers.controller('logoutController', ['$location', 'SessionService',
    function($location, SessionService) {
        SessionService.logout();
        $location.path('/login');
}]);

allControllers.controller('navController', ['$scope', 'SessionService',
    function($scope, SessionService) {
        // Hide and show the toolbar depending on whether you're logged in.
        $scope.logged_in = SessionService.authenticated();
        $scope.username = SessionService.username();
        $scope.$on('session:changed', function(evt, username) {
            $scope.logged_in = SessionService.authenticated();
            $scope.username = SessionService.username();
        });
}]);

// controller for the Order data from the server
allControllers.controller('ordersController', ['$scope', '$http', 'globalServerURL', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, sharedService, $timeout) {

        toggleMenu('orders');

        $scope.isDisabled = false;
        $scope.isCollapsed = true;
        $scope.jsonorders = [];
        $scope.componentsList = [];
        $scope.invoiceList = [];
        // Pagination variables and functions
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.orderListLength = $scope.maxPageSize + 1;

        // loading the project, client and supplier list
        $scope.clearFilters = function() {
            $scope.filters = [];
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });

            $http.get(globalServerURL + 'suppliers')
            .success(function(data) {
                $scope.suppliersList = data;
            });

            $http.get(globalServerURL + 'clients')
            .success(function(data) {
                $scope.clientsList = data;
            });

            // get the length of the list of all the orders
            $http.get(globalServerURL + 'orders/length').success(function(data) {
                $scope.orderListLength = data['length'];
            });
        }
        $scope.projectsList = [];
        $scope.suppliersList = [];
        $scope.clientsList = [];
        $scope.clearFilters();

        $scope.loadOrderSection = function() {
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'orders',
                params: {'start':start,
                        'end': end,
                        'Project': $scope.filters.Project,
                        'Client': $scope.filters.Client,
                        'Supplier': $scope.filters.Supplier,
                        'OrderNumber': $scope.filters.OrderNumber}
            };
            $http(req).success(function(response) {
                var length = response.pop();
                $scope.jsonorders = response;
                if (length) {
                    $scope.orderListLength = length;
                }
                console.log("Orders loaded");
            });
        }
        $scope.loadOrderSection();

        // filter the other filter options by project
        $scope.filterBy = function(selection) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'orders/filter',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                if (selection == 'project') {
                    if ($scope.filters.Project == null) {
                        $scope.projectsList = response['projects'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'client') {
                    if ($scope.filters.Client == null) {
                        $scope.clientsList = response['clients'];
                    }
                    $scope.projectsList = response['projects'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'supplier') {
                    if ($scope.filters.Supplier == null) {
                        $scope.suppliersList = response['suppliers'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.projectsList = response['projects'];
                }
                else {
                    $scope.projectsList = response['projects'];
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
                }
            })
        };

        // Adding or editing an order
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // set the list of checked components
                $scope.formData['ComponentsList'] = $scope.componentsList;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the order in the list
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
        $scope.handleNew = function(neworder) {
            // the new order is added to the list
            var high = $scope.jsonorders[0].ID + 2;
            var low = $scope.jsonorders[$scope.jsonorders.length - 1].ID + 2;
            // only need to add it if it's id falls in the current section
            if (neworder.ID > low && neworder.ID < high) {
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
        $scope.handleEdited = function(editedorder) {
            // search for the order and edit in the list
            var result = $.grep($scope.jsonorders, function(e) {
                return e.ID == editedorder.ID;
            });
            var i = $scope.jsonorders.indexOf(result[0]);
            if (i>-1) {
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
        $scope.addingState = function () {
            $scope.formData.TaxRate = undefined;
            $scope.formData = {'NodeType': 'order',
                                'TaxRate': false};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.componentsList = [];
            if ($scope.selectedOrder) {
                $('#order-'+$scope.selectedOrder.ID).removeClass('active');
                $scope.selectedOrder = undefined;
            }
            $scope.saveOrderModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.formData.TaxRate = undefined;
            $scope.formData.TaxRate = false;
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'order/' + $scope.selectedOrder.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.loadProject()
                $scope.componentsList = $scope.formData['ComponentsList'];
                $scope.formData['Date'] = new Date($scope.formData['Date']);
                $scope.formData['NodeType'] = 'order';
            });
            $scope.saveOrderModalForm.$setPristine();
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
                if (i>-1) {
                    $scope.jsonorders.splice(i, 1);
                    console.log("Deleted order");
                }
            });
        };

        $scope.toggleComponents = function(comp) {
            // set the component selected or unselected
            var flag = (comp.selected === true) ? undefined : true;
            comp.selected = flag;
            // find the component in the component list
            var i = $scope.componentsList.map(function(e)
                { return e.id; }).indexOf(comp.ID);
            // if the component is already in the list
            // and the node is deselected
            if ((i>-1) &(!flag)) {
                // remove it
                $scope.componentsList.splice(i, 1);
            }
            // if the component is not in the list
            // and the node is being selected
            else if ((i==-1) & flag) {
                // find the index to insert the node into
                var index = $scope.locationOf(comp);
                console.log("index: " +index);
                // add the component
                if (index == -1){
                    $scope.componentsList.push(comp);
                }
                else{
                    $scope.componentsList.splice(index, 0, comp);
                }
            }
        }

        // remove a component from the component list
        $scope.removeComponent = function(node) {
            var deleteid = node.ID;
            var result = $.grep($scope.componentsList, function(e) {
                return e.id == deleteid;
            });
            var i = $scope.componentsList.indexOf(result[0]);
            if (i>-1) {
                $scope.componentsList.splice(i, 1);
                // loop through all the open nodes and if the checked component
                // is in it uncheck the component
                for (var i = 0; i<$scope.openProjectsList.length; i++) {
                    var subitem = $scope.openProjectsList[i].Subitem || [];
                    if (subitem.length > 0) {
                        $scope.uncheckComponent(deleteid, subitem);
                    }
                }

            }
        };

        $scope.uncheckComponent = function(componentId, subitem) {
            for (var i = 0; i<subitem.length; i++) {
                if (subitem[i].ID == componentId) {
                    subitem[i].selected = false;
                    break;
                }
                else{
                    var subsubitem = subitem[i].Subitem || [];
                    if (subsubitem.length > 0) {
                        $scope.uncheckComponent(componentId, subsubitem);
                    }
                }
            }
        }

        $scope.toggleNode = function(node) {
            // when a node that is not a component is selected
            // flag the node, set the selection on all its children
            // load the components in the node and toggle them in the
            // component list
            var flag = (node.selected === true) ? undefined : true;
            node.selected = flag;
            var nodeid = node.ID;
            var subitems = node['Subitem'];
            // select the subitems
            for (var i = 0; i<subitems.length; i++) {
                subitems[i].selected = flag;
                var subsubitem = subitems[i]['Subitem'] || [];
                if (subsubitem.length > 0) {
                    $scope.toggleSubitems(subsubitem, flag);
                }
            }
            // add the components to the list
            $http.get(globalServerURL + 'node/' + nodeid + '/components/')
            .success(function(response) {
                // if the component list is empty just add all the nodes in order
                if ($scope.componentsList.length == 0){
                    $scope.componentsList =response;
                }
                else{
                    for (var v = 0; v<response.length; v++) {
                        var comp = response[v];
                        // find the component in the component list
                        var i = $scope.componentsList.map(function(e)
                            { return e.id; }).indexOf(comp.ID);
                        // if the component is already in the list
                        // and the node is deselected
                        if ((i>-1) &(!flag)) {
                            // remove it
                            $scope.componentsList.splice(i, 1);
                        }
                        // if the component is not in the list
                        // and the node is being selected
                        else if ((i==-1) & flag) {
                            // add the component
                            var index = $scope.locationOf(comp);
                            // add the component
                            if (index == -1){
                                $scope.componentsList.push(comp);
                            }
                            else{
                                $scope.componentsList.splice(index, 0, comp);
                            }
                        }
                    }
                }
            });
        };

        $scope.toggleSubitems = function(subitem, selected) {
            // recursively select/unselect all the children of a node
            for (var i = 0; i<subitem.length; i++) {
                subitem[i].selected = selected;
                var subsubitem = subitem[i]['Subitem'] || [];
                if (subsubitem.length > 0) {
                    $scope.toggleSubitems(subsubitem, selected);
                }
            }
        };

        $scope.toggleComponentsGrid = function() {
            $scope.isCollapsed = !$scope.isCollapsed;
            if ($scope.isCollapsed) {
                $scope.handleReloadOrderSlickgrid();
            }
        };

        $scope.openProjectsList = [];
        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $scope.formData['ProjectID']
            $http.get(globalServerURL + 'node/' + id + '/')
            .success(function(data) {
                $scope.openProjectsList = [data];
                $scope.selectNodeHead(data);
            });
        };

        $scope.locationOf = function(element, start, end) {
            // return the location the object should be inserted in a sorted array
            if ($scope.componentsList.length === 0){
                return -1;
            }

            start = start || 0;
            end = end || $scope.componentsList.length;
            var pivot = (start + end) >> 1;
            var c = $scope.nodeCompare(element, $scope.componentsList[pivot]);
            if (end - start <= 1) {
                return c == -1 ? pivot: pivot + 1;

            }
            switch (c) {
                case -1: return $scope.locationOf(element, start, pivot);
                case 0: return pivot;
                case 1: return $scope.locationOf(element, pivot, end);
            };
        };

        $scope.nodeCompare = function (a, b) {
            if (a.name.toUpperCase() < b.name.toUpperCase()) return -1;
            if (a.name.toUpperCase() > b.name.toUpperCase()) return 1;
            return 0;
        };

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.collapsed) {
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + "orders/tree/" + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    // check if any of the components are in the components list
                    // and select then
                    for (var i = 0; i<selectedNode.Subitem.length; i++) {
                        if (selectedNode.Subitem[i].NodeType == 'Component') {
                            for (var b = 0; b<$scope.componentsList.length; b++) {
                                if ($scope.componentsList[b].ID == selectedNode.Subitem[i].ID) {
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

        $scope.getReport = function (report) {
            if ( report == 'order' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'order_report/' + $scope.selectedOrder.ID + '/'},
                    {responseType: 'arraybuffer'
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
                    console.log("Order pdf download error")
                });
            }
        };

    }
]);

// controller for the Invoice data from the server
allControllers.controller('invoicesController', ['$scope', '$http', 'globalServerURL', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, sharedService, $timeout) {

        toggleMenu('invoices');

        $scope.isDisabled = false;
        $scope.jsoninvoices = [];
        $scope.invoiceList = [];

        // loading the project, client and supplier list
        $scope.clearFilters = function() {
            $scope.filters = [];
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });

            $http.get(globalServerURL + 'suppliers')
            .success(function(data) {
                $scope.suppliersList = data;
            });

            $http.get(globalServerURL + 'clients')
            .success(function(data) {
                $scope.clientsList = data;
            });
        }
        $scope.projectsList = [];
        $scope.suppliersList = [];
        $scope.clientsList = [];
        $scope.clearFilters();

        $scope.loadInvoiceSection = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices',
                params: {'Project': $scope.filters.Project,
                        'Client': $scope.filters.Client,
                        'Supplier': $scope.filters.Supplier,
                        'OrderNumber': $scope.filters.OrderNumber,
                        'InvoiceNumber': $scope.filters.InvoiceNumber,
                        'PaymentDate': $scope.filters.PaymentDate,
                        'Status': $scope.filters.Status}
            };
            $http(req).success(function(response) {
                $scope.jsoninvoices = response;
                console.log("Invoices loaded");
            });
        }
        $scope.loadInvoiceSection();

        // filter the other filter options by what is selected
        $scope.filterBy = function(selection) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices/filter',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                if (selection == 'project') {
                    if ($scope.filters.Project == null) {
                        $scope.projectsList = response['projects'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'client') {
                    if ($scope.filters.Client == null) {
                        $scope.clientsList = response['clients'];
                    }
                    $scope.projectsList = response['projects'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'supplier') {
                    if ($scope.filters.Supplier == null) {
                        $scope.suppliersList = response['suppliers'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.projectsList = response['projects'];
                }
                else {
                    $scope.projectsList = response['projects'];
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
                }
            })
        };

        // Adding or editing an invoice
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'invoice' + '/' + $scope.formData.id + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the invoice in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': 'invoice'};
                    });
                }
                else{
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'invoice/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new invoice to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': 'invoice'};
                    });
                }
            }
        };

        // add a new invoice to the list and sort
        $scope.handleNew = function(newinvoice) {
            $scope.jsoninvoices.push(newinvoice);
            // sort by invoice id
            $scope.jsoninvoices.sort(function(a, b) {
                var idA = a.id;
                var idB = b.id;
                return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
            });
            console.log ("Invoice added");
        }

        // handle editing an invoice
        $scope.handleEdited = function(editedinvoice) {
            // search for the invoice and edit in the list
            var result = $.grep($scope.jsoninvoices, function(e) {
                return e.id == editedinvoice.id;
            });
            var i = $scope.jsoninvoices.indexOf(result[0]);
            if (i>-1) {
                $scope.jsoninvoices[i] = editedinvoice;
            }
            console.log ("Invoice edited");
        };

        // Set the selected invoice and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedInvoice = obj;
            $('#invoice-'+obj.id).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'invoice',
                                'vat': '0.00'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.calculatedAmounts = [{'name': 'Subtotal', 'amount': ''},
                                        {'name': 'VAT', 'amount': ''},
                                        {'name': 'Total', 'amount': ''},
                                        {'name': 'Order total', 'amount': ''}];
            if ($scope.selectedInvoice) {
                $('#invoice-'+$scope.selectedInvoice.id).removeClass('active');
                $scope.selectedInvoice = undefined;
            }
            $scope.saveInvoiceModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'invoice/' + $scope.selectedInvoice.id + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', true);
                $scope.formData.invoicedate = new Date($scope.formData.invoicedate);
                $scope.formData.paymentdate = new Date($scope.formData.paymentdate);
                $scope.formData['NodeType'] = 'invoice';
                $scope.calculatedAmounts = [{'name': 'Subtotal', 'amount': response.amount},
                                        {'name': 'VAT', 'amount': response.vat},
                                        {'name': 'Total', 'amount': response.total},
                                        {'name': 'Order total', 'amount': response.ordertotal}];
            });
            $scope.saveInvoiceModalForm.$setPristine();
        }

        // Delete an invoice and remove from the list
        $scope.deleteInvoice = function() {
            var deleteid = $scope.selectedInvoice.id;
            $scope.selectedInvoice = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'invoice' + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsoninvoices, function(e) {
                    return e.id == deleteid;
                });
                var i = $scope.jsoninvoices.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsoninvoices.splice(i, 1);
                    console.log("Deleted invoice");
                }
            });
        };

        $scope.checkOrderNumber = function(){
            // check if the order exists and set the form valid or invalid
            $http.get(globalServerURL + 'order/' + $scope.formData.orderid + '/')
            .success(function(response){
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', true);
                $scope.calculatedAmounts[3].amount = response.Total
            })
            .error(function(response){
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', false);
            });
        };

        $scope.updateAmounts = function(){
            var subtotal = parseFloat($scope.formData.amount);
            var vatcost = parseFloat($scope.formData.vat);
            var total = subtotal + vatcost;

            var parts = subtotal.toString().split(".");
            if (parts.length > 1){
                parts[1] = parts[1].slice(0,2);
                subtotal = parts.join('.');
            }
            else{
                subtotal = subtotal.toString() + '.00'
            }

            parts = vatcost.toString().split(".");
            if (parts.length > 1){
                parts[1] = parts[1].slice(0,2);
                vatcost = parts.join('.');
            }
            else{
                vatcost = vatcost.toString() + '.00'
            }

            parts = total.toString().split(".");
            if (parts.length > 1){
                parts[1] = parts[1].slice(0,2);
                total = parts.join('.');
            }
            else{
                total = total.toString() + '.00'
            }

            $scope.calculatedAmounts[0].amount = subtotal;
            $scope.calculatedAmounts[1].amount = vatcost;
            $scope.calculatedAmounts[2].amount = total;
        }

        $scope.getReport = function (report) {
            if ( report == 'invoice' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'invoice_report/' + $scope.selectedInvoice.id + '/'},
                    {responseType: 'arraybuffer'})
                .success(function (response, status, headers, config) {
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
                    console.log("Invoice pdf download error")
                });
            }
        };

    }
]);

// controller for the Valuation data from the server
allControllers.controller('valuationsController', ['$scope', '$http', 'globalServerURL', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, sharedService, $timeout) {

        toggleMenu('valuations');
        $scope.dateTimeNow = function() {
            $scope.date = new Date();
        };
        $scope.dateTimeNow();
        $scope.isDisabled = false;
        $scope.isCollapsed = true;
        $scope.jsonvaluations = [];
        $scope.budgetgroupList = [];
        $scope.modalForm = [];
        // Pagination variables and functions
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.valuationListLength = $scope.maxPageSize + 1;

        // get the length of the list of all the valuations
        $http.get(globalServerURL + 'valuations/length').success(function(data) {
            $scope.valuationListLength = data['length'];
        });

        $http.get(globalServerURL + 'projects/')
        .success(function(data) {
            $scope.projectsList = data;
        });

        $scope.loadValuationSection = function() {
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'valuations',
                params: {'start': start,
                        'end': end}
            };
            $http(req).success(function(response) {
                var length = response.pop();
                $scope.jsonvaluations = response;
                if (length) {
                    $scope.valuationListLength = length;
                }
                console.log("Valuations loaded");
            });
        }
        $scope.loadValuationSection();

        // Adding or editing a valuation
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // set the list of checked budgetgroups
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList;
                // convert the date to json format
                $scope.formData['Date'] = $scope.date.toJSON();
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the valuation in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + $scope.formData['NodeType'] + '/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new valuation to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new valuation to the list and sort
        $scope.handleNew = function(newvaluation) {
            // the new valuation is added to the list
            if ($scope.jsonvaluations.length > 1) {
                var high = $scope.jsonvaluations[0].ID + 2;
                var low = $scope.jsonvaluations[$scope.jsonvaluations.length - 1].ID + 2;
                // only need to add it if it's id falls in the current section
                if (newvaluation.ID > low && newvaluation.ID < high) {
                    $scope.jsonvaluations.push(newvaluation);
                    // sort by valuation id
                    $scope.jsonvaluations.sort(function(a, b) {
                        var idA = a.ID;
                        var idB = b.ID;
                        return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
                    });
                }
            }
            else {
                $scope.jsonvaluations.push(newvaluation);
            }
            console.log ("Valuation added");
        }

        // handle editing a valuation
        $scope.handleEdited = function(editedvaluation) {
            // search for the valuation and edit in the list
            var result = $.grep($scope.jsonvaluations, function(e) {
                return e.ID == editedvaluation.ID;
            });
            var i = $scope.jsonvaluations.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonvaluations[i] = editedvaluation;
            }
            console.log ("Valuation edited");
        };

        // Set the selected valuation and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedValuation = obj;
            $('#valuation-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'valuation'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.dateTimeNow();
            $scope.formData['Date'] = $scope.date;
            $scope.budgetgroupList = [];
            if ($scope.selectedValuation) {
                $('#valuation-'+$scope.selectedValuation.ID).removeClass('active');
                $scope.selectedValuation = undefined;
            }
            $scope.saveValuationModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'valuation/' + $scope.selectedValuation.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.loadProject()
                $scope.budgetgroupList = $scope.formData['BudgetGroupList'];
                $scope.date = new Date($scope.formData['Date']);
                $scope.formData['NodeType'] = 'valuation';
            });
            $scope.saveValuationModalForm.$setPristine();
        }

        // Delete a valuation and remove from the valuations list
        $scope.deleteValuation = function() {
            var deleteid = $scope.selectedValuation.ID;
            $scope.selectedValuation = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonvaluations, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonvaluations.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsonvaluations.splice(i, 1);
                    console.log("Deleted valuation");
                }
            });
        };

        $scope.toggleBudgetgroups = function(bg) {
            // set the budgetgroup selected or unselected
            var flag = (bg.selected === true) ? undefined : true;
            bg.selected = flag;
            // find the budgetgroup in the budgetgroup list
            var i = $scope.budgetgroupList.map(function(e)
                { return e.id; }).indexOf(bg.ID);
            // if the budgetgroup is already in the list
            // and the node is deselected
            if ((i>-1) &(!flag)) {
                // remove it
                $scope.budgetgroupList.splice(i, 1);
            }
            // if the budgetgroup is not in the list
            // and the node is being selected
            else if ((i==-1) & flag) {
                // add the budgetgroup
                $scope.budgetgroupList.push(bg);
                console.log(bg);
            }
        }

        // remove a budgetgroup from the budgetgroup list
        $scope.removeBudgetgroup = function(node) {
            var deleteid = node.ID;
            var result = $.grep($scope.budgetgroupList, function(e) {
                    return e.id == deleteid;
            });
            var i = $scope.budgetgroupList.indexOf(result[0]);
            if (i>-1) {
                $scope.budgetgroupList.splice(i, 1);
                // loop through all the open nodes and if the checked budgetgroup
                // is in it uncheck the budgetgroup
                for (var i = 0; i<$scope.openProjectsList.length; i++) {
                    var subitem = $scope.openProjectsList[i].Subitem || [];
                    if (subitem.length > 0) {
                        $scope.uncheckBudgetgroup(deleteid, subitem);
                    }
                }

            }
        };

        $scope.uncheckBudgetgroup = function(budgetgroupId, subitem) {
            for (var i = 0; i<subitem.length; i++) {
                if (subitem[i].ID == budgetgroupId) {
                    subitem[i].selected = false;
                    break;
                }
                else{
                    var subsubitem = subitem[i].Subitem || [];
                    if (subsubitem.length > 0) {
                        $scope.uncheckBudgetgroup(budgetgroupId, subsubitem);
                    }
                }
            }
        }

        $scope.toggleNode = function(node) {
            // when a node that is not a budgetgroup is selected
            // flag the node, set the selection on all its children
            // load the budgetgroups in the node and toggle them in the
            // budgetgroup list
            var flag = (node.selected === true) ? undefined : true;
            node.selected = flag;
            var nodeid = node.ID;
            var subitems = node['Subitem'];
            // select the subitems
            for (var i = 0; i<subitems.length; i++) {
                subitems[i].selected = flag;
                var subsubitem = subitems[i]['Subitem'] || [];
                if (subsubitem.length > 0) {
                    $scope.toggleSubitems(subsubitem, flag);
                }
            }
            // add the budgetgroups to the list
            $http.get(globalServerURL + 'node/' + nodeid + '/budgetgroups/')
            .success(function(response) {
                for (var v = 0; v<response.length; v++) {
                    var bg = response[v];
                    // find the budgetgroup in the budgetgroup list
                    var i = $scope.budgetgroupList.map(function(e)
                        { return e.id; }).indexOf(bg.ID);
                    // if the budgetgroup is already in the list
                    // and the node is deselected
                    if ((i>-1) &(!flag)) {
                        // remove it
                        $scope.budgetgroupList.splice(i, 1);
                    }
                    // if the budgetgroup is not in the list
                    // and the node is being selected
                    else if ((i==-1) & flag) {
                        // add the budgetgroup
                        $scope.budgetgroupList.push(bg);
                    }
                }
            });
        };

        $scope.toggleSubitems = function(subitem, selected) {
            // recursively select/unselect all the children of a node
            for (var i = 0; i<subitem.length; i++) {
                subitem[i].selected = selected;
                var subsubitem = subitem[i]['Subitem'] || [];
                if (subsubitem.length > 0) {
                    $scope.toggleSubitems(subsubitem, selected);
                }
            }
        };

        $scope.toggleBudgetgroupGrid = function() {
            $scope.isCollapsed = !$scope.isCollapsed;
            if ($scope.isCollapsed) {
                $scope.handleReloadValuationSlickgrid();
            }
        };

        $scope.openProjectsList = [];
        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $scope.formData['ProjectID']
            $http.get(globalServerURL + 'node/' + id + '/')
            .success(function(data) {
                $scope.openProjectsList = [data];
                $scope.selectNodeHead(data);
            });
        };

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.collapsed) {
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + "valuations/tree/" + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    // check if any of the budgetgroup are in the budgetgroup list
                    // and select then
                    for (var i = 0; i<selectedNode.Subitem.length; i++) {
                        if (selectedNode.Subitem[i].NodeType == 'BudgetGroup') {
                            for (var b = 0; b<$scope.budgetgroupList.length; b++) {
                                if ($scope.budgetgroupList[b].ID == selectedNode.Subitem[i].ID) {
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

        $scope.getReport = function (report) {
            if ( report == 'valuation' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'valuation_report/' + $scope.selectedValuation.ID + '/'},
                    {responseType: 'arraybuffer'
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
                    console.log("Valuation pdf download error")
                });
            }
        };

    }
]);

allControllers.run(['$cacheFactory', function($cacheFactory) {
    $cacheFactory('optimate.resources')
}]);
